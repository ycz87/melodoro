/**
 * HybridDexPage — 杂交图鉴页面
 * 
 * 展示 10 个星系组合产生的 30 个杂交品种。
 */
import { useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { CollectedVariety, VarietyId } from '../types/farm';
import {
  getCollectedVarietyHarvestCount,
  HYBRID_GALAXY_PAIRS, HYBRID_VARIETIES, VARIETY_DEFS,
  RARITY_COLOR, RARITY_STARS,
} from '../types/farm';

interface HybridDexPageProps {
  collection: CollectedVariety[];
}

export function HybridDexPage({ collection }: HybridDexPageProps) {
  const theme = useTheme();
  const t = useI18n();
  const [selectedVarietyId, setSelectedVarietyId] = useState<VarietyId | null>(null);

  const collectionMap = useMemo(
    () => new Map(collection.map(item => [item.varietyId, item] as const)),
    [collection],
  );

  const hybridVarietiesAll = useMemo(() => {
    return HYBRID_GALAXY_PAIRS.flatMap(pair => HYBRID_VARIETIES[pair]);
  }, []);

  const collectedHybridCount = useMemo(() => {
    return hybridVarietiesAll.filter(id => collectionMap.has(id)).length;
  }, [collectionMap, hybridVarietiesAll]);

  const totalHybridCount = hybridVarietiesAll.length;
  const overallPercent = totalHybridCount > 0 ? Math.round((collectedHybridCount / totalHybridCount) * 100) : 0;

  const selectedVariety = selectedVarietyId ? collectionMap.get(selectedVarietyId) : undefined;

  return (
    <div className="flex-1 w-full px-4 pb-4 overflow-y-auto">
      {/* 杂交进度 */}
      <div className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: `${theme.surface}70`, borderColor: theme.border }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
          {t.hybridDexTitle || '杂交图鉴'}
        </h3>
        <div className="mb-1">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: theme.textMuted }}>
            <span>{collectedHybridCount}/{totalHybridCount}</span>
            <span>{overallPercent}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${theme.inputBg}90` }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${overallPercent}%`, backgroundColor: theme.accent }}
            />
          </div>
        </div>
      </div>

      {/* 组合列表 */}
      {HYBRID_GALAXY_PAIRS.map(pair => {
        const varieties = HYBRID_VARIETIES[pair];
        const collectedInPair = varieties.filter(id => collectionMap.has(id)).length;

        return (
          <div key={pair} className="mb-6">
            {/* 组合标题 */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: theme.text }}>
                  {t.hybridGalaxyPairLabel(pair)}
                </span>
              </div>
              <span className="text-[10px]" style={{ color: theme.textFaint }}>
                {collectedInPair}/{varieties.length}
              </span>
            </div>

            {/* 品种网格 */}
            <div className="grid grid-cols-3 gap-2">
              {varieties.map(id => {
                const collected = collectionMap.get(id);
                return (
                  <HybridVarietyCard
                    key={id}
                    varietyId={id}
                    collected={collected}
                    theme={theme}
                    t={t}
                    onOpenDetail={setSelectedVarietyId}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {selectedVarietyId && selectedVariety && (
        <VarietyDetailModal
          varietyId={selectedVarietyId}
          collected={selectedVariety}
          theme={theme}
          t={t}
          onClose={() => setSelectedVarietyId(null)}
        />
      )}
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

// 复用 VarietyDetailModal (之后可以抽离成公共组件)
function VarietyDetailModal({ varietyId, collected, theme, t, onClose }: {
  varietyId: VarietyId;
  collected: CollectedVariety;
  theme: ReturnType<typeof useTheme>;
  t: ReturnType<typeof useI18n>;
  onClose: () => void;
}) {
  const variety = VARIETY_DEFS[varietyId];
  const color = RARITY_COLOR[variety.rarity];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
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
            style={{ filter: `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 24px ${color}AA)` }}
          >
            {variety.emoji}
          </span>
          <p className="text-base font-semibold mt-2" style={{ color: theme.text }}>
            {t.varietyName(varietyId)}
          </p>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: RARITY_STARS[variety.rarity] }).map((_, i) => (
              <span key={i} style={{ color, fontSize: 14 }}>⭐</span>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed mb-4" style={{ color: theme.textMuted }}>
          {t.varietyStory(varietyId)}
        </p>
        <div className="rounded-xl border p-3 mb-4" style={{ borderColor: theme.border, backgroundColor: `${theme.inputBg}70` }}>
          <p className="text-xs mb-1" style={{ color: theme.textFaint }}>
            {t.varietyDetailFirstObtained}
          </p>
          <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>
            {collected.firstObtainedDate}
          </p>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            {t.varietyDetailHarvestCount(getCollectedVarietyHarvestCount(collected))}
          </p>
        </div>
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
