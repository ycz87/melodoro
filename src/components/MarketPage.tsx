/**
 * MarketPage — 商城页面（买入 / 卖出）
 *
 * 买入页整合每周特惠、常驻商品与地块扩展，统一为紧凑列表。
 * 卖出页保持现有业务逻辑，但也改为同一套列表语言。
 */
import { useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import type { Messages } from '../i18n/types';
import { getCollectedUniqueVarietyCount } from '../farm/galaxy';
import { PLOT_MILESTONES, VARIETY_DEFS } from '../types/farm';
import type { CollectedVariety, VarietyId } from '../types/farm';
import type { ShopItemDef, ShopItemId, WeeklyShop } from '../types/market';
import { SHOP_ITEMS, PLOT_PRICES } from '../types/market';
import { ConfirmModal } from './ConfirmModal';
import { MarketItemCard } from './Market/MarketItemCard';
import { MarketTradeHero } from './Market/MarketTradeHero';
import { WeeklyTab } from './Market/WeeklyTab';

interface MarketPageProps {
  balance: number;
  collection: CollectedVariety[];
  onSellVariety: (varietyId: VarietyId, isMutant: boolean) => void;
  onBuyItem: (itemId: ShopItemId) => void;
  onBuyWeeklyItem: (itemId: string) => void;
  onBuyPlot: (plotIndex: number) => void;
  unlockedPlotCount: number;
  weeklyShop: WeeklyShop;
  messages: Messages;
}

type MarketTab = 'buy' | 'sell';

interface SellableVariety {
  key: string;
  varietyId: VarietyId;
  isMutant: boolean;
  name: string;
  emoji: string;
  count: number;
  sellPrice: number;
}

type PendingPurchase =
  | { type: 'item'; item: ShopItemDef }
  | { type: 'plot'; plotIndex: number; price: number };

export function MarketPage(props: MarketPageProps) {
  const theme = useTheme();
  const {
    balance,
    collection,
    onSellVariety,
    onBuyItem,
    onBuyWeeklyItem,
    onBuyPlot,
    unlockedPlotCount,
    weeklyShop,
    messages,
  } = props;
  const [activeTab, setActiveTab] = useState<MarketTab>('buy');
  const [pendingSellKey, setPendingSellKey] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<PendingPurchase | null>(null);
  const [recentBoughtItemId, setRecentBoughtItemId] = useState<ShopItemId | null>(null);
  const marketTabIndex: Record<MarketTab, number> = { buy: 0, sell: 1 };

  const sellableVarieties = useMemo<SellableVariety[]>(() => {
    return collection.flatMap((entry) => {
      const def = VARIETY_DEFS[entry.varietyId];
      if (!def || entry.count <= 0 || def.sellPrice <= 0) return [];
      const isMutant = entry.isMutant === true;
      return [{
        key: `${entry.varietyId}:${isMutant ? 'mutant' : 'normal'}`,
        varietyId: entry.varietyId,
        isMutant,
        name: isMutant
          ? `${messages.varietyName(entry.varietyId)} · ${messages.mutationPositive}`
          : messages.varietyName(entry.varietyId),
        emoji: def.emoji,
        count: entry.count,
        sellPrice: isMutant ? def.sellPrice * 3 : def.sellPrice,
      }];
    });
  }, [collection, messages]);

  const pendingVariety = useMemo(() => {
    if (!pendingSellKey) return null;
    return sellableVarieties.find((item) => item.key === pendingSellKey) ?? null;
  }, [pendingSellKey, sellableVarieties]);

  const collectedUniqueCount = useMemo(() => getCollectedUniqueVarietyCount(collection), [collection]);

  const handleConfirmSell = () => {
    if (!pendingVariety) {
      setPendingSellKey(null);
      return;
    }
    onSellVariety(pendingVariety.varietyId, pendingVariety.isMutant);
    setPendingSellKey(null);
  };

  const buyablePlots = useMemo(() => {
    const milestoneByTotalPlots = new Map(
      PLOT_MILESTONES.map((milestone) => [milestone.totalPlots, milestone.requiredVarieties]),
    );

    return Object.entries(PLOT_PRICES)
      .map(([index, price]) => {
        const plotIndex = Number(index);
        return {
          plotIndex,
          price,
          freeUnlockRequiredVarieties: milestoneByTotalPlots.get(plotIndex + 1) ?? null,
        };
      })
      .sort((a, b) => a.plotIndex - b.plotIndex);
  }, []);

  const handleConfirmPurchase = () => {
    if (!pendingPurchase) return;

    if (pendingPurchase.type === 'item') {
      if (balance < pendingPurchase.item.price) {
        setPendingPurchase(null);
        return;
      }
      onBuyItem(pendingPurchase.item.id);
      setRecentBoughtItemId(pendingPurchase.item.id);
      window.setTimeout(() => setRecentBoughtItemId((prev) => (
        prev === pendingPurchase.item.id ? null : prev
      )), 1000);
      setPendingPurchase(null);
      return;
    }

    const { plotIndex, price } = pendingPurchase;
    if (balance < price || plotIndex !== unlockedPlotCount) {
      setPendingPurchase(null);
      return;
    }
    onBuyPlot(plotIndex);
    setPendingPurchase(null);
  };

  return (
    <div className="w-full px-4 pt-4 pb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: theme.text }}>{messages.marketTitle}</h2>
          <div className="mt-1 text-xs" style={{ color: theme.textMuted }}>{messages.marketBalance}</div>
        </div>
        <div
          className="text-sm font-semibold px-3 py-2 rounded-full"
          style={{ backgroundColor: theme.inputBg, color: '#fbbf24', border: `1px solid ${theme.border}` }}
        >
          💰 {balance}
        </div>
      </div>

      <div className="mb-4">
        <MarketTradeHero
          balance={balance}
          weeklyItemCount={weeklyShop.items.length}
          sellableCount={sellableVarieties.length}
          messages={messages}
          theme={theme}
        />
      </div>

      <div className="mb-4 relative flex items-center rounded-full p-[3px]" style={{ backgroundColor: theme.inputBg }}>
        <div
          className="absolute top-[3px] bottom-[3px] rounded-full transition-all duration-200 ease-in-out"
          style={{
            backgroundColor: theme.accent,
            opacity: 0.16,
            width: 'calc((100% - 6px) / 2)',
            left: '3px',
            transform: `translateX(${marketTabIndex[activeTab] * 100}%)`,
          }}
        />
        <button
          onClick={() => setActiveTab('buy')}
          className="relative z-10 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1"
          style={{ color: activeTab === 'buy' ? theme.text : theme.textMuted }}
        >
          {messages.marketTabBuy}
        </button>
        <button
          onClick={() => setActiveTab('sell')}
          className="relative z-10 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1"
          style={{ color: activeTab === 'sell' ? theme.text : theme.textMuted }}
        >
          {messages.marketTabSell}
        </button>
      </div>

      {activeTab === 'buy' && (
        <div className="flex flex-col gap-6">
          <WeeklyTab
            balance={balance}
            shop={weeklyShop}
            messages={messages}
            onBuyItem={onBuyWeeklyItem}
          />

          <section className="flex flex-col gap-3 pt-1">
            <SectionHeader title={messages.marketGoodsSection} themeText={theme.text} />
            <div className="flex flex-col gap-3">
              {SHOP_ITEMS.map((item) => {
                const affordable = balance >= item.price;
                const itemName = messages.itemName(item.id);
                const justBought = recentBoughtItemId === item.id;
                return (
                  <MarketItemCard
                    key={item.id}
                    icon={item.emoji}
                    name={itemName}
                    description={messages.itemDescription(item.id)}
                    priceText={`${item.price} 💰`}
                    actionText={justBought ? `✅ ${messages.marketBuySuccess}` : messages.marketBuyConfirmButton}
                    disabled={!affordable}
                    onAction={() => setPendingPurchase({ type: 'item', item })}
                    theme={theme}
                  />
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: theme.border }}>
            <SectionHeader title={messages.marketPlotSection} themeText={theme.text} />
            <div className="flex flex-col gap-3">
              {buyablePlots.map((plot) => {
                const freeUnlockRequiredVarieties = plot.freeUnlockRequiredVarieties;
                const milestoneUnlocked = freeUnlockRequiredVarieties !== null
                  && collectedUniqueCount >= freeUnlockRequiredVarieties;
                const unlocked = unlockedPlotCount > plot.plotIndex || milestoneUnlocked;
                const isNextUnlock = !unlocked && unlockedPlotCount === plot.plotIndex;
                const affordable = balance >= plot.price;
                const disabled = unlocked || !isNextUnlock || !affordable;
                const description = unlocked
                  ? messages.marketPlotUnlocked
                  : freeUnlockRequiredVarieties === null
                    ? messages.marketPlotSection
                    : messages.marketPlotFreeUnlockHint(
                      freeUnlockRequiredVarieties,
                      Math.min(collectedUniqueCount, freeUnlockRequiredVarieties),
                    );
                const metaText = unlocked
                  ? messages.marketPlotUnlocked
                  : isNextUnlock
                    ? undefined
                    : messages.marketBuyComingSoon;

                return (
                  <MarketItemCard
                    key={plot.plotIndex}
                    icon="🧱"
                    name={messages.marketPlotName(plot.plotIndex)}
                    description={description}
                    metaText={metaText}
                    priceText={unlocked ? messages.marketPlotUnlocked : `${plot.price} 💰`}
                    actionText={unlocked ? messages.marketPlotUnlocked : messages.marketBuyConfirmButton}
                    disabled={disabled}
                    dimmed={unlocked}
                    onAction={() => setPendingPurchase({ type: 'plot', plotIndex: plot.plotIndex, price: plot.price })}
                    theme={theme}
                  />
                );
              })}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'sell' && (
        <>
          {sellableVarieties.length === 0 ? (
            <div
              className="text-sm text-center py-10 rounded-[var(--radius-card)] border"
              style={{ color: theme.textMuted, borderColor: theme.border, backgroundColor: theme.inputBg, boxShadow: 'var(--shadow-card)' }}
            >
              {messages.marketSellEmpty}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sellableVarieties.map((item) => (
                <MarketItemCard
                  key={item.key}
                  icon={item.emoji}
                  name={item.name}
                  description={messages.marketSellOwned(item.count)}
                  priceText={`${item.sellPrice} 💰`}
                  actionText={messages.marketSellConfirmButton}
                  onAction={() => setPendingSellKey(item.key)}
                  theme={theme}
                />
              ))}
            </div>
          )}
        </>
      )}

      {pendingVariety && (
        <ConfirmModal
          title={messages.marketSellConfirmTitle}
          message={messages.marketSellConfirmMessage(pendingVariety.name, pendingVariety.sellPrice)}
          confirmText={messages.marketSellConfirmButton}
          cancelText={messages.marketSellCancelButton}
          onConfirm={handleConfirmSell}
          onCancel={() => setPendingSellKey(null)}
        />
      )}

      {pendingPurchase && (
        <ConfirmModal
          title={pendingPurchase.type === 'item' ? messages.marketBuyConfirmTitle : messages.marketPlotConfirmTitle}
          message={
            pendingPurchase.type === 'item'
              ? messages.marketBuyConfirmMessage(
                messages.itemName(pendingPurchase.item.id),
                pendingPurchase.item.price,
                balance,
              )
              : messages.marketPlotConfirmMessage(
                messages.marketPlotName(pendingPurchase.plotIndex),
                pendingPurchase.price,
                balance,
              )
          }
          confirmText={messages.marketBuyConfirmButton}
          cancelText={messages.marketBuyCancelButton}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setPendingPurchase(null)}
        />
      )}
    </div>
  );
}

function SectionHeader({ title, themeText }: { title: string; themeText: string }) {
  return (
    <h3 className="text-sm font-semibold" style={{ color: themeText }}>
      {title}
    </h3>
  );
}
