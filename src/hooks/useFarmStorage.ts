/**
 * useFarmStorage — 农场数据持久化 hook
 */
import { useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type {
  FarmStorage,
  Plot,
  CollectedVariety,
  VarietyId,
  GalaxyId,
  StolenRecord,
  Rarity,
  FarmMilestoneId,
  FarmMilestoneRecord,
  FarmMilestoneRewardId,
  FarmMilestoneRewardRecord,
  FarmMilestoneSource,
} from '../types/farm';
import type { SeedCounts, SeedQuality } from '../types/slicing';
import {
  DEFAULT_FARM_STORAGE,
  DEFAULT_UNLOCKED_PLOT_COUNT,
  DEFAULT_FARM_MILESTONE_STATE,
  createEmptyPlot,
  getCollectedVarietyHarvestCount,
  VARIETY_DEFS,
} from '../types/farm';
import { DEFAULT_SEED_COUNTS } from '../types/slicing';
import { getPlotCount } from '../farm/galaxy';
import {
  isLullabyGrowthBoostActive,
  isSupernovaBottleGrowthBoostActive,
  rollVariety,
  updatePlotGrowth,
  type MutationOutcome,
} from '../farm/growth';

const FARM_KEY = 'watermelon-farm';
const MAX_PLOT_COUNT = 9;
const SHED_KEY = 'watermelon-shed';
const RARITY_UPGRADE_MAP: Record<Rarity, Rarity | null> = {
  common: 'rare',
  rare: 'epic',
  epic: 'legendary',
  legendary: null,
};

function getTodayKeyFromTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeStolenRecord(raw: unknown): StolenRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.varietyId !== 'string') return null;
  if (typeof record.stolenAt !== 'number' || !Number.isFinite(record.stolenAt)) return null;

  const stolenAt = record.stolenAt;
  const resolved = typeof record.resolved === 'boolean'
    ? record.resolved
    : typeof record.recovered === 'boolean'
      ? record.recovered
      : false;
  const recoveredCount = typeof record.recoveredCount === 'number' && Number.isFinite(record.recoveredCount)
    ? Math.max(0, Math.floor(record.recoveredCount))
    : (record.recovered === true ? 1 : 0);
  const id = typeof record.id === 'string' && record.id.length > 0
    ? record.id
    : `${stolenAt}-${record.varietyId}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    plotId: typeof record.plotId === 'number' && Number.isFinite(record.plotId) ? Math.max(0, Math.floor(record.plotId)) : 0,
    varietyId: record.varietyId as VarietyId,
    stolenAt,
    resolved,
    recoveredCount,
    recoveredAt: typeof record.recoveredAt === 'number' && Number.isFinite(record.recoveredAt)
      ? record.recoveredAt
      : undefined,
  };
}

function pickUpgradedVariety(currentVarietyId: VarietyId): VarietyId | null {
  const currentDef = VARIETY_DEFS[currentVarietyId];
  if (!currentDef) return null;
  const nextRarity = RARITY_UPGRADE_MAP[currentDef.rarity];
  if (!nextRarity) return null;

  const candidates = (Object.keys(VARIETY_DEFS) as VarietyId[]).filter((varietyId) => {
    const def = VARIETY_DEFS[varietyId];
    if (!def || def.rarity !== nextRarity) return false;
    if (def.breedType !== currentDef.breedType) return false;
    if (def.galaxy !== currentDef.galaxy) return false;
    if (def.hybridPair !== currentDef.hybridPair) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function ensurePlotCapacity(plots: Plot[], requiredCount: number): Plot[] {
  if (plots.length >= requiredCount) return plots;
  const nextPlots = [...plots];
  while (nextPlots.length < requiredCount) {
    nextPlots.push(createEmptyPlot(nextPlots.length));
  }
  return nextPlots;
}

// Plot availability is monotonic: keep the highest purchased or milestone-expanded count.
function resolveUnlockedPlotCount(
  collection: CollectedVariety[],
  storedUnlockedPlotCount: number,
  currentPlotCount: number,
): number {
  return Math.max(
    DEFAULT_UNLOCKED_PLOT_COUNT,
    storedUnlockedPlotCount,
    getPlotCount(collection),
    Math.min(currentPlotCount, MAX_PLOT_COUNT),
  );
}

function cloneDefaultPlots(): Plot[] {
  return DEFAULT_FARM_STORAGE.plots.map((plot) => ({ ...plot }));
}

function isLegacyDefaultShowcaseLayout(plots: Plot[]): boolean {
  if (plots.length !== MAX_PLOT_COUNT) return false;

  return plots.every((plot, index) => {
    if (plot.id !== index) return false;

    if (index === 2 || index === 3 || index === 8) {
      return plot.state === 'mature' && plot.varietyId === 'jade-stripe' && plot.progress >= 1;
    }

    if (index === 1 || index === 4 || index === 7) {
      return plot.state === 'growing' && plot.varietyId === 'jade-stripe';
    }

    return plot.state === 'empty';
  });
}

function shouldResetLegacyPlotBaseline(collection: CollectedVariety[], plots: Plot[]): boolean {
  if (collection.length > 0) return false;
  if (plots.length !== MAX_PLOT_COUNT) return false;

  const legacyExtraPlotsAreEmpty = plots
    .slice(DEFAULT_UNLOCKED_PLOT_COUNT)
    .every((plot) => plot.state === 'empty');

  return legacyExtraPlotsAreEmpty || isLegacyDefaultShowcaseLayout(plots);
}

function isPagesPreviewHost(): boolean {
  try {
    return window.location.hostname.endsWith('.watermelon-clock.pages.dev');
  } catch {
    return false;
  }
}

function shouldSeedPreviewShowcase(
  collection: CollectedVariety[],
  plots: Plot[],
  storedUnlockedPlotCount: number | null,
): boolean {
  if (!isPagesPreviewHost()) return false;
  if (collection.length > 0) return false;

  const hasPersistedUnlockState = storedUnlockedPlotCount !== null;
  const hasPurchasedOrExpandedPlots = (storedUnlockedPlotCount ?? DEFAULT_UNLOCKED_PLOT_COUNT) > DEFAULT_UNLOCKED_PLOT_COUNT
    || plots.length > DEFAULT_UNLOCKED_PLOT_COUNT;

  // Only coerce very old preview saves with no explicit unlock metadata.
  // Never overwrite current-schema saves or any farm that already expanded beyond the 4-plot baseline.
  if (hasPersistedUnlockState || hasPurchasedOrExpandedPlots) return false;

  const matureCount = plots.filter((plot) => plot.state === 'mature').length;
  const growingCount = plots.filter((plot) => plot.state === 'growing').length;

  // Keep preview acceptance screenshots stable: avoid a +Plant-dominant first screen.
  return matureCount < 3 || growingCount < 2;
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

const FARM_MILESTONE_IDS = new Set<FarmMilestoneId>([
  'collect-3-varieties',
  'collect-5-varieties',
  'unlock-fire-galaxy',
  'collect-8-varieties',
  'unlock-water-galaxy',
  'complete-2-core-galaxies',
  'complete-3-core-galaxies',
  'collect-15-varieties',
  'reach-five-element-resonance',
  'collect-22-varieties',
  'complete-prismatic-collection',
  'complete-main-collection',
]);

const FARM_MILESTONE_REWARD_IDS = new Set<FarmMilestoneRewardId>([
  'plot-5',
  'plot-6',
  'fire-galaxy',
  'water-galaxy',
  'plot-7',
  'wood-galaxy',
  'focus-theme',
  'metal-galaxy',
  'plot-8',
  'cosmic-ambience',
  'rainbow-galaxy',
  'five-element-fusion',
  'plot-9',
  'dark-matter-galaxy',
  'cosmic-heart',
  'ultimate-theme',
]);

function normalizeMilestoneSource(value: unknown): FarmMilestoneSource {
  return value === 'live' ? 'live' : 'backfill';
}

function normalizeFarmMilestoneRecord(raw: unknown): FarmMilestoneRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.milestoneId !== 'string' || !FARM_MILESTONE_IDS.has(record.milestoneId as FarmMilestoneId)) return null;
  if (typeof record.achievedAt !== 'string' || record.achievedAt.length === 0) return null;

  return {
    milestoneId: record.milestoneId as FarmMilestoneId,
    achievedAt: record.achievedAt,
    source: normalizeMilestoneSource(record.source),
  };
}

function normalizeFarmMilestoneRewardRecord(raw: unknown): FarmMilestoneRewardRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.rewardId !== 'string' || !FARM_MILESTONE_REWARD_IDS.has(record.rewardId as FarmMilestoneRewardId)) return null;
  if (typeof record.milestoneId !== 'string' || !FARM_MILESTONE_IDS.has(record.milestoneId as FarmMilestoneId)) return null;
  if (typeof record.grantedAt !== 'string' || record.grantedAt.length === 0) return null;

  return {
    rewardId: record.rewardId as FarmMilestoneRewardId,
    milestoneId: record.milestoneId as FarmMilestoneId,
    grantedAt: record.grantedAt,
    source: normalizeMilestoneSource(record.source),
  };
}

function normalizeFarmMilestoneState(raw: unknown) {
  if (!raw || typeof raw !== 'object') return DEFAULT_FARM_MILESTONE_STATE;
  const state = raw as Record<string, unknown>;
  const milestones = Array.isArray(state.milestones)
    ? state.milestones
      .map((record) => normalizeFarmMilestoneRecord(record))
      .filter((record): record is FarmMilestoneRecord => record !== null)
    : [];
  const rewards = Array.isArray(state.rewards)
    ? state.rewards
      .map((record) => normalizeFarmMilestoneRewardRecord(record))
      .filter((record): record is FarmMilestoneRewardRecord => record !== null)
    : [];

  const uniqueMilestones = milestones.filter((record, index, list) => (
    list.findIndex((item) => item.milestoneId === record.milestoneId) === index
  ));
  const uniqueRewards = rewards.filter((record, index, list) => (
    list.findIndex((item) => item.rewardId === record.rewardId) === index
  ));

  return {
    milestones: uniqueMilestones,
    rewards: uniqueRewards,
  };
}

function normalizeSeedCounts(rawSeeds: unknown): SeedCounts {
  if (typeof rawSeeds === 'number') {
    return {
      ...DEFAULT_SEED_COUNTS,
      normal: toNonNegativeInt(rawSeeds),
    };
  }

  if (!rawSeeds || typeof rawSeeds !== 'object') {
    return { ...DEFAULT_SEED_COUNTS };
  }

  const seedRecord = rawSeeds as Record<string, unknown>;
  return {
    normal: toNonNegativeInt(seedRecord.normal),
    epic: toNonNegativeInt(seedRecord.epic),
    legendary: toNonNegativeInt(seedRecord.legendary),
  };
}

function normalizeSeedQuality(rawQuality: unknown): SeedQuality {
  if (rawQuality === 'epic' || rawQuality === 'legendary' || rawQuality === 'normal') return rawQuality;
  return 'normal';
}

function createCollectedVariety(record: Omit<CollectedVariety, 'harvestCount'> & { harvestCount?: number }): CollectedVariety {
  return {
    ...record,
    count: toNonNegativeInt(record.count),
    harvestCount: Math.max(
      toNonNegativeInt(record.harvestCount),
      toNonNegativeInt(record.count),
      1,
    ),
  };
}

function incrementCollectedVariety(record: CollectedVariety): CollectedVariety {
  return {
    ...record,
    count: toNonNegativeInt(record.count) + 1,
    harvestCount: getCollectedVarietyHarvestCount(record) + 1,
  };
}

function mergeCollectionWithHarvestedPlot(
  collection: CollectedVariety[],
  harvestedPlot: Plot,
  obtainedDate: string,
): CollectedVariety[] {
  if (harvestedPlot.state !== 'mature' || !harvestedPlot.varietyId) return collection;
  const harvestedIsMutant = harvestedPlot.isMutant === true;
  const isSameCollectionEntry = (record: CollectedVariety): boolean => (
    record.varietyId === harvestedPlot.varietyId
    && (record.isMutant === true) === harvestedIsMutant
  );
  const existing = collection.find(isSameCollectionEntry);

  if (existing) {
    return collection.map((record) => (
      isSameCollectionEntry(record)
        ? incrementCollectedVariety(record)
        : record
    ));
  }

  return [
    ...collection,
    createCollectedVariety({
      varietyId: harvestedPlot.varietyId,
      isMutant: harvestedIsMutant ? true : undefined,
      firstObtainedDate: obtainedDate,
      count: 1,
      harvestCount: 1,
    }),
  ];
}

function syncRefundedSeedsToShed(refundedSeeds: SeedCounts): void {
  const hasRefundedSeeds = refundedSeeds.normal > 0 || refundedSeeds.epic > 0 || refundedSeeds.legendary > 0;
  if (!hasRefundedSeeds) return;

  try {
    const stored = localStorage.getItem(SHED_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    const shedObject = parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
    const currentSeeds = normalizeSeedCounts(shedObject.seeds);
    const nextSeeds: SeedCounts = {
      normal: currentSeeds.normal + refundedSeeds.normal,
      epic: currentSeeds.epic + refundedSeeds.epic,
      legendary: currentSeeds.legendary + refundedSeeds.legendary,
    };

    localStorage.setItem(SHED_KEY, JSON.stringify({
      ...shedObject,
      seeds: nextSeeds,
    }));
  } catch {
    // Storage unavailable — ignore migration refund.
  }
}

function migrateFarm(raw: unknown): FarmStorage {
  if (!raw || typeof raw !== 'object') return DEFAULT_FARM_STORAGE;
  const s = raw as Record<string, unknown>;
  const result: FarmStorage = {
    plots: [...DEFAULT_FARM_STORAGE.plots],
    unlockedPlotCount: DEFAULT_UNLOCKED_PLOT_COUNT,
    collection: [],
    milestoneRewards: DEFAULT_FARM_MILESTONE_STATE,
    lastActiveDate: '',
    consecutiveInactiveDays: 0,
    lastActivityTimestamp: 0,
    guardianBarrierDate: '',
    lullabyActivatedAt: 0,
    supernovaBottleActivatedAt: 0,
    stolenRecords: [],
  };
  const storedUnlockedPlotCount = typeof s.unlockedPlotCount === 'number' && Number.isFinite(s.unlockedPlotCount)
    ? Math.max(DEFAULT_UNLOCKED_PLOT_COUNT, Math.min(MAX_PLOT_COUNT, Math.floor(s.unlockedPlotCount)))
    : null;

  if (Array.isArray(s.collection)) {
    result.collection = (s.collection as CollectedVariety[]).map((record) => createCollectedVariety({
      ...record,
      isMutant: record.isMutant === true ? true : undefined,
    }));
  }

  result.milestoneRewards = normalizeFarmMilestoneState(s.milestoneRewards);

  if (Array.isArray(s.plots)) {
    result.plots = (s.plots as Plot[]).map((p, i) => {
      const candidate = p as unknown as Record<string, unknown>;
      const rawThief = candidate.thief;
      const thiefRecord = rawThief && typeof rawThief === 'object'
        ? (rawThief as Record<string, unknown>)
        : null;
      const appearedAt = thiefRecord && typeof thiefRecord.appearedAt === 'number' && Number.isFinite(thiefRecord.appearedAt)
        ? thiefRecord.appearedAt
        : 0;
      const stealsAt = thiefRecord && typeof thiefRecord.stealsAt === 'number' && Number.isFinite(thiefRecord.stealsAt)
        ? thiefRecord.stealsAt
        : thiefRecord && typeof thiefRecord.stealAt === 'number' && Number.isFinite(thiefRecord.stealAt)
          ? thiefRecord.stealAt
          : 0;

      return {
        ...createEmptyPlot(i),
        ...p,
        id: i,
        hasTracker: p.hasTracker === true,
        thief: appearedAt > 0 && stealsAt > 0
          ? { appearedAt, stealsAt }
          : undefined,
      };
    });
  }

  if (result.plots.length > MAX_PLOT_COUNT) {
    const migratedDate = getTodayKeyFromTimestamp(Date.now());
    const removedPlots = result.plots.slice(MAX_PLOT_COUNT);
    const refundedSeeds: SeedCounts = { ...DEFAULT_SEED_COUNTS };
    let nextCollection = result.collection;

    for (const plot of removedPlots) {
      if (!plot || plot.state === 'empty') continue;

      if (plot.state === 'mature' && plot.varietyId) {
        nextCollection = mergeCollectionWithHarvestedPlot(nextCollection, plot, migratedDate);
      }

      if (plot.state === 'growing') {
        const seedQuality = normalizeSeedQuality(plot.seedQuality);
        refundedSeeds[seedQuality] += 1;
      }
    }

    result.collection = nextCollection;
    syncRefundedSeedsToShed(refundedSeeds);
    result.plots = result.plots.slice(0, MAX_PLOT_COUNT);
  }

  if (storedUnlockedPlotCount === null && shouldResetLegacyPlotBaseline(result.collection, result.plots)) {
    result.plots = cloneDefaultPlots();
  }

  const usePreviewShowcase = shouldSeedPreviewShowcase(
    result.collection,
    result.plots,
    storedUnlockedPlotCount,
  );
  result.unlockedPlotCount = resolveUnlockedPlotCount(
    result.collection,
    storedUnlockedPlotCount ?? 0,
    result.plots.length,
  );
  result.plots = ensurePlotCapacity(result.plots, result.unlockedPlotCount);

  if (usePreviewShowcase) {
    result.plots = DEFAULT_FARM_STORAGE.plots.map((plot) => ({ ...plot }));
    result.unlockedPlotCount = DEFAULT_UNLOCKED_PLOT_COUNT;
  }

  if (typeof s.lastActiveDate === 'string') result.lastActiveDate = s.lastActiveDate;
  if (typeof s.consecutiveInactiveDays === 'number') result.consecutiveInactiveDays = s.consecutiveInactiveDays;
  if (typeof s.lastActivityTimestamp === 'number') result.lastActivityTimestamp = s.lastActivityTimestamp;
  if (typeof s.guardianBarrierDate === 'string') result.guardianBarrierDate = s.guardianBarrierDate;
  if (typeof s.lullabyActivatedAt === 'number' && Number.isFinite(s.lullabyActivatedAt)) {
    result.lullabyActivatedAt = Math.max(0, s.lullabyActivatedAt);
  }
  if (typeof s.supernovaBottleActivatedAt === 'number' && Number.isFinite(s.supernovaBottleActivatedAt)) {
    result.supernovaBottleActivatedAt = Math.max(0, s.supernovaBottleActivatedAt);
  }
  if (Array.isArray(s.stolenRecords)) {
    result.stolenRecords = s.stolenRecords
      .map((record) => normalizeStolenRecord(record))
      .filter((record): record is StolenRecord => record !== null);
  }

  return result;
}

export function useFarmStorage() {
  const [farm, setFarm] = useLocalStorage<FarmStorage>(FARM_KEY, DEFAULT_FARM_STORAGE, migrateFarm);
  const farmRef = useRef(farm);

  useEffect(() => {
    farmRef.current = farm;
  }, [farm]);

  useEffect(() => {
    const targetUnlockedPlotCount = resolveUnlockedPlotCount(
      farm.collection,
      farm.unlockedPlotCount,
      farm.plots.length,
    );
    if (farm.unlockedPlotCount === targetUnlockedPlotCount && farm.plots.length === targetUnlockedPlotCount) return;

    setFarm((prev) => {
      const nextUnlockedPlotCount = resolveUnlockedPlotCount(
        prev.collection,
        prev.unlockedPlotCount,
        prev.plots.length,
      );
      const nextPlots = ensurePlotCapacity(prev.plots, nextUnlockedPlotCount);
      if (prev.unlockedPlotCount === nextUnlockedPlotCount && prev.plots.length === nextPlots.length) return prev;
      return {
        ...prev,
        plots: nextPlots,
        unlockedPlotCount: nextUnlockedPlotCount,
      };
    });
  }, [farm.collection, farm.plots.length, farm.unlockedPlotCount, setFarm]);

  /** 种植种子到指定地块 */
  const plantSeed = useCallback((plotId: number, unlockedGalaxies: GalaxyId[], seedQuality: SeedQuality, todayKey: string) => {
    const nowTimestamp = Date.now();
    const varietyId = rollVariety(unlockedGalaxies, seedQuality);
    let success = true;

    setFarm(prev => {
      const targetPlot = prev.plots.find(p => p.id === plotId);
      if (!targetPlot || targetPlot.state !== 'empty') {
        success = false;
        return prev;
      }

      return {
        ...prev,
        plots: prev.plots.map(p =>
          p.id === plotId ? {
            ...p,
            state: 'growing' as const,
            seedQuality,
            varietyId,
            progress: 0,
            mutationStatus: 'none',
            mutationChance: 0.02,
            isMutant: false,
            accumulatedMinutes: 0,
            plantedDate: todayKey,
            lastUpdateDate: todayKey,
            lastActivityTimestamp: nowTimestamp,
            hasTracker: false,
            thief: undefined,
          } : p
        ),
      };
    });

    return success ? varietyId : ('' as VarietyId);
  }, [setFarm]);

  /** 种植已确定品种的种子（注入种子用） */
  const plantSeedWithVariety = useCallback((plotId: number, varietyId: VarietyId, seedQuality: SeedQuality, todayKey: string) => {
    const nowTimestamp = Date.now();
    let success = true;

    setFarm(prev => {
      const targetPlot = prev.plots.find(p => p.id === plotId);
      if (!targetPlot || targetPlot.state !== 'empty') {
        success = false;
        return prev;
      }

      return {
        ...prev,
        plots: prev.plots.map(p =>
          p.id === plotId ? {
            ...p,
            state: 'growing' as const,
            seedQuality,
            varietyId,
            progress: 0,
            mutationStatus: 'none',
            mutationChance: 0.02,
            isMutant: false,
            accumulatedMinutes: 0,
            plantedDate: todayKey,
            lastUpdateDate: todayKey,
            lastActivityTimestamp: nowTimestamp,
            hasTracker: false,
            thief: undefined,
          } : p
        ),
      };
    });

    return success;
  }, [setFarm]);

  /** 收获地块 */
  const harvestPlot = useCallback((plotId: number, todayKey: string) => {
    let harvestedVariety: VarietyId | undefined;
    let harvestedIsMutant = false;
    let isNew = false;
    let collectedCount = 0;
    let rewardSeedQuality: SeedQuality | undefined;

    setFarm(prev => {
      const plot = prev.plots.find(p => p.id === plotId);
      if (!plot || plot.state !== 'mature' || !plot.varietyId) return prev;

      harvestedVariety = plot.varietyId;
      harvestedIsMutant = plot.isMutant === true;
      const isSameCollectionEntry = (record: CollectedVariety): boolean => (
        record.varietyId === plot.varietyId
        && (record.isMutant === true) === harvestedIsMutant
      );
      const existing = prev.collection.find(isSameCollectionEntry);
      isNew = !existing;
      collectedCount = existing ? existing.count + 1 : 1;
      rewardSeedQuality = isNew ? (plot.seedQuality ?? 'normal') : undefined;

      const newCollection = existing
        ? prev.collection.map(c =>
            isSameCollectionEntry(c) ? incrementCollectedVariety(c) : c
          )
        : [
            ...prev.collection,
            createCollectedVariety({
              varietyId: plot.varietyId,
              isMutant: harvestedIsMutant ? true : undefined,
              firstObtainedDate: todayKey,
              count: 1,
              harvestCount: 1,
            }),
          ];
      const nextPlots = prev.plots.map(p => (p.id === plotId ? createEmptyPlot(plotId) : p));

      return {
        ...prev,
        plots: nextPlots,
        collection: newCollection,
      };
    });

    return {
      varietyId: harvestedVariety,
      isMutant: harvestedIsMutant,
      isNew,
      collectedCount,
      rewardSeedQuality,
    };
  }, [setFarm]);

  /** 卖出品种（仅减少当前持有 count，累计收获保留） */
  const sellVariety = useCallback((varietyId: VarietyId, isMutant: boolean = false): boolean => {
    let success = false;

    setFarm(prev => {
      const isSameCollectionEntry = (record: CollectedVariety): boolean => (
        record.varietyId === varietyId
        && (record.isMutant === true) === isMutant
      );
      const record = prev.collection.find(isSameCollectionEntry);
      if (!record || record.count <= 0) return prev;
      success = true;

      return {
        ...prev,
        collection: prev.collection.map(item => (
          isSameCollectionEntry(item)
            ? { ...item, count: Math.max(0, item.count - 1) }
            : item
        )),
      };
    });

    return success;
  }, [setFarm]);

  /** 清除枯萎地块 */
  const clearPlot = useCallback((plotId: number) => {
    setFarm(prev => ({
      ...prev,
      plots: prev.plots.map(p => p.id === plotId ? createEmptyPlot(plotId) : p),
    }));
  }, [setFarm]);

  /** 批量更新地块（生长引擎调用后写回） */
  const updatePlots = useCallback((newPlots: Plot[]) => {
    setFarm(prev => ({ ...prev, plots: newPlots }));
  }, [setFarm]);

  /** 增加单个地块的变异概率（返回是否成功） */
  const updatePlotMutationChance = useCallback((plotId: number, increaseBy: number): boolean => {
    let success = false;
    const normalizedIncrease = Math.max(0, increaseBy);

    setFarm(prev => {
      const targetPlot = prev.plots.find(p => p.id === plotId);
      if (!targetPlot) return prev;
      if (targetPlot.state !== 'growing') return prev;
      if (targetPlot.progress >= 0.20) return prev;
      if ((targetPlot.mutationStatus ?? 'none') !== 'none') return prev;

      const currentChance = targetPlot.mutationChance ?? 0.02;
      const nextChance = Math.max(0, Math.min(1, currentChance + normalizedIncrease));
      if (nextChance <= currentChance) return prev;

      success = true;
      return {
        ...prev,
        plots: prev.plots.map(p => (
          p.id === plotId
            ? { ...p, mutationChance: nextChance }
            : p
        )),
      };
    });

    return success;
  }, [setFarm]);

  /** 购买地块并扩容（返回是否成功） */
  const buyPlot = useCallback((plotIndex: number): boolean => {
    if (plotIndex < DEFAULT_UNLOCKED_PLOT_COUNT || plotIndex >= MAX_PLOT_COUNT) return false;
    const currentFarm = farmRef.current;
    if (plotIndex !== currentFarm.unlockedPlotCount) return false;

    const nextUnlockedPlotCount = plotIndex + 1;
    const nextFarm: FarmStorage = {
      ...currentFarm,
      plots: ensurePlotCapacity(currentFarm.plots, nextUnlockedPlotCount),
      unlockedPlotCount: nextUnlockedPlotCount,
    };

    farmRef.current = nextFarm;
    setFarm(nextFarm);
    return true;
  }, [setFarm]);

  /** 更新活跃日信息 */
  const updateActiveDate = useCallback((todayKey: string, consecutiveInactiveDays: number, activityTimestamp: number = Date.now()) => {
    setFarm(prev => ({
      ...prev,
      lastActiveDate: todayKey,
      consecutiveInactiveDays,
      lastActivityTimestamp: activityTimestamp,
      plots: prev.plots.map(p => (
        p.state === 'growing' || p.state === 'mature'
          ? { ...p, lastActivityTimestamp: activityTimestamp, lastUpdateDate: todayKey }
          : p
      )),
    }));
  }, [setFarm]);

  /** 激活防护结界（当天有效） */
  const activateGuardianBarrier = useCallback((todayKey: string): boolean => {
    if (!todayKey) return false;
    setFarm((prev) => ({
      ...prev,
      guardianBarrierDate: todayKey,
      plots: prev.plots.map((plot) => (plot.thief ? { ...plot, thief: undefined } : plot)),
    }));
    return true;
  }, [setFarm]);

  /** 激活原初摇篮曲（当天有效） */
  const activateLullaby = useCallback((nowTimestamp: number = Date.now()): boolean => {
    if (!Number.isFinite(nowTimestamp) || nowTimestamp <= 0) return false;
    if (isLullabyGrowthBoostActive(farmRef.current.lullabyActivatedAt, nowTimestamp)) return false;

    const nextFarm: FarmStorage = {
      ...farmRef.current,
      lullabyActivatedAt: nowTimestamp,
    };
    farmRef.current = nextFarm;
    setFarm(nextFarm);
    return true;
  }, [setFarm]);

  /** 激活超新星之瓶（24 小时有效） */
  const activateSupernovaBottle = useCallback((nowTimestamp: number = Date.now()): boolean => {
    if (!Number.isFinite(nowTimestamp) || nowTimestamp <= 0) return false;
    if (isSupernovaBottleGrowthBoostActive(farmRef.current.supernovaBottleActivatedAt, nowTimestamp)) return false;

    const nextFarm: FarmStorage = {
      ...farmRef.current,
      supernovaBottleActivatedAt: nowTimestamp,
    };
    farmRef.current = nextFarm;
    setFarm(nextFarm);
    return true;
  }, [setFarm]);

  /** 为地块安装星际追踪器 */
  const addPlotTracker = useCallback((plotId: number): boolean => {
    const plot = farm.plots.find((p) => p.id === plotId);
    if (!plot) return false;
    if (!(plot.state === 'growing' || plot.state === 'mature')) return false;
    if (plot.hasTracker) return false;

    setFarm((prev) => ({
      ...prev,
      plots: prev.plots.map((p) => (p.id === plotId ? { ...p, hasTracker: true } : p)),
    }));
    return true;
  }, [farm.plots, setFarm]);

  /** 记录被偷记录（用于追回） */
  const addStolenRecord = useCallback((record: StolenRecord) => {
    setFarm(prev => ({
      ...prev,
      stolenRecords: [...prev.stolenRecords, record],
    }));
  }, [setFarm]);

  /** 标记被偷记录为已追回（按 stolenAt 定位） */
  const markStolenRecordRecovered = useCallback((stolenAt: number): boolean => {
    if (!Number.isFinite(stolenAt) || stolenAt <= 0) return false;
    let updated = false;
    const recoveredAt = Date.now();

    setFarm((prev) => {
      const hasTarget = prev.stolenRecords.some(
        (record) => record.stolenAt === stolenAt && !record.resolved,
      );
      if (!hasTarget) return prev;

      updated = true;
      return {
        ...prev,
        stolenRecords: prev.stolenRecords.map((record) => (
          record.stolenAt === stolenAt && !record.resolved
            ? {
                ...record,
                resolved: true,
                recoveredCount: Math.max(1, record.recoveredCount),
                recoveredAt,
              }
            : record
        )),
      };
    });

    return updated;
  }, [setFarm]);

  /** 复活枯萎西瓜（琼浆玉露） */
  const revivePlot = useCallback((plotId: number): boolean => {
    const plot = farm.plots.find((p) => p.id === plotId);
    if (!plot || plot.state !== 'withered') return false;

    const nowTimestamp = Date.now();
    const todayKey = getTodayKeyFromTimestamp(nowTimestamp);

    setFarm((prev) => ({
      ...prev,
      plots: prev.plots.map((p) => (
        p.id === plotId && p.state === 'withered'
          ? {
              ...p,
              state: 'growing',
              lastActivityTimestamp: nowTimestamp,
              lastUpdateDate: todayKey,
            }
          : p
      )),
    }));
    return true;
  }, [farm.plots, setFarm]);

  /** 升级品种稀有度（月神甘露） */
  const upgradePlotRarity = useCallback((plotId: number): boolean => {
    const plot = farm.plots.find((p) => p.id === plotId);
    if (!plot || plot.state !== 'mature' || !plot.varietyId) return false;

    const upgradedVarietyId = pickUpgradedVariety(plot.varietyId);
    if (!upgradedVarietyId) return false;

    setFarm((prev) => ({
      ...prev,
      plots: prev.plots.map((p) => (
        p.id === plotId && p.state === 'mature'
          ? { ...p, varietyId: upgradedVarietyId }
          : p
      )),
    }));
    return true;
  }, [farm.plots, setFarm]);

  /** 星露精华：立刻将当前剩余成熟时间减半 */
  const halvePlotRemainingMatureTime = useCallback((plotId: number): { success: boolean; mutationOutcome?: MutationOutcome } => {
    const plot = farm.plots.find((p) => p.id === plotId);
    if (!plot || plot.state !== 'growing' || !plot.varietyId) return { success: false };

    const matureMinutes = VARIETY_DEFS[plot.varietyId]?.matureMinutes ?? 10000;
    const accumulatedMinutes = Math.max(
      0,
      Math.floor(plot.accumulatedMinutes > 0 ? plot.accumulatedMinutes : plot.progress * matureMinutes),
    );
    const remainingMinutes = Math.max(0, matureMinutes - accumulatedMinutes);
    const boostMinutes = Math.min(remainingMinutes, Math.ceil(remainingMinutes / 2));
    if (boostMinutes <= 0) return { success: false };

    const nowTimestamp = Date.now();
    const growthResult = updatePlotGrowth(plot, boostMinutes, nowTimestamp);
    const mutationOutcome = growthResult.mutationOutcome?.status === 'positive' && growthResult.plot.isMutant === true
      ? growthResult.mutationOutcome
      : undefined;

    setFarm((prev) => ({
      ...prev,
      plots: prev.plots.map((p) => (
        p.id === plotId && p.state === 'growing' && p.varietyId
          ? growthResult.plot
          : p
      )),
    }));

    return mutationOutcome ? { success: true, mutationOutcome } : { success: true };
  }, [farm.plots, setFarm]);

  return {
    farm,
    setFarm,
    plantSeed,
    plantSeedWithVariety,
    harvestPlot,
    sellVariety,
    clearPlot,
    updatePlots,
    updatePlotMutationChance,
    buyPlot,
    updateActiveDate,
    activateGuardianBarrier,
    activateLullaby,
    activateSupernovaBottle,
    addPlotTracker,
    addStolenRecord,
    markStolenRecordRecovered,
    revivePlot,
    upgradePlotRarity,
    halvePlotRemainingMatureTime,
  };
}
