/**
 * 切瓜系统类型定义
 */
import type { DarkMatterVarietyId, GalaxyId, HybridGalaxyPair, VarietyId } from './farm';

// 当前活跃的瓜棚道具 ID（不含周商店装饰品等动态 key）。
export type ItemId =
  | 'star-dew'                // ✨ 星露精华（普通）
  | 'supernova-bottle'        // 💥 超新星能量瓶（稀有）
  | 'drift-bottle'            // 🍾 星际漂流瓶（普通）
  | 'trap-net'                // 🕸️ 瓜瓜星人捕网（普通）
  | 'crystal-ball'            // 🔮 先知水晶球（普通）
  | 'moon-dew'                // 🌙 月神甘露（稀有）
  | 'circus-tent'             // 🎪 西瓜马戏团帐篷（普通）
  | 'gene-modifier'           // 🧬 基因改造液（稀有）
  | 'lullaby'                 // 🎵 原初摇篮曲（普通）
  | 'guardian-barrier'        // 🛡️ 守护结界（稀有）
  | 'mutation-gun'            // 🔫 射线枪（稀有）
  | 'star-tracker'            // 🛰️ 星轨追踪器（稀有）
  | 'nectar';                 // ⭐ 琼浆玉露（稀有）

export type LegacyItemId =
  | 'starlight-fertilizer'
  | 'alien-flare'
  | 'thief-trap'
  | 'star-telescope'
  | 'moonlight-dew'
  | 'lullaby-record';

export const LEGACY_ITEM_ID_ALIASES = {
  'starlight-fertilizer': 'star-dew',
  'alien-flare': 'drift-bottle',
  'thief-trap': 'trap-net',
  'star-telescope': 'crystal-ball',
  'moonlight-dew': 'moon-dew',
  'lullaby-record': 'lullaby',
} as const satisfies Record<LegacyItemId, ItemId>;

export function normalizeShedItemId(itemId: string): string {
  return LEGACY_ITEM_ID_ALIASES[itemId as LegacyItemId] ?? itemId;
}

export type ItemRarity = 'common' | 'rare';

export interface ItemDef {
  id: ItemId;
  emoji: string;
  rarity: ItemRarity;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  'star-dew': { id: 'star-dew', emoji: '✨', rarity: 'common' },
  'supernova-bottle': { id: 'supernova-bottle', emoji: '💥', rarity: 'rare' },
  'drift-bottle': { id: 'drift-bottle', emoji: '🍾', rarity: 'common' },
  'trap-net': { id: 'trap-net', emoji: '🕸️', rarity: 'common' },
  'crystal-ball': { id: 'crystal-ball', emoji: '🔮', rarity: 'common' },
  'moon-dew': { id: 'moon-dew', emoji: '🌙', rarity: 'rare' },
  'circus-tent': { id: 'circus-tent', emoji: '🎪', rarity: 'common' },
  'gene-modifier': { id: 'gene-modifier', emoji: '🧬', rarity: 'rare' },
  lullaby: { id: 'lullaby', emoji: '🎵', rarity: 'common' },
  'guardian-barrier': { id: 'guardian-barrier', emoji: '🛡️', rarity: 'rare' },
  'mutation-gun': { id: 'mutation-gun', emoji: '🔫', rarity: 'rare' },
  'star-tracker': { id: 'star-tracker', emoji: '🛰️', rarity: 'rare' },
  nectar: { id: 'nectar', emoji: '⭐', rarity: 'rare' },
};

const LEGACY_COMMON_SLICING_ITEM_IDS = [
  'starlight-fertilizer',
  'alien-flare',
  'thief-trap',
  'star-telescope',
  'circus-tent',
  'lullaby-record',
] as const satisfies ReadonlyArray<ItemId | LegacyItemId>;

const LEGACY_RARE_SLICING_ITEM_IDS = [
  'supernova-bottle',
  'moonlight-dew',
  'gene-modifier',
] as const satisfies ReadonlyArray<ItemId | LegacyItemId>;

export const COMMON_ITEMS: ItemId[] = LEGACY_COMMON_SLICING_ITEM_IDS
  .map((itemId) => normalizeShedItemId(itemId) as ItemId);
export const RARE_ITEMS: ItemId[] = LEGACY_RARE_SLICING_ITEM_IDS
  .map((itemId) => normalizeShedItemId(itemId) as ItemId);
export const ALL_ITEM_IDS: ItemId[] = Object.keys(ITEM_DEFS) as ItemId[];

// ─── 种子品质 ───
export type SeedQuality = 'normal' | 'epic' | 'legendary';

export interface SeedCounts {
  normal: number;
  epic: number;
  legendary: number;
}

export const DEFAULT_SEED_COUNTS: SeedCounts = { normal: 0, epic: 0, legendary: 0 };

export interface SlicingResult {
  seeds: number;
  seedQuality: SeedQuality;   // 本次掉落的种子品质
  items: ItemId[];
  isPerfect: boolean;
  melonType: 'ripe' | 'legendary';
  comboBonus: number;          // combo 额外种子数
}

// ─── 保底计数器 ───
export interface PityCounter {
  epicPity: number;       // 连续未出 epic 种子的切瓜次数
  legendaryPity: number;  // 连续未出 legendary 种子的切瓜次数
}

export const DEFAULT_PITY: PityCounter = { epicPity: 0, legendaryPity: 0 };

export interface InjectedSeed {
  id: string;
  quality: SeedQuality;
  targetGalaxyId: GalaxyId;
}

export interface HybridSeed {
  id: string;
  galaxyPair: HybridGalaxyPair;
}

export interface PrismaticSeed {
  id: string;
  varietyId: VarietyId;
}

export interface DarkMatterSeed {
  id: string;
  varietyId: DarkMatterVarietyId;
}

export interface PendingRevealedNormalSeed {
  varietyId: VarietyId;
}

/** 瓜棚扩展存储（种子+道具+保底） */
export interface ShedStorage {
  seeds: SeedCounts;
  items: Record<ItemId, number>;
  totalSliced: number;
  pity: PityCounter;
  injectedSeeds: InjectedSeed[];
  hybridSeeds: HybridSeed[];
  prismaticSeeds: PrismaticSeed[];
  darkMatterSeeds: DarkMatterSeed[];
  pendingRevealedNormalSeed: PendingRevealedNormalSeed | null;
}

export const DEFAULT_SHED_STORAGE: ShedStorage = {
  seeds: { ...DEFAULT_SEED_COUNTS },
  items: Object.fromEntries(ALL_ITEM_IDS.map(id => [id, 0])) as Record<ItemId, number>,
  totalSliced: 0,
  pity: { ...DEFAULT_PITY },
  injectedSeeds: [],
  hybridSeeds: [],
  prismaticSeeds: [],
  darkMatterSeeds: [],
  pendingRevealedNormalSeed: null,
};
