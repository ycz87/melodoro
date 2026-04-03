/**
 * CollectionPage — 图鉴页面
 *
 * 按星系分类展示品种收集进度。
 */
import { useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { GeneInventory } from '../types/gene';
import type { CollectedVariety, FarmMilestoneState, VarietyId } from '../types/farm';
import {
  ALL_VARIETY_IDS,
  DARK_MATTER_VARIETIES,
  GALAXIES,
  GALAXY_VARIETIES,
  getCollectedVarietyHarvestCount,
  getCollectedVarietyOwnedCount,
  HYBRID_GALAXY_PAIRS,
  HYBRID_VARIETIES,
  PRISMATIC_VARIETIES,
  VARIETY_DEFS,
  RARITY_COLOR, RARITY_STARS,
} from '../types/farm';
import {
  CORE_GALAXIES,
  getCollectionGuideSnapshot,
  getGalaxyProgressSnapshot,
} from '../farm/galaxy';
import {
  getFarmMilestoneRewardStatusList,
} from '../farm/milestoneRewards';

interface CollectionPageProps {
  collection: CollectedVariety[];
  geneInventory: GeneInventory;
  milestoneRewards?: FarmMilestoneState;
}

type CollectionTab = 'pure' | 'hybrid' | 'prismatic' | 'dark-matter';

function pickEarlierDate(currentDate: string, nextDate: string): string {
  if (!currentDate) return nextDate;
  if (!nextDate) return currentDate;
  return currentDate <= nextDate ? currentDate : nextDate;
}

function buildDexCollectionMap(collection: CollectedVariety[]): Map<VarietyId, CollectedVariety> {
  return collection.reduce((map, record) => {
    const existing = map.get(record.varietyId);
    const ownedCount = getCollectedVarietyOwnedCount(record);
    const harvestCount = getCollectedVarietyHarvestCount(record);

    if (!existing) {
      map.set(record.varietyId, {
        varietyId: record.varietyId,
        firstObtainedDate: record.firstObtainedDate,
        count: ownedCount,
        harvestCount,
      });
      return map;
    }

    map.set(record.varietyId, {
      varietyId: record.varietyId,
      firstObtainedDate: pickEarlierDate(existing.firstObtainedDate, record.firstObtainedDate),
      count: getCollectedVarietyOwnedCount(existing) + ownedCount,
      harvestCount: getCollectedVarietyHarvestCount(existing) + harvestCount,
    });

    return map;
  }, new Map<VarietyId, CollectedVariety>());
}

function buildGeneFragmentInventoryMap(fragments: GeneInventory['fragments']): Map<VarietyId, number> {
  return fragments.reduce((map, fragment) => {
    map.set(fragment.varietyId, (map.get(fragment.varietyId) ?? 0) + 1);
    return map;
  }, new Map<VarietyId, number>());
}

export function CollectionPage({ collection, geneInventory, milestoneRewards }: CollectionPageProps) {
  const theme = useTheme();
  const t = useI18n();
  const [collectionTab, setCollectionTab] = useState<CollectionTab>('pure');
  const [selectedVarietyId, setSelectedVarietyId] = useState<VarietyId | null>(null);

  const collectionMap = useMemo(
    () => buildDexCollectionMap(collection),
    [collection],
  );
  const geneFragmentInventoryMap = useMemo(
    () => buildGeneFragmentInventoryMap(geneInventory.fragments),
    [geneInventory.fragments],
  );

  const collectedIds = new Set(collectionMap.keys());
  const galaxyProgress = useMemo(() => getGalaxyProgressSnapshot(collection), [collection]);
  const collectionGuide = useMemo(() => getCollectionGuideSnapshot(collection), [collection]);
  const selectedVariety = selectedVarietyId ? collectionMap.get(selectedVarietyId) : undefined;
  const selectedVarietyGeneFragmentInventory = selectedVarietyId
    ? geneFragmentInventoryMap.get(selectedVarietyId) ?? 0
    : 0;

  const milestoneRewardStatusList = useMemo(() => {
    if (!milestoneRewards) return [];
    return getFarmMilestoneRewardStatusList(milestoneRewards);
  }, [milestoneRewards]);

  const pureGalaxyDefs = useMemo(
    () => GALAXIES.filter((galaxy) => CORE_GALAXIES.some((galaxyId) => galaxyId === galaxy.id)),
    [],
  );

  const pureVarietiesAll = useMemo(
    () => CORE_GALAXIES.flatMap((galaxyId) => GALAXY_VARIETIES[galaxyId] ?? []),
    [],
  );
  const pureCollectedCount = pureVarietiesAll.filter((id) => collectedIds.has(id)).length;
  const pureTotalCount = pureVarietiesAll.length;
  const purePercent = pureTotalCount > 0 ? Math.round((pureCollectedCount / pureTotalCount) * 100) : 0;

  const pureStarJourneyProgress = pureGalaxyDefs.map(galaxy => {
    const varieties = GALAXY_VARIETIES[galaxy.id] ?? [];
    const collectedInGalaxy = varieties.reduce((sum, varietyId) => (
      collectedIds.has(varietyId) ? sum + 1 : sum
    ), 0);
    const totalInGalaxy = varieties.length;
    const percent = totalInGalaxy > 0 ? Math.round((collectedInGalaxy / totalInGalaxy) * 100) : 0;
    const unlockState = galaxyProgress.unlockStateByGalaxy[galaxy.id];

    return {
      galaxy,
      collectedInGalaxy,
      totalInGalaxy,
      percent,
      isUnlocked: unlockState.isUnlocked,
      progressSegments: unlockState.progressSegments,
    };
  });

  const hybridVarietiesAll = useMemo(
    () => HYBRID_GALAXY_PAIRS.flatMap(pair => HYBRID_VARIETIES[pair]),
    [],
  );
  const hybridCollectedCount = hybridVarietiesAll.filter((id) => collectedIds.has(id)).length;
  const hybridTotalCount = hybridVarietiesAll.length;
  const hybridPercent = hybridTotalCount > 0 ? Math.round((hybridCollectedCount / hybridTotalCount) * 100) : 0;

  const prismaticCollectedCount = PRISMATIC_VARIETIES.filter((id) => collectedIds.has(id)).length;
  const prismaticTotalCount = PRISMATIC_VARIETIES.length;
  const prismaticPercent = prismaticTotalCount > 0 ? Math.round((prismaticCollectedCount / prismaticTotalCount) * 100) : 0;
  const isPrismaticUnlocked = galaxyProgress.unlockStateByGalaxy.rainbow.isUnlocked;

  const darkMatterCollectedCount = DARK_MATTER_VARIETIES.filter((id) => collectedIds.has(id)).length;
  const darkMatterTotalCount = DARK_MATTER_VARIETIES.length;
  const darkMatterPercent = darkMatterTotalCount > 0 ? Math.round((darkMatterCollectedCount / darkMatterTotalCount) * 100) : 0;

  const selectedTabCount = collectionTab === 'pure'
    ? { collected: pureCollectedCount, total: pureTotalCount }
    : collectionTab === 'hybrid'
      ? { collected: hybridCollectedCount, total: hybridTotalCount }
      : collectionTab === 'prismatic'
        ? { collected: prismaticCollectedCount, total: prismaticTotalCount }
        : { collected: darkMatterCollectedCount, total: darkMatterTotalCount };

  return (
    <div className="flex-1 w-full px-4 pb-4 overflow-y-auto">
      <CollectionGuideOverview
        guide={collectionGuide}
        theme={theme}
        t={t}
      />

      <CollectionSubTabHeader
        collectionTab={collectionTab}
        setCollectionTab={setCollectionTab}
        theme={theme}
        t={t}
      />

      {/* 当前分类进度 */}
      <div className="flex items-center justify-between mt-4 mb-4 px-1">
        <span className="text-sm font-medium" style={{ color: theme.text }}>
          {t.collectionProgress(selectedTabCount.collected, selectedTabCount.total)}
        </span>
      </div>

      {collectionTab === 'pure' && (
        <>
          {/* 星际旅程（纯种） */}
          <div className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: `${theme.surface}70`, borderColor: theme.border }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
              {t.starJourneyTitle}
            </h3>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.textMuted }}>
                <span>{pureCollectedCount}/{pureTotalCount}</span>
                <span>{purePercent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${purePercent}%`, backgroundColor: theme.accent }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {pureStarJourneyProgress.map(({ galaxy, collectedInGalaxy, totalInGalaxy, percent, isUnlocked, progressSegments }) => (
                <div
                  key={galaxy.id}
                  className="rounded-xl border px-3 py-2"
                  style={{
                    borderColor: isUnlocked ? `${theme.accent}35` : theme.border,
                    backgroundColor: isUnlocked ? `${theme.accent}10` : `${theme.surface}55`,
                    opacity: isUnlocked ? 1 : 0.75,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{galaxy.emoji}</span>
                      <span className="text-xs font-medium truncate" style={{ color: isUnlocked ? theme.text : theme.textMuted }}>
                        {t.galaxyName(galaxy.id)}
                      </span>
                    </div>
                    {isUnlocked ? (
                      <span className="text-[11px] shrink-0" style={{ color: theme.textMuted }}>
                        {collectedInGalaxy}/{totalInGalaxy}
                      </span>
                    ) : (
                      <span className="text-[11px] shrink-0" style={{ color: theme.textFaint }}>
                        🔒 {progressSegments.map(seg => `${seg.current}/${seg.target}`).join(' · ')}
                      </span>
                    )}
                  </div>
                  {isUnlocked && totalInGalaxy > 0 && (
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%`, backgroundColor: theme.accent }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {pureGalaxyDefs.map(galaxy => {
            const varieties = GALAXY_VARIETIES[galaxy.id] ?? [];
            const unlockState = galaxyProgress.unlockStateByGalaxy[galaxy.id];
            const isUnlocked = unlockState.isUnlocked;
            return (
              <div key={galaxy.id} className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{galaxy.emoji}</span>
                  <span className="text-sm font-semibold" style={{ color: isUnlocked ? theme.text : theme.textMuted }}>
                    {t.galaxyName(galaxy.id)}
                  </span>
                  {!isUnlocked && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.border}50`, color: theme.textFaint }}>
                      🔒 {t.collectionLocked}
                    </span>
                  )}
                </div>

                {isUnlocked ? (
                  <div className="grid grid-cols-2 gap-2">
                    {varieties.map(id => (
                      <VarietyCard
                        key={id}
                        varietyId={id}
                        collected={collectionMap.get(id)}
                        collectionCount={collectedIds.size}
                        totalCount={ALL_VARIETY_IDS.length}
                        theme={theme}
                        t={t}
                        onOpenDetail={setSelectedVarietyId}
                      />
                    ))}
                  </div>
                ) : (
                  <div
                    className="rounded-xl border p-4 text-center"
                    style={{ backgroundColor: `${theme.surface}50`, borderColor: theme.border }}
                  >
                    <span className="text-2xl">🔒</span>
                    <p className="text-xs mt-1" style={{ color: theme.textFaint }}>
                      {t.collectionUnlockHint(galaxy.id)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {collectionTab === 'hybrid' && (
        <>
          <div className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: `${theme.surface}70`, borderColor: theme.border }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
              {t.collectionTabHybrid}
            </h3>
            <div className="mb-1">
              <div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.textMuted }}>
                <span>{hybridCollectedCount}/{hybridTotalCount}</span>
                <span>{hybridPercent}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${hybridPercent}%`, backgroundColor: theme.accent }}
                />
              </div>
            </div>
          </div>

          {HYBRID_GALAXY_PAIRS.map(pair => {
            const varieties = HYBRID_VARIETIES[pair];
            const collectedInPair = varieties.filter(id => collectionMap.has(id)).length;

            return (
              <div key={pair} className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-sm font-semibold" style={{ color: theme.text }}>
                    {t.hybridGalaxyPairLabel(pair)}
                  </span>
                  <span className="text-[10px]" style={{ color: theme.textFaint }}>
                    {collectedInPair}/{varieties.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {varieties.map(id => (
                    <HybridVarietyCard
                      key={id}
                      varietyId={id}
                      collected={collectionMap.get(id)}
                      theme={theme}
                      t={t}
                      onOpenDetail={setSelectedVarietyId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {collectionTab === 'prismatic' && (
        <div className="mb-5">
          <div className="mb-3 rounded-2xl border p-4" style={{ backgroundColor: `${theme.surface}70`, borderColor: theme.border }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
              🌈 {t.galaxyName('rainbow')}
            </h3>
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.textMuted }}>
              <span>{prismaticCollectedCount}/{prismaticTotalCount}</span>
              <span>{prismaticPercent}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${prismaticPercent}%`, backgroundColor: theme.accent }}
              />
            </div>
          </div>

          {isPrismaticUnlocked ? (
            <div className="grid grid-cols-2 gap-2">
              {PRISMATIC_VARIETIES.map(id => (
                <VarietyCard
                  key={id}
                  varietyId={id}
                  collected={collectionMap.get(id)}
                  collectionCount={collectedIds.size}
                  totalCount={ALL_VARIETY_IDS.length}
                  theme={theme}
                  t={t}
                  onOpenDetail={setSelectedVarietyId}
                />
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl border p-4 text-center"
              style={{ backgroundColor: `${theme.surface}50`, borderColor: theme.border }}
            >
              <span className="text-2xl">🔒</span>
              <p className="text-xs mt-1" style={{ color: theme.textFaint }}>
                {t.collectionUnlockHint('rainbow')}
              </p>
            </div>
          )}
        </div>
      )}

      {collectionTab === 'dark-matter' && (
        <div className="mb-5">
          <div className="mb-3 rounded-2xl border p-4" style={{ backgroundColor: `${theme.surface}70`, borderColor: theme.border }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
              🌑 {t.galaxyName('dark-matter')}
            </h3>
            <div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.textMuted }}>
              <span>{darkMatterCollectedCount}/{darkMatterTotalCount}</span>
              <span>{darkMatterPercent}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${darkMatterPercent}%`, backgroundColor: theme.accent }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DARK_MATTER_VARIETIES.map(id => (
              <VarietyCard
                key={id}
                varietyId={id}
                collected={collectionMap.get(id)}
                collectionCount={collectedIds.size}
                totalCount={ALL_VARIETY_IDS.length}
                theme={theme}
                t={t}
                onOpenDetail={setSelectedVarietyId}
              />
            ))}
          </div>
        </div>
      )}

      {milestoneRewardStatusList.length > 0 && (
        <MilestoneRewardLedger
          statusList={milestoneRewardStatusList}
          theme={theme}
          t={t}
        />
      )}

      {selectedVarietyId && (
        <VarietyDetailModal
          varietyId={selectedVarietyId}
          collected={selectedVariety}
          geneFragmentInventoryCount={selectedVarietyGeneFragmentInventory}
          collectionCount={collectedIds.size}
          totalCount={ALL_VARIETY_IDS.length}
          theme={theme}
          t={t}
          onClose={() => setSelectedVarietyId(null)}
        />
      )}
    </div>
  );
}

function MilestoneRewardLedger({ statusList, theme, t }: {
  statusList: ReturnType<typeof import('../farm/milestoneRewards').getFarmMilestoneRewardStatusList>;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
}) {
  const grantedCount = statusList.filter((s) => s.grantedAt).length;
  const totalCount = statusList.length;

  const kindLabel = (kind: string, reward: typeof statusList[number]['reward']) => {
    if (kind === 'plot') return t.marketPlotName((reward.plotCount ?? 1) - 1);
    if (kind === 'galaxy') return t.galaxyName(reward.galaxyId!);
    if (kind === 'feature') return t.geneFiveElementTitle;
    if (kind === 'theme') return reward.contentKey === 'ultimate-theme'
      ? t.collectionMilestoneRewardUltimateTheme
      : t.collectionMilestoneRewardFocusTheme;
    if (kind === 'ambience') return t.collectionMilestoneRewardCosmicAmbience;
    if (kind === 'variety') return t.varietyName(reward.varietyId!);
    return reward.id;
  };

  return (
    <div
      className="mt-4 mb-4 rounded-2xl border px-4 py-4"
      style={{ backgroundColor: `${theme.surface}70`, borderColor: theme.border }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
          🏅 {t.collectionMilestoneRewardsTitle}
        </h3>
        <span className="text-xs" style={{ color: theme.textMuted }}>
          {grantedCount}/{totalCount}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {statusList.map(({ reward, grantedAt, source }) => {
          const granted = Boolean(grantedAt);
          const isContentOnly = reward.kind === 'theme' || reward.kind === 'ambience';
          return (
            <div
              key={reward.id}
              className="rounded-xl border px-2.5 py-2"
              style={{
                borderColor: granted ? `${theme.accent}55` : theme.border,
                backgroundColor: granted ? `${theme.accent}10` : `${theme.surface}55`,
                opacity: granted ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base">{reward.icon}</span>
                <span className="text-xs font-medium truncate" style={{ color: granted ? theme.text : theme.textMuted }}>
                  {kindLabel(reward.kind, reward)}
                </span>
              </div>
              {granted ? (
                <div className="text-[10px]" style={{ color: theme.textFaint }}>
                  {source === 'backfill'
                    ? t.collectionMilestoneRewardBackfilled(grantedAt ?? '')
                    : t.collectionMilestoneRewardGranted(grantedAt ?? '')}
                  {isContentOnly && (
                    <span className="ml-1 opacity-70">({t.collectionMilestoneRewardContentPending})</span>
                  )}
                </div>
              ) : (
                <div className="text-[10px]" style={{ color: theme.textFaint }}>{t.collectionMilestoneRewardNotEarned}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CollectionGuideOverview({ guide, theme, t }: {
  guide: ReturnType<typeof getCollectionGuideSnapshot>;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
}) {
  const currentStageLabel = {
    'core-discovery': t.collectionGuideStageCoreDiscovery,
    'core-expansion': t.collectionGuideStageCoreExpansion,
    'five-element-resonance': t.collectionGuideStageResonance,
    'prismatic-journey': t.collectionGuideStagePrismatic,
    'dark-matter-journey': t.collectionGuideStageDarkMatter,
    'collection-complete': t.collectionGuideStageComplete,
  }[guide.currentStageId];

  const currentStageIcon = {
    'core-discovery': '🌱',
    'core-expansion': '🪐',
    'five-element-resonance': '✨',
    'prismatic-journey': '🌈',
    'dark-matter-journey': '🌑',
    'collection-complete': '🏆',
  }[guide.currentStageId];

  const milestoneTitle = (() => {
    if (guide.nextMilestone.id === 'collection-complete') return t.collectionGuideAllMilestonesComplete;
    if (guide.nextMilestone.id === 'dark-matter-collection') return t.collectionGuideCompleteDarkMatter;
    return t.collectionGuideUnlockGalaxy(t.galaxyName(guide.nextMilestone.id));
  })();

  const milestoneHint = (() => {
    if (guide.nextMilestone.id === 'collection-complete') return t.collectionGuideDone;
    if (guide.nextMilestone.id === 'dark-matter-collection') return t.collectionGuideGalaxyProgress(
      t.galaxyName('dark-matter'),
      guide.nextMilestone.progressSegments[0]?.current ?? 0,
      guide.nextMilestone.progressSegments[0]?.target ?? 0,
      Math.max(0, (guide.nextMilestone.progressSegments[0]?.target ?? 0) - (guide.nextMilestone.progressSegments[0]?.current ?? 0)),
    );
    if (guide.nextMilestone.id === 'wood' || guide.nextMilestone.id === 'metal') {
      const segment = guide.nextMilestone.progressSegments[0];
      return t.collectionGuideCompletedCoreGalaxiesProgress(
        segment?.current ?? 0,
        segment?.target ?? 0,
        Math.max(0, (segment?.target ?? 0) - (segment?.current ?? 0)),
      );
    }
    if (guide.nextMilestone.id === 'rainbow') {
      return null;
    }

    const segment = guide.nextMilestone.progressSegments[0];
    return t.collectionGuideGalaxyProgress(
      t.galaxyName('thick-earth'),
      segment?.current ?? 0,
      segment?.target ?? 0,
      Math.max(0, (segment?.target ?? 0) - (segment?.current ?? 0)),
    );
  })();

  const milestoneSecondaryHint = (() => {
    if (guide.nextMilestone.id === 'rainbow') {
      const missingNames = guide.fiveElementResonance.missingCoreGalaxies
        .map((galaxyId) => t.galaxyName(galaxyId))
        .join(' / ');

      return {
        core: t.collectionGuideResonanceCoreProgress(
          guide.fiveElementResonance.currentCoreGalaxies,
          guide.fiveElementResonance.targetCoreGalaxies,
        ),
        hybrid: t.collectionGuideResonanceHybridProgress(
          guide.fiveElementResonance.currentHybridVarieties,
          guide.fiveElementResonance.targetHybridVarieties,
        ),
        missing: missingNames ? t.collectionGuideResonanceMissingGalaxies(missingNames) : null,
      };
    }

    if (guide.nextMilestone.id === 'dark-matter') {
      const segment = guide.nextMilestone.progressSegments[0];
      return {
        core: t.collectionGuideGalaxyProgress(
          t.galaxyName('rainbow'),
          segment?.current ?? 0,
          segment?.target ?? 0,
          Math.max(0, (segment?.target ?? 0) - (segment?.current ?? 0)),
        ),
        hybrid: null,
        missing: null,
      };
    }

    return null;
  })();

  const resonanceMissingNames = guide.fiveElementResonance.missingCoreGalaxies
    .map((galaxyId) => t.galaxyName(galaxyId))
    .join(' / ');

  return (
    <div className="grid gap-3 mb-4 pt-1 md:grid-cols-3">
      <div
        className="rounded-2xl border p-4"
        style={{ backgroundColor: `${theme.surface}72`, borderColor: theme.border }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textFaint }}>
          {t.collectionGuideCurrentStage}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-2xl">{currentStageIcon}</span>
          <div className="text-sm font-semibold" style={{ color: theme.text }}>
            {currentStageLabel}
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{ backgroundColor: `${theme.surface}72`, borderColor: theme.border }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textFaint }}>
          {t.collectionGuideNextMilestone}
        </div>
        <div className="mt-3 text-sm font-semibold" style={{ color: theme.text }}>
          {milestoneTitle}
        </div>
        {guide.nextMilestone.id !== 'collection-complete' && guide.nextMilestone.id !== 'dark-matter-collection' && (
          <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
            {t.collectionUnlockHint(guide.nextMilestone.id)}
          </p>
        )}
        {milestoneHint && (
          <p className="mt-2 text-xs leading-5" style={{ color: theme.textMuted }}>
            {milestoneHint}
          </p>
        )}
        {milestoneSecondaryHint && (
          <div className="mt-2 flex flex-col gap-1.5 text-xs" style={{ color: theme.textMuted }}>
            <span>{milestoneSecondaryHint.core}</span>
            {milestoneSecondaryHint.hybrid && <span>{milestoneSecondaryHint.hybrid}</span>}
            {milestoneSecondaryHint.missing && <span>{milestoneSecondaryHint.missing}</span>}
          </div>
        )}
      </div>

      <div
        className="rounded-2xl border p-4"
        style={{ backgroundColor: `${theme.surface}72`, borderColor: guide.fiveElementResonance.isReady ? `${theme.accent}45` : theme.border }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textFaint }}>
          {t.collectionGuideFiveElementTitle}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CORE_GALAXIES.map((galaxyId) => {
            const isReady = guide.fiveElementResonance.coreGalaxyStatus[galaxyId];
            return (
              <div
                key={galaxyId}
                className="rounded-xl border px-3 py-2 text-xs"
                style={{
                  backgroundColor: isReady ? `${theme.accent}12` : `${theme.surface}60`,
                  borderColor: isReady ? `${theme.accent}35` : theme.border,
                  color: isReady ? theme.text : theme.textMuted,
                }}
              >
                <div className="font-medium">{t.galaxyName(galaxyId)}</div>
                <div className="mt-1 text-[11px]" style={{ color: isReady ? theme.textMuted : theme.textFaint }}>
                  {isReady ? '✓ ≥1' : '· 0/1'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs" style={{ color: theme.textMuted }}>
          <span>{t.collectionGuideResonanceHybridProgress(guide.fiveElementResonance.currentHybridVarieties, guide.fiveElementResonance.targetHybridVarieties)}</span>
          <span>{guide.fiveElementResonance.currentHybridVarieties}/{guide.fiveElementResonance.targetHybridVarieties}</span>
        </div>
        <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, (guide.fiveElementResonance.currentHybridVarieties / guide.fiveElementResonance.targetHybridVarieties) * 100)}%`,
              backgroundColor: theme.accent,
            }}
          />
        </div>
        <p className="mt-3 text-xs leading-5" style={{ color: guide.fiveElementResonance.isReady ? theme.text : theme.textMuted }}>
          {guide.fiveElementResonance.isReady
            ? t.collectionGuideResonanceReady
            : resonanceMissingNames
              ? t.collectionGuideResonanceMissingGalaxies(resonanceMissingNames)
              : t.collectionGuideResonanceHybridProgress(
                guide.fiveElementResonance.currentHybridVarieties,
                guide.fiveElementResonance.targetHybridVarieties,
              )}
        </p>
      </div>
    </div>
  );
}

function CollectionSubTabHeader({ collectionTab, setCollectionTab, theme, t }: {
  collectionTab: CollectionTab;
  setCollectionTab: (tab: CollectionTab) => void;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
}) {
  const tabIndex: Record<CollectionTab, number> = {
    pure: 0,
    hybrid: 1,
    prismatic: 2,
    'dark-matter': 3,
  };

  return (
    <div className="w-full pt-1">
      <div className="relative flex items-center rounded-full p-[3px]" style={{ backgroundColor: theme.inputBg }}>
        <div
          className="absolute top-[3px] bottom-[3px] rounded-full transition-all duration-200 ease-in-out"
          style={{
            backgroundColor: theme.accent,
            opacity: 0.16,
            width: 'calc((100% - 6px) / 4)',
            left: '3px',
            transform: `translateX(${tabIndex[collectionTab] * 100}%)`,
          }}
        />
        <button
          onClick={() => setCollectionTab('pure')}
          className="relative z-10 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1 truncate"
          style={{ color: collectionTab === 'pure' ? theme.text : theme.textMuted }}
        >
          {t.collectionTabPure}
        </button>
        <button
          onClick={() => setCollectionTab('hybrid')}
          className="relative z-10 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1 truncate"
          style={{ color: collectionTab === 'hybrid' ? theme.text : theme.textMuted }}
        >
          {t.collectionTabHybrid}
        </button>
        <button
          onClick={() => setCollectionTab('prismatic')}
          className="relative z-10 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1 truncate"
          style={{ color: collectionTab === 'prismatic' ? theme.text : theme.textMuted }}
        >
          {t.collectionTabPrismatic}
        </button>
        <button
          onClick={() => setCollectionTab('dark-matter')}
          className="relative z-10 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1 truncate"
          style={{ color: collectionTab === 'dark-matter' ? theme.text : theme.textMuted }}
        >
          {t.collectionTabDarkMatter}
        </button>
      </div>
    </div>
  );
}

function HybridVarietyCard({ varietyId, collected, theme, t, onOpenDetail }: {
  varietyId: VarietyId;
  collected?: CollectedVariety;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  onOpenDetail: (varietyId: VarietyId) => void;
}) {
  const variety = VARIETY_DEFS[varietyId];
  const color = RARITY_COLOR[variety.rarity];
  const isCollected = !!collected;

  return (
    <button
      type="button"
      disabled={!isCollected}
      onClick={() => onOpenDetail(varietyId)}
      className="w-full rounded-xl border p-2 flex flex-col items-center gap-1 transition-all text-center"
      style={{
        backgroundColor: isCollected ? `${color}08` : theme.surface,
        borderColor: isCollected ? `${color}25` : theme.border,
        opacity: isCollected ? 1 : 0.6,
        cursor: isCollected ? 'pointer' : 'default',
      }}
    >
      <span className="text-2xl" style={{
        filter: isCollected ? `drop-shadow(0 0 3px ${color})` : 'grayscale(1) brightness(0.4)',
      }}>
        {isCollected ? variety.emoji : '❓'}
      </span>
      <span className="text-[10px] font-medium truncate w-full" style={{ color: isCollected ? theme.text : theme.textFaint }}>
        {isCollected ? t.varietyName(varietyId) : '???'}
      </span>
      <div className="flex gap-0.5">
        {Array.from({ length: RARITY_STARS[variety.rarity] }).map((_, i) => (
          <span key={i} style={{ color: isCollected ? color : theme.textFaint, fontSize: 8 }}>⭐</span>
        ))}
      </div>
    </button>
  );
}

function VarietyCard({ varietyId, collected, collectionCount, totalCount, theme, t, onOpenDetail }: {
  varietyId: VarietyId;
  collected?: CollectedVariety;
  collectionCount: number;
  totalCount: number;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  onOpenDetail: (varietyId: VarietyId) => void;
}) {
  const variety = VARIETY_DEFS[varietyId];
  const color = RARITY_COLOR[variety.rarity];
  const isCollected = !!collected;
  const isDarkMatter = DARK_MATTER_VARIETIES.includes(varietyId as typeof DARK_MATTER_VARIETIES[number]);
  const canOpenDetail = isCollected || isDarkMatter;

  return (
    <button
      type="button"
      disabled={!canOpenDetail}
      onClick={() => onOpenDetail(varietyId)}
      className="w-full rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all text-center"
      style={{
        backgroundColor: isCollected ? `${color}08` : isDarkMatter ? `${theme.accent}08` : theme.surface,
        borderColor: isCollected ? `${color}25` : isDarkMatter ? `${theme.accent}30` : theme.border,
        opacity: isCollected ? 1 : isDarkMatter ? 0.8 : 0.5,
        cursor: canOpenDetail ? 'pointer' : 'default',
      }}
      title={!isCollected && isDarkMatter ? t.collectionAcquireHintTitle : undefined}
    >
      {/* Emoji or silhouette */}
      <span className="text-3xl" style={{
        filter: isCollected ? `drop-shadow(0 0 4px ${color})` : 'grayscale(1) brightness(0.3)',
      }}>
        {isCollected ? variety.emoji : '❓'}
      </span>

      {/* Name */}
      <span className="text-xs font-medium text-center" style={{ color: isCollected ? theme.text : theme.textFaint }}>
        {isCollected ? t.varietyName(varietyId) : '???'}
      </span>

      {/* Stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: RARITY_STARS[variety.rarity] }).map((_, i) => (
          <span key={i} style={{ color: isCollected ? color : theme.textFaint, fontSize: 10 }}>⭐</span>
        ))}
      </div>

      {/* Story (collected only) */}
      {isCollected && (
        <p className="text-[10px] text-center leading-tight mt-0.5" style={{ color: theme.textMuted }}>
          {t.varietyStory(varietyId)}
        </p>
      )}

      {!isCollected && isDarkMatter && (
        <p className="text-[10px] text-center leading-tight mt-0.5" style={{ color: theme.textFaint }}>
          {varietyId === 'cosmic-heart' ? t.darkMatterGuideProgress(collectionCount, totalCount) : t.collectionAcquireHintTitle}
        </p>
      )}

      {/* Date */}
      {collected && (
        <span className="text-[10px]" style={{ color: theme.textFaint }}>
          {collected.firstObtainedDate}
        </span>
      )}
    </button>
  );
}

function VarietyDetailModal({ varietyId, collected, geneFragmentInventoryCount, collectionCount, totalCount, theme, t, onClose }: {
  varietyId: VarietyId;
  collected?: CollectedVariety;
  geneFragmentInventoryCount: number;
  collectionCount: number;
  totalCount: number;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
}) {
  const variety = VARIETY_DEFS[varietyId];
  const color = RARITY_COLOR[variety.rarity];
  const rarityStars = RARITY_STARS[variety.rarity];
  const isCollected = Boolean(collected);
  const isDarkMatter = DARK_MATTER_VARIETIES.includes(varietyId as typeof DARK_MATTER_VARIETIES[number]);
  const hybridPairName = variety.breedType === 'hybrid' && variety.hybridPair
    ? t.hybridGalaxyPairName(variety.hybridPair)
    : null;
  const showStandardSellPrice = variety.sellPrice > 0
    && (variety.breedType === 'pure' || variety.breedType === 'hybrid' || variety.breedType === 'prismatic');
  const showBaseDropRateChip = variety.breedType === 'pure' || variety.breedType === 'hybrid';
  const baseDropRate = VARIETY_DEFS[varietyId].dropRate;
  const baseDropRateLabel = `${Math.round(baseDropRate * 100)}%`;
  const showDarkMatterSellState = variety.breedType === 'dark-matter';
  const isDarkMatterNotSellable = showDarkMatterSellState && variety.sellPrice <= 0;
  const showSellChip = showStandardSellPrice || showDarkMatterSellState;
  const sellChipLabel = isDarkMatterNotSellable
    ? t.varietyDetailNotSellable
    : t.varietyDetailSellPrice(variety.sellPrice);
  const sellChipStyle = isDarkMatterNotSellable
    ? { backgroundColor: theme.inputBg, color: theme.textMuted }
    : { backgroundColor: 'rgba(245, 158, 11, 0.14)', color: '#f59e0b' };

  const darkMatterGuide = varietyId === 'void-melon'
    ? t.darkMatterGuideVoid
    : varietyId === 'blackhole-melon'
      ? t.darkMatterGuideBlackHole
      : t.darkMatterGuideCosmicHeart;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      data-modal-overlay
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-sm rounded-2xl border p-5 max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-up"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: theme.text }}>
          {t.varietyDetailTitle}
        </h3>
        <div className="flex flex-col items-center mb-4">
          <span
            className="text-7xl leading-none"
            style={{ filter: isCollected ? `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 24px ${color}AA)` : 'grayscale(1) brightness(0.4)' }}
          >
            {isCollected ? variety.emoji : '❓'}
          </span>
          <p className="text-base font-semibold mt-2" style={{ color: theme.text }}>
            {isCollected || isDarkMatter ? t.varietyName(varietyId) : '???'}
          </p>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: rarityStars }).map((_, i) => (
              <span key={i} style={{ color, fontSize: 14 }}>⭐</span>
            ))}
          </div>
          <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs"
              style={{ backgroundColor: `${theme.accent}14`, color: theme.accent }}
            >
              <span aria-hidden="true">🌌</span>
              <span>{t.galaxyName(variety.galaxy)}</span>
            </div>
            {hybridPairName && (
              <div
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs"
                style={{ backgroundColor: `${theme.inputBg}90`, color: theme.text }}
              >
                <span aria-hidden="true">🧬</span>
                <span>{hybridPairName}</span>
              </div>
            )}
            <div
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs"
              style={{ backgroundColor: `${color}16`, color }}
            >
              <span aria-hidden="true">⭐</span>
              <span>{t.varietyDetailRarityText(rarityStars)}</span>
            </div>
            {showBaseDropRateChip && (
              <div
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.14)', color: '#10b981' }}
              >
                <span aria-hidden="true">🎯</span>
                <span>{baseDropRateLabel}</span>
              </div>
            )}
            {showSellChip && (
              <div
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs"
                style={sellChipStyle}
              >
                <span aria-hidden="true">{isDarkMatterNotSellable ? '🚫' : '💰'}</span>
                <span>{sellChipLabel}</span>
              </div>
            )}
          </div>
        </div>
        {isCollected ? (
          <>
            <p className="text-sm leading-relaxed mb-4" style={{ color: theme.textMuted }}>
              {t.varietyStory(varietyId)}
            </p>
            <div className="rounded-xl border p-3 mb-4" style={{ borderColor: theme.border, backgroundColor: `${theme.inputBg}70` }}>
              <p className="text-xs mb-1" style={{ color: theme.textFaint }}>
                {t.varietyDetailFirstObtained}
              </p>
              <p className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                {collected?.firstObtainedDate ?? '-'}
              </p>
              <p className="text-xs mb-1" style={{ color: theme.textFaint }}>
                {t.varietyDetailOwnedCountLabel}
              </p>
              <p className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                {collected ? getCollectedVarietyOwnedCount(collected) : 0}
              </p>
              <p className="text-xs mb-1" style={{ color: theme.textFaint }}>
                {t.varietyDetailGeneFragmentInventoryLabel}
              </p>
              <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                {geneFragmentInventoryCount}
              </p>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                {t.varietyDetailHarvestCount(collected ? getCollectedVarietyHarvestCount(collected) : 0)}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-xl border p-3 mb-4" style={{ borderColor: theme.border, backgroundColor: `${theme.inputBg}70` }}>
            <p className="text-xs mb-1" style={{ color: theme.textFaint }}>
              {t.collectionAcquireHintTitle}
            </p>
            <p className="text-sm font-medium" style={{ color: theme.text }}>
              {darkMatterGuide}
            </p>
            {varietyId === 'cosmic-heart' && (
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
                {t.darkMatterGuideProgress(collectionCount, totalCount)}
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
        >
          {t.varietyDetailClose}
        </button>
      </div>
    </div>
  );
}
