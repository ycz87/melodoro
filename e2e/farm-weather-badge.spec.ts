import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { en } from '../src/i18n/locales/en';
import { zh } from '../src/i18n/locales/zh';
import type { Plot, TimeOfDay, Weather, WeatherState } from '../src/types/farm';
import { WEATHER_ICON_MAP } from '../src/utils/weather';

interface SeedState {
  settings: Record<string, unknown>;
  farm: Record<string, unknown>;
  shed: Record<string, unknown>;
  gene: Record<string, unknown>;
  weatherState?: WeatherState;
  debugWeatherOverride?: Weather | null;
  debugTimeOfDayOverride?: TimeOfDay | null;
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
  now?: number;
  weather?: Weather;
  timeOfDay?: TimeOfDay;
  debugMode?: boolean;
}): SeedState {
  const now = options?.now ?? Date.now();

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
      seeds: { normal: 0, epic: 0, legendary: 0 },
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
      lastChangeAt: now,
      nextChangeAt: now + 6 * 60 * 60 * 1000,
      previousWeather: null,
      changedAt: null,
      rainyAftermathUntil: null,
    },
    debugTimeOfDayOverride: options?.timeOfDay,
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

    if (payload.weatherState) {
      localStorage.setItem('weatherState', JSON.stringify(payload.weatherState));
    }

    if (payload.debugWeatherOverride !== undefined) {
      localStorage.setItem('weatherDebugOverride', JSON.stringify(payload.debugWeatherOverride));
    } else {
      localStorage.removeItem('weatherDebugOverride');
    }

    if (payload.debugTimeOfDayOverride !== undefined) {
      localStorage.setItem('debugTimeOfDayOverride', JSON.stringify(payload.debugTimeOfDayOverride));
    } else {
      localStorage.removeItem('debugTimeOfDayOverride');
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
  await expect(page.locator('[data-testid="farm-v2-weather-badge"]')).toBeVisible();
}

async function captureProof(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage: false,
  });
}

test.describe('Farm weather badge', () => {
  test.describe.configure({ timeout: 60000 });
  test('desktop badge stays in sync with weather updates and uses zh weather names', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop proof only');
    await seedInit(page, createSeedState({ language: 'zh', weather: 'sunny', timeOfDay: 'day', debugMode: true }));
    await goToFarm(page);

    const badge = page.locator('[data-testid="farm-v2-weather-badge"]');
    await expect(badge).toContainText(WEATHER_ICON_MAP.sunny);
    await expect(badge).toContainText(`${zh.farmWeatherName('sunny')} · ${zh.farmTimeOfDayName('day')}`);
    await captureProof(page, testInfo, 'desktop-farm-weather-badge.png');

    await page.getByRole('button', { name: '切换天气' }).click();
    await expect(badge).toContainText(WEATHER_ICON_MAP.cloudy);
    await expect(badge).toContainText(`${zh.farmWeatherName('cloudy')} · ${zh.farmTimeOfDayName('day')}`);
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('weatherDebugOverride') ?? 'null'))).toBe('cloudy');

    await page.getByRole('button', { name: '切换昼夜' }).click();
    await expect(badge).toContainText(`${zh.farmWeatherName('cloudy')} · ${zh.farmTimeOfDayName('night')}`);
    await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('debugTimeOfDayOverride') ?? 'null'))).toBe('night');
  });

  test('mobile badge is visible below the HUD pills, stays off the plot area, and uses en weather names', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile proof only');
    await seedInit(page, createSeedState({ language: 'en', weather: 'rainbow', timeOfDay: 'night' }));
    await goToFarm(page);

    const badge = page.locator('[data-testid="farm-v2-weather-badge"]');
    const board = page.locator('[data-testid="farm-plot-board-v2"]');

    await expect(badge).toContainText(WEATHER_ICON_MAP.rainbow);
    await expect(badge).toContainText(`${en.farmWeatherName('rainbow')} · ${en.farmTimeOfDayName('night')}`);
    await captureProof(page, testInfo, 'mobile-farm-weather-badge.png');

    const badgeBox = await badge.boundingBox();
    const boardBox = await board.boundingBox();

    expect(badgeBox).not.toBeNull();
    expect(boardBox).not.toBeNull();
    expect((badgeBox?.y ?? 0) + (badgeBox?.height ?? 0)).toBeLessThan(boardBox?.y ?? 0);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
