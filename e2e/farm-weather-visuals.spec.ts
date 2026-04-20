import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { Plot, Weather, WeatherState } from '../src/types/farm';

interface SeedState {
  settings: Record<string, unknown>;
  farm: Record<string, unknown>;
  shed: Record<string, unknown>;
  gene: Record<string, unknown>;
  weatherState: WeatherState;
}

interface SceneSnapshot {
  sceneBackground: string;
  skyBackground: string;
  cloudCount: number;
  rainLayerCount: number;
  rainbowCount: number;
  haloOpacity: number;
  celestialLabel: string | null;
}

const WEATHER_ORDER: Weather[] = ['sunny', 'cloudy', 'rainy', 'night', 'rainbow'];

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

function createSeedState(weather: Weather, now: number = Date.now()): SeedState {
  return {
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: 'en',
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
      current: weather,
      lastChangeAt: now,
    },
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
    localStorage.removeItem('weatherDebugOverride');
    localStorage.removeItem('watermelon-debug');
  }, state);
}

async function goToFarm(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /(Farm|农场|🌱)/ }).first().click();
  await expect(page.locator('[data-testid="farm-v2-scene"]')).toBeVisible();
  await expect(page.locator('[data-testid="farm-plot-board-v2"]')).toBeVisible();
}

async function openFarmPage(page: Page, weather: Weather) {
  await seedInit(page, createSeedState(weather));
  await goToFarm(page);
}

async function captureProof(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage: false,
  });
}

async function collectSceneSnapshot(page: Page): Promise<SceneSnapshot> {
  return page.evaluate(() => {
    const scene = document.querySelector('[data-testid="farm-v2-scene"]');
    const sky = document.querySelector('[data-testid="farm-v2-sky-layer"]');
    const halo = document.querySelector('[data-testid="farm-v2-celestial-halo"]');
    const celestial = document.querySelector('[data-testid="farm-v2-celestial-body"]');

    return {
      sceneBackground: scene ? getComputedStyle(scene).backgroundImage : '',
      skyBackground: sky ? getComputedStyle(sky).backgroundImage : '',
      cloudCount: document.querySelectorAll('[data-testid="farm-v2-cloud-cluster"]').length,
      rainLayerCount: document.querySelectorAll('[data-testid="farm-v2-rain-layer"]').length,
      rainbowCount: document.querySelectorAll('[data-testid="farm-v2-rainbow"]').length,
      haloOpacity: halo instanceof HTMLElement ? Number.parseFloat(halo.style.opacity || '0') : 0,
      celestialLabel: celestial?.getAttribute('aria-label') ?? null,
    };
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

test.describe('Farm V2 weather visuals', () => {
  test.describe.configure({ timeout: 60000 });
  test('desktop proof differentiates five weather states without touching the interaction layout', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop proof only');

    const snapshots = new Map<Weather, SceneSnapshot>();

    for (const weather of WEATHER_ORDER) {
      const proofPage = await page.context().newPage();
      await openFarmPage(proofPage, weather);
      snapshots.set(weather, await collectSceneSnapshot(proofPage));
      await captureProof(proofPage, testInfo, `desktop-${weather}.png`);
      await proofPage.close();
    }

    const sunny = snapshots.get('sunny');
    const cloudy = snapshots.get('cloudy');
    const rainy = snapshots.get('rainy');
    const night = snapshots.get('night');
    const rainbow = snapshots.get('rainbow');

    expect(sunny).toBeDefined();
    expect(cloudy).toBeDefined();
    expect(rainy).toBeDefined();
    expect(night).toBeDefined();
    expect(rainbow).toBeDefined();

    expect(sunny?.skyBackground).not.toBe(cloudy?.skyBackground);
    expect(cloudy?.skyBackground).not.toBe(rainy?.skyBackground);
    expect(sunny?.skyBackground).not.toBe(rainbow?.skyBackground);

    expect(cloudy?.cloudCount ?? 0).toBeGreaterThan(sunny?.cloudCount ?? 0);
    expect(rainy?.cloudCount ?? 0).toBeGreaterThan(cloudy?.cloudCount ?? 0);
    expect(rainbow?.cloudCount ?? 0).toBeGreaterThan(sunny?.cloudCount ?? 0);

    expect((sunny?.haloOpacity ?? 0)).toBeGreaterThan(cloudy?.haloOpacity ?? 0);
    expect((cloudy?.haloOpacity ?? 0)).toBeGreaterThan(rainy?.haloOpacity ?? 0);

    expect(sunny?.rainLayerCount).toBe(0);
    expect(cloudy?.rainLayerCount).toBe(0);
    expect(rainy?.rainLayerCount).toBeGreaterThan(0);
    expect(rainbow?.rainLayerCount).toBe(0);

    expect(sunny?.rainbowCount).toBe(0);
    expect(cloudy?.rainbowCount).toBe(0);
    expect(rainbow?.rainbowCount).toBe(1);
    expect(night?.celestialLabel).toBe('moon');
  });

  test('mobile proof keeps rainy and rainbow decor above the plot board while preserving the same visual splits', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile proof only');

    const snapshots = new Map<Weather, SceneSnapshot>();
    let rainyBoardTop = Number.POSITIVE_INFINITY;
    let rainyBottoms: number[] = [];
    let rainbowBoardTop = Number.POSITIVE_INFINITY;
    let rainbowBottoms: number[] = [];

    for (const weather of WEATHER_ORDER) {
      const proofPage = await page.context().newPage();
      await openFarmPage(proofPage, weather);
      snapshots.set(weather, await collectSceneSnapshot(proofPage));
      await captureProof(proofPage, testInfo, `mobile-${weather}.png`);

      if (weather === 'rainy') {
        const boardBox = await proofPage.locator('[data-testid="farm-plot-board-v2"]').boundingBox();
        expect(boardBox).not.toBeNull();
        rainyBoardTop = boardBox?.y ?? Number.POSITIVE_INFINITY;
        rainyBottoms = await getBottomBounds(proofPage, '[data-testid="farm-v2-rain-layer"]');
      }

      if (weather === 'rainbow') {
        const boardBox = await proofPage.locator('[data-testid="farm-plot-board-v2"]').boundingBox();
        expect(boardBox).not.toBeNull();
        rainbowBoardTop = boardBox?.y ?? Number.POSITIVE_INFINITY;
        rainbowBottoms = await getBottomBounds(proofPage, '[data-testid="farm-v2-rainbow"]');
      }

      await proofPage.close();
    }

    expect(rainyBottoms.length).toBeGreaterThan(0);
    expect(Math.max(...rainyBottoms)).toBeLessThan(rainyBoardTop);
    expect(rainbowBottoms.length).toBe(1);
    expect(rainbowBottoms[0]).toBeLessThan(rainbowBoardTop);

    const sunny = snapshots.get('sunny');
    const cloudy = snapshots.get('cloudy');
    const rainy = snapshots.get('rainy');
    const rainbow = snapshots.get('rainbow');

    expect(sunny?.sceneBackground).not.toBe(cloudy?.sceneBackground);
    expect(cloudy?.sceneBackground).not.toBe(rainy?.sceneBackground);
    expect(sunny?.sceneBackground).not.toBe(rainbow?.sceneBackground);
    expect(cloudy?.cloudCount ?? 0).toBeGreaterThan(sunny?.cloudCount ?? 0);
    expect(rainy?.rainLayerCount).toBeGreaterThan(0);
    expect(rainbow?.rainbowCount).toBe(1);
  });
});
