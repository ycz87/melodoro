/**
 * FarmPage — 农场主页面
 *
 * 7 地块等距农场布局 + 种植/收获/清除交互 + 品种揭晓动画 + 收获动画。
 * 内嵌图鉴入口（顶部 tab 切换）。
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type {
  AlienAppearance,
  AlienType,
  Plot,
  VarietyId,
  FarmStorage,
  GalaxyId,
  StolenRecord,
  FusionHistory,
  Weather,
} from '../types/farm';
import type { GeneInventory } from '../types/gene';
import type { DarkMatterFusion, DarkMatterFusionType, FusionResult } from '../types/gene';
import type {
  SeedQuality,
  SeedCounts,
  InjectedSeed,
  HybridSeed,
  PrismaticSeed,
  DarkMatterSeed,
  PendingRevealedNormalSeed,
  ItemId,
} from '../types/slicing';
import { VARIETY_DEFS, RARITY_COLOR, RARITY_STARS } from '../types/farm';
import {
  getGrowthStage,
  getSupernovaBottleGrowthBoostEndTimestamp,
  isCircusTentGrowthBoostActive,
  isLullabyGrowthBoostActive,
  isSupernovaBottleGrowthBoostActive,
  isVarietyRevealed,
} from '../farm/growth';
import { CollectionPage } from './CollectionPage';
import { GeneLabPage } from './GeneLabPage';
import { SimpleFarmGrid } from './farm/SimpleFarmGrid';
import { FarmPlotBoardV2 } from './farm-v2/FarmPlotBoardV2';

interface FarmPageProps {
  farm: FarmStorage;
  geneInventory: GeneInventory;
  coinBalance: number;
  seeds: SeedCounts;
  items: Record<ItemId, number>;
  injectedSeeds: InjectedSeed[];
  hybridSeeds: HybridSeed[];
  prismaticSeeds: PrismaticSeed[];
  darkMatterSeeds: DarkMatterSeed[];
  pendingRevealedNormalSeed: PendingRevealedNormalSeed | null;
  weather: Weather;
  todayFocusMinutes: number;
  todayKey: string;
  activeAlienVisit: AlienAppearance | null;
  addSeeds: (count: number, quality?: SeedQuality) => void;
  onPlant: (plotId: number, quality: SeedQuality) => VarietyId;
  onPlantPendingRevealedNormal: (plotId: number) => void;
  onPlantInjected: (plotId: number, seedId: string) => void;
  onPlantHybrid: (plotId: number, seedId: string) => void;
  onPlantPrismatic: (plotId: number, seedId: string) => void;
  onPlantDarkMatter: (plotId: number, seedId: string) => void;
  onInject: (galaxyId: GalaxyId, quality: SeedQuality) => void;
  onFusion: (fragment1Id: string, fragment2Id: string, useModifier: boolean) => { success: boolean; galaxyPair: string } | null;
  onFiveElementFusion: () => FusionResult | null;
  onDarkMatterFusion: (type: DarkMatterFusionType) => DarkMatterFusion | null;
  harvestedHybridVarietyCount: number;
  fusionHistory: FusionHistory;
  onHarvest: (plotId: number) => {
    varietyId?: VarietyId;
    isMutant?: boolean;
    isNew: boolean;
    collectedCount?: number;
    rewardSeedQuality?: SeedQuality;
  };
  onClear: (plotId: number) => void;
  onUseLullaby: () => void;
  onUseSupernovaBottle: () => void;
  onUseCrystalBall: () => void;
  onUseMutationGun: (plotId: number) => void;
  onUseMoonDew: (plotId: number) => void;
  onUseStarDew: (plotId: number) => void;
  onUseNectar: (plotId: number) => void;
  onUseStarTracker: (plotId: number) => void;
  onUseGuardianBarrier: () => void;
  onUseCircusTent: () => void;
  onUseDriftBottle: () => void;
  onUseTrapNet: (plotId: number) => void;
  onGoWarehouse: () => void;
  compactShell?: boolean;
}

type SubTab = 'plots' | 'collection' | 'lab';

// ─── 动画 overlay 类型 ───
interface RevealAnim { varietyId: VarietyId; plotId: number }
interface HarvestAnim {
  varietyId: VarietyId;
  isNew: boolean;
  collectedCount: number;
  rewardSeedQuality?: SeedQuality;
}

const REVEAL_DURATION_MS = 3000;
const REVEAL_DURATION_RARE_PLUS_MS = 3800;
const HARVEST_DURATION_NEW_MS = 4200;
const HARVEST_DURATION_REPEAT_MS = 2800;
const REVEAL_RARE_PLUS_MIN_STARS = 2;

const ALIEN_VISITOR_VISUALS: Record<AlienType, {
  avatar: string;
  align: 'left' | 'right';
  bubbleBackground: string;
  borderColor: string;
  textColor: string;
  glow: string;
  avatarBackground: string;
  avatarBorderColor: string;
}> = {
  'melon-alien': {
    avatar: '👽',
    align: 'right',
    bubbleBackground: 'linear-gradient(135deg, rgba(227,255,219,0.97) 0%, rgba(188,255,238,0.95) 100%)',
    borderColor: 'rgba(32, 171, 141, 0.42)',
    textColor: '#18453b',
    glow: 'radial-gradient(circle, rgba(105,255,214,0.38) 0%, rgba(105,255,214,0) 72%)',
    avatarBackground: 'linear-gradient(180deg, rgba(226,255,238,0.99) 0%, rgba(152,236,216,0.95) 100%)',
    avatarBorderColor: 'rgba(28, 150, 120, 0.45)',
  },
  'mutation-doctor': {
    avatar: '🧪',
    align: 'left',
    bubbleBackground: 'linear-gradient(135deg, rgba(255,232,255,0.98) 0%, rgba(233,225,255,0.96) 100%)',
    borderColor: 'rgba(155, 92, 240, 0.44)',
    textColor: '#4a2570',
    glow: 'radial-gradient(circle, rgba(201,143,255,0.38) 0%, rgba(201,143,255,0) 74%)',
    avatarBackground: 'linear-gradient(180deg, rgba(255,245,255,0.99) 0%, rgba(234,214,255,0.96) 100%)',
    avatarBorderColor: 'rgba(152, 85, 244, 0.46)',
  },
};

export function FarmPage({
  farm,
  geneInventory,
  coinBalance,
  seeds,
  items,
  injectedSeeds,
  hybridSeeds,
  prismaticSeeds,
  darkMatterSeeds,
  pendingRevealedNormalSeed,
  weather,
  todayFocusMinutes,
  todayKey,
  activeAlienVisit,
  addSeeds,
  onPlant,
  onPlantPendingRevealedNormal,
  onPlantInjected,
  onPlantHybrid,
  onPlantPrismatic,
  onPlantDarkMatter,
  onInject,
  onFusion,
  onFiveElementFusion,
  onDarkMatterFusion,
  harvestedHybridVarietyCount,
  fusionHistory,
  onHarvest,
  onClear,
  onUseLullaby,
  onUseSupernovaBottle,
  onUseCrystalBall,
  onUseMutationGun,
  onUseMoonDew,
  onUseStarDew,
  onUseNectar,
  onUseStarTracker,
  onUseGuardianBarrier,
  onUseCircusTent,
  onUseDriftBottle,
  onUseTrapNet,
  onGoWarehouse,
  compactShell = false,
}: FarmPageProps) {
  const theme = useTheme();
  const t = useI18n();

  const [subTab, setSubTab] = useState<SubTab>('plots');
  const [plantingPlotId, setPlantingPlotId] = useState<number | null>(null);
  const [revealAnim, setRevealAnim] = useState<RevealAnim | null>(null);
  const [harvestAnim, setHarvestAnim] = useState<HarvestAnim | null>(null);
  const [showFarmHelp, setShowFarmHelp] = useState(false);
  const [activeTooltipPlotId, setActiveTooltipPlotId] = useState<number | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());
  const useFarmPlotBoardV2 = useMemo(() => {
    if (typeof window === 'undefined') return true;
    const forcedBoard = new URLSearchParams(window.location.search).get('farmBoard');
    return forcedBoard !== 'legacy';
  }, []);
  const gentleV2Layout = useFarmPlotBoardV2 && !compactShell;

  // 追踪已揭晓的地块（避免重复触发动画）
  const revealedRef = useRef<Set<number>>(new Set());
  const revealAnimFrameRef = useRef<number | null>(null);
  const revealAnimTimerRef = useRef<number | null>(null);

  const clearRevealAnimSchedule = useCallback(() => {
    if (revealAnimFrameRef.current !== null) {
      window.cancelAnimationFrame(revealAnimFrameRef.current);
      revealAnimFrameRef.current = null;
    }
    if (revealAnimTimerRef.current !== null) {
      window.clearTimeout(revealAnimTimerRef.current);
      revealAnimTimerRef.current = null;
    }
  }, []);

  // 检测品种揭晓
  useEffect(() => {
    for (const plot of farm.plots) {
      if (
        plot.state === 'growing' &&
        plot.varietyId &&
        isVarietyRevealed(plot.progress) &&
        !revealedRef.current.has(plot.id)
      ) {
        revealedRef.current.add(plot.id);
        const varietyId = plot.varietyId;
        const plotId = plot.id;
        const rarityStars = RARITY_STARS[VARIETY_DEFS[varietyId].rarity];
        const revealDuration = rarityStars >= REVEAL_RARE_PLUS_MIN_STARS
          ? REVEAL_DURATION_RARE_PLUS_MS
          : REVEAL_DURATION_MS;

        clearRevealAnimSchedule();
        revealAnimFrameRef.current = window.requestAnimationFrame(() => {
          revealAnimFrameRef.current = null;
          setRevealAnim({ varietyId, plotId });
          revealAnimTimerRef.current = window.setTimeout(() => {
            setRevealAnim(null);
            revealAnimTimerRef.current = null;
          }, revealDuration);
        });
        break;
      }
    }
  }, [clearRevealAnimSchedule, farm.plots]);

  useEffect(() => () => {
    clearRevealAnimSchedule();
  }, [clearRevealAnimSchedule]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNowTimestamp(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const activeGrowingPlot = useMemo(() => {
    if (activeTooltipPlotId === null) return null;
    const match = farm.plots.find((plot) => plot.id === activeTooltipPlotId);
    return match?.state === 'growing' ? match : null;
  }, [activeTooltipPlotId, farm.plots]);

  const effectiveActiveTooltipPlotId = activeGrowingPlot ? activeTooltipPlotId : null;

  const activeGrowingSnapshot = useMemo(() => {
    if (!activeGrowingPlot) return null;

    const matureMinutes = activeGrowingPlot.varietyId
      ? (VARIETY_DEFS[activeGrowingPlot.varietyId]?.matureMinutes ?? 10000)
      : 10000;

    const hasTimeComponent = typeof activeGrowingPlot.lastUpdateDate === 'string'
      && activeGrowingPlot.lastUpdateDate.includes('T');
    const parsedLastUpdateTs = hasTimeComponent
      ? new Date(activeGrowingPlot.lastUpdateDate as string).getTime()
      : NaN;
    const elapsedMinutes = Number.isFinite(parsedLastUpdateTs)
      ? Math.max(0, Math.floor((nowTimestamp - parsedLastUpdateTs) / 60000))
      : 0;

    const displayAccumulatedMinutes = Math.min(
      matureMinutes,
      hasTimeComponent ? activeGrowingPlot.accumulatedMinutes + elapsedMinutes : activeGrowingPlot.accumulatedMinutes,
    );
    const displayProgress = Math.min(
      0.999,
      Math.max(activeGrowingPlot.progress, matureMinutes > 0 ? displayAccumulatedMinutes / matureMinutes : 0),
    );

    return {
      stage: getGrowthStage(displayProgress),
      progressPercent: Math.min(99, Math.floor(displayProgress * 100)),
      accumulatedMinutes: displayAccumulatedMinutes,
      matureMinutes,
      hasTracker: activeGrowingPlot.hasTracker,
      needsFocusHint: displayProgress < 0.5,
    };
  }, [activeGrowingPlot, nowTimestamp]);

  const totalBaseSeeds = seeds.normal + seeds.epic + seeds.legendary;
  const totalPlantableSeeds = totalBaseSeeds
    + injectedSeeds.length
    + hybridSeeds.length
    + prismaticSeeds.length
    + darkMatterSeeds.length
    + (pendingRevealedNormalSeed ? 1 : 0);
  const harvestablePlotCount = useMemo(
    () => farm.plots.filter((plot) => plot.state === 'mature').length,
    [farm.plots],
  );
  const lullabyCount = (items as Record<string, number>).lullaby ?? 0;
  const supernovaBottleCount = (items as Record<string, number>)['supernova-bottle'] ?? 0;
  const mutationGunCount = (items as Record<string, number>)['mutation-gun'] ?? 0;
  const moonDewCount = (items as Record<string, number>)['moon-dew'] ?? 0;
  const starDewCount = (items as Record<string, number>)['star-dew'] ?? 0;
  const nectarCount = (items as Record<string, number>)['nectar'] ?? 0;
  const starTrackerCount = (items as Record<string, number>)['star-tracker'] ?? 0;
  const guardianBarrierCount = (items as Record<string, number>)['guardian-barrier'] ?? 0;
  const circusTentCount = (items as Record<string, number>)['circus-tent'] ?? 0;
  const driftBottleCount = (items as Record<string, number>)['drift-bottle'] ?? 0;
  const trapNetCount = (items as Record<string, number>)['trap-net'] ?? 0;
  const crystalBallCount = (items as Record<string, number>)['crystal-ball'] ?? 0;
  const crystalBallPendingVarietyName = pendingRevealedNormalSeed
    ? t.varietyName(pendingRevealedNormalSeed.varietyId)
    : null;
  const canUseCrystalBall = crystalBallCount > 0 && !pendingRevealedNormalSeed && seeds.normal > 0;
  const barrierActiveToday = farm.guardianBarrierDate === todayKey;
  const circusTentActive = barrierActiveToday && isCircusTentGrowthBoostActive(farm.circusTentActivatedAt, nowTimestamp);
  const lullabyActive = isLullabyGrowthBoostActive(farm.lullabyActivatedAt, nowTimestamp);
  const supernovaBottleActive = isSupernovaBottleGrowthBoostActive(
    farm.supernovaBottleActivatedAt,
    nowTimestamp,
  );
  const supernovaBottleRemainingMinutes = supernovaBottleActive
    ? Math.max(
        1,
        Math.ceil((getSupernovaBottleGrowthBoostEndTimestamp(farm.supernovaBottleActivatedAt) - nowTimestamp) / 60000),
      )
    : 0;
  const canUseActivePlotStarDew = Boolean(activeGrowingPlot?.varietyId) && starDewCount > 0;
  const activeAlienSceneVisit = activeAlienVisit && activeAlienVisit.expiresAt > nowTimestamp
    ? activeAlienVisit
    : null;
  const driftBottleDisabled = Boolean(activeAlienSceneVisit);

  const latestStolenRecordByPlotId = useMemo(() => {
    const latestByPlot = new Map<number, StolenRecord>();
    for (const record of farm.stolenRecords) {
      const previous = latestByPlot.get(record.plotId);
      if (!previous || record.stolenAt > previous.stolenAt) {
        latestByPlot.set(record.plotId, record);
      }
    }
    return latestByPlot;
  }, [farm.stolenRecords]);

  const handlePlant = useCallback((quality: SeedQuality) => {
    if (plantingPlotId === null) return;
    onPlant(plantingPlotId, quality);
    setPlantingPlotId(null);
  }, [plantingPlotId, onPlant]);

  const handlePlantPendingRevealedNormal = useCallback(() => {
    if (plantingPlotId === null) return;
    onPlantPendingRevealedNormal(plantingPlotId);
    setPlantingPlotId(null);
  }, [plantingPlotId, onPlantPendingRevealedNormal]);

  const handlePlantInjected = useCallback((seedId: string) => {
    if (plantingPlotId === null) return;
    onPlantInjected(plantingPlotId, seedId);
    setPlantingPlotId(null);
  }, [plantingPlotId, onPlantInjected]);

  const handlePlantHybrid = useCallback((seedId: string) => {
    if (plantingPlotId === null) return;
    onPlantHybrid(plantingPlotId, seedId);
    setPlantingPlotId(null);
  }, [plantingPlotId, onPlantHybrid]);

  const handlePlantPrismatic = useCallback((seedId: string) => {
    if (plantingPlotId === null) return;
    onPlantPrismatic(plantingPlotId, seedId);
    setPlantingPlotId(null);
  }, [plantingPlotId, onPlantPrismatic]);

  const handlePlantDarkMatter = useCallback((seedId: string) => {
    if (plantingPlotId === null) return;
    onPlantDarkMatter(plantingPlotId, seedId);
    setPlantingPlotId(null);
  }, [plantingPlotId, onPlantDarkMatter]);

  const handleHarvest = useCallback((plotId: number) => {
    const result = onHarvest(plotId);
    if (result.varietyId) {
      if (result.isNew && result.rewardSeedQuality) {
        addSeeds(1, result.rewardSeedQuality);
      }
      const collectedCount = Math.max(result.isNew ? 1 : 2, result.collectedCount ?? (result.isNew ? 1 : 2));
      setHarvestAnim({
        varietyId: result.varietyId,
        isNew: result.isNew,
        collectedCount,
        rewardSeedQuality: result.rewardSeedQuality,
      });
      setTimeout(
        () => setHarvestAnim(null),
        result.isNew ? HARVEST_DURATION_NEW_MS : HARVEST_DURATION_REPEAT_MS,
      );
    }
  }, [onHarvest, addSeeds]);

  if (subTab === 'collection') {
    return (
      <div className="flex-1 flex flex-col w-full pt-4 pb-6 gap-4">
        {/* Sub-tab header */}
        <div className="px-4">
          <SubTabHeader subTab={subTab} setSubTab={setSubTab} theme={theme} t={t} gentle={useFarmPlotBoardV2} />
        </div>
        <CollectionPage collection={farm.collection} geneInventory={geneInventory} milestoneRewards={farm.milestoneRewards} />
      </div>
    );
  }

  if (subTab === 'lab') {
    return (
      <div className="flex-1 flex flex-col w-full pt-4 pb-6 gap-4">
        {/* Sub-tab header */}
        <div className="px-4">
          <SubTabHeader subTab={subTab} setSubTab={setSubTab} theme={theme} t={t} gentle={useFarmPlotBoardV2} />
        </div>
        <GeneLabPage
          geneInventory={geneInventory}
          seeds={seeds}
          items={items}
          hybridSeeds={hybridSeeds}
          prismaticSeedCount={prismaticSeeds.length}
          darkMatterSeedCount={darkMatterSeeds.length}
          harvestedHybridVarietyCount={harvestedHybridVarietyCount}
          fusionHistory={fusionHistory}
          onInject={onInject}
          onFusion={onFusion}
          onFiveElementFusion={onFiveElementFusion}
          onDarkMatterFusion={onDarkMatterFusion}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col w-full ${compactShell ? 'px-0 pt-0 pb-0 gap-0' : gentleV2Layout ? 'px-3 sm:px-4 pt-2 pb-3 gap-2' : 'px-4 pt-4 pb-6 gap-4'}`}
      style={gentleV2Layout
        ? {
          background: 'linear-gradient(180deg, #9ad7f4 0%, #a6def2 28%, #a8d993 56%, #94cf73 100%)',
        }
        : undefined}
    >
      {!compactShell && (
        <>
          {/* Sub-tab header */}
          <SubTabHeader subTab={subTab} setSubTab={setSubTab} theme={theme} t={t} gentle={useFarmPlotBoardV2} />

          {/* 道具快捷栏 */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {(lullabyCount > 0 || lullabyActive) && (
              <button
                type="button"
                onClick={onUseLullaby}
                disabled={lullabyActive}
                data-testid="farm-lullaby-boost-chip"
                data-active={lullabyActive ? 'true' : 'false'}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button disabled:hover:translate-y-0"
                style={{
                  background: lullabyActive
                    ? 'linear-gradient(135deg, rgba(241,255,220,0.95) 0%, rgba(217,244,170,0.95) 100%)'
                    : `${theme.surface}cc`,
                  borderColor: lullabyActive ? '#84cc16' : theme.border,
                  color: lullabyActive ? '#47611b' : theme.text,
                  boxShadow: 'var(--shadow-card)',
                  cursor: lullabyActive ? 'default' : 'pointer',
                }}
                title={t.itemDescription('lullaby')}
              >
                <span>🎵</span>
                <span>
                  {lullabyActive
                    ? `${t.itemName('lullaby')} · +30% · ${t.today}`
                    : `${t.itemName('lullaby')} · ${lullabyCount}`}
                </span>
              </button>
            )}
            {(supernovaBottleCount > 0 || supernovaBottleActive) && (
              <button
                type="button"
                onClick={onUseSupernovaBottle}
                disabled={supernovaBottleActive}
                data-testid="farm-supernova-boost-chip"
                data-active={supernovaBottleActive ? 'true' : 'false'}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button disabled:hover:translate-y-0"
                style={{
                  background: supernovaBottleActive
                    ? 'linear-gradient(135deg, rgba(255,238,196,0.97) 0%, rgba(255,198,109,0.95) 100%)'
                    : `${theme.surface}cc`,
                  borderColor: supernovaBottleActive ? '#f97316' : theme.border,
                  color: supernovaBottleActive ? '#8a3b12' : theme.text,
                  boxShadow: 'var(--shadow-card)',
                  cursor: supernovaBottleActive ? 'default' : 'pointer',
                }}
                title={t.itemDescription('supernova-bottle')}
              >
                <span>💥</span>
                <span>
                  {supernovaBottleActive
                    ? `${t.itemName('supernova-bottle')} · +50% · ${t.formatDuration(supernovaBottleRemainingMinutes)}`
                    : `${t.itemName('supernova-bottle')} · ${supernovaBottleCount}`}
                </span>
              </button>
            )}
            {pendingRevealedNormalSeed ? (
              <div
                data-testid="farm-crystal-ball-chip"
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,214,255,0.95) 0%, rgba(219,177,255,0.94) 100%)',
                  borderColor: '#a855f7',
                  color: '#581c87',
                  boxShadow: 'var(--shadow-card)',
                }}
                title={t.revealedNormalSeedHint}
              >
                <span>🔮</span>
                <span>
                  {crystalBallCount > 0
                    ? `${crystalBallPendingVarietyName} · ${crystalBallCount}`
                    : crystalBallPendingVarietyName}
                </span>
              </div>
            ) : crystalBallCount > 0 && (
              <button
                type="button"
                onClick={onUseCrystalBall}
                disabled={!canUseCrystalBall}
                data-testid="farm-crystal-ball-chip"
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button disabled:hover:translate-y-0"
                style={{
                  background: canUseCrystalBall
                    ? 'linear-gradient(135deg, rgba(236,225,255,0.97) 0%, rgba(223,190,255,0.95) 100%)'
                    : `${theme.surface}cc`,
                  borderColor: canUseCrystalBall ? '#a855f7' : theme.border,
                  color: canUseCrystalBall ? '#581c87' : theme.textMuted,
                  boxShadow: 'var(--shadow-card)',
                  cursor: canUseCrystalBall ? 'pointer' : 'not-allowed',
                  opacity: canUseCrystalBall ? 1 : 0.7,
                }}
                title={t.itemDescription('crystal-ball')}
              >
                <span>🔮</span>
                <span>{`${t.itemName('crystal-ball')} · ${crystalBallCount}`}</span>
              </button>
            )}
            {(guardianBarrierCount > 0 || barrierActiveToday) && (
              <button
                onClick={onUseGuardianBarrier}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button"
                style={{
                  backgroundColor: `${theme.surface}cc`,
                  borderColor: barrierActiveToday ? '#fbbf24' : theme.border,
                  color: barrierActiveToday ? '#fbbf24' : theme.text,
                  boxShadow: 'var(--shadow-card)',
                }}
                title={barrierActiveToday ? t.itemGuardianBarrierActive : t.itemName('guardian-barrier')}
              >
                <span>🎪</span>
                <span>{barrierActiveToday ? t.itemGuardianBarrierActive : `${t.itemName('guardian-barrier')} · ${guardianBarrierCount}`}</span>
              </button>
            )}
            {(circusTentCount > 0 || circusTentActive) && (
              <button
                type="button"
                onClick={onUseCircusTent}
                disabled={circusTentActive}
                data-testid="farm-circus-tent-chip"
                data-active={circusTentActive ? 'true' : 'false'}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button disabled:hover:translate-y-0"
                style={{
                  background: circusTentActive
                    ? 'linear-gradient(135deg, rgba(255,244,205,0.97) 0%, rgba(255,219,124,0.95) 100%)'
                    : `${theme.surface}cc`,
                  borderColor: circusTentActive ? '#f59e0b' : theme.border,
                  color: circusTentActive ? '#92400e' : theme.text,
                  boxShadow: 'var(--shadow-card)',
                  cursor: circusTentActive ? 'default' : 'pointer',
                }}
                title={t.itemDescription('circus-tent')}
              >
                <span>🎪</span>
                <span>
                  {circusTentActive
                    ? `${t.itemName('circus-tent')} · +20% · ${t.today}`
                    : `${t.itemName('circus-tent')} · ${circusTentCount}`}
                </span>
              </button>
            )}
            {driftBottleCount > 0 && (
              <button
                type="button"
                onClick={onUseDriftBottle}
                disabled={driftBottleDisabled}
                data-testid="farm-drift-bottle-chip"
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button disabled:hover:translate-y-0"
                style={{
                  background: driftBottleDisabled
                    ? `${theme.surface}cc`
                    : `${theme.accent}18`,
                  borderColor: driftBottleDisabled ? theme.border : theme.accent,
                  color: driftBottleDisabled ? theme.textMuted : theme.accent,
                  boxShadow: 'var(--shadow-card)',
                  cursor: driftBottleDisabled ? 'not-allowed' : 'pointer',
                  opacity: driftBottleDisabled ? 0.72 : 1,
                }}
                title={t.itemDescription('drift-bottle')}
              >
                <span>🍾</span>
                <span>{`${t.itemName('drift-bottle')} · ${driftBottleCount}`}</span>
              </button>
            )}
            {trapNetCount > 0 && (
              <div
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] border text-xs font-medium"
                style={{
                  backgroundColor: `${theme.surface}cc`,
                  borderColor: theme.border,
                  color: theme.text,
                  boxShadow: 'var(--shadow-card)',
                }}
                title={t.itemName('trap-net')}
                data-testid="trap-net-inventory"
              >
                <span>🪤</span>
                <span>{trapNetCount}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* 农场场景 */}
      <div
        className={`farm-page relative isolate min-h-0 ${useFarmPlotBoardV2 && !compactShell ? 'flex-none -mx-3 sm:mx-0 sm:flex-1' : 'flex-1'} ${compactShell ? 'pt-0' : gentleV2Layout ? 'pt-1' : 'pt-4'}`}
        style={compactShell
          ? {
            background: 'linear-gradient(180deg, #90d6f6 0%, #bdeafd 38%, #b4e8a6 58%, #9ad577 80%, #8cc764 100%)',
          }
          : undefined}
      >
          {activeAlienSceneVisit && (
            <AlienVisitSceneOverlay
              visit={activeAlienSceneVisit}
              compactShell={compactShell}
              useFarmPlotBoardV2={useFarmPlotBoardV2}
              t={t}
            />
          )}
          {useFarmPlotBoardV2 ? (
            <FarmPlotBoardV2
              compactMode={compactShell}
              plots={farm.plots}
              weather={weather}
              todayFocusMinutes={todayFocusMinutes}
              coinBalance={coinBalance}
              plantableSeedCount={totalPlantableSeeds}
              harvestablePlotCount={harvestablePlotCount}
              onPlotClick={(plotId, state) => {
                if (state === 'empty') {
                  setActiveTooltipPlotId(null);
                  setPlantingPlotId(plotId);
                } else if (state === 'growing') {
                  setActiveTooltipPlotId(activeTooltipPlotId === plotId ? null : plotId);
                } else if (state === 'mature') {
                  setActiveTooltipPlotId(null);
                  handleHarvest(plotId);
                }
              }}
            />
          ) : (
            <SimpleFarmGrid
              compactMode={compactShell}
              plots={farm.plots}
              weather={weather}
              nowTimestamp={nowTimestamp}
              activeTooltipPlotId={effectiveActiveTooltipPlotId}
              stolenRecordByPlotId={latestStolenRecordByPlotId}
              mutationGunCount={mutationGunCount}
              moonDewCount={moonDewCount}
              starDewCount={starDewCount}
              nectarCount={nectarCount}
              starTrackerCount={starTrackerCount}
              trapNetCount={trapNetCount}
              onActiveTooltipChange={setActiveTooltipPlotId}
              onPlant={(plotId) => {
                setPlantingPlotId(plotId);
              }}
              onHarvest={handleHarvest}
              onClear={onClear}
              onUseMutationGun={onUseMutationGun}
              onUseMoonDew={onUseMoonDew}
              onUseStarDew={onUseStarDew}
              onUseNectar={onUseNectar}
              onUseStarTracker={onUseStarTracker}
              onUseTrapNet={onUseTrapNet}
            />
          )}
      </div>

      {useFarmPlotBoardV2 && activeGrowingPlot && activeGrowingSnapshot && (
        <div
          data-testid="farm-v2-growth-info-card"
          className="mx-2 rounded-[var(--radius-card)] border px-3 py-2 text-xs shadow-[var(--shadow-card)] sm:mx-0"
          style={{
            backgroundColor: `${theme.surface}e8`,
            borderColor: `${theme.accent}44`,
            color: theme.text,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold" style={{ color: theme.accent }}>
              🌱 {t.farmStage(activeGrowingSnapshot.stage)} · {activeGrowingSnapshot.progressPercent}%
            </div>
            <button
              onClick={() => setActiveTooltipPlotId(null)}
              className="rounded px-1.5 py-0.5 text-[11px]"
              style={{ backgroundColor: `${theme.text}14`, color: theme.textMuted }}
              aria-label="Close growth tooltip"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
            {t.farmGrowthTime(activeGrowingSnapshot.accumulatedMinutes, activeGrowingSnapshot.matureMinutes)}
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${theme.text}1f` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${activeGrowingSnapshot.progressPercent}%`,
                background: 'linear-gradient(90deg, #6bc15a 0%, #86db68 100%)',
              }}
            />
          </div>
          {activeGrowingSnapshot.hasTracker && (
            <div className="mt-1 text-[11px]" style={{ color: '#f59e0b' }}>📡 {t.itemStarTrackerActive}</div>
          )}
          {activeGrowingSnapshot.needsFocusHint && (
            <div className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>{t.farmFocusBoostHint}</div>
          )}
          {canUseActivePlotStarDew && activeGrowingPlot && (
            <button
              type="button"
              onClick={() => onUseStarDew(activeGrowingPlot.id)}
              data-testid="farm-v2-star-dew-action"
              className="mt-2 w-full rounded-[var(--radius-sm)] px-3 py-2 text-[11px] font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5"
              style={{ color: '#000', background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 58%, #fb7185 100%)' }}
            >
              ✨ {t.itemName('star-dew')} · {starDewCount}
            </button>
          )}
        </div>
      )}

      {/* 没有种子提示 */}
      {totalPlantableSeeds === 0 && farm.plots.every(p => p.state === 'empty') && (
        <div
          className="text-center p-4 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
          style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
        >
          <p className="text-sm mb-2" style={{ color: theme.textMuted }}>{t.farmNoSeeds}</p>
          <button
            onClick={onGoWarehouse}
            className="text-sm font-medium px-4 py-2 rounded-[var(--radius-sm)] transition-all duration-200 ease-in-out hover:-translate-y-0.5"
            style={{ color: theme.accent, backgroundColor: `${theme.accent}15` }}
          >
            {t.farmGoSlice}
          </button>
        </div>
      )}

      {/* 种植弹窗 */}
      {plantingPlotId !== null && (
          <PlantModal
            seeds={seeds}
            injectedSeeds={injectedSeeds}
            hybridSeeds={hybridSeeds}
            prismaticSeeds={prismaticSeeds}
            darkMatterSeeds={darkMatterSeeds}
            pendingRevealedNormalSeed={pendingRevealedNormalSeed}
            theme={theme}
            t={t}
            onSelect={handlePlant}
            onSelectPendingRevealedNormal={handlePlantPendingRevealedNormal}
            onSelectInjected={handlePlantInjected}
            onSelectHybrid={handlePlantHybrid}
            onSelectPrismatic={handlePlantPrismatic}
            onSelectDarkMatter={handlePlantDarkMatter}
            onClose={() => setPlantingPlotId(null)}
          />
        )}

      {/* 农场规则弹窗 */}
      {showFarmHelp && (
        <FarmHelpModal
          theme={theme}
          t={t}
          onClose={() => setShowFarmHelp(false)}
        />
      )}

      {/* 品种揭晓动画 */}
      {revealAnim && (
        <RevealOverlay varietyId={revealAnim.varietyId} t={t} />
      )}

      {/* 收获动画 */}
      {harvestAnim && (
        <HarvestOverlay
          varietyId={harvestAnim.varietyId}
          isNew={harvestAnim.isNew}
          collectedCount={harvestAnim.collectedCount}
          rewardSeedQuality={harvestAnim.rewardSeedQuality}
          t={t}
        />
      )}
    </div>
  );
}

function AlienVisitSceneOverlay({
  visit,
  compactShell,
  useFarmPlotBoardV2,
  t,
}: {
  visit: AlienAppearance;
  compactShell: boolean;
  useFarmPlotBoardV2: boolean;
  t: ReturnType<typeof useI18n>;
}) {
  const visual = ALIEN_VISITOR_VISUALS[visit.type];
  const directionClass = visual.align === 'left' ? 'justify-start' : 'justify-end';
  const rowClass = visual.align === 'left' ? 'flex-row' : 'flex-row-reverse';
  const bubbleTailStyle = visual.align === 'left'
    ? { left: '-7px' }
    : { right: '-7px' };

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-30 flex ${directionClass} select-none`}
      style={{
        top: useFarmPlotBoardV2
          ? `calc(env(safe-area-inset-top, 0px) + ${compactShell ? 56 : 58}px)`
          : 'calc(env(safe-area-inset-top, 0px) + 20px)',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 12px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 12px)',
      }}
    >
      <div
        className={`relative flex max-w-full items-end gap-2 sm:gap-3 ${rowClass}`}
        data-testid="farm-alien-visit-overlay"
        data-alien-type={visit.type}
        role="status"
        aria-live="polite"
      >
        <div
          className="absolute inset-x-3 -inset-y-2 rounded-[28px] blur-2xl"
          aria-hidden="true"
          style={{ background: visual.glow }}
        />

        <div className="relative z-10 shrink-0 self-end">
          <div
            className="grid h-11 w-11 place-items-center rounded-full border text-xl shadow-[0_10px_22px_rgba(34,24,18,0.16)] sm:h-12 sm:w-12 sm:text-2xl"
            style={{
              background: visual.avatarBackground,
              borderColor: visual.avatarBorderColor,
            }}
            aria-hidden="true"
          >
            {visual.avatar}
          </div>
          <div
            className="absolute inset-x-2 -bottom-1 h-2 rounded-full blur-sm"
            aria-hidden="true"
            style={{ background: visual.glow, opacity: 0.85 }}
          />
        </div>

        <div
          className="relative z-10 rounded-[22px] border px-3 py-2.5 shadow-[0_12px_30px_rgba(50,36,24,0.14)] backdrop-blur-[6px] sm:px-4 sm:py-3"
          style={{
            maxWidth: compactShell
              ? 'min(84vw, 18rem)'
              : useFarmPlotBoardV2
                ? 'min(82vw, 22rem)'
                : 'min(84vw, 20rem)',
            background: visual.bubbleBackground,
            borderColor: visual.borderColor,
            color: visual.textColor,
          }}
        >
          <span
            className="absolute bottom-3 h-3 w-3 rotate-45 rounded-[4px] border"
            aria-hidden="true"
            style={{
              ...bubbleTailStyle,
              background: visual.bubbleBackground,
              borderColor: visual.borderColor,
            }}
          />
          <p
            data-testid="farm-alien-visit-message"
            className="relative text-[11px] font-semibold leading-5 sm:text-xs"
          >
            {t[visit.messageKey]}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tab header ───
function SubTabHeader({ subTab, setSubTab, theme, t, gentle = false }: {
  subTab: SubTab;
  setSubTab: (t: SubTab) => void;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  gentle?: boolean;
}) {
  const subTabIndex: Record<SubTab, number> = {
    plots: 0,
    collection: 1,
    lab: 2,
  };

  const wrapperStyle = gentle
    ? {
      backgroundColor: 'rgba(244,231,198,0.28)',
      border: '1px solid rgba(178,138,96,0.34)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.28) inset',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
    }
    : { backgroundColor: theme.inputBg };

  const indicatorStyle = gentle
    ? {
      background: 'linear-gradient(180deg, rgba(232,157,112,0.34) 0%, rgba(211,121,78,0.26) 100%)',
      opacity: 1,
    }
    : {
      backgroundColor: theme.accent,
      opacity: 0.16,
    };

  const activeTextColor = gentle ? '#5c371f' : theme.text;
  const inactiveTextColor = gentle ? 'rgba(90,60,37,0.75)' : theme.textMuted;

  return (
    <div className="w-full">
      <div className="relative flex items-center rounded-full p-[3px]" style={wrapperStyle}>
        <div
          className="absolute top-[3px] bottom-[3px] rounded-full transition-all duration-200 ease-in-out"
          style={{
            ...indicatorStyle,
            width: 'calc((100% - 6px) / 3)',
            left: '3px',
            transform: `translateX(${subTabIndex[subTab] * 100}%)`,
          }}
        />
        <button
          onClick={() => setSubTab('plots')}
          className="relative z-10 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ease-in-out cursor-pointer flex-1"
          style={{
            color: subTab === 'plots' ? activeTextColor : inactiveTextColor,
          }}
        >
          🌱 {t.farmPlotsTab}
        </button>
        <button
          onClick={() => setSubTab('collection')}
          className="relative z-10 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ease-in-out cursor-pointer flex-1"
          style={{
            color: subTab === 'collection' ? activeTextColor : inactiveTextColor,
          }}
        >
          📖 {t.farmCollectionTab}
        </button>
        <button
          onClick={() => setSubTab('lab')}
          className="relative z-10 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ease-in-out cursor-pointer flex-1"
          style={{
            color: subTab === 'lab' ? activeTextColor : inactiveTextColor,
          }}
        >
          🧪 {t.farmTabLab}
        </button>
      </div>
    </div>
  );
}

// ─── 地块卡片 ───
export interface PlotCardProps {
  plot: Plot;
  weather: Weather;
  stolenRecord?: StolenRecord;
  nowTimestamp: number;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  isTooltipOpen: boolean;
  onTooltipToggle: () => void;
  onPlantClick: () => void;
  onHarvestClick: () => void;
  onClearClick: () => void;
  mutationGunCount: number;
  onUseMutationGun: () => void;
  moonDewCount: number;
  onUseMoonDew: () => void;
  starDewCount: number;
  onUseStarDew: () => void;
  nectarCount: number;
  onUseNectar: () => void;
  starTrackerCount: number;
  onUseStarTracker: () => void;
  trapNetCount: number;
  onUseTrapNet: () => void;
}

export function PlotCard({ plot, stolenRecord, nowTimestamp, theme, t, isTooltipOpen, onTooltipToggle, onPlantClick, onHarvestClick, onClearClick, mutationGunCount, onUseMutationGun, moonDewCount, onUseMoonDew, starDewCount, onUseStarDew, nectarCount, onUseNectar, starTrackerCount, onUseStarTracker, trapNetCount, onUseTrapNet }: PlotCardProps) {
  const variety = plot.varietyId ? VARIETY_DEFS[plot.varietyId] : null;
  const varietyLabel = plot.varietyId
    ? `${t.varietyName(plot.varietyId)}${plot.isMutant ? ` · ${t.mutationPositive}` : ''}`
    : '';
  const negativeStatusText = plot.mutationStatus === 'negative'
    ? (plot.state === 'withered' ? t.mutationWithered : t.mutationDowngraded)
    : null;
  const revealed = plot.varietyId ? isVarietyRevealed(plot.progress) : false;
  const stage = getGrowthStage(plot.progress);
  const progressPercent = Math.min(100, plot.progress * 100);
  const matureMinutes = variety?.matureMinutes ?? 10000;
  const mutationChance = Math.max(0, Math.min(1, plot.mutationChance ?? 0.02));
  const isMutationResolved = plot.progress >= 0.20 && (plot.mutationChance ?? 0.02) === 0;
  const canUseMutationGun = plot.state === 'growing'
    && (plot.mutationStatus ?? 'none') === 'none'
    && mutationGunCount > 0
    && !isMutationResolved
    && plot.progress < 0.20;
  const canUseStarDew = plot.state === 'growing' && Boolean(plot.varietyId) && starDewCount > 0;
  const canUseMoonDew = plot.state === 'mature' && moonDewCount > 0;
  const canUseNectar = plot.state === 'withered' && nectarCount > 0;
  const canUseStarTracker = (plot.state === 'growing' || plot.state === 'mature') && starTrackerCount > 0 && !plot.hasTracker;
  const canUseTrapNet = Boolean(plot.thief) && trapNetCount > 0;
  const shouldPreferMatureTooltip = canUseMoonDew || canUseStarTracker;
  const shouldPreferWitheredTooltip = canUseNectar;
  const thiefTotalMs = plot.thief ? Math.max(1, plot.thief.stealsAt - plot.thief.appearedAt) : 1;
  const thiefRemainingMs = plot.thief ? Math.max(0, plot.thief.stealsAt - nowTimestamp) : 0;
  const thiefElapsedPercent = plot.thief
    ? Math.min(100, ((thiefTotalMs - thiefRemainingMs) / thiefTotalMs) * 100)
    : 0;
  const isStolenRecovered = stolenRecord?.resolved === true && stolenRecord.recoveredCount > 0;

  const [isHovered, setIsHovered] = useState(false);
  const [isPlantFxActive, setIsPlantFxActive] = useState(false);
  const [harvestFxEmoji, setHarvestFxEmoji] = useState<string | null>(null);
  const previousPlotStateRef = useRef<Plot['state']>(plot.state);
  const plantFxFrameRef = useRef<number | null>(null);
  const plantFxTimerRef = useRef<number | null>(null);
  const harvestFxTimerRef = useRef<number | null>(null);

  const clearPlantFxSchedule = useCallback(() => {
    if (plantFxFrameRef.current !== null) {
      window.cancelAnimationFrame(plantFxFrameRef.current);
      plantFxFrameRef.current = null;
    }
    if (plantFxTimerRef.current !== null) {
      window.clearTimeout(plantFxTimerRef.current);
      plantFxTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const previousState = previousPlotStateRef.current;
    if (previousState === 'empty' && plot.state === 'growing') {
      clearPlantFxSchedule();
      plantFxFrameRef.current = window.requestAnimationFrame(() => {
        plantFxFrameRef.current = null;
        setIsPlantFxActive(true);
        plantFxTimerRef.current = window.setTimeout(() => {
          setIsPlantFxActive(false);
          plantFxTimerRef.current = null;
        }, 680);
      });
    } else if (plot.state !== 'growing') {
      clearPlantFxSchedule();
      plantFxFrameRef.current = window.requestAnimationFrame(() => {
        plantFxFrameRef.current = null;
        setIsPlantFxActive(false);
      });
    }
    previousPlotStateRef.current = plot.state;
  }, [clearPlantFxSchedule, plot.state]);

  useEffect(() => () => {
    clearPlantFxSchedule();
    if (harvestFxTimerRef.current !== null) {
      window.clearTimeout(harvestFxTimerRef.current);
    }
  }, [clearPlantFxSchedule]);

  const triggerHarvestFx = useCallback((emoji: string) => {
    if (harvestFxTimerRef.current !== null) {
      window.clearTimeout(harvestFxTimerRef.current);
    }
    setHarvestFxEmoji(emoji);
    harvestFxTimerRef.current = window.setTimeout(() => {
      setHarvestFxEmoji(null);
      harvestFxTimerRef.current = null;
    }, 720);
  }, []);

  const handleHarvestAction = useCallback(() => {
    triggerHarvestFx(variety?.emoji ?? '🍉');
    onHarvestClick();
  }, [onHarvestClick, triggerHarvestFx, variety?.emoji]);

  const stageSwayAnimation = stage === 'seed' || stage === 'sprout'
    ? 'plantSwaySm 4s ease-in-out infinite'
    : stage === 'leaf' || stage === 'flower'
      ? 'plantSwayMd 3.5s ease-in-out infinite'
      : stage === 'green'
        ? 'plantSwayMd 3.2s ease-in-out infinite'
        : 'plantSwayLg 3.8s ease-in-out infinite';


  return (
    <div
      className={`group relative w-full h-full select-none${isTooltipOpen ? ' z-[100]' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsHovered(true)}
      onBlurCapture={() => setIsHovered(false)}
    >
      <div
        className="relative h-full w-full transform-gpu transition-all duration-200 ease-out"
        style={{
          transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        }}
      >
        {isPlantFxActive && (
          <span
            className="pointer-events-none absolute left-1/2 top-[14%] z-30 text-[1.35rem]"
            style={{
              transform: 'translateX(-50%)',
              animation: 'farmSeedDrop 420ms ease-out forwards',
            }}
          >
            🌱
          </span>
        )}
        {harvestFxEmoji && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <span
              className="text-[clamp(2.2rem,7vw,3.2rem)]"
              style={{
                animation: 'farmHarvestPop 520ms ease-out forwards',
              }}
            >
              {harvestFxEmoji}
            </span>
            <span
              className="absolute text-[1.1rem]"
              style={{
                animation: 'farmSparkleRise 560ms ease-out forwards',
              }}
            >
              ✨
            </span>
          </div>
        )}

        {/* Empty plot */}
        {plot.state === 'empty' && (
          <button
            onClick={onPlantClick}
            className="absolute inset-0 flex items-center justify-center text-center transition-all duration-200 ease-out hover:-translate-y-0.5"
          >
            <span
              className="pointer-events-none absolute left-1/2 top-[62%] h-3 w-12 -translate-x-1/2"
              style={{
                background: 'linear-gradient(180deg, rgba(104,70,43,0.42) 0%, rgba(104,70,43,0) 100%)',
                borderRadius: '999px',
              }}
            />
            <span className="relative h-10 w-12">
              <span
                className="absolute left-1/2 top-1 h-[3px] w-[3px] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: '#6b4a2d' }}
              />
              <span
                className="absolute left-[28%] top-[28%] h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: '#7a5432' }}
              />
              <span
                className="absolute right-[26%] top-[26%] h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: '#7a5432' }}
              />
              <span
                className="absolute left-[24%] bottom-[18%] h-5 w-3 -rotate-[14deg] rounded-[100%_0_100%_0]"
                style={{
                  background: 'linear-gradient(160deg, #7ec95f 0%, #4c9f44 100%)',
                  border: '1px solid rgba(58,115,48,0.7)',
                }}
              />
              <span
                className="absolute right-[24%] bottom-[18%] h-5 w-3 rotate-[14deg] rounded-[0_100%_0_100%]"
                style={{
                  background: 'linear-gradient(200deg, #7ec95f 0%, #4c9f44 100%)',
                  border: '1px solid rgba(58,115,48,0.7)',
                }}
              />
            </span>
          </button>
        )}

        {/* Growing plot */}
        {plot.state === 'growing' && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-3 py-3 text-center cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onTooltipToggle();
            }}
          >
            <div className="relative h-[4.2rem] w-full">
              <span
                className="pointer-events-none absolute left-1/2 top-[64%] h-3 w-14 -translate-x-1/2"
                style={{
                  background: 'linear-gradient(180deg, rgba(71,46,27,0.5) 0%, rgba(71,46,27,0) 100%)',
                  borderRadius: '999px',
                }}
              />
              <span
                className="absolute left-1/2 top-[34%] h-10 w-10 -translate-x-1/2 -translate-y-1/2"
                style={{
                  animation: stageSwayAnimation,
                  transformOrigin: 'bottom center',
                  filter: 'drop-shadow(0 2px 1px rgba(0,0,0,0.16))',
                }}
              >
                <span
                  className="absolute left-1/2 bottom-[8%] h-5 w-[3px] -translate-x-1/2 rounded-full"
                  style={{ background: 'linear-gradient(180deg, #77bf53 0%, #4e9440 100%)' }}
                />
                <span
                  className="absolute left-[12%] bottom-[26%] h-4 w-3 -rotate-[22deg] rounded-[100%_0_100%_0]"
                  style={{
                    background: 'linear-gradient(160deg, #86d069 0%, #4ea145 100%)',
                    border: '1px solid rgba(62,128,53,0.78)',
                  }}
                />
                <span
                  className="absolute right-[12%] bottom-[26%] h-4 w-3 rotate-[22deg] rounded-[0_100%_0_100%]"
                  style={{
                    background: 'linear-gradient(200deg, #86d069 0%, #4ea145 100%)',
                    border: '1px solid rgba(62,128,53,0.78)',
                  }}
                />
              </span>
              <span
                className="absolute left-[17%] top-[43%] h-6 w-6"
                style={{ animation: 'plantSwaySm 3.2s ease-in-out infinite', transformOrigin: 'bottom center' }}
              >
                <span className="absolute left-1/2 bottom-0 h-3 w-[2px] -translate-x-1/2 rounded-full" style={{ backgroundColor: '#5aa04a' }} />
                <span className="absolute left-[18%] top-[22%] h-3 w-2 -rotate-[20deg] rounded-[100%_0_100%_0]" style={{ background: 'linear-gradient(160deg, #86d069 0%, #56aa4d 100%)' }} />
                <span className="absolute right-[18%] top-[22%] h-3 w-2 rotate-[20deg] rounded-[0_100%_0_100%]" style={{ background: 'linear-gradient(200deg, #86d069 0%, #56aa4d 100%)' }} />
              </span>
              <span
                className="absolute right-[17%] top-[44%] h-6 w-6"
                style={{ animation: 'plantSwaySm 3.2s ease-in-out 120ms infinite', transformOrigin: 'bottom center' }}
              >
                <span className="absolute left-1/2 bottom-0 h-3 w-[2px] -translate-x-1/2 rounded-full" style={{ backgroundColor: '#5aa04a' }} />
                <span className="absolute left-[18%] top-[22%] h-3 w-2 -rotate-[20deg] rounded-[100%_0_100%_0]" style={{ background: 'linear-gradient(160deg, #86d069 0%, #56aa4d 100%)' }} />
                <span className="absolute right-[18%] top-[22%] h-3 w-2 rotate-[20deg] rounded-[0_100%_0_100%]" style={{ background: 'linear-gradient(200deg, #86d069 0%, #56aa4d 100%)' }} />
              </span>
            </div>
            {plot.thief && (
              <div className="mt-1 w-[78%]">
                <div className="h-1.5 overflow-hidden" style={{ backgroundColor: 'rgba(239,68,68,0.25)' }}>
                  <div
                    className="h-full transition-all duration-700"
                    style={{
                      width: `${thiefElapsedPercent}%`,
                      backgroundColor: '#ef4444',
                    }}
                  />
                </div>
                <span className="farm-plot-thief-status mt-1 block text-[10px] font-medium leading-tight" style={{ color: '#fca5a5' }}>
                  {t.thiefStealing(Math.max(1, Math.ceil(thiefRemainingMs / 60000)))}
                </span>
              </div>
            )}
            {negativeStatusText && (
              <span className="mt-1 text-[10px] font-medium leading-tight" style={{ color: '#ef4444' }}>
                {negativeStatusText}
              </span>
            )}
            {isTooltipOpen && (
              <div
                className="absolute left-1/2 top-full z-50 mt-2 w-max max-w-[200px] -translate-x-1/2 px-4 py-3 text-[11px] leading-relaxed text-white"
                style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
              >
                <span
                  className="absolute left-1/2 top-[-6px] -translate-x-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '6px solid rgba(0,0,0,0.85)',
                  }}
                />
                {revealed && variety && (
                  <div className="font-semibold">{varietyLabel}</div>
                )}
                {plot.state === 'growing' && (
                  <>
                    <div>{`${Math.round(progressPercent)}%`}</div>
                    <div>{t.farmGrowthTime(plot.accumulatedMinutes, matureMinutes)}</div>
                    {plot.hasTracker && <div style={{ color: '#fbbf24' }}>📡 {t.itemStarTrackerActive}</div>}
                    {plot.progress < 0.5 && <div>{t.farmFocusBoostHint}</div>}
                  </>
                )}
                {plot.thief && (
                  <div className="mt-1" style={{ color: '#ef4444' }}>
                    {thiefRemainingMs > 0
                      ? t.thiefStealing(Math.max(1, Math.ceil(thiefRemainingMs / (1000 * 60))))
                      : t.thiefStolen}
                  </div>
                )}
                {negativeStatusText && <div>{negativeStatusText}</div>}

                <div className="flex flex-col gap-2 mt-2">
                  {canUseMutationGun && (
                    <>
                      <div>{`${t.mutationChanceLabel}: ${Math.round(mutationChance * 100)}%`}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUseMutationGun();
                        }}
                        className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                        style={{ color: '#000', backgroundColor: '#fbbf24' }}
                      >
                        {`🔦 ${t.mutationGunUse} · ${mutationGunCount}`}
                      </button>
                    </>
                  )}
                  {canUseStarDew && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUseStarDew(); }}
                      data-testid="farm-legacy-star-dew-action"
                      className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                      style={{ color: '#000', background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 58%, #fb7185 100%)' }}
                    >
                      ✨ {t.itemName('star-dew')} · {starDewCount}
                    </button>
                  )}
                  {canUseStarTracker && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUseStarTracker(); }}
                      className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                      style={{ color: '#000', backgroundColor: '#fbbf24' }}
                    >
                      📡 {t.itemName('star-tracker')} · {starTrackerCount}
                    </button>
                  )}
                  {canUseTrapNet && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onUseTrapNet(); }}
                      className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                      style={{ color: '#000', backgroundColor: '#fbbf24' }}
                    >
                      🪤 {t.itemName('trap-net')} · {trapNetCount}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mature plot */}
        {plot.state === 'mature' && variety && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (shouldPreferMatureTooltip) {
                onTooltipToggle();
                return;
              }
              handleHarvestAction();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center px-3 py-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5"
          >
            <div className="grid h-[4.6rem] w-[4.6rem] grid-cols-2 grid-rows-2 place-items-center gap-1">
              {[0, 120, 60, 180].map((delayMs) => (
                <span
                  key={delayMs}
                  className="relative h-8 w-8 rounded-full"
                  style={{
                    animation: `farmMaturePulse 1.65s ease-in-out ${delayMs}ms infinite`,
                    filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.24))',
                    background: 'radial-gradient(circle at 32% 28%, #9be07a 0%, #4fae42 42%, #2f7c2f 100%)',
                    border: '2px solid #2d6f2a',
                  }}
                >
                  <span className="absolute inset-[20%] rounded-full opacity-55" style={{ background: 'repeating-linear-gradient(90deg, rgba(30,94,37,0.86) 0px, rgba(30,94,37,0.86) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)' }} />
                </span>
              ))}
            </div>
            {negativeStatusText && (
              <span className="mt-1 text-[10px] font-medium leading-tight" style={{ color: '#ef4444' }}>
                {negativeStatusText}
              </span>
            )}
          </button>
        )}

        {plot.state === 'mature' && (
          <div className="absolute left-2 top-2 z-30 flex flex-col gap-1">
            {canUseMoonDew && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUseMoonDew();
                }}
                className="px-2 py-1 text-[10px] font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5"
                style={{ backgroundColor: '#fbbf24', color: '#000' }}
              >
                {`🌙 ${moonDewCount}`}
              </button>
            )}
            {canUseStarTracker && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUseStarTracker();
                }}
                className="px-2 py-1 text-[10px] font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5"
                style={{ backgroundColor: '#60a5fa', color: '#001426' }}
              >
                {`📡 ${starTrackerCount}`}
              </button>
            )}
          </div>
        )}

        {plot.state === 'mature' && isTooltipOpen && (
          <div
            className="absolute left-1/2 top-full z-50 mt-2 w-max max-w-[220px] -translate-x-1/2 px-4 py-3 text-[11px] leading-relaxed text-white"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute left-1/2 top-[-6px] -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid rgba(0,0,0,0.85)',
              }}
            />
            <div className="font-semibold">{varietyLabel}</div>
            <div>{t.farmStage('fruit')}</div>
            <div className="flex flex-col gap-2 mt-2">
              {canUseMoonDew && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseMoonDew();
                  }}
                  className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                  style={{ color: '#000', backgroundColor: '#fbbf24' }}
                >
                  🌙 {t.itemName('moon-dew')} · {moonDewCount}
                </button>
              )}
              {canUseStarTracker && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseStarTracker();
                  }}
                  className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                  style={{ color: '#000', backgroundColor: '#60a5fa' }}
                >
                  📡 {t.itemName('star-tracker')} · {starTrackerCount}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleHarvestAction();
                }}
                className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                style={{ color: '#000', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
              >
                ✋ {t.farmHarvest}
              </button>
            </div>
          </div>
        )}

        {/* Withered plot */}
        {plot.state === 'withered' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (shouldPreferWitheredTooltip) {
                onTooltipToggle();
                return;
              }
              onClearClick();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center px-3 py-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5"
          >
            <span className="text-[clamp(1.9rem,6vw,2.5rem)] grayscale">💀</span>
            <span className="text-[11px] font-medium" style={{ color: theme.textMuted }}>
              {negativeStatusText ?? t.farmWithered}
            </span>
            <span
              className="mt-1 px-3 py-1 text-[10px] font-medium"
              style={{ color: theme.textMuted, backgroundColor: `${theme.border}66` }}
            >
              {t.farmClear}
            </span>
          </button>
        )}

        {plot.state === 'withered' && canUseNectar && (
          <div className="absolute left-2 top-2 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUseNectar();
              }}
              className="px-2 py-1 text-[10px] font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5"
              style={{ backgroundColor: '#38bdf8', color: '#001426' }}
            >
              {`💧 ${nectarCount}`}
            </button>
          </div>
        )}

        {plot.state === 'withered' && isTooltipOpen && (
          <div
            className="absolute left-1/2 top-full z-50 mt-2 w-max max-w-[220px] -translate-x-1/2 px-4 py-3 text-[11px] leading-relaxed text-white"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="absolute left-1/2 top-[-6px] -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid rgba(0,0,0,0.85)',
              }}
            />
            <div>{negativeStatusText ?? t.farmWithered}</div>
            <div className="flex flex-col gap-2 mt-2">
              {canUseNectar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseNectar();
                  }}
                  className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                  style={{ color: '#000', backgroundColor: '#38bdf8' }}
                >
                  💧 {t.itemName('nectar')} · {nectarCount}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearClick();
                }}
                className="w-full px-3 py-2 text-[11px] font-medium cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5"
                style={{ color: theme.textMuted, backgroundColor: `${theme.border}66` }}
              >
                {t.farmClear}
              </button>
            </div>
          </div>
        )}

        {/* Stolen plot */}
        {plot.state === 'stolen' && (
          <button
            onClick={onClearClick}
            className="absolute inset-0 flex flex-col items-center justify-center px-3 py-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5"
          >
            <span className="text-[clamp(1.8rem,5.8vw,2.4rem)]">📜</span>
            <span className="mt-1 text-[11px] font-semibold leading-tight" style={{ color: '#fee2e2' }}>
              {t.thiefNote}
            </span>
            <span className="mt-1 text-[10px] leading-tight" style={{ color: '#fecaca' }}>
              {t.thiefRecoveryTask}
            </span>
            {isStolenRecovered && (
              <span
                className="mt-1 px-3 py-1 text-[10px] font-semibold leading-tight"
                style={{
                  color: '#dcfce7',
                  backgroundColor: 'rgba(22,163,74,0.24)',
                  border: '1px solid rgba(110,231,183,0.5)',
                }}
              >
                {t.thiefRecovered}
              </span>
            )}
            <span
              className="mt-1 px-3 py-1 text-[10px] font-medium"
              style={{ color: '#fecaca', backgroundColor: 'rgba(127,29,29,0.5)' }}
            >
              {t.farmClear}
            </span>
          </button>
        )}


      </div>

      <style>{`
        @keyframes plantSwaySm {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes plantSwayMd {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes plantSwayLg {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes progressShine {
          0% { transform: translateX(-110%); opacity: 0.2; }
          35% { opacity: 0.95; }
          100% { transform: translateX(390%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── 种植弹窗 ───
function PlantModal({ seeds, injectedSeeds, hybridSeeds, prismaticSeeds, darkMatterSeeds, pendingRevealedNormalSeed, theme, t, onSelect, onSelectPendingRevealedNormal, onSelectInjected, onSelectHybrid, onSelectPrismatic, onSelectDarkMatter, onClose }: {
  seeds: SeedCounts;
  injectedSeeds: InjectedSeed[];
  hybridSeeds: import('../types/slicing').HybridSeed[];
  prismaticSeeds: PrismaticSeed[];
  darkMatterSeeds: DarkMatterSeed[];
  pendingRevealedNormalSeed: PendingRevealedNormalSeed | null;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  onSelect: (quality: SeedQuality) => void;
  onSelectPendingRevealedNormal: () => void;
  onSelectInjected: (seedId: string) => void;
  onSelectHybrid: (seedId: string) => void;
  onSelectPrismatic: (seedId: string) => void;
  onSelectDarkMatter: (seedId: string) => void;
  onClose: () => void;
}) {
  const options = [
    { quality: 'normal' as SeedQuality, emoji: '🌱', count: seeds.normal, color: '#a3a3a3' },
    { quality: 'epic' as SeedQuality, emoji: '💎', count: seeds.epic, color: '#a78bfa' },
    { quality: 'legendary' as SeedQuality, emoji: '🌟', count: seeds.legendary, color: '#fbbf24' },
  ];
  const qualityColor: Record<SeedQuality, string> = {
    normal: '#a3a3a3',
    epic: '#a78bfa',
    legendary: '#fbbf24',
  };
  const hybridSeedGroups = hybridSeeds.reduce<Array<{
    galaxyPair: import('../types/slicing').HybridSeed['galaxyPair'];
    seedId: string;
    count: number;
  }>>((groups, seed) => {
    const existing = groups.find((group) => group.galaxyPair === seed.galaxyPair);
    if (existing) {
      existing.count += 1;
      return groups;
    }
    groups.push({ galaxyPair: seed.galaxyPair, seedId: seed.id, count: 1 });
    return groups;
  }, []);
  const prismaticSeedGroups = prismaticSeeds.reduce<Array<{
    varietyId: VarietyId;
    seedId: string;
    count: number;
  }>>((groups, seed) => {
    const existing = groups.find((group) => group.varietyId === seed.varietyId);
    if (existing) {
      existing.count += 1;
      return groups;
    }
    groups.push({ varietyId: seed.varietyId, seedId: seed.id, count: 1 });
    return groups;
  }, []);
  const darkMatterSeedGroups = darkMatterSeeds.reduce<Array<{
    varietyId: VarietyId;
    seedId: string;
    count: number;
  }>>((groups, seed) => {
    const existing = groups.find((group) => group.varietyId === seed.varietyId);
    if (existing) {
      existing.count += 1;
      return groups;
    }
    groups.push({ varietyId: seed.varietyId, seedId: seed.id, count: 1 });
    return groups;
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <div className="relative rounded-[var(--radius-panel)] border p-5 mx-4 max-w-sm w-full animate-fade-up" style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: 'var(--shadow-elevated)' }}>
        <h3 className="text-base font-semibold text-center mb-4" style={{ color: theme.text }}>{t.farmSelectSeed}</h3>

        {pendingRevealedNormalSeed && (
          <div className="mb-3">
            <button
              type="button"
              onClick={onSelectPendingRevealedNormal}
              data-testid="farm-plant-modal-revealed-normal-seed"
              className="w-full rounded-[var(--radius-card)] border p-3 text-left transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card"
              style={{
                background: 'linear-gradient(135deg, rgba(241,233,255,0.96) 0%, rgba(230,209,255,0.95) 100%)',
                borderColor: '#a855f780',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold" style={{ color: '#581c87' }}>
                  {t.revealedNormalSeedLabel(t.varietyName(pendingRevealedNormalSeed.varietyId))}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold"
                  style={{ color: '#581c87', backgroundColor: 'rgba(168,85,247,0.16)' }}
                >
                  {t.seedQualityLabel('normal')}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: '#6b21a8' }}>
                {t.revealedNormalSeedHint}
              </p>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {options.map(opt => (
            <button
              key={opt.quality}
              disabled={opt.count <= 0}
              onClick={() => onSelect(opt.quality)}
              className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card"
              style={{
                backgroundColor: opt.count > 0 ? opt.color + '08' : theme.inputBg,
                borderColor: opt.count > 0 ? opt.color + '30' : theme.border,
                opacity: opt.count > 0 ? 1 : 0.4,
                cursor: opt.count > 0 ? 'pointer' : 'not-allowed',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-sm font-medium" style={{ color: opt.count > 0 ? opt.color : theme.textMuted }}>{t.seedQualityLabel(opt.quality)}</span>
              </div>
              <span className="text-sm" style={{ color: theme.textMuted }}>×{opt.count}</span>
            </button>
          ))}
        </div>

        {injectedSeeds.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
            <p className="text-xs mb-2 text-center" style={{ color: theme.textFaint }}>
              {t.injectedSeedHint}
            </p>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {injectedSeeds.map((seed) => {
                const badgeColor = qualityColor[seed.quality];
                return (
                  <button
                    key={seed.id}
                    onClick={() => onSelectInjected(seed.id)}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card text-left"
                    style={{
                      backgroundColor: `${badgeColor}10`,
                      borderColor: `${badgeColor}45`,
                      boxShadow: 'var(--shadow-card)',
                    }}
                  >
                    <span className="text-sm font-medium truncate pr-3" style={{ color: theme.text }}>
                      {t.injectedSeedLabel(t.galaxyName(seed.targetGalaxyId))}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold"
                      style={{ color: badgeColor, backgroundColor: `${badgeColor}22` }}
                    >
                      {t.seedQualityLabel(seed.quality)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {hybridSeedGroups.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
            <p className="text-xs mb-2 text-center" style={{ color: theme.textFaint }}>
              {t.hybridSeedHint}
            </p>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {hybridSeedGroups.map((seed) => (
                <button
                  key={seed.galaxyPair}
                  onClick={() => onSelectHybrid(seed.seedId)}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card text-left"
                  style={{
                    backgroundColor: `${theme.accent}10`,
                    borderColor: `${theme.accent}35`,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span className="text-sm font-medium truncate pr-3" style={{ color: theme.text }}>
                    {t.hybridGalaxyPairLabel(seed.galaxyPair)}
                  </span>
                  <span className="text-sm shrink-0" style={{ color: theme.textMuted }}>
                    ×{seed.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {prismaticSeedGroups.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
            <p className="text-xs mb-2 text-center" style={{ color: theme.textFaint }}>
              {t.prismaticSeedHint}
            </p>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {prismaticSeedGroups.map((seed) => (
                <button
                  key={seed.varietyId}
                  onClick={() => onSelectPrismatic(seed.seedId)}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card text-left"
                  style={{
                    backgroundColor: '#a78bfa12',
                    borderColor: '#a78bfa45',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span className="text-sm font-medium truncate pr-3" style={{ color: theme.text }}>
                    {t.prismaticSeedLabel(t.varietyName(seed.varietyId))}
                  </span>
                  <span className="text-sm shrink-0" style={{ color: theme.textMuted }}>
                    ×{seed.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {darkMatterSeedGroups.length > 0 && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
            <p className="text-xs mb-2 text-center" style={{ color: theme.textFaint }}>
              {t.darkMatterSeedHint}
            </p>
            <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
              {darkMatterSeedGroups.map((seed) => (
                <button
                  key={seed.varietyId}
                  onClick={() => onSelectDarkMatter(seed.seedId)}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card text-left"
                  style={{
                    backgroundColor: '#0f172a55',
                    borderColor: '#94a3b855',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span className="text-sm font-medium truncate pr-3" style={{ color: theme.text }}>
                    {t.darkMatterSeedLabel(t.varietyName(seed.varietyId))}
                  </span>
                  <span className="text-sm shrink-0" style={{ color: theme.textMuted }}>
                    ×{seed.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center mt-3" style={{ color: theme.textFaint }}>{t.farmSeedHint}</p>
        <button onClick={onClose} className="w-full mt-3 py-2 rounded-[var(--radius-sm)] text-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button" style={{ color: theme.textMuted, backgroundColor: theme.border + '30' }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

// ─── 品种揭晓动画 ───
function RevealOverlay({ varietyId, t }: {
  varietyId: VarietyId;
  t: ReturnType<typeof useI18n>;
}) {
  const variety = VARIETY_DEFS[varietyId];
  const color = RARITY_COLOR[variety.rarity];
  const rarityStars = RARITY_STARS[variety.rarity];
  const isRarePlus = rarityStars >= REVEAL_RARE_PLUS_MIN_STARS;
  const revealDuration = isRarePlus ? REVEAL_DURATION_RARE_PLUS_MS : REVEAL_DURATION_MS;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none overflow-hidden"
      style={{ backgroundColor: isRarePlus ? 'rgba(2,6,14,0.56)' : 'transparent' }}
    >
      {isRarePlus && (
        <div className="absolute inset-0">
          <div
            className="absolute left-1/2 top-1/2 w-[460px] h-[460px] rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, ${color}88 20%, transparent 38%, ${color}66 56%, transparent 74%, ${color}99 92%, transparent 100%)`,
              animation: 'revealRareBandSpin 6.5s linear infinite',
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 w-[360px] h-[360px] rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              border: `1px solid ${color}66`,
              boxShadow: `0 0 48px ${color}55`,
              animation: 'revealRareBandReverse 5.4s linear infinite',
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 w-[320px] h-[320px] -translate-x-1/2 -translate-y-1/2"
            style={{ animation: 'revealParticleRing 5.2s linear infinite' }}
          >
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (Math.PI * 2 * i) / 16;
              const x = 50 + Math.cos(angle) * 43;
              const y = 50 + Math.sin(angle) * 43;
              const size = i % 3 === 0 ? 6 : 4;
              return (
                <span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: i % 2 === 0 ? color : '#fff',
                    boxShadow: `0 0 12px ${color}`,
                    animation: `revealParticleFlicker 1.4s ease-in-out ${i * 0.08}s infinite`,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div
        className="relative flex flex-col items-center"
        style={{
          animation: isRarePlus
            ? `revealPopRare ${revealDuration}ms cubic-bezier(0.22, 1.25, 0.35, 1) forwards`
            : `revealPop ${revealDuration}ms ease-out forwards`,
        }}
      >
        {rarityStars >= 2 && (
          <div
            className="absolute w-44 h-44 rounded-full"
            style={{
              background: `radial-gradient(circle, ${color}44 0%, transparent 72%)`,
              animation: 'revealGlow 1.4s ease-in-out infinite alternate',
            }}
          />
        )}
        <span className="text-6xl mb-3" style={{
          filter: rarityStars >= 2 ? `drop-shadow(0 0 24px ${color})` : 'none',
          animation: isRarePlus
            ? 'revealEmojiRare 1.05s cubic-bezier(0.34, 1.66, 0.58, 1) forwards'
            : 'revealEmoji 0.82s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}>
          {variety.emoji}
        </span>
        <div className="text-center">
          <p
            className="text-lg font-bold mb-1"
            style={{
              color: '#fff',
              textShadow: isRarePlus
                ? `0 0 14px ${color}, 0 0 26px ${color}88, 0 3px 12px rgba(0,0,0,0.65)`
                : '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {t.farmReveal}
          </p>
          <p
            className="text-xl font-black"
            style={{
              color: isRarePlus ? '#fff' : color,
              textShadow: isRarePlus
                ? `0 0 18px ${color}, 0 0 36px ${color}AA`
                : `0 0 15px ${color}80`,
            }}
          >
            {t.varietyName(varietyId)}
          </p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {Array.from({ length: rarityStars }).map((_, i) => (
              <span
                key={i}
                style={{
                  color,
                  fontSize: 14,
                  textShadow: isRarePlus ? `0 0 10px ${color}` : 'none',
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes revealPop {
          0% { opacity: 0; transform: scale(0.3); }
          20% { opacity: 1; transform: scale(1.1); }
          40% { transform: scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: scale(1) translateY(-20px); }
        }
        @keyframes revealPopRare {
          0% { opacity: 0; transform: scale(0.16) rotate(-8deg); }
          18% { opacity: 1; transform: scale(1.2) rotate(3deg); }
          34% { transform: scale(0.96) rotate(-1deg); }
          50% { transform: scale(1.05) rotate(0deg); }
          82% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1) translateY(-30px); }
        }
        @keyframes revealGlow {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes revealEmoji {
          0% { transform: scale(0) rotate(-30deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes revealEmojiRare {
          0% { transform: scale(0) rotate(-38deg); }
          60% { transform: scale(1.2) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes revealRareBandSpin {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.95); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.05); opacity: 0.95; }
        }
        @keyframes revealRareBandReverse {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.35; }
          100% { transform: translate(-50%, -50%) rotate(-360deg); opacity: 0.75; }
        }
        @keyframes revealParticleRing {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.9); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.08); opacity: 1; }
        }
        @keyframes revealParticleFlicker {
          0%, 100% { opacity: 0.25; transform: translate(-50%, -50%) scale(0.65); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

// ─── 收获动画 ───
function HarvestOverlay({ varietyId, isNew, collectedCount, rewardSeedQuality, t }: {
  varietyId: VarietyId;
  isNew: boolean;
  collectedCount: number;
  rewardSeedQuality?: SeedQuality;
  t: ReturnType<typeof useI18n>;
}) {
  const variety = VARIETY_DEFS[varietyId];
  const color = RARITY_COLOR[variety.rarity];
  const safeCollectedCount = Math.max(isNew ? 1 : 2, collectedCount);
  const stars = RARITY_STARS[variety.rarity];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: isNew ? 'rgba(4,8,22,0.82)' : 'rgba(0,0,0,0.62)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0"
        style={{
          background: isNew
            ? `radial-gradient(circle at 50% 50%, ${color}26 0%, rgba(0,0,0,0) 52%)`
            : `radial-gradient(circle at 50% 50%, ${color}18 0%, rgba(0,0,0,0) 48%)`,
          animation: isNew ? 'harvestBackdropBreath 1.8s ease-in-out infinite alternate' : 'harvestRepeatBackdrop 2.3s ease-in-out infinite',
        }}
      />
      {isNew && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = 4 + ((i * 23) % 92);
            const delay = (i % 9) * 0.11;
            const duration = 1.9 + (i % 4) * 0.35;
            const size = 3 + (i % 3) * 2;
            const animationName = i % 3 === 0 ? 'harvestFireworkA' : i % 3 === 1 ? 'harvestFireworkB' : 'harvestFireworkC';
            const tint = i % 2 === 0 ? color : '#ffffff';
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${left}%`,
                  bottom: '-10%',
                  width: size,
                  height: size,
                  backgroundColor: tint,
                  boxShadow: `0 0 12px ${tint}`,
                  animation: `${animationName} ${duration}s ease-out ${delay}s infinite`,
                }}
              />
            );
          })}
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={`ray-${i}`}
              className="absolute left-1/2 top-1/2 w-[2px] h-[220px] origin-bottom"
              style={{
                transform: `translate(-50%, -88%) rotate(${i * 45}deg)`,
                background: `linear-gradient(180deg, ${color}DD 0%, transparent 100%)`,
                animation: `harvestRay 1.9s ease-out ${i * 0.07}s infinite`,
              }}
            />
          ))}
        </div>
      )}
      {!isNew && (
        <div
          className="absolute left-1/2 top-1/2 w-72 h-72 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"
          style={{
            background: `radial-gradient(circle, ${color}24 0%, transparent 70%)`,
            animation: 'harvestRepeatGlow 2.3s ease-in-out infinite',
          }}
        />
      )}

      <div
        className="relative flex flex-col items-center"
        style={{
          animation: isNew
            ? 'harvestEntry 0.72s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            : 'harvestEntryRepeat 0.45s ease-out forwards',
        }}
      >
        <span className="text-7xl mb-4" style={{
          filter: `drop-shadow(0 0 ${isNew ? 28 : 10}px ${color})`,
          animation: isNew ? 'harvestEmojiPulse 1.3s ease-in-out infinite' : 'none',
        }}>
          {variety.emoji}
        </span>

        <p className="text-xl font-black mb-1" style={{
          color: isNew ? '#fff' : color,
          textShadow: isNew ? `0 0 14px ${color}, 0 0 30px ${color}99` : `0 0 12px ${color}66`,
        }}>
          {t.varietyName(varietyId)}
        </p>

        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: stars }).map((_, i) => (
            <span key={i} style={{ color, fontSize: 16 }}>⭐</span>
          ))}
        </div>

        {isNew ? (
          <div className="flex flex-col items-center gap-1 mb-1">
            <span
              className="text-[11px] font-black"
              style={{
                color: '#fff',
                letterSpacing: '0.38em',
                paddingLeft: '0.38em',
                textShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
                animation: 'newFlash 0.75s steps(2, end) infinite',
              }}
            >
              {t.farmNewFlash}
            </span>
            <div className="px-4 py-2 rounded-full text-sm font-bold" style={{
              backgroundColor: `${color}22`,
              color,
              border: `1px solid ${color}55`,
              animation: 'newBadgePulse 1s ease-in-out infinite alternate',
            }}>
              ✨ {t.farmNewVariety}
            </div>
            {rewardSeedQuality && (
              <div
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.14)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.28)',
                }}
              >
                {`🌱 +1 ${t.seedQualityLabel(rewardSeedQuality)}`}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium" style={{
            color: 'rgba(255,255,255,0.82)',
            textShadow: '0 2px 6px rgba(0,0,0,0.45)',
          }}>
            {`${t.farmAlreadyCollected} ×${safeCollectedCount}`}
          </span>
        )}

        <p className="text-xs mt-3 max-w-[240px] text-center leading-relaxed" style={{ color: isNew ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.56)' }}>
          {t.varietyStory(varietyId)}
        </p>
      </div>

      <style>{`
        @keyframes harvestEntry {
          0% { opacity: 0; transform: scale(0.45) translateY(40px); }
          75% { opacity: 1; transform: scale(1.06) translateY(-6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes harvestEntryRepeat {
          0% { opacity: 0; transform: scale(0.82) translateY(14px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes harvestBackdropBreath {
          0% { opacity: 0.55; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes harvestRepeatGlow {
          0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(0.95); }
          50% { opacity: 0.85; transform: translate(-50%, -50%) scale(1.06); }
        }
        @keyframes harvestRepeatBackdrop {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        @keyframes harvestEmojiPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes harvestFireworkA {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(-70px, -84vh) scale(0.2); }
        }
        @keyframes harvestFireworkB {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(12px, -78vh) scale(0.2); }
        }
        @keyframes harvestFireworkC {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(72px, -88vh) scale(0.2); }
        }
        @keyframes harvestRay {
          0% { opacity: 0; filter: blur(0.5px); }
          20% { opacity: 0.95; }
          100% { opacity: 0; filter: blur(2px); }
        }
        @keyframes newBadgePulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.06); }
        }
        @keyframes newFlash {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

function FarmHelpModal({ theme, t, onClose }: {
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
}) {
  const rules = [t.farmHelpPlant, t.farmHelpGrow, t.farmHelpHarvest, t.farmHelpWither, t.farmHelpUnlock];
  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center'>
      <div className='absolute inset-0 animate-fade-in' style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
      <div className='relative rounded-[var(--radius-panel)] border p-5 mx-4 max-w-sm w-full animate-fade-up' style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: 'var(--shadow-elevated)' }}>
        <h3 className='text-base font-semibold text-center mb-4' style={{ color: theme.text }}>{t.farmHelpTitle}</h3>
        <div className='flex flex-col gap-3'>
          {rules.map((rule, i) => (
            <p key={i} className='text-sm leading-relaxed' style={{ color: theme.textMuted }}>{rule}</p>
          ))}
        </div>
        <button onClick={onClose} className='w-full mt-4 py-2 rounded-[var(--radius-sm)] text-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button' style={{ color: theme.textMuted, backgroundColor: theme.border + '30' }}>
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
