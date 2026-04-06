/**
 * useShedStorage — 种子/道具/保底存储 hook
 *
 * 管理切瓜产出的种子（三品质）、道具和保底计数器，持久化到 localStorage。
 */
import { useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type {
  ItemId,
  ShedStorage,
  SeedQuality,
  PityCounter,
  InjectedSeed,
  HybridSeed,
  PrismaticSeed,
  DarkMatterSeed,
} from '../types/slicing';
import { DEFAULT_SHED_STORAGE, DEFAULT_PITY, DEFAULT_SEED_COUNTS } from '../types/slicing';
import { DARK_MATTER_VARIETIES, HYBRID_GALAXY_PAIRS, PRISMATIC_VARIETIES, VARIETY_DEFS } from '../types/farm';
import { SHOP_SEED_ITEM_TO_QUALITY } from '../types/market';

const SHED_KEY = 'watermelon-shed';
const INJECTED_SEED_QUALITIES: SeedQuality[] = ['normal', 'epic', 'legendary'];
const INJECTED_SEED_GALAXIES: InjectedSeed['targetGalaxyId'][] = [
  'thick-earth', 'fire', 'water', 'wood', 'metal', 'rainbow', 'dark-matter',
];

function migrateShed(raw: unknown): ShedStorage {
  if (!raw || typeof raw !== 'object') return DEFAULT_SHED_STORAGE;
  const s = raw as Record<string, unknown>;
  const result: ShedStorage = {
    seeds: { ...DEFAULT_SEED_COUNTS },
    items: { ...DEFAULT_SHED_STORAGE.items },
    totalSliced: 0,
    pity: { ...DEFAULT_PITY },
    injectedSeeds: [],
    hybridSeeds: [],
    prismaticSeeds: [],
    darkMatterSeeds: [],
    pendingRevealedNormalSeed: null,
  };

  // Migrate seeds: old format was a single number, new format is { normal, epic, legendary }
  if (typeof s.seeds === 'number') {
    result.seeds.normal = s.seeds;
  } else if (s.seeds && typeof s.seeds === 'object') {
    const sc = s.seeds as Record<string, number>;
    if (typeof sc.normal === 'number') result.seeds.normal = sc.normal;
    if (typeof sc.epic === 'number') result.seeds.epic = sc.epic;
    if (typeof sc.legendary === 'number') result.seeds.legendary = sc.legendary;
  }

  if (typeof s.totalSliced === 'number') result.totalSliced = s.totalSliced;

  if (s.items && typeof s.items === 'object') {
    const items = s.items as Record<string, unknown>;
    const nextItems = result.items as Record<string, number>;
    for (const [id, value] of Object.entries(items)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;

      const normalizedCount = Math.max(0, Math.floor(value));
      const migratedSeedQuality = SHOP_SEED_ITEM_TO_QUALITY[id as keyof typeof SHOP_SEED_ITEM_TO_QUALITY];
      if (migratedSeedQuality) {
        result.seeds[migratedSeedQuality] += normalizedCount;
        continue;
      }

      nextItems[id] = normalizedCount;
    }
  }

  if (s.pity && typeof s.pity === 'object') {
    const p = s.pity as Record<string, number>;
    if (typeof p.epicPity === 'number') result.pity.epicPity = p.epicPity;
    if (typeof p.legendaryPity === 'number') result.pity.legendaryPity = p.legendaryPity;
  }

  if (Array.isArray(s.injectedSeeds)) {
    for (const seed of s.injectedSeeds) {
      if (!seed || typeof seed !== 'object') continue;
      const candidate = seed as Record<string, unknown>;
      if (
        typeof candidate.id === 'string'
        && INJECTED_SEED_QUALITIES.includes(candidate.quality as SeedQuality)
        && INJECTED_SEED_GALAXIES.includes(candidate.targetGalaxyId as InjectedSeed['targetGalaxyId'])
      ) {
        result.injectedSeeds.push({
          id: candidate.id,
          quality: candidate.quality as SeedQuality,
          targetGalaxyId: candidate.targetGalaxyId as InjectedSeed['targetGalaxyId'],
        });
      }
    }
  }

  if (Array.isArray(s.hybridSeeds)) {
    for (const seed of s.hybridSeeds) {
      if (!seed || typeof seed !== 'object') continue;
      const candidate = seed as Record<string, unknown>;
      if (
        typeof candidate.id === 'string'
        && HYBRID_GALAXY_PAIRS.includes(candidate.galaxyPair as HybridSeed['galaxyPair'])
      ) {
        result.hybridSeeds.push({
          id: candidate.id,
          galaxyPair: candidate.galaxyPair as HybridSeed['galaxyPair'],
        });
      }
    }
  }

  if (Array.isArray(s.prismaticSeeds)) {
    for (const seed of s.prismaticSeeds) {
      if (!seed || typeof seed !== 'object') continue;
      const candidate = seed as Record<string, unknown>;
      if (
        typeof candidate.id === 'string'
        && PRISMATIC_VARIETIES.includes(candidate.varietyId as PrismaticSeed['varietyId'])
      ) {
        result.prismaticSeeds.push({
          id: candidate.id,
          varietyId: candidate.varietyId as PrismaticSeed['varietyId'],
        });
      }
    }
  }

  if (Array.isArray(s.darkMatterSeeds)) {
    for (const seed of s.darkMatterSeeds) {
      if (!seed || typeof seed !== 'object') continue;
      const candidate = seed as Record<string, unknown>;
      if (
        typeof candidate.id === 'string'
        && DARK_MATTER_VARIETIES.includes(candidate.varietyId as DarkMatterSeed['varietyId'])
      ) {
        result.darkMatterSeeds.push({
          id: candidate.id,
          varietyId: candidate.varietyId as DarkMatterSeed['varietyId'],
        });
      }
    }
  }

  if (s.pendingRevealedNormalSeed && typeof s.pendingRevealedNormalSeed === 'object') {
    const candidate = s.pendingRevealedNormalSeed as Record<string, unknown>;
    if (
      typeof candidate.varietyId === 'string'
      && Object.prototype.hasOwnProperty.call(VARIETY_DEFS, candidate.varietyId)
    ) {
      result.pendingRevealedNormalSeed = {
        varietyId: candidate.varietyId as keyof typeof VARIETY_DEFS,
      };
    }
  }

  return result;
}

export function useShedStorage() {
  const [shed, setShed] = useLocalStorage<ShedStorage>(SHED_KEY, DEFAULT_SHED_STORAGE, migrateShed);
  const shedRef = useRef(shed);
  const consumePrismaticSeedMutexRef = useRef(false);
  const consumePrismaticSeedResultRef = useRef(false);
  const consumeDarkMatterSeedMutexRef = useRef(false);
  const consumeDarkMatterSeedResultRef = useRef(false);

  shedRef.current = shed;

  const commitShed = useCallback((nextShed: ShedStorage) => {
    shedRef.current = nextShed;
    setShed(nextShed);
    try {
      localStorage.setItem(SHED_KEY, JSON.stringify(nextShed));
    } catch {
      // Storage unavailable — ignore immediate persistence.
    }
  }, [setShed]);

  const addSeeds = useCallback((count: number, quality: SeedQuality = 'normal') => {
    const nextShed: ShedStorage = {
      ...shedRef.current,
      seeds: {
        ...shedRef.current.seeds,
        [quality]: shedRef.current.seeds[quality] + count,
      },
    };
    commitShed(nextShed);
  }, [commitShed]);

  const addItem = useCallback((itemId: string, count: number = 1) => {
    if (count <= 0) return;
    const nextItems = shedRef.current.items as Record<string, number>;
    const current = nextItems[itemId] ?? 0;
    commitShed({
      ...shedRef.current,
      items: { ...nextItems, [itemId]: current + count } as ShedStorage['items'],
    });
  }, [commitShed]);

  const incrementSliced = useCallback(() => {
    setShed(prev => ({ ...prev, totalSliced: prev.totalSliced + 1 }));
  }, [setShed]);

  const updatePityCounter = useCallback((newPity: PityCounter) => {
    setShed(prev => ({ ...prev, pity: newPity }));
  }, [setShed]);

  const resetShed = useCallback(() => {
    setShed({
      seeds: { ...DEFAULT_SEED_COUNTS },
      items: { ...DEFAULT_SHED_STORAGE.items },
      totalSliced: 0,
      pity: { ...DEFAULT_PITY },
      injectedSeeds: [],
      hybridSeeds: [],
      prismaticSeeds: [],
      darkMatterSeeds: [],
      pendingRevealedNormalSeed: null,
    });
  }, [setShed]);

  const addInjectedSeed = useCallback((seed: InjectedSeed): void => {
    setShed(prev => ({
      ...prev,
      injectedSeeds: [...prev.injectedSeeds, seed],
    }));
  }, [setShed]);

  /** 消耗一颗注入种子（返回是否成功） */
  const consumeInjectedSeed = useCallback((id: string): boolean => {
    let success = false;
    setShed(prev => {
      const index = prev.injectedSeeds.findIndex(seed => seed.id === id);
      if (index < 0) return prev;
      success = true;
      return {
        ...prev,
        injectedSeeds: [
          ...prev.injectedSeeds.slice(0, index),
          ...prev.injectedSeeds.slice(index + 1),
        ],
      };
    });
    return success;
  }, [setShed]);

  const addHybridSeed = useCallback((seed: HybridSeed): void => {
    setShed(prev => ({
      ...prev,
      hybridSeeds: [...prev.hybridSeeds, seed],
    }));
  }, [setShed]);

  /** 消耗一颗杂交种子（返回是否成功） */
  const consumeHybridSeed = useCallback((id: string): boolean => {
    let success = false;
    setShed(prev => {
      const index = prev.hybridSeeds.findIndex(seed => seed.id === id);
      if (index < 0) return prev;
      success = true;
      return {
        ...prev,
        hybridSeeds: [
          ...prev.hybridSeeds.slice(0, index),
          ...prev.hybridSeeds.slice(index + 1),
        ],
      };
    });
    return success;
  }, [setShed]);

  const addPrismaticSeed = useCallback((seed: PrismaticSeed): void => {
    setShed(prev => ({
      ...prev,
      prismaticSeeds: [...prev.prismaticSeeds, seed],
    }));
  }, [setShed]);

  /** 消耗一颗幻彩种子（返回是否成功） */
  const consumePrismaticSeed = useCallback((id: string): boolean => {
    if (consumePrismaticSeedMutexRef.current) return false;
    consumePrismaticSeedMutexRef.current = true;
    consumePrismaticSeedResultRef.current = false;
    try {
      setShed(prev => {
        const index = prev.prismaticSeeds.findIndex(seed => seed.id === id);
        if (index < 0) return prev;
        consumePrismaticSeedResultRef.current = true;
        return {
          ...prev,
          prismaticSeeds: [
            ...prev.prismaticSeeds.slice(0, index),
            ...prev.prismaticSeeds.slice(index + 1),
          ],
        };
      });
      return consumePrismaticSeedResultRef.current;
    } finally {
      consumePrismaticSeedResultRef.current = false;
      consumePrismaticSeedMutexRef.current = false;
    }
  }, [setShed]);

  const addDarkMatterSeed = useCallback((seed: DarkMatterSeed): void => {
    setShed(prev => ({
      ...prev,
      darkMatterSeeds: [...prev.darkMatterSeeds, seed],
    }));
  }, [setShed]);

  /** 消耗一颗暗物质种子（返回是否成功） */
  const consumeDarkMatterSeed = useCallback((id: string): boolean => {
    if (consumeDarkMatterSeedMutexRef.current) return false;
    consumeDarkMatterSeedMutexRef.current = true;
    consumeDarkMatterSeedResultRef.current = false;
    try {
      setShed(prev => {
        const index = prev.darkMatterSeeds.findIndex(seed => seed.id === id);
        if (index < 0) return prev;
        consumeDarkMatterSeedResultRef.current = true;
        return {
          ...prev,
          darkMatterSeeds: [
            ...prev.darkMatterSeeds.slice(0, index),
            ...prev.darkMatterSeeds.slice(index + 1),
          ],
        };
      });
      return consumeDarkMatterSeedResultRef.current;
    } finally {
      consumeDarkMatterSeedResultRef.current = false;
      consumeDarkMatterSeedMutexRef.current = false;
    }
  }, [setShed]);

  const revealPendingNormalSeed = useCallback((varietyId: keyof typeof VARIETY_DEFS): boolean => {
    let success = false;
    setShed(prev => {
      const nextItems = prev.items as Record<string, number>;
      const crystalBallCount = nextItems['crystal-ball'] ?? 0;
      if (crystalBallCount <= 0 || prev.seeds.normal <= 0 || prev.pendingRevealedNormalSeed) return prev;
      success = true;
      return {
        ...prev,
        items: { ...nextItems, 'crystal-ball': crystalBallCount - 1 } as unknown as ShedStorage['items'],
        pendingRevealedNormalSeed: { varietyId },
      };
    });
    return success;
  }, [setShed]);

  const consumePendingRevealedNormalSeed = useCallback((): boolean => {
    let success = false;
    setShed(prev => {
      if (!prev.pendingRevealedNormalSeed || prev.seeds.normal <= 0) return prev;
      success = true;
      return {
        ...prev,
        seeds: { ...prev.seeds, normal: prev.seeds.normal - 1 },
        pendingRevealedNormalSeed: null,
      };
    });
    return success;
  }, [setShed]);

  /** 消耗一颗种子（种植时调用），返回是否成功 */
  const consumeSeed = useCallback((quality: SeedQuality): boolean => {
    let success = false;
    setShed(prev => {
      const reservedNormalSeedCount = quality === 'normal' && prev.pendingRevealedNormalSeed ? 1 : 0;
      if (prev.seeds[quality] <= reservedNormalSeedCount) return prev;
      success = true;
      return { ...prev, seeds: { ...prev.seeds, [quality]: prev.seeds[quality] - 1 } };
    });
    return success;
  }, [setShed]);

  /** 消耗一个道具（返回是否成功） */
  const consumeItem = useCallback((id: ItemId): boolean => {
    let success = false;
    setShed(prev => {
      if (prev.items[id] <= 0) return prev;
      success = true;
      return { ...prev, items: { ...prev.items, [id]: prev.items[id] - 1 } };
    });
    return success;
  }, [setShed]);

  /** 消耗一个商城道具（返回是否成功） */
  const consumeShopItem = useCallback((itemId: string): boolean => {
    const items = shedRef.current.items as Record<string, number>;
    if ((items[itemId] ?? 0) <= 0) return false;

    commitShed({
      ...shedRef.current,
      items: { ...items, [itemId]: items[itemId] - 1 } as ShedStorage['items'],
    });
    return true;
  }, [commitShed]);

  return {
    shed,
    addSeeds,
    addItem,
    incrementSliced,
    updatePityCounter,
    consumeSeed,
    consumeItem,
    consumeShopItem,
    addInjectedSeed,
    consumeInjectedSeed,
    addHybridSeed,
    consumeHybridSeed,
    addPrismaticSeed,
    consumePrismaticSeed,
    addDarkMatterSeed,
    consumeDarkMatterSeed,
    revealPendingNormalSeed,
    consumePendingRevealedNormalSeed,
    resetShed,
  };
}
