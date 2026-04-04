/**
 * 切瓜系统类型定义
 */
import type { DarkMatterVarietyId, GalaxyId, HybridGalaxyPair, VarietyId } from './farm';

// 9种道具ID
export type ItemId =
  | 'starlight-fertilizer'    // ⚡ 星光肥料（普通）
  | 'supernova-bottle'        // ☀️ 超新星能量瓶（稀有）
  | 'alien-flare'             // 🛸 外星信号弹（普通）
  | 'thief-trap'              // 🪤 瓜贼陷阱（普通）
  | 'star-telescope'          // 🔮 星际望远镜（普通）
  | 'moonlight-dew'           // 🌙 月光露水（稀有）
  | 'circus-tent'             // 🎪 西瓜马戏团帐篷（普通）
  | 'gene-modifier'           // 🧬 基因改造液（稀有）
  | 'lullaby-record';         // 🎵 西瓜摇篮曲唱片（普通）

export type ItemRarity = 'common' | 'rare';

export interface ItemDef {
  id: ItemId;
  emoji: string;
  rarity: ItemRarity;
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  'starlight-fertilizer': { id: 'starlight-fertilizer', emoji: '⚡', rarity: 'common' },
  'supernova-bottle': { id: 'supernova-bottle', emoji: '☀️', rarity: 'rare' },
  'alien-flare': { id: 'alien-flare', emoji: '🛸', rarity: 'common' },
  'thief-trap': { id: 'thief-trap', emoji: '🪤', rarity: 'common' },
  'star-telescope': { id: 'star-telescope', emoji: '🔮', rarity: 'common' },
  'moonlight-dew': { id: 'moonlight-dew', emoji: '🌙', rarity: 'rare' },
  'circus-tent': { id: 'circus-tent', emoji: '🎪', rarity: 'common' },
  'gene-modifier': { id: 'gene-modifier', emoji: '🧬', rarity: 'rare' },
  'lullaby-record': { id: 'lullaby-record', emoji: '🎵', rarity: 'common' },
};

export const COMMON_ITEMS: ItemId[] = Object.values(ITEM_DEFS)
  .filter(d => d.rarity === 'common').map(d => d.id);
export const RARE_ITEMS: ItemId[] = Object.values(ITEM_DEFS)
  .filter(d => d.rarity === 'rare').map(d => d.id);
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
