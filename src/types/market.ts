import type { Rarity, VarietyId } from './farm';

export type ShopItemId =
  | 'star-dew' | 'trap-net' | 'lullaby' | 'crystal-ball' | 'guardian-barrier'
  | 'mutation-gun' | 'mystery-seed' | 'moon-dew' | 'drift-bottle'
  | 'gene-modifier' | 'supernova-bottle' | 'star-tracker' | 'premium-seed' | 'nectar';

export interface ShopItemDef {
  id: ShopItemId;
  emoji: string;
  price: number;
  category: 'boost' | 'defense' | 'seed' | 'special';
}

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'star-dew', emoji: '✨', price: 20, category: 'boost' },
  { id: 'trap-net', emoji: '🕸️', price: 30, category: 'defense' },
  { id: 'lullaby', emoji: '🎵', price: 40, category: 'boost' },
  { id: 'crystal-ball', emoji: '🔮', price: 50, category: 'special' },
  { id: 'guardian-barrier', emoji: '🛡️', price: 60, category: 'defense' },
  { id: 'mutation-gun', emoji: '🔫', price: 80, category: 'special' },
  { id: 'mystery-seed', emoji: '🌱', price: 80, category: 'seed' },
  { id: 'moon-dew', emoji: '🌙', price: 80, category: 'special' },
  { id: 'drift-bottle', emoji: '🍾', price: 100, category: 'special' },
  { id: 'gene-modifier', emoji: '🧬', price: 120, category: 'special' },
  { id: 'supernova-bottle', emoji: '💥', price: 150, category: 'boost' },
  { id: 'star-tracker', emoji: '🛰️', price: 150, category: 'defense' },
  { id: 'premium-seed', emoji: '💎', price: 200, category: 'seed' },
  { id: 'nectar', emoji: '⭐', price: 300, category: 'special' },
];

export const PLOT_PRICES: Record<number, number> = {
  4: 200,
  5: 500,
  6: 1000,
  7: 2000,
  8: 5000,
};

export interface MelonCoinState {
  balance: number;
}

export const DEFAULT_MELON_COIN: MelonCoinState = { balance: 0 };

export type WeeklyItemType = 'rare-gene-fragment' | 'legendary-seed' | 'limited-decoration';

export type WeeklyDecorationId =
  | 'star-lamp'
  | 'melon-scarecrow'
  | 'nebula-banner'
  | 'mini-windmill'
  | 'meteor-stone';

export interface WeeklyRareGeneData {
  varietyId: VarietyId;
  rarity: Extract<Rarity, 'epic' | 'legendary'>;
  emoji: string;
}

export interface WeeklyLegendarySeedData {
  varietyId: VarietyId;
  emoji: string;
}

export interface WeeklyDecorationData {
  decorationId: WeeklyDecorationId;
  emoji: string;
}

export interface WeeklyItemDataMap {
  'rare-gene-fragment': WeeklyRareGeneData;
  'legendary-seed': WeeklyLegendarySeedData;
  'limited-decoration': WeeklyDecorationData;
}

interface WeeklyItemBase {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export type WeeklyItemByType<T extends WeeklyItemType> = WeeklyItemBase & {
  type: T;
  data: WeeklyItemDataMap[T];
};

export type WeeklyItem = {
  [K in WeeklyItemType]: WeeklyItemByType<K>;
}[WeeklyItemType];

export interface WeeklyShop {
  items: WeeklyItem[];
  refreshAt: string; // ISO timestamp (UTC Monday 00:00)
  lastRefreshAt: string; // ISO timestamp
}
