/**
 * 农场生长引擎
 *
 * 计算分钟级生长进度、枯萎检测、品种随机。
 */
import type { Plot, VarietyId, GrowthStage, GalaxyId, MutationStatus, StolenRecord } from '../types/farm';
import type { SeedQuality } from '../types/slicing';
import {
  GALAXY_VARIETIES, VARIETY_DEFS, GROWTH_STAGES,
} from '../types/farm';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const WITHER_THRESHOLD_HOURS = 72;
const WITHER_THRESHOLD_MINUTES = WITHER_THRESHOLD_HOURS * MINUTES_PER_HOUR;
const PRISMATIC_REWIND_PER_DAY = 0.05;
const PRISMATIC_REWIND_MAX = 0.50;
const MUTATION_TRIGGER_PROGRESS = 0.20;
const THIEF_STEAL_DELAY_MINUTES = 30;
const THIEF_STEAL_DELAY_MS = THIEF_STEAL_DELAY_MINUTES * 60 * 1000;
const DAY_IN_MS = MINUTES_PER_DAY * 60 * 1000;

export const CIRCUS_TENT_FARM_GROWTH_BONUS_RATE = 0.20;
export const LULLABY_FARM_GROWTH_BONUS_RATE = 0.30;
export const SUPERNOVA_BOTTLE_FARM_GROWTH_BONUS_RATE = 0.50;
export const SUPERNOVA_BOTTLE_DURATION_MS = DAY_IN_MS;

function getLocalDayEndTimestamp(timestamp: number): number {
  const dayEnd = new Date(timestamp);
  dayEnd.setHours(24, 0, 0, 0);
  return dayEnd.getTime();
}

function getTimeOverlapMs(
  rangeStart: number,
  rangeEnd: number,
  windowStart: number,
  windowEnd: number,
): number {
  return Math.max(0, Math.min(rangeEnd, windowEnd) - Math.max(rangeStart, windowStart));
}

function getCircusTentGrowthBoostWindow(activatedAt: number): { start: number; end: number } | null {
  if (!Number.isFinite(activatedAt) || activatedAt <= 0) return null;
  return {
    start: activatedAt,
    end: getLocalDayEndTimestamp(activatedAt),
  };
}

function getLullabyGrowthBoostWindow(activatedAt: number): { start: number; end: number } | null {
  if (!Number.isFinite(activatedAt) || activatedAt <= 0) return null;
  return {
    start: activatedAt,
    end: getLocalDayEndTimestamp(activatedAt),
  };
}

function getSupernovaBottleGrowthBoostWindow(activatedAt: number): { start: number; end: number } | null {
  if (!Number.isFinite(activatedAt) || activatedAt <= 0) return null;
  return {
    start: activatedAt,
    end: activatedAt + SUPERNOVA_BOTTLE_DURATION_MS,
  };
}

export function getSupernovaBottleGrowthBoostEndTimestamp(activatedAt: number): number {
  return getSupernovaBottleGrowthBoostWindow(activatedAt)?.end ?? 0;
}

export function isCircusTentGrowthBoostActive(
  activatedAt: number,
  nowTimestamp: number = Date.now(),
): boolean {
  const window = getCircusTentGrowthBoostWindow(activatedAt);
  if (!window) return false;
  return nowTimestamp >= window.start && nowTimestamp < window.end;
}

export function isLullabyGrowthBoostActive(
  activatedAt: number,
  nowTimestamp: number = Date.now(),
): boolean {
  const window = getLullabyGrowthBoostWindow(activatedAt);
  if (!window) return false;
  return nowTimestamp >= window.start && nowTimestamp < window.end;
}

export function isSupernovaBottleGrowthBoostActive(
  activatedAt: number,
  nowTimestamp: number = Date.now(),
): boolean {
  const window = getSupernovaBottleGrowthBoostWindow(activatedAt);
  if (!window) return false;
  return nowTimestamp >= window.start && nowTimestamp < window.end;
}

export function calculateFarmGrowthBonusMinutes(
  baseGrowthMinutes: number,
  intervalStartTimestamp: number,
  intervalEndTimestamp: number,
  circusTentActivatedAt: number,
  lullabyActivatedAt: number,
  supernovaBottleActivatedAt: number,
): number {
  const safeBaseGrowthMinutes = Number.isFinite(baseGrowthMinutes) ? Math.max(0, baseGrowthMinutes) : 0;
  if (safeBaseGrowthMinutes <= 0) return 0;

  const safeEndTimestamp = Number.isFinite(intervalEndTimestamp) && intervalEndTimestamp > 0
    ? intervalEndTimestamp
    : Date.now();
  const fallbackStartTimestamp = safeEndTimestamp - safeBaseGrowthMinutes * 60 * 1000;
  const safeStartTimestamp = Number.isFinite(intervalStartTimestamp) && intervalStartTimestamp > 0
    ? Math.min(intervalStartTimestamp, safeEndTimestamp)
    : fallbackStartTimestamp;
  const intervalDurationMs = Math.max(1, safeEndTimestamp - safeStartTimestamp);

  const circusTentOverlapMs = (() => {
    const window = getCircusTentGrowthBoostWindow(circusTentActivatedAt);
    if (!window) return 0;
    return getTimeOverlapMs(safeStartTimestamp, safeEndTimestamp, window.start, window.end);
  })();

  const lullabyOverlapMs = (() => {
    const window = getLullabyGrowthBoostWindow(lullabyActivatedAt);
    if (!window) return 0;
    return getTimeOverlapMs(safeStartTimestamp, safeEndTimestamp, window.start, window.end);
  })();

  const supernovaOverlapMs = (() => {
    const window = getSupernovaBottleGrowthBoostWindow(supernovaBottleActivatedAt);
    if (!window) return 0;
    return getTimeOverlapMs(safeStartTimestamp, safeEndTimestamp, window.start, window.end);
  })();

  const weightedBonusRate = (circusTentOverlapMs / intervalDurationMs) * CIRCUS_TENT_FARM_GROWTH_BONUS_RATE
    + (lullabyOverlapMs / intervalDurationMs) * LULLABY_FARM_GROWTH_BONUS_RATE
    + (supernovaOverlapMs / intervalDurationMs) * SUPERNOVA_BOTTLE_FARM_GROWTH_BONUS_RATE;

  return safeBaseGrowthMinutes * weightedBonusRate;
}

/**
 * 星际大盗出现概率（按当天专注分钟）：
 * - >= 60 分钟：0.5%
 * - >= 25 分钟：2%
 * - 其他：5%
 */
export function getThiefAppearanceChance(focusMinutesToday: number): number {
  const safeMinutes = Number.isFinite(focusMinutesToday) ? Math.max(0, Math.floor(focusMinutesToday)) : 0;
  if (safeMinutes >= 60) return 0.005;
  if (safeMinutes >= 25) return 0.02;
  return 0.05;
}

/**
 * 离线成长分钟数：
 * - <= 24 小时：全额计入
 * - 24~72 小时：封顶 1440 分钟
 * - > 72 小时：不再成长（应由枯萎逻辑处理）
 */
export function calculateOfflineGrowth(offlineMinutes: number): number {
  const normalized = Math.max(0, Math.floor(offlineMinutes));
  if (normalized <= MINUTES_PER_DAY) return normalized;
  if (normalized <= WITHER_THRESHOLD_MINUTES) return MINUTES_PER_DAY;
  return 0;
}

/**
 * 专注加速分钟数：
 * - <= 2 小时：10x
 * - > 2 小时：20x
 */
export function calculateFocusBoost(focusMinutes: number): number {
  const normalized = Math.max(0, Math.floor(focusMinutes));
  if (normalized === 0) return 0;
  const multiplier = normalized <= 120 ? 10 : 20;
  return normalized * multiplier;
}

export interface WitherStatus {
  inactiveMinutes: number;
  inactiveHours: number;
  inactiveDays: number;
  shouldWither: boolean;
}

export function getWitherStatus(
  lastActivityTimestamp: number,
  nowTimestamp: number = Date.now(),
): WitherStatus {
  if (!Number.isFinite(lastActivityTimestamp) || lastActivityTimestamp <= 0) {
    return {
      inactiveMinutes: 0,
      inactiveHours: 0,
      inactiveDays: 0,
      shouldWither: false,
    };
  }

  const safeNow = Number.isFinite(nowTimestamp) && nowTimestamp > 0 ? nowTimestamp : Date.now();
  const inactiveMs = Math.max(0, safeNow - lastActivityTimestamp);
  const inactiveMinutes = Math.floor(inactiveMs / (1000 * 60));

  return {
    inactiveMinutes,
    inactiveHours: Math.floor(inactiveMinutes / MINUTES_PER_HOUR),
    inactiveDays: Math.floor(inactiveMinutes / MINUTES_PER_DAY),
    shouldWither: inactiveMinutes >= WITHER_THRESHOLD_MINUTES,
  };
}

// ─── 生长阶段 ───

export function getGrowthStage(progress: number): GrowthStage {
  let stage: GrowthStage = 'seed';
  for (const s of GROWTH_STAGES) {
    if (progress >= s.threshold) stage = s.id;
  }
  return stage;
}

export function getStageEmoji(progress: number, varietyId?: VarietyId): string {
  const stage = getGrowthStage(progress);
  if (stage === 'fruit' && varietyId) {
    return VARIETY_DEFS[varietyId]?.emoji ?? '🍉';
  }
  return GROWTH_STAGES.find(s => s.id === stage)?.emoji ?? '🌱';
}

/** 品种是否已揭晓（进度 >= 60%） */
export function isVarietyRevealed(progress: number): boolean {
  return progress >= 0.60;
}

function isPrismaticVariety(varietyId?: VarietyId): boolean {
  if (!varietyId) return false;
  return VARIETY_DEFS[varietyId]?.breedType === 'prismatic';
}

function downgradeSeedQuality(seedQuality: SeedQuality | undefined): SeedQuality {
  if (seedQuality === 'legendary') return 'epic';
  if (seedQuality === 'epic') return 'normal';
  return 'normal';
}

/**
 * 变异判定（单次）：
 * - 已判定（positive/negative）直接跳过
 * - 一旦判定（包含未命中概率）即将 mutationChance 归零，避免重复判定
 */
export function rollMutation(plot: Plot): Plot {
  if ((plot.mutationStatus ?? 'none') !== 'none') return plot;

  const mutationChance = plot.mutationChance ?? 0.02;
  if (mutationChance <= 0) return plot;
  if (Math.random() >= mutationChance) {
    return {
      ...plot,
      mutationChance: 0,
      isMutant: false,
    };
  }

  const mutationRoll = Math.random();

  // 40% 良性变异 (0.0 <= roll < 0.4)
  if (mutationRoll < 0.4) {
    return {
      ...plot,
      mutationStatus: 'positive',
      mutationChance: 0,
      isMutant: true,
    };
  }

  // 30% 恶性变异 (0.4 <= roll < 0.7)
  if (mutationRoll < 0.7) {
    const shouldWither = Math.random() < 0.5;
    return shouldWither
      ? {
          ...plot,
          state: 'withered',
          progress: 0,
          accumulatedMinutes: 0,
          mutationStatus: 'negative',
          mutationChance: 0,
          isMutant: false,
        }
      : {
          ...plot,
          mutationStatus: 'negative',
          mutationChance: 0,
          isMutant: false,
          seedQuality: downgradeSeedQuality(plot.seedQuality),
        };
  }

  // 30% 触发但无效果 (0.7 <= roll < 1.0)
  return {
    ...plot,
    mutationStatus: 'none',
    mutationChance: 0,
    isMutant: false,
  };
}

export interface MutationOutcome {
  varietyId: VarietyId;
  status: Exclude<MutationStatus, 'none'>;
}

export interface ApplyGrowthOptions {
  nowTimestamp?: number;
  todayKey?: string;
  focusMinutesToday?: number;
  guardianBarrierDate?: string;
  enableThiefRoll?: boolean;
}

export interface ApplyGrowthResult {
  plots: Plot[];
  mutationToasts: MutationOutcome[];
  stolenRecords: StolenRecord[];
}

function createStolenRecord(plot: Plot, stolenAt: number): StolenRecord | null {
  if (!plot.varietyId) return null;
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${stolenAt}-${plot.id}-${Math.random().toString(36).slice(2, 9)}`;

  return {
    id,
    plotId: plot.id,
    varietyId: plot.varietyId,
    stolenAt,
    resolved: false,
    recoveredCount: 0,
  };
}

// ─── 品种随机 ───

/**
 * 根据种子品质随机品种
 * epic 种子：稀有+ 概率 ×2
 * legendary 种子：稀有+ 概率 ×4
 */
export function rollVariety(unlockedGalaxies: GalaxyId[], seedQuality: SeedQuality = 'normal'): VarietyId {
  const multiplier = seedQuality === 'legendary' ? 4 : seedQuality === 'epic' ? 2 : 1;
  const sourcePool: VarietyId[] = [];
  for (const gid of unlockedGalaxies) {
    sourcePool.push(...(GALAXY_VARIETIES[gid] || []));
  }
  if (sourcePool.length === 0) sourcePool.push(...GALAXY_VARIETIES['thick-earth']);

  // 构建加权池
  const pool: { id: VarietyId; weight: number }[] = sourcePool.map(id => {
    const def = VARIETY_DEFS[id];
    const isHighRarity = def.rarity === 'rare' || def.rarity === 'epic' || def.rarity === 'legendary';
    return { id, weight: def.dropRate * (isHighRarity ? multiplier : 1) };
  });

  // 归一化
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const p of pool) {
    roll -= p.weight;
    if (roll <= 0) return p.id;
  }
  return pool[pool.length - 1].id;
}

// ─── 地块更新 ───

/**
 * 更新单个地块的生长进度
 * @returns 更新后的地块 + 是否刚揭晓品种
 */
export function updatePlotGrowth(
  plot: Plot,
  growthMinutes: number,
  nowTimestamp: number = Date.now(),
): { plot: Plot; justRevealed: boolean; mutationOutcome?: MutationOutcome } {
  if (plot.state !== 'growing') return { plot, justRevealed: false };
  if (!plot.varietyId) return { plot, justRevealed: false };

  const varietyDef = VARIETY_DEFS[plot.varietyId];
  const matureMinutes = varietyDef?.matureMinutes ?? 10000;
  const safeGrowthMinutes = Math.max(0, Math.floor(growthMinutes));
  const prevAccumulatedMinutes = Math.max(
    0,
    Math.floor(plot.accumulatedMinutes > 0 ? plot.accumulatedMinutes : plot.progress * matureMinutes),
  );
  const prevProgress = plot.progress;
  const nextAccumulatedMinutes = Math.min(matureMinutes, prevAccumulatedMinutes + safeGrowthMinutes);
  const newProgress = Math.min(1, nextAccumulatedMinutes / matureMinutes);
  const safeNow = Number.isFinite(nowTimestamp) && nowTimestamp > 0 ? nowTimestamp : Date.now();
  const todayKey = new Date(safeNow).toISOString().slice(0, 10);

  const wasRevealed = isVarietyRevealed(prevProgress);
  const nowRevealed = isVarietyRevealed(newProgress);
  const justRevealed = !wasRevealed && nowRevealed;

  const newState = newProgress >= 1 ? 'mature' as const : 'growing' as const;
  const preMutationPlot: Plot = {
    ...plot,
    progress: newProgress,
    accumulatedMinutes: nextAccumulatedMinutes,
    state: newState,
    pausedAt: undefined,
    pausedProgress: undefined,
    lastUpdateDate: todayKey,
    lastActivityTimestamp: safeNow,
  };
  const currentMutationStatus = preMutationPlot.mutationStatus ?? 'none';
  const currentMutationChance = preMutationPlot.mutationChance ?? 0.02;
  const reachedSproutThreshold = prevProgress < MUTATION_TRIGGER_PROGRESS
    && newProgress >= MUTATION_TRIGGER_PROGRESS;
  const shouldRollMutation = reachedSproutThreshold
    && currentMutationStatus === 'none'
    && currentMutationChance > 0;
  const finalPlot = shouldRollMutation ? rollMutation(preMutationPlot) : preMutationPlot;
  const finalMutationStatus = finalPlot.mutationStatus;
  const mutationOutcome = shouldRollMutation && (finalMutationStatus === 'positive' || finalMutationStatus === 'negative')
    ? { varietyId: plot.varietyId, status: finalMutationStatus }
    : undefined;

  return {
    plot: finalPlot,
    justRevealed,
    mutationOutcome,
  };
}

/**
 * 批量应用地块生长 + 变异 + 大盗逻辑
 */
export function applyGrowthWithMutation(
  plots: Plot[],
  growthMinutes: number,
  options: ApplyGrowthOptions = {},
): ApplyGrowthResult {
  const mutationToasts: MutationOutcome[] = [];
  const stolenRecords: StolenRecord[] = [];

  const safeNow = Number.isFinite(options.nowTimestamp) && (options.nowTimestamp ?? 0) > 0
    ? (options.nowTimestamp as number)
    : Date.now();
  const safeTodayKey = options.todayKey ?? new Date(safeNow).toISOString().slice(0, 10);
  const safeGrowthMinutes = Math.max(0, Math.floor(growthMinutes));
  const thiefRollEnabled = (options.enableThiefRoll ?? true) && safeGrowthMinutes > 0;
  const thiefChance = getThiefAppearanceChance(options.focusMinutesToday ?? 0);
  const barrierActiveToday = (options.guardianBarrierDate ?? '') === safeTodayKey;

  const nextPlots = plots.map((plot) => {
    let nextPlot = plot;

    if (nextPlot.state === 'growing' && safeGrowthMinutes > 0) {
      const growthResult = updatePlotGrowth(nextPlot, safeGrowthMinutes, safeNow);
      if (
        growthResult.mutationOutcome?.status === 'positive'
        && growthResult.plot.isMutant === true
      ) {
        mutationToasts.push(growthResult.mutationOutcome);
      }
      nextPlot = growthResult.plot;
    }

    if (nextPlot.thief) {
      if (safeNow < nextPlot.thief.stealsAt) return nextPlot;

      if (nextPlot.hasTracker) {
        return {
          ...nextPlot,
          thief: undefined,
          hasTracker: false,
          lastUpdateDate: safeTodayKey,
          lastActivityTimestamp: safeNow,
        };
      }

      const stolenRecord = createStolenRecord(nextPlot, safeNow);
      if (stolenRecord) {
        stolenRecords.push(stolenRecord);
      }

      return {
        ...nextPlot,
        state: 'stolen' as const,
        thief: undefined,
        hasTracker: false,
        lastUpdateDate: safeTodayKey,
        lastActivityTimestamp: safeNow,
      };
    }

    const canRollThief = thiefRollEnabled
      && !barrierActiveToday
      && (nextPlot.state === 'growing' || nextPlot.state === 'mature')
      && Boolean(nextPlot.varietyId);

    if (!canRollThief) return nextPlot;
    if (Math.random() >= thiefChance) return nextPlot;

    return {
      ...nextPlot,
      thief: {
        appearedAt: safeNow,
        stealsAt: safeNow + THIEF_STEAL_DELAY_MS,
      },
      lastUpdateDate: safeTodayKey,
      lastActivityTimestamp: safeNow,
    };
  });

  return { plots: nextPlots, mutationToasts, stolenRecords };
}

/**
 * 枯萎检测：连续 3 天未活跃 → 所有生长中的地块枯萎
 */
export function witherPlots(
  plots: Plot[],
  nowTimestamp: number = Date.now(),
  fallbackLastActivityTimestamp: number = 0,
): Plot[] {
  const safeNow = Number.isFinite(nowTimestamp) && nowTimestamp > 0 ? nowTimestamp : Date.now();
  const todayKey = new Date(safeNow).toISOString().slice(0, 10);

  return plots.map(p => {
    if (p.state === 'growing' || p.state === 'mature') {
      const plotLastActivity = p.lastActivityTimestamp > 0 ? p.lastActivityTimestamp : fallbackLastActivityTimestamp;
      const status = getWitherStatus(plotLastActivity, safeNow);
      if (status.shouldWither) {
        if (isPrismaticVariety(p.varietyId)) {
          const pausedDays = Math.max(0, Math.floor((status.inactiveMinutes - WITHER_THRESHOLD_MINUTES) / MINUTES_PER_DAY));
          const baseProgress = p.pausedProgress ?? p.progress;
          const rewindRatio = Math.min(PRISMATIC_REWIND_MAX, pausedDays * PRISMATIC_REWIND_PER_DAY);
          const nextProgress = Math.max(0, Math.min(1, baseProgress * (1 - rewindRatio)));
          const matureMinutes = p.varietyId ? (VARIETY_DEFS[p.varietyId]?.matureMinutes ?? 1) : 1;
          const pausedAt = p.pausedAt ?? Math.max(
            0,
            safeNow - Math.max(0, status.inactiveMinutes - WITHER_THRESHOLD_MINUTES) * 60 * 1000,
          );

          return {
            ...p,
            state: nextProgress >= 1 ? 'mature' as const : 'growing' as const,
            progress: nextProgress,
            accumulatedMinutes: Math.floor(matureMinutes * nextProgress),
            pausedAt,
            pausedProgress: baseProgress,
            lastUpdateDate: todayKey,
          };
        }

        return {
          ...p,
          state: 'withered' as const,
          lastUpdateDate: todayKey,
          lastActivityTimestamp: safeNow,
        };
      }
    }
    return p;
  });
}
