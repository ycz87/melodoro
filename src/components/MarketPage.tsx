/**
 * MarketPage — 商城页面（买入 / 卖出 / 每周特惠）
 *
 * 买入 Tab 支持常驻道具购买与地块扩展，卖出 Tab 支持西瓜售卖，
 * 每周特惠 Tab 支持限时商品购买。
 */
import { useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import type { Messages } from '../i18n/types';
import { VARIETY_DEFS } from '../types/farm';
import type { CollectedVariety, VarietyId } from '../types/farm';
import type { ShopItemDef, ShopItemId, WeeklyShop } from '../types/market';
import { SHOP_ITEMS, PLOT_PRICES } from '../types/market';
import { ConfirmModal } from './ConfirmModal';
import { MarketItemCard } from './Market/MarketItemCard';
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

type MarketTab = 'buy' | 'sell' | 'weekly';

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
  const marketTabIndex: Record<MarketTab, number> = { buy: 0, sell: 1, weekly: 2 };

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

  const handleConfirmSell = () => {
    if (!pendingVariety) {
      setPendingSellKey(null);
      return;
    }
    onSellVariety(pendingVariety.varietyId, pendingVariety.isMutant);
    setPendingSellKey(null);
  };

  const buyablePlots = useMemo(() => {
    return Object.entries(PLOT_PRICES)
      .map(([index, price]) => ({
        plotIndex: Number(index),
        price,
      }))
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: theme.text }}>{messages.marketTitle}</h2>
        <div
          className="text-sm font-semibold px-3 py-2 rounded-full"
          style={{ backgroundColor: theme.inputBg, color: '#fbbf24' }}
        >
          💰 {balance}
        </div>
      </div>

      <div className="mb-4 relative flex items-center rounded-full p-[3px]" style={{ backgroundColor: theme.inputBg }}>
        <div
          className="absolute top-[3px] bottom-[3px] rounded-full transition-all duration-200 ease-in-out"
          style={{
            backgroundColor: theme.accent,
            opacity: 0.16,
            width: 'calc((100% - 6px) / 3)',
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
        <button
          onClick={() => setActiveTab('weekly')}
          className="relative z-10 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ease-in-out cursor-pointer flex-1"
          style={{ color: activeTab === 'weekly' ? theme.text : theme.textMuted }}
        >
          {messages.marketTabWeekly}
        </button>
      </div>

      {activeTab === 'buy' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

          <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
              {messages.marketPlotSection}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {buyablePlots.map((plot) => {
                const unlocked = unlockedPlotCount > plot.plotIndex;
                const isNextUnlock = unlockedPlotCount === plot.plotIndex;
                const affordable = balance >= plot.price;
                const disabled = unlocked || !isNextUnlock || !affordable;
                return (
                  <MarketItemCard
                    key={plot.plotIndex}
                    icon="🧱"
                    name={messages.marketPlotName(plot.plotIndex)}
                    description={unlocked ? messages.marketPlotUnlocked : messages.marketPlotSection}
                    priceText={unlocked ? messages.marketPlotUnlocked : `${plot.price} 💰`}
                    actionText={unlocked ? messages.marketPlotUnlocked : messages.marketBuyConfirmButton}
                    disabled={disabled}
                    onAction={() => setPendingPurchase({ type: 'plot', plotIndex: plot.plotIndex, price: plot.price })}
                    theme={theme}
                  />
                );
              })}
            </div>
          </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sellableVarieties.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPendingSellKey(item.key)}
                  className="h-full p-3 rounded-[var(--radius-card)] border cursor-pointer transition-all duration-200 ease-in-out hover:-translate-y-0.5 text-left flex flex-col"
                  style={{ backgroundColor: theme.inputBg, borderColor: theme.border, boxShadow: 'var(--shadow-card)' }}
                >
                  <span className="text-3xl leading-none">{item.emoji}</span>
                  <div className="mt-2 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: theme.text }}>
                      {item.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: theme.textMuted }}>
                      {messages.marketSellOwned(item.count)}
                    </div>
                  </div>
                  <div className="mt-3 text-sm font-semibold" style={{ color: '#fbbf24' }}>
                    {item.sellPrice} 💰
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'weekly' && (
        <WeeklyTab
          balance={balance}
          shop={weeklyShop}
          messages={messages}
          onBuyItem={onBuyWeeklyItem}
        />
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
