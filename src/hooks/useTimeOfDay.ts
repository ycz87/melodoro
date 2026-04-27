import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { TimeOfDayDebugOverride } from '../types/farm';
import {
  getLocalTimeOfDay,
  getMsUntilNextTimeOfDayBoundary,
  migrateLegacyWeatherDebugOverrideToTimeOfDay,
  migrateTimeOfDayDebugOverride,
  TIME_OF_DAY_TICK_MS,
} from '../utils/timeOfDay';

const TIME_OF_DAY_DEBUG_OVERRIDE_STORAGE_KEY = 'debugTimeOfDayOverride';
const LEGACY_WEATHER_DEBUG_OVERRIDE_STORAGE_KEY = 'weatherDebugOverride';

function initialDebugTimeOfDayOverride(): TimeOfDayDebugOverride {
  try {
    const stored = localStorage.getItem(TIME_OF_DAY_DEBUG_OVERRIDE_STORAGE_KEY);
    if (stored) {
      return migrateTimeOfDayDebugOverride(JSON.parse(stored));
    }

    const legacyWeatherOverride = localStorage.getItem(LEGACY_WEATHER_DEBUG_OVERRIDE_STORAGE_KEY);
    if (legacyWeatherOverride) {
      return migrateLegacyWeatherDebugOverrideToTimeOfDay(JSON.parse(legacyWeatherOverride));
    }
  } catch {
    return null;
  }

  return null;
}

export function useTimeOfDay() {
  const [localTimeOfDay, setLocalTimeOfDay] = useState(() => getLocalTimeOfDay());
  const [debugTimeOfDayOverride, setDebugTimeOfDayOverride] = useLocalStorage<TimeOfDayDebugOverride>(
    TIME_OF_DAY_DEBUG_OVERRIDE_STORAGE_KEY,
    initialDebugTimeOfDayOverride,
    migrateTimeOfDayDebugOverride,
  );

  useEffect(() => {
    const refresh = () => setLocalTimeOfDay(getLocalTimeOfDay());
    refresh();

    const intervalId = window.setInterval(refresh, TIME_OF_DAY_TICK_MS);
    const boundaryTimeoutId = window.setTimeout(refresh, getMsUntilNextTimeOfDayBoundary(Date.now()) + 50);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(boundaryTimeoutId);
    };
  }, [localTimeOfDay]);

  return {
    localTimeOfDay,
    effectiveTimeOfDay: debugTimeOfDayOverride ?? localTimeOfDay,
    debugTimeOfDayOverride,
    setDebugTimeOfDayOverride,
  };
}
