/**
 * WeeklyTab — Weekly special offers section in market.
 *
 * Embedded into the Buy tab and rendered with the same compact list language
 * as permanent goods and plot expansion rows.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { Messages } from '../../i18n/types';
import type { WeeklyItem, WeeklyShop } from '../../types/market';
import { getWeeklyCountdownParts } from '../../utils/weeklyShop';
import { MarketItemCard } from './MarketItemCard';

interface WeeklyTabProps {
  balance: number;
  shop: WeeklyShop;
  messages: Messages;
  onBuyItem: (itemId: string) => void;
}

function getWeeklyItemDisplayName(item: WeeklyItem, messages: Messages): string {
  if (item.type === 'rare-gene-fragment') {
    const stars = item.data.rarity === 'legendary' ? 4 : 3;
    return messages.marketWeeklyGeneName(messages.varietyName(item.data.varietyId), stars);
  }
  if (item.type === 'legendary-seed') {
    return messages.marketWeeklySeedName(messages.varietyName(item.data.varietyId));
  }
  return messages.marketWeeklyDecorationName(item.data.decorationId);
}

function getWeeklyItemTypeLabel(item: WeeklyItem, messages: Messages): string {
  if (item.type === 'rare-gene-fragment') return messages.marketWeeklyTypeRareGene;
  if (item.type === 'legendary-seed') return messages.marketWeeklyTypeLegendarySeed;
  return messages.marketWeeklyTypeDecoration;
}

export function WeeklyTab(props: WeeklyTabProps) {
  const { balance, shop, messages, onBuyItem } = props;
  const theme = useTheme();
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const countdown = useMemo(
    () => getWeeklyCountdownParts(shop.refreshAt, nowTimestamp),
    [shop.refreshAt, nowTimestamp],
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold" style={{ color: theme.text }}>
            {messages.marketTabWeekly}
          </div>
          <div className="mt-1 text-xs" style={{ color: theme.textMuted }}>
            {messages.marketWeeklyTitle}
          </div>
        </div>
        <div
          className="inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${theme.accent}14`,
            color: theme.accent,
            border: `1px solid ${theme.accent}22`,
          }}
        >
          {messages.marketWeeklyRefreshIn(countdown.days, countdown.hours)}
        </div>
      </div>

      <div
        className="overflow-hidden rounded-[16px] border divide-y"
        style={{
          backgroundColor: theme.inputBg,
          borderColor: theme.border,
        }}
      >
        {shop.items.map((item) => {
          const soldOut = item.stock <= 0;
          const affordable = balance >= item.price;
          const disabled = soldOut || !affordable;
          const itemName = getWeeklyItemDisplayName(item, messages);
          const itemTypeLabel = getWeeklyItemTypeLabel(item, messages);
          const metaText = soldOut ? messages.marketWeeklySoldOut : messages.marketWeeklyStock(item.stock);

          return (
            <MarketItemCard
              key={item.id}
              icon={item.data.emoji}
              name={itemName}
              description={itemTypeLabel}
              metaText={metaText}
              priceText={`${item.price} 💰`}
              actionText={soldOut ? messages.marketWeeklySoldOut : messages.marketWeeklyBuyButton}
              disabled={disabled}
              dimmed={soldOut}
              onAction={() => onBuyItem(item.id)}
              theme={theme}
            />
          );
        })}
      </div>
    </section>
  );
}
