/**
 * useFarmStorage — 农场数据持久化 hook
 */
import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { FarmStorage, Plot, CollectedVariety, VarietyId, GalaxyId, StolenRecord, Rarity } from '../types/farm';
import type { SeedCounts, SeedQuality } from '../types/slicing';
import { DEFAULT_FARM_STORAGE, createEmptyPlot, VARIETY_DEFS } from '../types/farm';
import { DEFAULT_SEED_COUNTS } from '../types/slicing';
import { rollVariety } from '../farm/growth';
import { getPlotCount } from '../farm/galaxy';

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

function isPagesPreviewHost(): boolean {
  try {
    return window.location.hostname.endsWith('.watermelon-clock.pages.dev');
  } catch {
    return false;
  }
}

function shouldSeedPreviewShowcase(collection: CollectedVariety[], plots: Plot[]): boolean {
  if (!isPagesPreviewHost()) return false;
  if (collection.length > 0) return false;

  const matureCount = plots.filter((plot) => plot.state === 'mature').length;
  const growingCount = plots.filter((plot) => plot.state === 'growing').length;

  // Keep preview acceptance screenshots stable: avoid a +Plant-dominant first screen.
  return matureCount < 3 || growingCount < 2;
}

function toNonNegativeInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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
        ? { ...record, count: record.count + 1 }
        : record
    ));
  }

  return [
    ...collection,
    {
      varietyId: harvestedPlot.varietyId,
      isMutant: harvestedIsMutant ? true : undefined,
      firstObtainedDate: obtainedDate,
      count: 1,
    },
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
    collection: [],
    lastActiveDate: '',
    consecutiveInactiveDays: 0,
    lastActivityTimestamp: 0,
    guardianBarrierDate: '',
    stolenRecords: [],
  };

  if (Array.isArray(s.collection)) {
    result.collection = (s.collection as CollectedVariety[]).map((record) => ({
      ...record,
      isMutant: record.isMutant === true ? true : undefined,
    }));
  }

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

  const usePreviewShowcase = shouldSeedPreviewShowcase(result.collection, result.plots);
  const targetPlotCount = usePreviewShowcase
    ? DEFAULT_FARM_STORAGE.plots.length
    : Math.min(getPlotCount(result.collection), MAX_PLOT_COUNT);
  result.plots = ensurePlotCapacity(result.plots, targetPlotCount);

  if (usePreviewShowcase) {
    result.plots = DEFAULT_FARM_STORAGE.plots.map((plot) => ({ ...plot }));
  }

  if (typeof s.lastActiveDate === 'string') result.lastActiveDate = s.lastActiveDate;
  if (typeof s.consecutiveInactiveDays === 'number') result.consecutiveInactiveDays = s.consecutiveInactiveDays;
  if (typeof s.lastActivityTimestamp === 'number') result.lastActivityTimestamp = s.lastActivityTimestamp;
  if (typeof s.guardianBarrierDate === 'string') result.guardianBarrierDate = s.guardianBarrierDate;
  if (Array.isArray(s.stolenRecords)) {
    result.stolenRecords = s.stolenRecords
      .map((record) => normalizeStolenRecord(record))
      .filter((record): record is StolenRecord => record !== null);
  }

  return result;
}

export function useFarmStorage() {
  const [farm, setFarm] = useLocalStorage<FarmStorage>(FARM_KEY, DEFAULT_FARM_STORAGE, migrateFarm);

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
            isSameCollectionEntry(c) ? { ...c, count: c.count + 1 } : c
          )
        : [
            ...prev.collection,
            {
              varietyId: plot.varietyId,
              isMutant: harvestedIsMutant ? true : undefined,
              firstObtainedDate: todayKey,
              count: 1,
            },
          ];
      const targetPlotCount = getPlotCount(newCollection);
      const nextPlots = prev.plots.map(p => (p.id === plotId ? createEmptyPlot(plotId) : p));

      return {
        ...prev,
        plots: ensurePlotCapacity(nextPlots, targetPlotCount),
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

  /** 卖出品种（仅减少图鉴 count，条目保留） */
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
    if (plotIndex < 0) return false;
    let success = false;
    setFarm(prev => {
      if (prev.plots.length > plotIndex) return prev;
      const nextPlots = [...prev.plots];
      while (nextPlots.length <= plotIndex) {
        nextPlots.push(createEmptyPlot(nextPlots.length));
      }
      success = true;
      return { ...prev, plots: nextPlots };
    });
    return success;
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
    addPlotTracker,
    addStolenRecord,
    markStolenRecordRecovered,
    revivePlot,
    upgradePlotRarity,
  };
}
