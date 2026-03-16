/**
 * GeneLabPage — 基因实验室背包页面
 *
 * 按星系分组展示已收集的基因片段，支持折叠展开查看每个星系的片段明细。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import {
  FIVE_ELEMENT_GALAXIES,
  canFuseFiveElements,
  fusionSuccessRate,
  getBestFiveElementFragments,
  fiveElementFusionSuccessRate,
} from '../farm/gene';
import type { DarkMatterFusion, DarkMatterFusionType, FusionResult, GeneInventory } from '../types/gene';
import {
  GALAXIES,
  HYBRID_GALAXY_PAIRS,
  PRISMATIC_VARIETIES,
  VARIETY_DEFS,
  RARITY_COLOR,
  RARITY_STARS,
} from '../types/farm';
import type { FusionHistory, GalaxyId, Rarity } from '../types/farm';
import type { SeedCounts, SeedQuality, ItemId, HybridSeed } from '../types/slicing';

interface GeneLabPageProps {
  geneInventory: GeneInventory;
  seeds: SeedCounts;
  items: Record<ItemId, number>;
  hybridSeeds: HybridSeed[];
  prismaticSeedCount: number;
  darkMatterSeedCount: number;
  harvestedHybridVarietyCount: number;
  fusionHistory: FusionHistory;
  onInject: (galaxyId: GalaxyId, quality: SeedQuality) => void;
  onFusion: (fragment1Id: string, fragment2Id: string, useModifier: boolean) => { success: boolean; galaxyPair: string } | null;
  onFiveElementFusion: () => FusionResult | null;
  onDarkMatterFusion: (type: DarkMatterFusionType) => DarkMatterFusion | null;
}

type GeneFragmentItem = GeneInventory['fragments'][number];

interface GalaxyFragmentGroup {
  galaxyId: GalaxyId;
  galaxyEmoji: string;
  fragments: GeneFragmentItem[];
}

const SEED_QUALITY_OPTIONS: Array<{ quality: SeedQuality; color: string }> = [
  { quality: 'normal', color: '#a3a3a3' },
  { quality: 'epic', color: '#a78bfa' },
  { quality: 'legendary', color: '#fbbf24' },
];

const RARITY_PRIORITY: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};

const FUSION_GALAXY_SET = new Set<GalaxyId>(['thick-earth', 'fire', 'water', 'wood', 'metal']);

function pickBestFragment(fragments: GeneFragmentItem[]): GeneFragmentItem | null {
  if (fragments.length === 0) return null;
  return fragments.reduce((best, current) => {
    const rarityDiff = RARITY_PRIORITY[current.rarity] - RARITY_PRIORITY[best.rarity];
    if (rarityDiff !== 0) return rarityDiff > 0 ? current : best;
    return current.obtainedAt > best.obtainedAt ? current : best;
  });
}

export function GeneLabPage({
  geneInventory,
  seeds,
  items,
  hybridSeeds,
  prismaticSeedCount,
  darkMatterSeedCount,
  harvestedHybridVarietyCount,
  fusionHistory,
  onInject,
  onFusion,
  onFiveElementFusion,
  onDarkMatterFusion,
}: GeneLabPageProps) {
  const theme = useTheme();
  const t = useI18n();
  const [expandedGalaxyIds, setExpandedGalaxyIds] = useState<Set<GalaxyId>>(() => new Set());
  const [selectedGalaxyId, setSelectedGalaxyId] = useState<GalaxyId | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<SeedQuality | null>(null);
  const [selectedFusionGalaxy1, setSelectedFusionGalaxy1] = useState<GalaxyId | null>(null);
  const [selectedFusionGalaxy2, setSelectedFusionGalaxy2] = useState<GalaxyId | null>(null);
  const [useModifier, setUseModifier] = useState(false);
  const [showInjectToast, setShowInjectToast] = useState(false);
  const [fusionToastType, setFusionToastType] = useState<'success' | 'fail' | null>(null);
  const [fusionAnimType, setFusionAnimType] = useState<'success' | 'fail' | null>(null);
  const [fiveElementToast, setFiveElementToast] = useState<{ type: 'success' | 'fail'; message: string } | null>(null);
  const [darkMatterToast, setDarkMatterToast] = useState<{ type: 'success' | 'fail'; message: string } | null>(null);
  const injectToastTimerRef = useRef<number | null>(null);
  const fusionToastTimerRef = useRef<number | null>(null);
  const fusionAnimTimerRef = useRef<number | null>(null);
  const fiveElementToastTimerRef = useRef<number | null>(null);
  const darkMatterToastTimerRef = useRef<number | null>(null);

  const totalFragments = geneInventory.fragments.length;
  const totalSeeds = seeds.normal + seeds.epic + seeds.legendary;

  const galaxyGroups = useMemo<GalaxyFragmentGroup[]>(() => {
    const fragmentsByGalaxy = new Map<GalaxyId, GeneFragmentItem[]>();

    geneInventory.fragments.forEach((fragment) => {
      const existing = fragmentsByGalaxy.get(fragment.galaxyId);
      if (existing) {
        existing.push(fragment);
        return;
      }
      fragmentsByGalaxy.set(fragment.galaxyId, [fragment]);
    });

    return GALAXIES.flatMap((galaxy) => {
      const fragments = fragmentsByGalaxy.get(galaxy.id) ?? [];
      if (fragments.length === 0) {
        return [];
      }
      return [{
        galaxyId: galaxy.id,
        galaxyEmoji: galaxy.emoji,
        fragments,
      }];
    });
  }, [geneInventory.fragments]);

  const fusionGalaxyGroups = useMemo<GalaxyFragmentGroup[]>(() => {
    return galaxyGroups.filter((group) => FUSION_GALAXY_SET.has(group.galaxyId));
  }, [galaxyGroups]);

  const bestFragmentByGalaxy = useMemo(() => {
    const result = new Map<GalaxyId, GeneFragmentItem>();
    fusionGalaxyGroups.forEach((group) => {
      const bestFragment = pickBestFragment(group.fragments);
      if (bestFragment) {
        result.set(group.galaxyId, bestFragment);
      }
    });
    return result;
  }, [fusionGalaxyGroups]);

  const handleToggleGalaxy = (galaxyId: GalaxyId) => {
    setExpandedGalaxyIds((prev) => {
      const next = new Set(prev);
      if (next.has(galaxyId)) {
        next.delete(galaxyId);
      } else {
        next.add(galaxyId);
      }
      return next;
    });
  };

  const fragmentCounts = useMemo(() => {
    const counts = new Map<GalaxyId, number>();
    galaxyGroups.forEach((group) => counts.set(group.galaxyId, group.fragments.length));
    return counts;
  }, [galaxyGroups]);

  const effectiveSelectedGalaxyId = useMemo(() => {
    if (selectedGalaxyId === null) return null;
    return (fragmentCounts.get(selectedGalaxyId) ?? 0) > 0 ? selectedGalaxyId : null;
  }, [selectedGalaxyId, fragmentCounts]);

  const effectiveSelectedQuality = useMemo(() => {
    if (selectedQuality === null) return null;
    return seeds[selectedQuality] > 0 ? selectedQuality : null;
  }, [selectedQuality, seeds]);

  const effectiveSelectedFusionGalaxy1 = useMemo(() => {
    if (selectedFusionGalaxy1 === null) return null;
    return bestFragmentByGalaxy.has(selectedFusionGalaxy1) ? selectedFusionGalaxy1 : null;
  }, [selectedFusionGalaxy1, bestFragmentByGalaxy]);

  const effectiveSelectedFusionGalaxy2 = useMemo(() => {
    if (selectedFusionGalaxy2 === null) return null;
    if (!bestFragmentByGalaxy.has(selectedFusionGalaxy2)) return null;
    if (selectedFusionGalaxy2 === effectiveSelectedFusionGalaxy1) return null;
    return selectedFusionGalaxy2;
  }, [selectedFusionGalaxy2, effectiveSelectedFusionGalaxy1, bestFragmentByGalaxy]);

  const modifierCount = items['gene-modifier'] ?? 0;
  const hasModifier = modifierCount > 0;
  const effectiveUseModifier = useModifier && hasModifier;

  useEffect(() => {
    return () => {
      if (injectToastTimerRef.current !== null) window.clearTimeout(injectToastTimerRef.current);
      if (fusionToastTimerRef.current !== null) window.clearTimeout(fusionToastTimerRef.current);
      if (fusionAnimTimerRef.current !== null) window.clearTimeout(fusionAnimTimerRef.current);
      if (fiveElementToastTimerRef.current !== null) window.clearTimeout(fiveElementToastTimerRef.current);
      if (darkMatterToastTimerRef.current !== null) window.clearTimeout(darkMatterToastTimerRef.current);
    };
  }, []);

  const selectedGalaxyFragments = effectiveSelectedGalaxyId ? (fragmentCounts.get(effectiveSelectedGalaxyId) ?? 0) : 0;
  const selectedQualityCount = effectiveSelectedQuality ? seeds[effectiveSelectedQuality] : 0;
  const hasFragments = totalFragments > 0;
  const hasSeeds = totalSeeds > 0;
  const selectedFusionFragment1 = effectiveSelectedFusionGalaxy1 ? (bestFragmentByGalaxy.get(effectiveSelectedFusionGalaxy1) ?? null) : null;
  const selectedFusionFragment2 = effectiveSelectedFusionGalaxy2 ? (bestFragmentByGalaxy.get(effectiveSelectedFusionGalaxy2) ?? null) : null;
  const baseFusionRate = selectedFusionFragment1 && selectedFusionFragment2
    ? fusionSuccessRate(selectedFusionFragment1.rarity, selectedFusionFragment2.rarity)
    : null;
  const fusionRate = baseFusionRate === null ? null : Math.min(1, baseFusionRate + (effectiveUseModifier ? 0.2 : 0));
  const canFusion = selectedFusionFragment1 !== null && selectedFusionFragment2 !== null;
  const canInject = effectiveSelectedGalaxyId !== null
    && effectiveSelectedQuality !== null
    && selectedGalaxyFragments > 0
    && selectedQualityCount > 0;
  const fiveElementGeneCounts = useMemo(() => {
    const counts = new Map<GalaxyId, number>();
    FIVE_ELEMENT_GALAXIES.forEach((galaxyId) => {
      counts.set(galaxyId, fragmentCounts.get(galaxyId) ?? 0);
    });
    return counts;
  }, [fragmentCounts]);
  const hasHybridRequirement = harvestedHybridVarietyCount >= 3;
  const fiveElementReady = canFuseFiveElements(geneInventory.fragments, harvestedHybridVarietyCount);
  const selectedFiveElementFragments = useMemo(
    () => getBestFiveElementFragments(geneInventory.fragments),
    [geneInventory.fragments],
  );
  const fiveElementRate = selectedFiveElementFragments
    ? fiveElementFusionSuccessRate(selectedFiveElementFragments)
    : null;
  const canFiveElementFuse = fiveElementReady && selectedFiveElementFragments !== null;
  const prismaticVarietySet = useMemo(() => {
    const varieties = new Set<string>();
    for (const fragment of geneInventory.fragments) {
      if (PRISMATIC_VARIETIES.includes(fragment.varietyId)) {
        varieties.add(fragment.varietyId);
      }
    }
    return varieties;
  }, [geneInventory.fragments]);
  const voidReadyCount = prismaticVarietySet.size;
  const voidFusionReady = PRISMATIC_VARIETIES.every((varietyId) => prismaticVarietySet.has(varietyId));
  const hybridPairSet = useMemo(() => {
    const pairs = new Set<string>();
    for (const fragment of geneInventory.fragments) {
      const pair = VARIETY_DEFS[fragment.varietyId]?.hybridPair;
      if (pair) {
        pairs.add(pair);
      }
    }
    return pairs;
  }, [geneInventory.fragments]);
  const blackHoleReadyCount = hybridPairSet.size;
  const blackHoleFusionReady = HYBRID_GALAXY_PAIRS.every((pair) => hybridPairSet.has(pair));

  const handleInject = () => {
    if (!canInject || effectiveSelectedGalaxyId === null || effectiveSelectedQuality === null) return;
    onInject(effectiveSelectedGalaxyId, effectiveSelectedQuality);
    setShowInjectToast(true);
    if (injectToastTimerRef.current !== null) {
      window.clearTimeout(injectToastTimerRef.current);
    }
    injectToastTimerRef.current = window.setTimeout(() => {
      setShowInjectToast(false);
      injectToastTimerRef.current = null;
    }, 2000);
  };

  const triggerFusionFeedback = (type: 'success' | 'fail') => {
    setFusionToastType(type);
    setFusionAnimType(type);
    if (fusionToastTimerRef.current !== null) {
      window.clearTimeout(fusionToastTimerRef.current);
    }
    if (fusionAnimTimerRef.current !== null) {
      window.clearTimeout(fusionAnimTimerRef.current);
    }
    fusionToastTimerRef.current = window.setTimeout(() => {
      setFusionToastType(null);
      fusionToastTimerRef.current = null;
    }, 2000);
    fusionAnimTimerRef.current = window.setTimeout(() => {
      setFusionAnimType(null);
      fusionAnimTimerRef.current = null;
    }, 600);
  };

  const handleFusion = () => {
    if (!canFusion || !selectedFusionFragment1 || !selectedFusionFragment2) return;
    const result = onFusion(selectedFusionFragment1.id, selectedFusionFragment2.id, effectiveUseModifier);
    if (!result) return;
    setSelectedFusionGalaxy1(null);
    setSelectedFusionGalaxy2(null);
    setUseModifier(false);
    triggerFusionFeedback(result.success ? 'success' : 'fail');
  };

  const handleFiveElementFusion = () => {
    if (!canFiveElementFuse) return;
    const result = onFiveElementFusion();
    if (!result) return;

    if (fiveElementToastTimerRef.current !== null) {
      window.clearTimeout(fiveElementToastTimerRef.current);
    }

    if (result.success && result.seedVarietyId) {
      setFiveElementToast({
        type: 'success',
        message: t.geneFiveElementSuccess(t.varietyName(result.seedVarietyId)),
      });
    } else if (!result.success && result.returnedGene) {
      setFiveElementToast({
        type: 'fail',
        message: t.geneFiveElementFailReturn(t.varietyName(result.returnedGene.varietyId)),
      });
    } else {
      setFiveElementToast({
        type: result.success ? 'success' : 'fail',
        message: result.success ? t.geneFusionSuccess : t.geneFiveElementFail,
      });
    }

    fiveElementToastTimerRef.current = window.setTimeout(() => {
      setFiveElementToast(null);
      fiveElementToastTimerRef.current = null;
    }, 2500);
  };

  const handleDarkMatterFusion = (fusionType: DarkMatterFusionType) => {
    const result = onDarkMatterFusion(fusionType);
    if (!result) return;

    if (darkMatterToastTimerRef.current !== null) {
      window.clearTimeout(darkMatterToastTimerRef.current);
    }

    if (result.success && result.seedVarietyId) {
      setDarkMatterToast({
        type: 'success',
        message: t.geneDarkMatterSuccess(t.varietyName(result.seedVarietyId)),
      });
    } else {
      setDarkMatterToast({
        type: 'fail',
        message: t.geneDarkMatterFail,
      });
    }

    darkMatterToastTimerRef.current = window.setTimeout(() => {
      setDarkMatterToast(null);
      darkMatterToastTimerRef.current = null;
    }, 2500);
  };

  return (
    <div className="flex-1 w-full px-4 pb-4 overflow-y-auto">
      <h2 className="text-base sm:text-lg font-semibold mb-3" style={{ color: theme.text }}>
        {t.geneLabTitle}
      </h2>

      {totalFragments === 0 ? (
        <div
          className="rounded-2xl border px-4 py-8 text-center"
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        >
          <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
            {t.geneLabEmpty}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {galaxyGroups.map((group) => {
            const isExpanded = expandedGalaxyIds.has(group.galaxyId);
            return (
              <section
                key={group.galaxyId}
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleGalaxy(group.galaxyId)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-base shrink-0">{group.galaxyEmoji}</span>
                    <span className="text-sm font-medium truncate" style={{ color: theme.text }}>
                      {t.galaxyName(group.galaxyId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs" style={{ color: theme.textMuted }}>
                      {t.geneLabFragmentCount(group.fragments.length)}
                    </span>
                    <span
                      className="text-xs transition-transform duration-200"
                      style={{
                        color: theme.textFaint,
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      &gt;
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-2">
                    {group.fragments.map((fragment, index) => {
                      const variety = VARIETY_DEFS[fragment.varietyId];
                      const rarityColor = RARITY_COLOR[fragment.rarity];
                      const rarityStars = RARITY_STARS[fragment.rarity];
                      return (
                        <div
                          key={fragment.id}
                          className={`py-2 flex items-center justify-between gap-3${index === 0 ? '' : ' border-t'}`}
                          style={{ borderColor: theme.border }}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-lg shrink-0">{variety.emoji}</span>
                            <span className="text-sm truncate" style={{ color: theme.text }}>
                              {t.varietyName(fragment.varietyId)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {Array.from({ length: rarityStars }).map((_, starIndex) => (
                              <span key={`${fragment.id}-star-${starIndex}`} className="text-xs" style={{ color: rarityColor }}>
                                ⭐
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div
        className="mt-4 rounded-2xl border px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <span className="text-xs" style={{ color: theme.textMuted }}>
          {t.geneLabFragments}
        </span>
        <span className="text-sm font-semibold" style={{ color: theme.text }}>
          {t.geneLabFragmentCount(totalFragments)}
        </span>
      </div>

      <section
        className="mt-4 rounded-2xl border px-4 py-4"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <h3 className="text-sm sm:text-base font-semibold mb-1" style={{ color: theme.text }}>
          {t.geneInjectTitle}
        </h3>
        <p className="text-xs leading-relaxed mb-4" style={{ color: theme.textMuted }}>
          {t.geneInjectDesc}
        </p>

        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: theme.text }}>
            {`1. ${t.geneInjectSelectGalaxy}`}
          </p>
          {galaxyGroups.length === 0 ? (
            <p className="text-xs" style={{ color: theme.textFaint }}>
              {t.geneInjectNoFragments}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {galaxyGroups.map((group) => {
                const isSelected = effectiveSelectedGalaxyId === group.galaxyId;
                return (
                  <button
                    key={`inject-${group.galaxyId}`}
                    type="button"
                    onClick={() => setSelectedGalaxyId(group.galaxyId)}
                    className="rounded-xl border px-3 py-2 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? `${theme.accent}22` : theme.inputBg,
                      borderColor: isSelected ? `${theme.accent}66` : theme.border,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.galaxyEmoji}</span>
                      <span className="text-sm font-medium" style={{ color: theme.text }}>
                        {t.galaxyName(group.galaxyId)}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {t.geneLabFragmentCount(group.fragments.length)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: theme.text }}>
            {`2. ${t.geneInjectSelectSeed}`}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SEED_QUALITY_OPTIONS.map((option) => {
              const count = seeds[option.quality];
              const disabled = count <= 0;
              const isSelected = selectedQuality === option.quality;
              return (
                <button
                  key={`inject-quality-${option.quality}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedQuality(option.quality)}
                  className="rounded-xl border px-2 py-2 text-center transition-colors"
                  style={{
                    opacity: disabled ? 0.45 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor: disabled ? theme.inputBg : `${option.color}${isSelected ? '20' : '10'}`,
                    borderColor: disabled ? theme.border : (isSelected ? option.color : `${option.color}55`),
                  }}
                >
                  <p className="text-xs font-semibold leading-none" style={{ color: disabled ? theme.textFaint : option.color }}>
                    {t.seedQualityLabel(option.quality)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                    ×{count}
                  </p>
                </button>
              );
            })}
          </div>
          {!hasSeeds && (
            <p className="text-xs mt-2" style={{ color: theme.textFaint }}>
              {t.geneInjectNoSeeds}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleInject}
          disabled={!canInject}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: canInject ? `${theme.accent}22` : theme.inputBg,
            border: `1px solid ${canInject ? `${theme.accent}66` : theme.border}`,
            color: canInject ? theme.accent : theme.textFaint,
            cursor: canInject ? 'pointer' : 'not-allowed',
          }}
        >
          {t.geneInjectButton}
        </button>

        <p className="text-xs mt-2 text-center" style={{ color: theme.textFaint }}>
          {t.geneInjectCost}
        </p>
        {!hasFragments && (
          <p className="text-xs mt-1 text-center" style={{ color: theme.textFaint }}>
            {t.geneInjectNoFragments}
          </p>
        )}
      </section>

      <section
        className="mt-4 rounded-2xl border px-4 py-4"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <h3 className="text-sm sm:text-base font-semibold mb-1" style={{ color: theme.text }}>
          {t.geneFusionTitle}
        </h3>
        <p className="text-xs leading-relaxed mb-4" style={{ color: theme.textMuted }}>
          {t.geneFusionDesc}
        </p>

        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: theme.text }}>
            {`1. ${t.geneFusionSelectFirst}`}
          </p>
          {fusionGalaxyGroups.length === 0 ? (
            <p className="text-xs" style={{ color: theme.textFaint }}>
              {t.geneFusionNoFragments}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fusionGalaxyGroups.map((group) => {
                const isSelected = selectedFusionGalaxy1 === group.galaxyId;
                return (
                  <button
                    key={`fusion-first-${group.galaxyId}`}
                    type="button"
                    onClick={() => setSelectedFusionGalaxy1(group.galaxyId)}
                    className="rounded-xl border px-3 py-2 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? `${theme.accent}22` : theme.inputBg,
                      borderColor: isSelected ? `${theme.accent}66` : theme.border,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.galaxyEmoji}</span>
                      <span className="text-sm font-medium" style={{ color: theme.text }}>
                        {t.galaxyName(group.galaxyId)}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {t.geneLabFragmentCount(group.fragments.length)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {selectedFusionFragment1 && (
            <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
              {`${t.geneLabVarietySource}: ${t.varietyName(selectedFusionFragment1.varietyId)} · ${'⭐'.repeat(RARITY_STARS[selectedFusionFragment1.rarity])}`}
            </p>
          )}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: theme.text }}>
            {`2. ${t.geneFusionSelectSecond}`}
          </p>
          {fusionGalaxyGroups.length < 2 ? (
            <p className="text-xs" style={{ color: theme.textFaint }}>
              {t.geneFusionNoFragments}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fusionGalaxyGroups.map((group) => {
                const disabled = selectedFusionGalaxy1 === group.galaxyId;
                const isSelected = selectedFusionGalaxy2 === group.galaxyId;
                return (
                  <button
                    key={`fusion-second-${group.galaxyId}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedFusionGalaxy2(group.galaxyId)}
                    className="rounded-xl border px-3 py-2 text-left transition-colors"
                    style={{
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isSelected ? `${theme.accent}22` : theme.inputBg,
                      borderColor: isSelected ? `${theme.accent}66` : theme.border,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{group.galaxyEmoji}</span>
                      <span className="text-sm font-medium" style={{ color: theme.text }}>
                        {t.galaxyName(group.galaxyId)}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {t.geneLabFragmentCount(group.fragments.length)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {selectedFusionFragment2 && (
            <p className="text-xs mt-2" style={{ color: theme.textMuted }}>
              {`${t.geneLabVarietySource}: ${t.varietyName(selectedFusionFragment2.varietyId)} · ${'⭐'.repeat(RARITY_STARS[selectedFusionFragment2.rarity])}`}
            </p>
          )}
        </div>

        {fusionRate !== null && (
          <p className="text-xs font-semibold mb-3" style={{ color: theme.text }}>
            {t.geneFusionRate(fusionRate)}
          </p>
        )}

        <label className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={effectiveUseModifier}
            disabled={!hasModifier}
            onChange={(event) => setUseModifier(event.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-xs" style={{ color: hasModifier ? theme.text : theme.textFaint }}>
            {`${t.itemName('gene-modifier')} (+20%) · ×${modifierCount}`}
          </span>
        </label>

        <div
          className={`relative ${fusionAnimType === 'success' ? 'gene-fusion-success' : ''}${fusionAnimType === 'fail' ? ' gene-fusion-fail' : ''}`}
        >
          <button
            type="button"
            onClick={handleFusion}
            disabled={!canFusion}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: canFusion ? `${theme.accent}22` : theme.inputBg,
              border: `1px solid ${canFusion ? `${theme.accent}66` : theme.border}`,
              color: canFusion ? theme.accent : theme.textFaint,
              cursor: canFusion ? 'pointer' : 'not-allowed',
            }}
          >
            {t.geneFusionButton}
          </button>
          {fusionAnimType && (
            <span className="gene-fusion-burst absolute -top-2 -right-1 text-lg pointer-events-none" aria-hidden>
              {fusionAnimType === 'success' ? '✨' : '💥'}
            </span>
          )}
        </div>

        <p className="text-xs mt-3 text-center" style={{ color: theme.textFaint }}>
          {t.hybridSeedLabel(`×${hybridSeeds.length}`)}
        </p>
      </section>

      <section
        className="mt-4 rounded-2xl border px-4 py-4"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <h3 className="text-sm sm:text-base font-semibold mb-1" style={{ color: theme.text }}>
          {t.geneFiveElementTitle}
        </h3>
        <p className="text-xs leading-relaxed mb-3" style={{ color: theme.textMuted }}>
          {t.geneFiveElementDesc}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {FIVE_ELEMENT_GALAXIES.map((galaxyId) => {
            const count = fiveElementGeneCounts.get(galaxyId) ?? 0;
            const isReady = count > 0;
            return (
              <div
                key={`five-element-${galaxyId}`}
                className="rounded-xl border px-2.5 py-2"
                style={{
                  borderColor: isReady ? `${theme.accent}55` : theme.border,
                  backgroundColor: isReady ? `${theme.accent}14` : theme.inputBg,
                }}
              >
                <p className="text-xs truncate" style={{ color: isReady ? theme.text : theme.textMuted }}>
                  {t.galaxyName(galaxyId)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: isReady ? theme.accent : theme.textFaint }}>
                  ×{count}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs mb-1" style={{ color: hasHybridRequirement ? theme.text : theme.textMuted }}>
          {t.geneFiveElementHybridRequirement(harvestedHybridVarietyCount)}
        </p>
        <p className="text-xs mb-3" style={{ color: fiveElementReady ? '#22c55e' : theme.textFaint }}>
          {fiveElementReady ? t.geneFiveElementResonanceReady : t.geneFiveElementResonanceLocked}
        </p>

        {fiveElementRate !== null && (
          <p className="text-xs font-semibold mb-3" style={{ color: theme.text }}>
            {t.geneFiveElementRate(fiveElementRate)}
          </p>
        )}

        <button
          type="button"
          onClick={handleFiveElementFusion}
          disabled={!canFiveElementFuse}
          className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: canFiveElementFuse ? `${theme.accent}22` : theme.inputBg,
            border: `1px solid ${canFiveElementFuse ? `${theme.accent}66` : theme.border}`,
            color: canFiveElementFuse ? theme.accent : theme.textFaint,
            cursor: canFiveElementFuse ? 'pointer' : 'not-allowed',
          }}
        >
          {t.geneFiveElementButton}
        </button>

        <div className="mt-2 text-center text-xs" style={{ color: theme.textFaint }}>
          {t.prismaticSeedCountLabel(prismaticSeedCount)}
        </div>
        {fusionHistory.sameVarietyStreak >= 3 && (
          <div className="mt-1 text-center text-xs" style={{ color: '#fbbf24' }}>
            {t.geneFiveElementPityReady}
          </div>
        )}
      </section>

      <section
        className="mt-4 rounded-2xl border px-4 py-4"
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
      >
        <h3 className="text-sm sm:text-base font-semibold mb-1" style={{ color: theme.text }}>
          {t.geneDarkMatterTitle}
        </h3>
        <p className="text-xs leading-relaxed mb-3" style={{ color: theme.textMuted }}>
          {t.geneDarkMatterDesc}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: `${theme.inputBg}80` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: theme.text }}>
              🌑 {t.varietyName('void-melon')}
            </p>
            <p className="text-xs mb-2" style={{ color: voidFusionReady ? '#22c55e' : theme.textFaint }}>
              {t.geneDarkMatterVoidProgress(voidReadyCount, PRISMATIC_VARIETIES.length)}
            </p>
            <button
              type="button"
              onClick={() => handleDarkMatterFusion('void-melon')}
              disabled={!voidFusionReady}
              className="w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: voidFusionReady ? `${theme.accent}22` : theme.inputBg,
                border: `1px solid ${voidFusionReady ? `${theme.accent}66` : theme.border}`,
                color: voidFusionReady ? theme.accent : theme.textFaint,
                cursor: voidFusionReady ? 'pointer' : 'not-allowed',
              }}
            >
              {t.geneDarkMatterVoidButton}
            </button>
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: `${theme.inputBg}80` }}>
            <p className="text-xs font-semibold mb-1" style={{ color: theme.text }}>
              🕳️ {t.varietyName('blackhole-melon')}
            </p>
            <p className="text-xs mb-2" style={{ color: blackHoleFusionReady ? '#22c55e' : theme.textFaint }}>
              {t.geneDarkMatterBlackHoleProgress(blackHoleReadyCount, HYBRID_GALAXY_PAIRS.length)}
            </p>
            <button
              type="button"
              onClick={() => handleDarkMatterFusion('blackhole-melon')}
              disabled={!blackHoleFusionReady}
              className="w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: blackHoleFusionReady ? `${theme.accent}22` : theme.inputBg,
                border: `1px solid ${blackHoleFusionReady ? `${theme.accent}66` : theme.border}`,
                color: blackHoleFusionReady ? theme.accent : theme.textFaint,
                cursor: blackHoleFusionReady ? 'pointer' : 'not-allowed',
              }}
            >
              {t.geneDarkMatterBlackHoleButton}
            </button>
          </div>
        </div>

        <div className="mt-2 text-center text-xs" style={{ color: theme.textFaint }}>
          {t.darkMatterSeedCountLabel(darkMatterSeedCount)}
        </div>
      </section>

      <style>{`
        @keyframes geneFusionPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(34,197,94,0); }
          45% { transform: scale(1.015); box-shadow: 0 0 0 8px rgba(34,197,94,0.12); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes geneFusionShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        @keyframes geneFusionBurst {
          0% { opacity: 0; transform: scale(0.5); }
          40% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.4); }
        }
        .gene-fusion-success {
          animation: geneFusionPulse 620ms ease-out;
        }
        .gene-fusion-fail {
          animation: geneFusionShake 420ms ease-in-out;
        }
        .gene-fusion-burst {
          animation: geneFusionBurst 620ms ease-out;
        }
      `}</style>

      {showInjectToast && (
        <div
          className="fixed left-1/2 bottom-20 z-[90] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm"
          style={{ backgroundColor: theme.surface, borderColor: `${theme.accent}66`, color: theme.text }}
        >
          {t.geneInjectSuccess}
        </div>
      )}
      {fusionToastType && (
        <div
          className="fixed left-1/2 bottom-8 z-[90] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm"
          style={{
            backgroundColor: theme.surface,
            borderColor: fusionToastType === 'success' ? '#22c55e66' : '#ef444466',
            color: fusionToastType === 'success' ? '#22c55e' : '#ef4444',
          }}
        >
          {fusionToastType === 'success' ? t.geneFusionSuccess : t.geneFusionFail}
        </div>
      )}
      {fiveElementToast && (
        <div
          className="fixed left-1/2 bottom-32 z-[90] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm"
          style={{
            backgroundColor: theme.surface,
            borderColor: fiveElementToast.type === 'success' ? '#22c55e66' : '#ef444466',
            color: fiveElementToast.type === 'success' ? '#22c55e' : '#ef4444',
          }}
        >
          {fiveElementToast.message}
        </div>
      )}
      {darkMatterToast && (
        <div
          className="fixed left-1/2 bottom-44 z-[90] -translate-x-1/2 rounded-xl border px-4 py-2 text-sm"
          style={{
            backgroundColor: theme.surface,
            borderColor: darkMatterToast.type === 'success' ? '#22c55e66' : '#ef444466',
            color: darkMatterToast.type === 'success' ? '#22c55e' : '#ef4444',
          }}
        >
          {darkMatterToast.message}
        </div>
      )}
    </div>
  );
}
