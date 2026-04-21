import { test, expect, type Page } from '@playwright/test';
import {
  migrateWeatherDebugOverride,
  migrateWeatherState,
  rotateWeatherState,
  WEATHER_SWITCH_INTERVAL_MS,
} from '../src/utils/weather';
import type {
  AlienVisit,
  Creature,
  CreatureType,
  Plot,
  Weather,
  WeatherState,
} from '../src/types/farm';

interface DebugState {
  settings: Record<string, unknown>;
  farm: Record<string, unknown>;
  shed: Record<string, unknown>;
  gene: Record<string, unknown>;
  weatherState?: unknown;
  debugWeatherOverride?: unknown;
  creatures?: Creature[];
  alienVisit?: AlienVisit;
  debugMode?: boolean;
}

const WEATHER_TYPES: Weather[] = ['sunny', 'cloudy', 'rainy', 'night', 'rainbow'];
const CREATURE_TYPES: CreatureType[] = ['bee', 'butterfly', 'ladybug', 'bird'];

function sequenceRandom(values: number[]): () => number {
  const remaining = [...values];
  const fallback = remaining.at(-1) ?? 0.5;
  return () => (remaining.length > 0 ? remaining.shift() ?? fallback : fallback);
}

function getTodayKey(now: number = Date.now()): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
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

function createCreature(
  id: string,
  type: CreatureType,
  expiresAt: number,
): Creature {
  return {
    id,
    type,
    xPercent: 50,
    yPercent: 42,
    expiresAt,
  };
}

function createSeedPayload(options?: {
  now?: number;
  plots?: Plot[];
  farmOverrides?: Record<string, unknown>;
  shedOverrides?: Record<string, unknown>;
  weatherState?: unknown;
  debugWeatherOverride?: unknown;
  creatures?: Creature[];
  alienVisit?: AlienVisit;
  debugMode?: boolean;
}): DebugState {
  const now = options?.now ?? Date.now();
  const todayKey = getTodayKey(now);

  return {
    settings: {
      workMinutes: 25,
      shortBreakMinutes: 5,
      theme: 'dark',
      language: 'zh',
    },
    farm: {
      plots: options?.plots ?? [0, 1, 2, 3].map((id) => createEmptyPlot(id)),
      collection: [],
      lastActiveDate: todayKey,
      consecutiveInactiveDays: 0,
      lastActivityTimestamp: now,
      guardianBarrierDate: '',
      stolenRecords: [],
      ...options?.farmOverrides,
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
      ...options?.shedOverrides,
    },
    gene: {
      fragments: [],
    },
    weatherState: options?.weatherState,
    debugWeatherOverride: options?.debugWeatherOverride,
    creatures: options?.creatures,
    alienVisit: options?.alienVisit,
    debugMode: options?.debugMode ?? false,
  };
}

function seedInit(
  page: Page,
  payload: DebugState,
  options?: { now?: number; randomSequence?: number[] },
) {
  return page.addInitScript(({ state, now, randomSequence }: {
    state: DebugState;
    now?: number;
    randomSequence?: number[];
  }) => {
    if (typeof now === 'number') {
      const fixedNow = now;
      Date.now = () => fixedNow;
    }

    if (Array.isArray(randomSequence)) {
      const remaining = [...randomSequence];
      const fallback = remaining.at(-1) ?? 0.5;
      Math.random = () => (remaining.length > 0 ? remaining.shift() ?? fallback : fallback);
    }

    localStorage.clear();
    localStorage.setItem('pomodoro-guide-seen', '1');
    localStorage.setItem('pomodoro-settings', JSON.stringify(state.settings));
    localStorage.setItem('watermelon-farm', JSON.stringify(state.farm));
    localStorage.setItem('watermelon-shed', JSON.stringify(state.shed));
    localStorage.setItem('watermelon-genes', JSON.stringify(state.gene));

    if (state.weatherState !== undefined) {
      localStorage.setItem('weatherState', JSON.stringify(state.weatherState));
    } else {
      localStorage.removeItem('weatherState');
    }

    if (state.debugWeatherOverride !== undefined) {
      localStorage.setItem('weatherDebugOverride', JSON.stringify(state.debugWeatherOverride));
    } else {
      localStorage.removeItem('weatherDebugOverride');
    }

    if (state.creatures !== undefined) {
      localStorage.setItem('creatures', JSON.stringify(state.creatures));
    } else {
      localStorage.removeItem('creatures');
    }

    if (state.alienVisit !== undefined) {
      localStorage.setItem('alienVisit', JSON.stringify(state.alienVisit));
    } else {
      localStorage.removeItem('alienVisit');
    }

    if (state.debugMode) {
      localStorage.setItem('watermelon-debug', 'true');
    } else {
      localStorage.removeItem('watermelon-debug');
    }
  }, {
    state: payload,
    now: options?.now,
    randomSequence: options?.randomSequence,
  });
}

async function readStorage<T>(page: Page, key: string, fallback: T): Promise<T> {
  return page.evaluate(([storageKey, fallbackValue]: [string, T]) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallbackValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallbackValue;
    }
  }, [key, fallback]);
}

async function goToFarm(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /(Farm|农场|🌱)/ }).first().click();
  await expect(page.locator('[data-testid="farm-v2-scene"]')).toBeVisible();
  await expect(page.locator('[data-testid="farm-plot-board-v2"]')).toBeVisible();
}

test.describe('Farm weather/life compatibility coverage', () => {
  test('compat: weatherState initializes into the canonical storage shape', async ({ page }) => {
    await seedInit(page, createSeedPayload());
    await goToFarm(page);

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('weatherState');
      if (!raw) return false;
      try {
        const data = JSON.parse(raw) as { current?: unknown; lastChangeAt?: unknown };
        return typeof data.current === 'string'
          && typeof data.lastChangeAt === 'number'
          && Number.isFinite(data.lastChangeAt);
      } catch {
        return false;
      }
    });

    const weatherState = await readStorage<WeatherState | null>(page, 'weatherState', null);

    expect(weatherState).not.toBeNull();
    if (!weatherState) return;

    expect(WEATHER_TYPES).toContain(weatherState.current);
    expect(weatherState.lastChangeAt).toBeGreaterThan(0);
  });

  test('compat: creatures storage keeps the expected schema', async ({ page }) => {
    const now = Date.now();
    const seededCreature = createCreature('creature-structure', 'bee', now + 10 * 60 * 1000);

    await seedInit(page, createSeedPayload({
      creatures: [seededCreature],
    }));
    await goToFarm(page);

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('creatures');
      if (!raw) return false;
      try {
        const data = JSON.parse(raw) as unknown;
        return Array.isArray(data);
      } catch {
        return false;
      }
    });

    const creatures = await readStorage<Creature[]>(page, 'creatures', []);
    expect(Array.isArray(creatures)).toBeTruthy();
    expect(creatures.length).toBeGreaterThan(0);

    const creature = creatures[0];
    if (!creature) {
      throw new Error('creatures[0] should exist');
    }
    expect(typeof creature.id).toBe('string');
    expect(CREATURE_TYPES).toContain(creature.type);
    expect(Number.isFinite(creature.xPercent)).toBeTruthy();
    expect(Number.isFinite(creature.yPercent)).toBeTruthy();
    expect(creature.xPercent).toBeGreaterThanOrEqual(0);
    expect(creature.xPercent).toBeLessThanOrEqual(100);
    expect(creature.yPercent).toBeGreaterThanOrEqual(0);
    expect(creature.yPercent).toBeLessThanOrEqual(100);
    expect(Number.isFinite(creature.expiresAt)).toBeTruthy();
    expect(creature.expiresAt).toBeGreaterThan(Date.now());
  });

  test('compat: alienVisit storage keeps the expected schema', async ({ page }) => {
    await seedInit(page, createSeedPayload({
      alienVisit: {
        lastMelonAlienCheckDate: '',
        current: null,
      },
    }));
    await goToFarm(page);

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('alienVisit');
      if (!raw) return false;
      try {
        const data = JSON.parse(raw) as unknown;
        if (!data || typeof data !== 'object') return false;
        const parsed = data as { lastMelonAlienCheckDate?: unknown; current?: unknown };
        return typeof parsed.lastMelonAlienCheckDate === 'string'
          && Object.prototype.hasOwnProperty.call(parsed, 'current');
      } catch {
        return false;
      }
    });

    const alienVisit = await readStorage<AlienVisit | null>(page, 'alienVisit', null);
    expect(alienVisit).not.toBeNull();
    if (!alienVisit) return;

    expect(typeof alienVisit.lastMelonAlienCheckDate).toBe('string');
    if (alienVisit.current === null) return;

    expect(alienVisit.current.type === 'melon-alien' || alienVisit.current.type === 'mutation-doctor').toBeTruthy();
    expect(
      alienVisit.current.messageKey === 'alienMelonGreeting'
      || alienVisit.current.messageKey === 'alienMutationDoctor',
    ).toBeTruthy();
    expect(Number.isFinite(alienVisit.current.appearedAt)).toBeTruthy();
    expect(Number.isFinite(alienVisit.current.expiresAt)).toBeTruthy();
    expect(alienVisit.current.expiresAt).toBeGreaterThan(alienVisit.current.appearedAt);
  });

  test('compat: legacy snowy state and future lastChangeAt repair into canonical weather', async ({ page }) => {
    const now = Date.UTC(2026, 3, 20, 12, 0, 0);

    await seedInit(page, createSeedPayload({
      now,
      weatherState: {
        current: 'snowy',
        lastChangeAt: now + WEATHER_SWITCH_INTERVAL_MS,
      },
    }), { now });

    await page.goto('/');

    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.current ?? null;
    }).toBe('cloudy');
    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.lastChangeAt ?? null;
    }).toBe(now);
  });

  test('compat: malformed weather state repairs into canonical production weather', async ({ page }) => {
    const now = Date.UTC(2026, 3, 20, 12, 0, 0);

    expect(migrateWeatherState({ current: 'stormy', lastChangeAt: now }, now).current).toBe('rainy');
    expect(
      migrateWeatherState({ current: 'mystery-weather', lastChangeAt: 'invalid' }, now, sequenceRandom([0.51])),
    ).toEqual({ current: 'cloudy', lastChangeAt: now });

    await seedInit(page, createSeedPayload({
      now,
      weatherState: {
        current: null,
        lastChangeAt: 'invalid-timestamp',
      },
    }), {
      now,
      randomSequence: [0.51],
    });

    await page.goto('/');

    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.current ?? null;
    }).toBe('cloudy');
    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.lastChangeAt ?? null;
    }).toBe(now);
  });

  test('compat: non-rainy production weather cannot rotate directly into rainbow', async ({ page }) => {
    const now = Date.UTC(2026, 3, 20, 18, 0, 0);
    const lastChangeAt = now - WEATHER_SWITCH_INTERVAL_MS - 1;

    await seedInit(page, createSeedPayload({
      now,
      weatherState: {
        current: 'sunny',
        lastChangeAt,
      },
    }), {
      now,
      randomSequence: [0.99, 0.01],
    });

    await page.goto('/');

    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.current ?? null;
    }).toBe('sunny');
    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.lastChangeAt ?? null;
    }).toBe(lastChangeAt + WEATHER_SWITCH_INTERVAL_MS);
  });

  test('compat: multi-slot catch-up can still reach rainbow after the rainy gate', () => {
    const now = Date.UTC(2026, 3, 21, 0, 0, 0);
    const lastChangeAt = now - (WEATHER_SWITCH_INTERVAL_MS * 2) - 1;

    const state = rotateWeatherState(
      {
        current: 'sunny',
        lastChangeAt,
      },
      now,
      sequenceRandom([0.70, 0.01]),
    );

    expect(state.current).toBe('rainbow');
    expect(state.lastChangeAt).toBe(lastChangeAt + (WEATHER_SWITCH_INTERVAL_MS * 2));
  });

  test('compat: debug override stays separate from production truth', async ({ page }) => {
    const now = Date.UTC(2026, 3, 21, 0, 0, 0);

    expect(migrateWeatherDebugOverride('snowy')).toBe('cloudy');
    expect(migrateWeatherDebugOverride('stormy')).toBe('rainy');

    await seedInit(page, createSeedPayload({
      now,
      weatherState: {
        current: 'rainbow',
        lastChangeAt: now,
      },
      debugWeatherOverride: 'night',
      debugMode: true,
    }), { now });

    await page.goto('/');
    await expect(page.getByText('🧪 Debug Toolbar')).toBeVisible();

    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.current ?? null;
    }).toBe('rainbow');
    await expect.poll(async () => readStorage<Weather | null>(page, 'weatherDebugOverride', null)).toBe('night');

    await page.getByRole('button', { name: '清除天气' }).click();

    await expect.poll(async () => readStorage<Weather | null>(page, 'weatherDebugOverride', null)).toBe(null);
    await expect.poll(async () => {
      const state = await readStorage<WeatherState | null>(page, 'weatherState', null);
      return state?.current ?? null;
    }).toBe('rainbow');
  });
});
