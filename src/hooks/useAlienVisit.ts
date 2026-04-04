import { useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type {
  AlienAppearance,
  AlienDialogueKey,
  AlienType,
  AlienVisit,
} from '../types/farm';
import { DEFAULT_ALIEN_VISIT } from '../types/farm';

const ALIEN_VISIT_STORAGE_KEY = 'alienVisit';
const ALIEN_DISPLAY_DURATION_MS = 3_000;
const DRIFT_BOTTLE_SUMMON_CANDIDATES: readonly {
  type: AlienType;
  messageKey: AlienDialogueKey;
}[] = [
  { type: 'melon-alien', messageKey: 'alienMelonGreeting' },
  { type: 'mutation-doctor', messageKey: 'alienMutationDoctor' },
];

interface UseAlienVisitOptions {
  plantedMelonCount: number;
  todayKey: string;
  mutationDoctorSignal: number;
}

function isAlienType(value: unknown): value is AlienType {
  return value === 'melon-alien' || value === 'mutation-doctor';
}

function isAlienDialogueKey(value: unknown): value is AlienDialogueKey {
  return value === 'alienMelonGreeting' || value === 'alienMutationDoctor';
}

function normalizeAppearance(raw: unknown): AlienAppearance | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null;
  if (!isAlienType(candidate.type) || !isAlienDialogueKey(candidate.messageKey)) return null;
  if (typeof candidate.appearedAt !== 'number' || !Number.isFinite(candidate.appearedAt)) return null;
  if (typeof candidate.expiresAt !== 'number' || !Number.isFinite(candidate.expiresAt)) return null;

  return {
    id: candidate.id,
    type: candidate.type,
    messageKey: candidate.messageKey,
    appearedAt: candidate.appearedAt,
    expiresAt: candidate.expiresAt,
  };
}

function migrateAlienVisit(raw: unknown): AlienVisit {
  if (!raw || typeof raw !== 'object') return DEFAULT_ALIEN_VISIT;

  const candidate = raw as Record<string, unknown>;
  const current = normalizeAppearance(candidate.current);
  const lastMelonAlienCheckDate = typeof candidate.lastMelonAlienCheckDate === 'string'
    ? candidate.lastMelonAlienCheckDate
    : '';

  return {
    lastMelonAlienCheckDate,
    current,
  };
}

function clearExpiredAppearance(visit: AlienVisit, now: number): AlienVisit {
  if (!visit.current) return visit;
  if (visit.current.expiresAt > now) return visit;
  return {
    ...visit,
    current: null,
  };
}

function createAppearance(
  type: AlienType,
  messageKey: AlienDialogueKey,
  now: number,
  idSuffix: string,
): AlienAppearance {
  return {
    id: `${type}-${now}-${idSuffix}`,
    type,
    messageKey,
    appearedAt: now,
    expiresAt: now + ALIEN_DISPLAY_DURATION_MS,
  };
}

export function useAlienVisit({ plantedMelonCount, todayKey, mutationDoctorSignal }: UseAlienVisitOptions) {
  const [alienVisit, setAlienVisit] = useLocalStorage<AlienVisit>(
    ALIEN_VISIT_STORAGE_KEY,
    DEFAULT_ALIEN_VISIT,
    migrateAlienVisit,
  );
  const previousSignalRef = useRef(mutationDoctorSignal);
  const currentAlienExpiresAt = alienVisit.current?.expiresAt;
  const activeAlienExpiresAtRef = useRef(currentAlienExpiresAt ?? 0);

  useEffect(() => {
    activeAlienExpiresAtRef.current = currentAlienExpiresAt ?? 0;
  }, [currentAlienExpiresAt]);

  // App open / day check: melon alien appears with 10% chance when 3+ melons exist.
  useEffect(() => {
    if (!todayKey) return;

    const now = Date.now();
    const melonAlienChanceRoll = Math.random();
    const melonAlienIdSuffix = Math.random().toString(36).slice(2, 8);
    setAlienVisit((prev) => {
      const cleaned = clearExpiredAppearance(prev, now);

      if (plantedMelonCount < 3) {
        return cleaned;
      }
      if (cleaned.lastMelonAlienCheckDate === todayKey) {
        return cleaned;
      }

      const checkedToday: AlienVisit = {
        ...cleaned,
        lastMelonAlienCheckDate: todayKey,
      };

      if (melonAlienChanceRoll >= 0.10) {
        return checkedToday;
      }

      return {
        ...checkedToday,
        current: createAppearance('melon-alien', 'alienMelonGreeting', now, melonAlienIdSuffix),
      };
    });
  }, [plantedMelonCount, todayKey, setAlienVisit]);

  // Mutation doctor: 15% chance when gene modifier is consumed.
  useEffect(() => {
    if (mutationDoctorSignal <= previousSignalRef.current) {
      previousSignalRef.current = mutationDoctorSignal;
      return;
    }

    previousSignalRef.current = mutationDoctorSignal;
    const mutationDoctorChanceRoll = Math.random();
    if (mutationDoctorChanceRoll >= 0.15) return;

    const now = Date.now();
    const mutationDoctorIdSuffix = Math.random().toString(36).slice(2, 8);
    setAlienVisit((prev) => ({
      ...clearExpiredAppearance(prev, now),
      current: createAppearance('mutation-doctor', 'alienMutationDoctor', now, mutationDoctorIdSuffix),
    }));
  }, [mutationDoctorSignal, setAlienVisit]);

  // Auto-hide active alien bubble after 3 seconds.
  useEffect(() => {
    if (!currentAlienExpiresAt) return;
    const remainingMs = currentAlienExpiresAt - Date.now();
    if (remainingMs <= 0) {
      setAlienVisit((prev) => clearExpiredAppearance(prev, Date.now()));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAlienVisit((prev) => clearExpiredAppearance(prev, Date.now()));
    }, remainingMs + 10);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentAlienExpiresAt, setAlienVisit]);

  const summonDriftBottleVisit = useCallback(() => {
    const now = Date.now();
    if (activeAlienExpiresAtRef.current > now) {
      return false;
    }

    const cleanedVisit = clearExpiredAppearance(alienVisit, now);

    if (cleanedVisit.current && cleanedVisit.current.expiresAt > now) {
      activeAlienExpiresAtRef.current = cleanedVisit.current.expiresAt;
      return false;
    }

    const candidate = DRIFT_BOTTLE_SUMMON_CANDIDATES[
      Math.floor(Math.random() * DRIFT_BOTTLE_SUMMON_CANDIDATES.length)
    ];
    const idSuffix = Math.random().toString(36).slice(2, 8);
    const appearance = createAppearance(candidate.type, candidate.messageKey, now, idSuffix);
    activeAlienExpiresAtRef.current = appearance.expiresAt;

    setAlienVisit({
      ...cleanedVisit,
      current: appearance,
    });
    return true;
  }, [alienVisit, setAlienVisit]);

  return {
    alienVisit,
    setAlienVisit,
    summonDriftBottleVisit,
  };
}
