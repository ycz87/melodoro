import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { Plot, TimeOfDay, Weather, WeatherState } from '../src/types/farm';

interface SeedState {
  settings: Record<string, unknown>;
  farm: Record<string, unknown>;
  shed: Record<string, unknown>;
  gene: Record<string, unknown>;
  weatherState: WeatherState;
  debugTimeOfDayOverride: TimeOfDay;
}

interface SceneCase {
  key: string;
  weather: Weather;
  timeOfDay: TimeOfDay;
  aftermath?: boolean;
}

interface SceneSnapshot {
  sceneBackground: string;
  skyBackground: string;
  timeOfDay: string | null;
  effectiveWeather: string | null;
  cloudCount: number;
  rainLayerCount: number;
  wetnessLayerCount: number;
  puddleLayerCount: number;
  rippleLayerCount: number;
  mistLayerCount: number;
  splashLayerCount: number;
  rainbowCount: number;
  rainbowOpacity: number;
  haloOpacity: number;
  celestialLabel: string | null;
  weatherBadgeText: string | null;
  forecastCount: number;
  backHillTextureBackground: string;
  frontHillTextureBackground: string;
}

const SCENE_CASES: SceneCase[] = [
  { key: 'day-sunny', weather: 'sunny', timeOfDay: 'day' },
  { key: 'day-rainy', weather: 'rainy', timeOfDay: 'day' },
  { key: 'night-sunny', weather: 'sunny', timeOfDay: 'night' },
  { key: 'night-rainy', weather: 'rainy', timeOfDay: 'night' },
  { key: 'day-rainbow-aftermath', weather: 'rainbow', timeOfDay: 'day', aftermath: true },
  { key: 'night-moonbow-aftermath', weather: 'rainbow', timeOfDay: 'night', aftermath: true },
];

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

function createSeedState(sceneCase: SceneCase, now: number = Date.now()): SeedState {
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
      current: sceneCase.weather,
      next: sceneCase.weather === 'rainy' ? 'rainbow' : 'cloudy',
      lastChangeAt: now,
      nextChangeAt: now + 6 * 60 * 60 * 1000,
      previousWeather: sceneCase.aftermath ? 'rainy' : null,
      changedAt: sceneCase.aftermath ? now - 5 * 60 * 1000 : null,
      rainyAftermathUntil: sceneCase.aftermath ? now + 55 * 60 * 1000 : null,
    },
    debugTimeOfDayOverride: sceneCase.timeOfDay,
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
    localStorage.setItem('debugTimeOfDayOverride', JSON.stringify(payload.debugTimeOfDayOverride));
    localStorage.removeItem('watermelon-debug');
  }, state);
}

async function goToFarm(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /(Farm|农场|🌱)/ }).first().click();
  await expect(page.locator('[data-testid="farm-v2-scene"]')).toBeVisible();
  await expect(page.locator('[data-testid="farm-plot-board-v2"]')).toBeVisible();
}

async function openFarmPage(page: Page, sceneCase: SceneCase) {
  await seedInit(page, createSeedState(sceneCase));
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
    const rainbow = document.querySelector('[data-testid="farm-v2-rainbow"]');
    const weatherBadge = document.querySelector('[data-testid="farm-v2-weather-badge"]');
    const backHillTexture = document.querySelector('[data-testid="farm-v2-back-hill-texture"]');
    const frontHillTexture = document.querySelector('[data-testid="farm-v2-front-hill-texture"]');

    return {
      sceneBackground: scene ? getComputedStyle(scene).backgroundImage : '',
      skyBackground: sky ? getComputedStyle(sky).backgroundImage : '',
      timeOfDay: scene?.getAttribute('data-time-of-day') ?? null,
      effectiveWeather: scene?.getAttribute('data-effective-weather') ?? null,
      cloudCount: document.querySelectorAll('[data-testid="farm-v2-cloud-cluster"]').length,
      rainLayerCount: document.querySelectorAll('[data-testid="farm-v2-rain-layer"]').length,
      wetnessLayerCount: document.querySelectorAll('[data-testid="farm-v2-wetness-layer"]').length,
      puddleLayerCount: document.querySelectorAll('[data-testid="farm-v2-puddle-layer"]').length,
      rippleLayerCount: document.querySelectorAll('[data-testid="farm-v2-rain-ripple-layer"]').length,
      mistLayerCount: document.querySelectorAll('[data-testid="farm-v2-rain-mist-layer"]').length,
      splashLayerCount: document.querySelectorAll('[data-testid="farm-v2-rain-splash-layer"]').length,
      rainbowCount: document.querySelectorAll('[data-testid="farm-v2-rainbow"]').length,
      rainbowOpacity: rainbow instanceof HTMLElement ? Number.parseFloat(rainbow.style.opacity || '0') : 0,
      haloOpacity: halo instanceof HTMLElement ? Number.parseFloat(halo.style.opacity || '0') : 0,
      celestialLabel: celestial?.getAttribute('aria-label') ?? null,
      weatherBadgeText: weatherBadge?.textContent ?? null,
      forecastCount: document.querySelectorAll('[data-testid="farm-v2-weather-forecast"]').length,
      backHillTextureBackground: backHillTexture ? getComputedStyle(backHillTexture).backgroundImage : '',
      frontHillTextureBackground: frontHillTexture ? getComputedStyle(frontHillTexture).backgroundImage : '',
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

  test('desktop proof differentiates weather plus local day/night scene states', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop proof only');

    const snapshots = new Map<string, SceneSnapshot>();

    for (const sceneCase of SCENE_CASES) {
      const proofPage = await page.context().newPage();
      await openFarmPage(proofPage, sceneCase);
      const snapshot = await collectSceneSnapshot(proofPage);
      expect(snapshot.weatherBadgeText).toContain(sceneCase.timeOfDay === 'day' ? 'Day' : 'Night');
      expect(snapshot.forecastCount).toBe(0);
      expect(snapshot.backHillTextureBackground).not.toContain('repeating-linear-gradient');
      expect(snapshot.frontHillTextureBackground).not.toContain('repeating-linear-gradient');
      await expect(proofPage.locator('body')).not.toContainText(/Next up|Rain clears soon|Rainbow after rain/);
      snapshots.set(sceneCase.key, snapshot);
      await captureProof(proofPage, testInfo, `desktop-${sceneCase.key}.png`);
      await proofPage.close();
    }

    const daySunny = snapshots.get('day-sunny');
    const dayRainy = snapshots.get('day-rainy');
    const nightSunny = snapshots.get('night-sunny');
    const nightRainy = snapshots.get('night-rainy');
    const dayRainbow = snapshots.get('day-rainbow-aftermath');
    const moonbow = snapshots.get('night-moonbow-aftermath');

    expect(daySunny?.timeOfDay).toBe('day');
    expect(nightSunny?.timeOfDay).toBe('night');
    expect(daySunny?.celestialLabel).toBe('sun');
    expect(nightSunny?.celestialLabel).toBe('moon');
    expect(daySunny?.skyBackground).not.toBe(nightSunny?.skyBackground);
    expect(dayRainy?.skyBackground).not.toBe(nightRainy?.skyBackground);

    expect(dayRainy?.cloudCount ?? 0).toBeGreaterThan(daySunny?.cloudCount ?? 0);
    expect(nightRainy?.cloudCount ?? 0).toBeGreaterThan(nightSunny?.cloudCount ?? 0);
    expect(dayRainy?.rainLayerCount).toBeGreaterThanOrEqual(2);
    expect(nightRainy?.rainLayerCount).toBeGreaterThanOrEqual(2);
    expect(dayRainy?.wetnessLayerCount).toBe(1);
    expect(dayRainy?.puddleLayerCount).toBe(1);
    expect(dayRainy?.rippleLayerCount).toBe(1);
    expect(dayRainy?.mistLayerCount).toBe(1);
    expect(dayRainy?.splashLayerCount).toBe(1);

    expect(dayRainbow?.rainbowCount).toBe(1);
    expect(moonbow?.rainbowCount).toBe(1);
    expect(moonbow?.celestialLabel).toBe('moon');
    expect(moonbow?.rainbowOpacity ?? 1).toBeLessThan(dayRainbow?.rainbowOpacity ?? 0);
    expect(dayRainbow?.wetnessLayerCount).toBe(1);
  });

  test('mobile proof keeps rainy and moonbow decor above the plot board without horizontal overflow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile proof only');

    let rainyBoardTop = Number.POSITIVE_INFINITY;
    let rainyBottoms: number[] = [];
    let moonbowBoardTop = Number.POSITIVE_INFINITY;
    let moonbowBottoms: number[] = [];

    for (const sceneCase of SCENE_CASES) {
      const proofPage = await page.context().newPage();
      await openFarmPage(proofPage, sceneCase);
      const snapshot = await collectSceneSnapshot(proofPage);
      expect(snapshot.weatherBadgeText).toContain(sceneCase.timeOfDay === 'day' ? 'Day' : 'Night');
      expect(snapshot.forecastCount).toBe(0);
      expect(snapshot.backHillTextureBackground).not.toContain('repeating-linear-gradient');
      expect(snapshot.frontHillTextureBackground).not.toContain('repeating-linear-gradient');
      await expect(proofPage.locator('body')).not.toContainText(/Next up|Rain clears soon|Rainbow after rain/);
      await captureProof(proofPage, testInfo, `mobile-${sceneCase.key}.png`);

      if (sceneCase.key === 'night-rainy') {
        const boardBox = await proofPage.locator('[data-testid="farm-plot-board-v2"]').boundingBox();
        expect(boardBox).not.toBeNull();
        rainyBoardTop = boardBox?.y ?? Number.POSITIVE_INFINITY;
        rainyBottoms = await getBottomBounds(proofPage, '[data-testid="farm-v2-rain-layer"]');
      }

      if (sceneCase.key === 'night-moonbow-aftermath') {
        const boardBox = await proofPage.locator('[data-testid="farm-plot-board-v2"]').boundingBox();
        expect(boardBox).not.toBeNull();
        moonbowBoardTop = boardBox?.y ?? Number.POSITIVE_INFINITY;
        moonbowBottoms = await getBottomBounds(proofPage, '[data-testid="farm-v2-rainbow"]');
      }

      const scrollWidth = await proofPage.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await proofPage.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      await proofPage.close();
    }

    expect(rainyBottoms.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...rainyBottoms)).toBeLessThan(rainyBoardTop);
    expect(moonbowBottoms.length).toBe(1);
    expect(moonbowBottoms[0]).toBeLessThan(moonbowBoardTop);
  });
});
