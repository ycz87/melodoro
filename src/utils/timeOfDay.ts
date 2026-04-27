import type { TimeOfDay, TimeOfDayDebugOverride } from '../types/farm';

export const DAY_START_HOUR = 6;
export const NIGHT_START_HOUR = 18;
export const TIME_OF_DAY_TICK_MS = 60 * 1000;
export const DEBUG_TIME_OF_DAY_ORDER: TimeOfDay[] = ['day', 'night'];
export const TIME_OF_DAY_ICON_MAP: Record<TimeOfDay, string> = {
  day: '☀️',
  night: '🌙',
};

function coerceDate(input: Date | number = Date.now()): Date {
  return input instanceof Date ? input : new Date(input);
}

export function getLocalTimeOfDay(input: Date | number = Date.now()): TimeOfDay {
  const date = coerceDate(input);
  const hour = date.getHours();
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? 'day' : 'night';
}

export function getMsUntilNextTimeOfDayBoundary(input: Date | number = Date.now()): number {
  const now = coerceDate(input);
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp)) {
    return TIME_OF_DAY_TICK_MS;
  }

  const boundaryHour = now.getHours() < DAY_START_HOUR || now.getHours() >= NIGHT_START_HOUR
    ? DAY_START_HOUR
    : NIGHT_START_HOUR;
  const nextBoundary = new Date(now);
  nextBoundary.setHours(boundaryHour, 0, 0, 0);

  if (nextBoundary.getTime() <= timestamp) {
    nextBoundary.setDate(nextBoundary.getDate() + 1);
  }

  const remaining = nextBoundary.getTime() - timestamp;
  return Number.isFinite(remaining) && remaining > 0 ? remaining : TIME_OF_DAY_TICK_MS;
}

export function migrateTimeOfDayDebugOverride(raw: unknown): TimeOfDayDebugOverride {
  if (raw === null || typeof raw === 'undefined') {
    return null;
  }
  return raw === 'day' || raw === 'night' ? raw : null;
}

export function migrateLegacyWeatherDebugOverrideToTimeOfDay(raw: unknown): TimeOfDayDebugOverride {
  return raw === 'night' ? 'night' : null;
}
