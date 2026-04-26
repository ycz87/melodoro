import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import type { Plot, Weather, WeatherState } from '../src/types/farm';
import { WEATHER_SWITCH_INTERVAL_MS } from '../src/utils/weather';

interface SeedState {
  settings: Record<string, unknown>;
  farm: Record<string, unknown>;
  shed: Record<string, unknown>;
  gene: Record<string, unknown>;
  weatherState: WeatherState;
  debugWeatherOverride?: Weather | null;
  debugMode?: boolean;
}

function getTodayKey(now: number = Date.now()): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createEmptyPlot(id: number): Plot {
  return {
    id,
    state: 'empty',
    progress: 0,
    mutationStatus: 'none',
    mutationChance: 0.02,
    isMutant: false,
    accumulatedMinutes: 0,
    lastActivityTimestamp: 0,
    hasTracker: false,
  };
}

function createSeedState(options?: {
  language?: 'zh' | 'en';
  weather?: Weather;
  lastChangeAt?: number;
  debugWeatherOverride?: Weather | null;
  debugMode?: boolean;
  normalSeeds?: number;
}): SeedState {
  const now = Date.now();

  return {
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: options?.language ?? 'zh',
    },
    farm: {
      plots: Array.from({ length: 4 }, (_, index) => createEmptyPlot(index)),
      collection: [],
      lastActiveDate: getTodayKey(now),
      consecutiveInactiveDays: 0,
      lastActivityTimestamp: now,
      guardianBarrierDate: '',
      stolenRecords: [],
    },
    shed: {
      seeds: { normal: options?.normalSeeds ?? 0, epic: 0, legendary: 0 },
      items: {},
      totalSliced: 0,
      pity: { epicPity: 0, legendaryPity: 0 },
      injectedSeeds: [],
      hybridSeeds: [],
      prismaticSeeds: [],
      darkMatterSeeds: [],
    },
    gene: {
      fragments: [],
    },
    weatherState: {
      current: options?.weather ?? 'sunny',
      next: options?.weather === 'rainy' ? 'sunny' : 'cloudy',
      lastChangeAt: options?.lastChangeAt ?? now,
      nextChangeAt: (options?.lastChangeAt ?? now) + WEATHER_SWITCH_INTERVAL_MS,
      previousWeather: null,
      changedAt: null,
      rainyAftermathUntil: null,
    },
    debugWeatherOverride: options?.debugWeatherOverride,
    debugMode: options?.debugMode ?? false,
  };
}

function seedInit(page: Page, state: SeedState) {
  return page.addInitScript((payload: SeedState) => {
    localStorage.clear();
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify(payload.settings));
    localStorage.setItem('watermelon-farm', JSON.stringify(payload.farm));
    localStorage.setItem('watermelon-shed', JSON.stringify(payload.shed));
    localStorage.setItem('watermelon-genes', JSON.stringify(payload.gene));
    localStorage.setItem('weatherState', JSON.stringify(payload.weatherState));

    if (payload.debugWeatherOverride !== undefined) {
      localStorage.setItem('weatherDebugOverride', JSON.stringify(payload.debugWeatherOverride));
    } else {
      localStorage.removeItem('weatherDebugOverride');
    }

    if (payload.debugMode) {
      localStorage.setItem('watermelon-debug', 'true');
    } else {
      localStorage.removeItem('watermelon-debug');
    }
  }, state);
}

async function goToFarm(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /(Farm|农场|🌱)/ }).first().click();
  await expect(page.locator('[data-testid="farm-v2-scene"]')).toBeVisible();
  await expect(page.locator('[data-testid="farm-plot-board-v2"]')).toBeVisible();
}

function scene(page: Page): Locator {
  return page.locator('[data-testid="farm-v2-scene"]');
}

function overlay(page: Page): Locator {
  return page.locator('[data-testid="farm-v2-weather-transition-overlay"]');
}

async function expectOverlay(page: Page, fromWeather: Weather, toWeather: Weather): Promise<string> {
  const farmScene = scene(page);

  await expect.poll(async () => farmScene.getAttribute('data-last-transition-from'), { timeout: 3000 }).toBe(fromWeather);
  await expect.poll(async () => farmScene.getAttribute('data-last-transition-to'), { timeout: 3000 }).toBe(toWeather);
  await expect.poll(async () => {
    const token = await farmScene.getAttribute('data-last-transition-token');
    const mountedToken = await farmScene.getAttribute('data-last-transition-mounted-token');
    return token && token === mountedToken ? token : '';
  }, { timeout: 3000 }).not.toBe('');

  const transitionToken = await farmScene.getAttribute('data-last-transition-token');
  expect(transitionToken).not.toBeNull();
  return transitionToken ?? '0';
}

async function waitForOverlayToClear(page: Page, transitionToken: string) {
  const farmScene = scene(page);
  await expect.poll(async () => farmScene.getAttribute('data-last-transition-cleared-token'), { timeout: 3000 }).toBe(transitionToken);
  await expect.poll(async () => farmScene.getAttribute('data-transition-active'), { timeout: 3000 }).toBe('false');
  await expect.poll(async () => overlay(page).count(), { timeout: 3000 }).toBe(0);
}

async function captureProof(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage: false,
  });
}

async function getBottomBounds(page: Page, selector: string): Promise<number[]> {
  const locator = page.locator(selector);
  const count = await locator.count();
  const bottoms: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const box = await locator.nth(index).boundingBox();
    if (box) {
      bottoms.push(box.y + box.height);
    }
  }

  return bottoms;
}

test.describe('Farm V2 weather transitions', () => {
  test.describe.configure({ timeout: 60000 });
  test('desktop debug path reuses one overlay, clears cleanly, and never blocks plot clicks', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop proof only');

    await seedInit(page, createSeedState({ weather: 'sunny', debugMode: true, normalSeeds: 1 }));
    await goToFarm(page);

    await expect(scene(page)).toHaveAttribute('data-transition-active', 'false');

    await page.getByRole('button', { name: '切换天气' }).click();
    await expectOverlay(page, 'sunny', 'cloudy');
    await captureProof(page, testInfo, 'desktop-transition-debug-cloudy.png');

    await page.getByRole('button', { name: '切换天气' }).click();
    const rainyTransitionToken = await expectOverlay(page, 'cloudy', 'rainy');

    await page.locator('[data-testid="farm-plot-board-v2"] [role="button"]').first().click();
    await expect(page.getByRole('heading', { name: '选择种子' })).toBeVisible();
    await page.getByRole('button', { name: '取消' }).click();

    await waitForOverlayToClear(page, rainyTransitionToken);

    await page.getByRole('button', { name: '清除天气' }).click();
    const clearTransitionToken = await expectOverlay(page, 'rainy', 'sunny');
    await captureProof(page, testInfo, 'desktop-transition-rainy-sunny.png');
    await waitForOverlayToClear(page, clearTransitionToken);
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('weatherDebugOverride') ?? 'null'))).toBe(null);
  });

  test('desktop real weather rotation uses the same scene overlay trigger', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop proof only');

    await page.addInitScript(() => {
      Math.random = () => 0.5;
    });
    await seedInit(page, createSeedState({
      weather: 'sunny',
      lastChangeAt: Date.now() - WEATHER_SWITCH_INTERVAL_MS + 700,
      normalSeeds: 1,
    }));
    await goToFarm(page);

    const realTransitionToken = await expectOverlay(page, 'sunny', 'cloudy');
    await captureProof(page, testInfo, 'desktop-transition-real-rotation.png');
    await waitForOverlayToClear(page, realTransitionToken);
    await expect(scene(page)).toHaveAttribute('data-current-weather', 'cloudy');
  });

  test('mobile rainy and rainbow decor stay above the board after transitions settle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile proof only');

    await seedInit(page, createSeedState({ weather: 'sunny', debugMode: true }));
    await goToFarm(page);

    await page.getByRole('button', { name: '切换天气' }).click();
    const cloudyTransitionToken = await expectOverlay(page, 'sunny', 'cloudy');
    await captureProof(page, testInfo, 'mobile-transition-cloudy.png');
    await waitForOverlayToClear(page, cloudyTransitionToken);

    await page.getByRole('button', { name: '切换天气' }).click();
    const rainyTransitionToken = await expectOverlay(page, 'cloudy', 'rainy');
    await waitForOverlayToClear(page, rainyTransitionToken);
    await captureProof(page, testInfo, 'mobile-transition-rainy.png');

    const rainyBoardBox = await page.locator('[data-testid="farm-plot-board-v2"]').boundingBox();
    expect(rainyBoardBox).not.toBeNull();
    const rainyBottoms = await getBottomBounds(page, '[data-testid="farm-v2-rain-layer"]');
    expect(rainyBottoms.length).toBeGreaterThan(0);
    expect(Math.max(...rainyBottoms)).toBeLessThan(rainyBoardBox?.y ?? Number.POSITIVE_INFINITY);

    await page.getByRole('button', { name: '清除天气' }).click();
    const clearTransitionToken = await expectOverlay(page, 'rainy', 'sunny');
    await captureProof(page, testInfo, 'mobile-transition-rainy-sunny.png');
    await waitForOverlayToClear(page, clearTransitionToken);

    await page.getByRole('button', { name: '切换天气' }).click();
    const cloudyAgainTransitionToken = await expectOverlay(page, 'sunny', 'cloudy');
    await waitForOverlayToClear(page, cloudyAgainTransitionToken);

    await page.getByRole('button', { name: '切换天气' }).click();
    const rainyAgainTransitionToken = await expectOverlay(page, 'cloudy', 'rainy');
    await waitForOverlayToClear(page, rainyAgainTransitionToken);

    await page.getByRole('button', { name: '切换天气' }).click();
    const nightTransitionToken = await expectOverlay(page, 'rainy', 'night');
    await waitForOverlayToClear(page, nightTransitionToken);

    await page.getByRole('button', { name: '切换天气' }).click();
    const rainbowTransitionToken = await expectOverlay(page, 'night', 'rainbow');
    await waitForOverlayToClear(page, rainbowTransitionToken);
    await captureProof(page, testInfo, 'mobile-transition-rainbow.png');

    const rainbowBoardBox = await page.locator('[data-testid="farm-plot-board-v2"]').boundingBox();
    expect(rainbowBoardBox).not.toBeNull();
    const rainbowBottoms = await getBottomBounds(page, '[data-testid="farm-v2-rainbow"]');
    expect(rainbowBottoms).toHaveLength(1);
    expect(rainbowBottoms[0]).toBeLessThan(rainbowBoardBox?.y ?? Number.POSITIVE_INFINITY);
  });
});
