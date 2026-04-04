/**
 * WarehousePage — 瓜棚页面（收获物 + 切瓜 + 种子 + 道具 + 合成）
 */
import { useState, useCallback } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n';
import type { GrowthStage, SynthesisRecipe } from '../types';
import type { Warehouse } from '../types';
import { SYNTHESIS_RECIPES } from '../types';
import { GrowthIcon } from './GrowthIcon';
import type { ShedStorage, ItemId } from '../types/slicing';
import { ALL_ITEM_IDS, ITEM_DEFS } from '../types/slicing';

interface WarehousePageProps {
  warehouse: Warehouse;
  shed: ShedStorage;
  onSynthesize: (recipe: SynthesisRecipe, count?: number) => boolean;
  onSynthesizeAll: (recipe: SynthesisRecipe) => number;
  onSlice: (type: 'ripe' | 'legendary') => void;
  highestStage: GrowthStage | null;
  onClose?: () => void;
  inline?: boolean;
  onGoFarm?: () => void;
}

const DISPLAY_ORDER: GrowthStage[] = ['seed', 'sprout', 'bloom', 'green', 'ripe', 'legendary'];
type WarehouseTab = 'shed' | 'backpack';

function getStageName(stage: GrowthStage, t: ReturnType<typeof useI18n>): string {
  const map: Record<GrowthStage, string> = {
    seed: t.stageNameSeed,
    sprout: t.stageNameSprout,
    bloom: t.stageNameBloom,
    green: t.stageNameGreen,
    ripe: t.stageNameRipe,
    legendary: t.stageNameLegendary,
  };
  return map[stage];
}

export function WarehousePage({ warehouse, shed, onSynthesize, onSynthesizeAll, onSlice, highestStage, onClose, inline, onGoFarm }: WarehousePageProps) {
  const theme = useTheme();
  const t = useI18n();
  const [activeTab, setActiveTab] = useState<WarehouseTab>('shed');
  const [toast, setToast] = useState<string | null>(null);
  const [synthAnim, setSynthAnim] = useState<string | null>(null);
  const [flavorTooltip, setFlavorTooltip] = useState<ItemId | null>(null);

  const visibleSeedCounts = {
    ...shed.seeds,
    normal: Math.max(0, shed.seeds.normal - (shed.pendingRevealedNormalSeed ? 1 : 0)),
  };
  const legendaryUnlocked = warehouse.items.legendary > 0;
  const canSliceRipe = warehouse.items.ripe > 0;
  const canSliceLegendary = warehouse.items.legendary > 0;
  const hasItems = ALL_ITEM_IDS.some(id => shed.items[id] > 0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSynthesize = useCallback((recipe: SynthesisRecipe) => {
    setSynthAnim(recipe.from);
    setTimeout(() => {
      const ok = onSynthesize(recipe);
      setSynthAnim(null);
      if (ok) showToast(t.synthesisSuccess(getStageName(recipe.to, t)));
    }, 600);
  }, [onSynthesize, showToast, t]);

  const handleSynthesizeAll = useCallback((recipe: SynthesisRecipe) => {
    setSynthAnim(recipe.from);
    setTimeout(() => {
      const count = onSynthesizeAll(recipe);
      setSynthAnim(null);
      if (count > 0) showToast(`${t.synthesisSuccess(getStageName(recipe.to, t))} x${count}`);
    }, 600);
  }, [onSynthesizeAll, showToast, t]);

  const content = (
    <>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: theme.text }}>{t.warehouseTitle}</h2>
            {!inline && onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button cursor-pointer"
                style={{ color: theme.textMuted, backgroundColor: theme.inputBg }}
              >✕</button>
            )}
          </div>
          <div className="mt-3 relative flex items-center rounded-full p-[3px]" style={{ backgroundColor: theme.inputBg }}>
            <div
              className="absolute top-[3px] bottom-[3px] rounded-full transition-all duration-200 ease-in-out"
              style={{
                backgroundColor: theme.accent,
                opacity: 0.16,
                width: 'calc(50% - 3px)',
                left: activeTab === 'shed' ? '3px' : 'calc(50%)',
              }}
            />
            <button
              onClick={() => { setActiveTab('shed'); setFlavorTooltip(null); }}
              className="relative z-10 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1"
              style={{ color: activeTab === 'shed' ? theme.text : theme.textMuted }}
            >
              {t.warehouseTabShed}
            </button>
            <button
              onClick={() => { setActiveTab('backpack'); setFlavorTooltip(null); }}
              className="relative z-10 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1"
              style={{ color: activeTab === 'backpack' ? theme.text : theme.textMuted }}
            >
              {t.warehouseTabBackpack}
            </button>
          </div>
        </div>

      {activeTab === 'shed' ? (
        <>
        {/* Items grid */}
        {warehouse.totalCollected === 0 ? (
          <div
            className="text-center p-4 text-sm rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
            style={{ color: theme.textMuted, backgroundColor: theme.inputBg, borderColor: theme.border }}
          >
            {t.warehouseEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {DISPLAY_ORDER.map((stage) => {
              const isLegendary = stage === 'legendary';
              const locked = isLegendary && !legendaryUnlocked;
              const count = warehouse.items[stage];
              return (
                <div
                  key={stage}
                  className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card"
                  style={{
                    backgroundColor: locked ? theme.inputBg : count > 0 ? `${theme.accent}08` : theme.inputBg,
                    borderColor: count > 0 && !locked ? `${theme.accent}30` : theme.border,
                    opacity: locked ? 0.5 : 1,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  {locked ? (
                    <span className="text-2xl">🔒</span>
                  ) : (
                    <GrowthIcon stage={stage} size={36} />
                  )}
                  <span className="text-xs font-medium" style={{ color: locked ? theme.textFaint : theme.textMuted }}>
                    {locked ? t.warehouseLockedName : getStageName(stage, t)}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: locked ? theme.textFaint : theme.text }}>
                    {locked ? '—' : `×${count}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Synthesis */}
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>{t.synthesisTitle}</h3>
          <div className="flex flex-col gap-3">
            {SYNTHESIS_RECIPES.map((recipe) => {
              const available = warehouse.items[recipe.from];
              const canMake = Math.floor(available / recipe.cost);
              const isAnimating = synthAnim === recipe.from;
              return (
                <div
                  key={`${recipe.from}-${recipe.to}`}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-card)] border transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card"
                  style={{
                    backgroundColor: isAnimating ? `${theme.accent}15` : theme.inputBg,
                    borderColor: theme.border,
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GrowthIcon stage={recipe.from} size={22} />
                    <span className="text-xs font-medium" style={{ color: theme.textMuted }}>×{recipe.cost}</span>
                    <span className="text-xs" style={{ color: theme.textFaint }}>→</span>
                    <GrowthIcon stage={recipe.to} size={22} />
                    <span className="text-xs font-medium" style={{ color: theme.textMuted }}>×1</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canMake > 0 ? (
                      <>
                        <button
                          onClick={() => handleSynthesize(recipe)}
                          className="px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button"
                          style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                        >
                          {t.synthesisSynthesize}
                        </button>
                        {canMake > 1 && (
                          <button
                            onClick={() => handleSynthesizeAll(recipe)}
                            className="px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button"
                            style={{ backgroundColor: `${theme.accent}10`, color: theme.accent }}
                          >
                            {t.synthesisSynthesizeAll}
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: theme.textFaint }}>
                        {t.synthesisNotEnough}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Slice Section ─── */}
        {(canSliceRipe || canSliceLegendary) && (
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>{t.shedSliceSection}</h3>
            <div className="flex flex-col gap-2">
              {canSliceRipe && (
                <div
                  className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border"
                  style={{ backgroundColor: theme.inputBg, borderColor: theme.border, boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-center gap-2">
                    <GrowthIcon stage="ripe" size={28} />
                    <span className="text-sm font-medium" style={{ color: theme.text }}>
                      {getStageName('ripe', t)} ×{warehouse.items.ripe}
                    </span>
                  </div>
                  <button
                    onClick={() => onSlice('ripe')}
                    className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5"
                    style={{ backgroundColor: '#ef4444', color: '#fff', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
                  >
                    {t.sliceButton}
                  </button>
                </div>
              )}
              {canSliceLegendary && (
                <div
                  className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border"
                  style={{ backgroundColor: '#fbbf2408', borderColor: '#fbbf2430', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-center gap-2">
                    <GrowthIcon stage="legendary" size={28} />
                    <span className="text-sm font-medium" style={{ color: '#fbbf24' }}>
                      {getStageName('legendary', t)} ×{warehouse.items.legendary}
                    </span>
                  </div>
                  <button
                    onClick={() => onSlice('legendary')}
                    className="px-4 py-2 rounded-[var(--radius-sm)] text-sm font-bold cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5"
                    style={{ backgroundColor: '#fbbf24', color: '#78350f', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }}
                  >
                    {t.sliceButton}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </>
      ) : (
        <>
          {/* ─── Seeds Section ─── */}
          {(visibleSeedCounts.normal > 0 || visibleSeedCounts.epic > 0 || visibleSeedCounts.legendary > 0) && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>{t.shedSeedsTitle}</h3>
              <div className="flex flex-col gap-2">
                {visibleSeedCounts.normal > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border"
                    style={{ backgroundColor: theme.inputBg, borderColor: theme.border, boxShadow: 'var(--shadow-card)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌱</span>
                      <span className="text-sm font-medium" style={{ color: theme.text }}>
                        {t.seedQualityLabel('normal')} {t.shedSeedsCount(visibleSeedCounts.normal)}
                      </span>
                    </div>
                  </div>
                )}
                {visibleSeedCounts.epic > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border"
                    style={{ backgroundColor: '#a78bfa08', borderColor: '#a78bfa30', boxShadow: 'var(--shadow-card)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💎</span>
                      <span className="text-sm font-medium" style={{ color: '#a78bfa' }}>
                        {t.seedQualityLabel('epic')} {t.shedSeedsCount(visibleSeedCounts.epic)}
                      </span>
                    </div>
                  </div>
                )}
                {visibleSeedCounts.legendary > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-[var(--radius-card)] border"
                    style={{ backgroundColor: '#fbbf2408', borderColor: '#fbbf2430', boxShadow: 'var(--shadow-card)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🌟</span>
                      <span className="text-sm font-medium" style={{ color: '#fbbf24' }}>
                        {t.seedQualityLabel('legendary')} {t.shedSeedsCount(visibleSeedCounts.legendary)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs ml-1" style={{ color: theme.textFaint }}>{t.shedFarmComingSoon}</p>
                <button
                  onClick={onGoFarm}
                  className="px-3 py-2 rounded-[var(--radius-sm)] text-xs font-medium cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-button"
                  style={{ backgroundColor: `${theme.accent}15`, color: theme.accent, border: `1px solid ${theme.accent}30` }}
                >
                  {t.farmGoFarm}
                </button>
              </div>
            </div>
          )}

          {/* ─── Items Section ─── */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>{t.shedItemsTitle}</h3>
            {!hasItems ? (
              <p
                className="text-xs p-4 text-center rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]"
                style={{ color: theme.textFaint, backgroundColor: theme.inputBg, borderColor: theme.border }}
              >
                {t.shedNoItems}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {ALL_ITEM_IDS.filter(id => shed.items[id] > 0).map((id) => {
                  const def = ITEM_DEFS[id];
                  const isRare = def.rarity === 'rare';
                  return (
                    <button
                      key={id}
                      onClick={() => setFlavorTooltip(flavorTooltip === id ? null : id)}
                      className="flex flex-col items-center gap-1 p-3 rounded-[var(--radius-card)] border cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 ui-hover-card"
                      style={{
                        backgroundColor: isRare ? '#fbbf2408' : theme.inputBg,
                        borderColor: isRare ? '#fbbf2430' : theme.border,
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <span className="text-xl">{def.emoji}</span>
                      <span className="text-[10px] font-medium leading-tight text-center" style={{ color: theme.textMuted }}>
                        {t.itemName(id).replace(/^[^\s]+\s/, '')}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: isRare ? '#fbbf24' : theme.text }}>
                        ×{shed.items[id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {/* Flavor tooltip */}
            {flavorTooltip && (
              <div
                className="mt-2 p-3 rounded-[var(--radius-card)] text-xs italic"
                style={{ backgroundColor: theme.inputBg, color: theme.textMuted, border: `1px solid ${theme.border}`, boxShadow: 'var(--shadow-card)' }}
              >
                {t.itemFlavor(flavorTooltip)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Stats */}
      <div
        className="flex items-center justify-between p-4 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] flex-wrap gap-2"
        style={{ backgroundColor: theme.inputBg, borderColor: theme.border }}
      >
        <div className="text-xs" style={{ color: theme.textMuted }}>
          {t.warehouseTotal}: <span style={{ color: theme.text, fontWeight: 600 }}>{warehouse.totalCollected}</span>
        </div>
        <div className="text-xs" style={{ color: theme.textMuted }}>
          {t.warehouseHighest}: <span style={{ color: theme.text, fontWeight: 600 }}>
            {highestStage ? getStageName(highestStage, t) : '—'}
          </span>
        </div>
        {shed.totalSliced > 0 && (
          <div className="text-xs" style={{ color: theme.textMuted }}>
            {t.shedTotalSliced}: <span style={{ color: theme.text, fontWeight: 600 }}>{shed.totalSliced}</span>
          </div>
        )}
        {legendaryUnlocked && (
          <div className="text-xs" style={{ color: '#fbbf24', fontWeight: 600 }}>
            👑 {t.legendaryUnlocked}
          </div>
        )}
      </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium animate-fade-up z-[60]"
          style={{ backgroundColor: theme.surface, color: theme.accent, border: `1px solid ${theme.border}` }}
        >
          {toast}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex-1 w-full px-4 pt-4 pb-6 overflow-y-auto">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-container)] border p-5 mx-4 animate-fade-up"
        style={{ backgroundColor: theme.surface, borderColor: theme.border, boxShadow: 'var(--shadow-elevated)' }}
      >
        {content}
      </div>
    </div>
  );
}
