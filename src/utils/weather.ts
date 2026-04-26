import type { Weather, WeatherClimateProfile, WeatherDebugOverride, WeatherState } from '../types/farm';

export const WEATHER_SWITCH_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const RAINY_AFTERMATH_DURATION_MS = 60 * 60 * 1000;
export const DEBUG_WEATHER_ORDER: Weather[] = ['sunny', 'cloudy', 'rainy', 'night', 'rainbow'];
export const WEATHER_ICON_MAP: Record<Weather, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  night: '🌙',
  rainbow: '🌈',
};

const RAINBOW_CHANCE = 0.05;
const DEFAULT_WEATHER: Weather = 'sunny';

const GLOBAL_WEATHER_PROFILE: WeatherClimateProfile = {
  id: 'global',
  switchIntervalMs: WEATHER_SWITCH_INTERVAL_MS,
  rainyAftermathDurationMs: RAINY_AFTERMATH_DURATION_MS,
};

interface ResolveWeatherProfileInput {
  activePlanet?: null;
}

interface NormalizedWeatherPlan {
  current: Weather;
  next: Weather;
  lastChangeAt: number;
  nextChangeAt: number;
  previousWeather: Weather | null;
  changedAt: number | null;
  rainyAftermathUntil: number | null;
}

export interface WeatherWetnessState {
  isRaining: boolean;
  isAftermathActive: boolean;
  isWet: boolean;
  aftermathMsRemaining: number;
  visualMode: 'dry' | 'rainy' | 'aftermath' | 'night-clean';
}

export function resolveWeatherProfile(input: ResolveWeatherProfileInput = { activePlanet: null }): WeatherClimateProfile {
  void input;
  return GLOBAL_WEATHER_PROFILE;
}

function isWeather(value: unknown): value is Weather {
  return typeof value === 'string' && DEBUG_WEATHER_ORDER.includes(value as Weather);
}

function repairWeather(value: unknown, fallbackWeather: Weather = DEFAULT_WEATHER): Weather {
  if (isWeather(value)) {
    return value;
  }
  if (value === 'snowy') {
    return 'cloudy';
  }
  if (value === 'stormy') {
    return 'rainy';
  }
  return fallbackWeather;
}

function normalizeLastChangeAt(value: unknown, now: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > now) {
    return now;
  }
  return value;
}

function normalizeChangedAt(value: unknown, now: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value > now) {
    return null;
  }
  return value;
}

function normalizeFutureTimestamp(value: unknown, now: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= now) {
    return null;
  }
  return value;
}

function cleanupRainyAftermath(value: number | null, now: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= now) {
    return null;
  }
  return value;
}

function normalizeWeatherState(
  state: WeatherState,
  now: number,
  randomFn: () => number,
): NormalizedWeatherPlan {
  const current = repairWeather(state.current, DEFAULT_WEATHER);
  const next = isWeather(state.next) || state.next === 'snowy' || state.next === 'stormy'
    ? repairWeather(state.next, DEFAULT_WEATHER)
    : rollWeather(current, randomFn);
  const lastChangeAt = normalizeLastChangeAt(state.lastChangeAt, now);
  const nextChangeAt = lastChangeAt + resolveWeatherProfile({ activePlanet: null }).switchIntervalMs;
  const previousWeather = state.previousWeather === null || typeof state.previousWeather === 'undefined'
    ? null
    : repairWeather(state.previousWeather, DEFAULT_WEATHER);
  const changedAt = normalizeChangedAt(state.changedAt, now);
  const rainyAftermathUntil = cleanupRainyAftermath(state.rainyAftermathUntil ?? null, now);

  return {
    current,
    next,
    lastChangeAt,
    nextChangeAt,
    previousWeather,
    changedAt,
    rainyAftermathUntil,
  };
}

export function rollWeather(previousWeather: Weather, randomFn: () => number = Math.random): Weather {
  const roll = randomFn();

  if (previousWeather === 'rainy') {
    if (roll < RAINBOW_CHANCE) return 'rainbow';
    if (roll < 0.45) return 'sunny';
    if (roll < 0.70) return 'cloudy';
    if (roll < 0.85) return 'rainy';
    return 'night';
  }

  if (roll < 0.40) return 'sunny';
  if (roll < 0.65) return 'cloudy';
  if (roll < 0.85) return 'rainy';
  return 'night';
}

export function createInitialWeatherState(
  now: number = Date.now(),
  randomFn: () => number = Math.random,
): WeatherState {
  const current = rollWeather(DEFAULT_WEATHER, randomFn);
  const next = rollWeather(current, randomFn);

  return {
    current,
    next,
    lastChangeAt: now,
    nextChangeAt: now + resolveWeatherProfile({ activePlanet: null }).switchIntervalMs,
    previousWeather: null,
    changedAt: null,
    rainyAftermathUntil: null,
  };
}

export function migrateWeatherState(
  raw: unknown,
  now: number = Date.now(),
  randomFn: () => number = Math.random,
): WeatherState {
  if (!raw || typeof raw !== 'object') {
    return createInitialWeatherState(now, randomFn);
  }

  const candidate = raw as Record<string, unknown>;
  const current = isWeather(candidate.current)
    ? candidate.current
    : candidate.current === 'snowy'
      ? 'cloudy'
      : candidate.current === 'stormy'
        ? 'rainy'
        : rollWeather(DEFAULT_WEATHER, randomFn);
  const next = isWeather(candidate.next)
    ? candidate.next
    : candidate.next === 'snowy'
      ? 'cloudy'
      : candidate.next === 'stormy'
        ? 'rainy'
        : rollWeather(current, randomFn);
  const lastChangeAt = normalizeLastChangeAt(candidate.lastChangeAt, now);
  const previousWeather = candidate.previousWeather === null || typeof candidate.previousWeather === 'undefined'
    ? null
    : repairWeather(candidate.previousWeather, DEFAULT_WEATHER);

  return {
    current,
    next,
    lastChangeAt,
    nextChangeAt: lastChangeAt + resolveWeatherProfile({ activePlanet: null }).switchIntervalMs,
    previousWeather,
    changedAt: normalizeChangedAt(candidate.changedAt, now),
    rainyAftermathUntil: normalizeFutureTimestamp(candidate.rainyAftermathUntil, now),
  };
}

export function migrateWeatherDebugOverride(raw: unknown): WeatherDebugOverride {
  if (raw === null || typeof raw === 'undefined') {
    return null;
  }
  if (raw === 'snowy') {
    return 'cloudy';
  }
  if (raw === 'stormy') {
    return 'rainy';
  }
  return isWeather(raw) ? raw : null;
}

export function rotateWeatherState(
  state: WeatherState,
  now: number = Date.now(),
  randomFn: () => number = Math.random,
): WeatherState {
  if (!Number.isFinite(now)) return state;

  const profile = resolveWeatherProfile({ activePlanet: null });
  const currentState = normalizeWeatherState(state, now, randomFn);
  const elapsed = now - currentState.lastChangeAt;
  const rotations = Math.floor(elapsed / profile.switchIntervalMs);

  if (rotations <= 0) {
    return {
      ...currentState,
      rainyAftermathUntil: cleanupRainyAftermath(currentState.rainyAftermathUntil, now),
    };
  }

  let current = currentState.current;
  let next = currentState.next;
  let previousWeather = currentState.previousWeather;
  let changedAt = currentState.changedAt;
  let rainyAftermathUntil = currentState.rainyAftermathUntil;
  let lastChangeAt = currentState.lastChangeAt;

  for (let i = 0; i < rotations; i += 1) {
    const slotChangeAt = lastChangeAt + profile.switchIntervalMs;
    const oldCurrent = current;
    current = next;
    previousWeather = oldCurrent;
    changedAt = slotChangeAt;

    if (oldCurrent === 'rainy' && current !== 'rainy') {
      rainyAftermathUntil = slotChangeAt + profile.rainyAftermathDurationMs;
    } else if (current === 'rainy') {
      rainyAftermathUntil = null;
    } else {
      rainyAftermathUntil = cleanupRainyAftermath(rainyAftermathUntil, slotChangeAt);
    }

    lastChangeAt = slotChangeAt;
    next = rollWeather(current, randomFn);
  }

  rainyAftermathUntil = cleanupRainyAftermath(rainyAftermathUntil, now);

  return {
    current,
    next,
    lastChangeAt,
    nextChangeAt: lastChangeAt + profile.switchIntervalMs,
    previousWeather,
    changedAt,
    rainyAftermathUntil,
  };
}

export function getMsUntilNextWeatherSwitch(state: WeatherState, now: number = Date.now()): number {
  if (!Number.isFinite(now)) {
    return WEATHER_SWITCH_INTERVAL_MS;
  }

  const lastChangeAt = normalizeLastChangeAt(state.lastChangeAt, now);
  const nextChangeAt = lastChangeAt + resolveWeatherProfile({ activePlanet: null }).switchIntervalMs;
  const remaining = nextChangeAt - now;
  return remaining > 0 ? remaining : WEATHER_SWITCH_INTERVAL_MS;
}

export function getWeatherWetnessState(
  state: WeatherState,
  visualWeather: Weather = state.current,
  now: number = Date.now(),
): WeatherWetnessState {
  const isRaining = state.current === 'rainy';
  const aftermathMsRemaining = Math.max(0, (state.rainyAftermathUntil ?? 0) - now);
  const isAftermathActive = aftermathMsRemaining > 0;

  if (visualWeather === 'night') {
    return {
      isRaining,
      isAftermathActive,
      isWet: false,
      aftermathMsRemaining,
      visualMode: 'night-clean',
    };
  }

  if (isRaining) {
    return {
      isRaining,
      isAftermathActive,
      isWet: true,
      aftermathMsRemaining,
      visualMode: 'rainy',
    };
  }

  if (isAftermathActive) {
    return {
      isRaining,
      isAftermathActive,
      isWet: true,
      aftermathMsRemaining,
      visualMode: 'aftermath',
    };
  }

  return {
    isRaining,
    isAftermathActive,
    isWet: false,
    aftermathMsRemaining: 0,
    visualMode: 'dry',
  };
}

export function getWeatherContinuityPhase(
  state: WeatherState,
  visualWeather: Weather = state.current,
  now: number = Date.now(),
): string {
  const wetness = getWeatherWetnessState(state, visualWeather, now);

  if (wetness.visualMode === 'night-clean') {
    return 'night-clean';
  }
  if (state.current === 'sunny' && state.next === 'cloudy') {
    return 'sunny-to-cloudy';
  }
  if (state.current === 'cloudy' && state.next === 'rainy') {
    return 'cloudy-to-rainy';
  }
  if (wetness.visualMode === 'rainy') {
    return 'rainy-wet';
  }
  if (wetness.visualMode === 'aftermath') {
    return state.current === 'rainbow' ? 'rainy-to-rainbow' : 'rainy-aftermath';
  }
  return `${state.current}-to-${state.next}`;
}
