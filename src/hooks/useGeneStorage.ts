/**
 * useGeneStorage — 基因片段背包持久化 hook
 *
 * 管理基因片段存储、按星系查询/统计和批量消耗。
 * 数据持久化到 localStorage，并预留云端同步回调。
 */
import { useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { GalaxyId, VarietyId, Rarity } from '../types/farm';
import { VARIETY_DEFS } from '../types/farm';
import type { GeneFragment, GeneInventory } from '../types/gene';
import { DEFAULT_GENE_INVENTORY } from '../types/gene';

const GENE_KEY = 'watermelon-genes';

function createFragmentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGalaxyId(value: unknown): value is GalaxyId {
  return value === 'thick-earth'
    || value === 'fire'
    || value === 'water'
    || value === 'wood'
    || value === 'metal'
    || value === 'rainbow'
    || value === 'dark-matter';
}

function isRarity(value: unknown): value is Rarity {
  return value === 'common' || value === 'rare' || value === 'epic' || value === 'legendary';
}

function isVarietyId(value: unknown): value is VarietyId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VARIETY_DEFS, value);
}

function createEmptyGalaxyCounts(): Record<GalaxyId, number> {
  return {
    'thick-earth': 0,
    fire: 0,
    water: 0,
    wood: 0,
    metal: 0,
    rainbow: 0,
    'dark-matter': 0,
  };
}

function migrateGeneInventory(raw: unknown): GeneInventory {
  const fragmentsRaw = Array.isArray(raw)
    ? raw
    : (isRecord(raw) && Array.isArray(raw.fragments) ? raw.fragments : []);

  if (fragmentsRaw.length === 0) {
    return DEFAULT_GENE_INVENTORY;
  }

  const fragments: GeneFragment[] = [];

  for (const item of fragmentsRaw) {
    if (!isRecord(item)) continue;

    const rawVarietyId = item.varietyId;
    if (!isVarietyId(rawVarietyId)) continue;

    const varietyDef = VARIETY_DEFS[rawVarietyId];

    const id = typeof item.id === 'string' && item.id.length > 0
      ? item.id
      : createFragmentId();

    const obtainedAt = typeof item.obtainedAt === 'string' && item.obtainedAt.length > 0
      ? item.obtainedAt
      : new Date().toISOString();

    const galaxyId = isGalaxyId(item.galaxyId)
      ? item.galaxyId
      : varietyDef.galaxy;

    const rarity = isRarity(item.rarity)
      ? item.rarity
      : varietyDef.rarity;

    fragments.push({
      id,
      galaxyId,
      varietyId: rawVarietyId,
      rarity,
      obtainedAt,
    });
  }

  return { fragments };
}

export function useGeneStorage(onSync?: (inventory: GeneInventory) => void) {
  const [geneInventory, setGeneInventory] = useLocalStorage<GeneInventory>(
    GENE_KEY,
    DEFAULT_GENE_INVENTORY,
    migrateGeneInventory,
  );

  // Sync gene inventory to cloud on changes (skip initial mount)
  const onSyncRef = useRef(onSync);
  const mountedRef = useRef(false);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    onSyncRef.current?.(geneInventory);
  }, [geneInventory]);

  const addFragment = useCallback((galaxyId: GalaxyId, varietyId: VarietyId, rarity: Rarity) => {
    const nextFragment: GeneFragment = {
      id: createFragmentId(),
      galaxyId,
      varietyId,
      rarity,
      obtainedAt: new Date().toISOString(),
    };

    setGeneInventory((prev) => ({
      ...prev,
      fragments: [...prev.fragments, nextFragment],
    }));
  }, [setGeneInventory]);

  const removeFragment = useCallback((id: string) => {
    setGeneInventory((prev) => ({
      ...prev,
      fragments: prev.fragments.filter((fragment) => fragment.id !== id),
    }));
  }, [setGeneInventory]);

  const removeFragmentsByGalaxy = useCallback((galaxyId: GalaxyId, count: number) => {
    const removeCount = Math.max(0, Math.floor(count));
    if (removeCount <= 0) return;

    setGeneInventory((prev) => {
      let removed = 0;
      return {
        ...prev,
        fragments: prev.fragments.filter((fragment) => {
          if (fragment.galaxyId !== galaxyId) return true;
          if (removed >= removeCount) return true;
          removed += 1;
          return false;
        }),
      };
    });
  }, [setGeneInventory]);

  const getFragmentsByGalaxy = useCallback((galaxyId: GalaxyId): GeneFragment[] => {
    return geneInventory.fragments.filter((fragment) => fragment.galaxyId === galaxyId);
  }, [geneInventory.fragments]);

  const getFragmentCount = useCallback((): Record<GalaxyId, number> => {
    const counts = createEmptyGalaxyCounts();
    geneInventory.fragments.forEach((fragment) => {
      counts[fragment.galaxyId] += 1;
    });
    return counts;
  }, [geneInventory.fragments]);

  return {
    geneInventory,
    setGeneInventory,
    addFragment,
    removeFragment,
    removeFragmentsByGalaxy,
    getFragmentsByGalaxy,
    getFragmentCount,
  };
}

export type { GeneFragment, GeneInventory };
