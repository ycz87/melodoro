import type { Weather, WeatherDebugOverride, WeatherState } from '../types/farm';

export const WEATHER_SWITCH_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const DEBUG_WEATHER_ORDER: Weather[] = ['sunny', 'cloudy', 'rainy', 'night', 'rainbow'];

const RAINBOW_CHANCE = 0.05;
const DEFAULT_WEATHER: Weather = 'sunny';

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
  return {
    current: rollWeather(DEFAULT_WEATHER, randomFn),
    lastChangeAt: now,
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

  return {
    current,
    lastChangeAt: normalizeLastChangeAt(candidate.lastChangeAt, now),
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

  const current = repairWeather(state.current, DEFAULT_WEATHER);
  const lastChangeAt = normalizeLastChangeAt(state.lastChangeAt, now);
  const elapsed = now - lastChangeAt;
  const rotations = Math.floor(elapsed / WEATHER_SWITCH_INTERVAL_MS);
  if (rotations <= 0) {
    return {
      current,
      lastChangeAt,
    };
  }

  let nextWeather = current;
  for (let i = 0; i < rotations; i += 1) {
    nextWeather = rollWeather(nextWeather, randomFn);
  }

  return {
    current: nextWeather,
    lastChangeAt: lastChangeAt + rotations * WEATHER_SWITCH_INTERVAL_MS,
  };
}

export function getMsUntilNextWeatherSwitch(state: WeatherState, now: number = Date.now()): number {
  if (!Number.isFinite(now)) {
    return WEATHER_SWITCH_INTERVAL_MS;
  }

  const lastChangeAt = normalizeLastChangeAt(state.lastChangeAt, now);
  const elapsed = now - lastChangeAt;
  const remainder = elapsed % WEATHER_SWITCH_INTERVAL_MS;
  if (remainder === 0) {
    return WEATHER_SWITCH_INTERVAL_MS;
  }
  return WEATHER_SWITCH_INTERVAL_MS - remainder;
}
