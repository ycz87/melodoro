/**
 * useWeeklyShop — Weekly market storage and purchase workflow.
 *
 * Responsibilities:
 * - Persist weekly shop to localStorage
 * - Refresh items at Monday 00:00 UTC
 * - Handle purchase flow: spend -> grant -> reduce stock
 */
import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { VarietyId } from '../types/farm';
import { VARIETY_DEFS } from '../types/farm';
import type {
  WeeklyItem,
  WeeklyItemType,
  WeeklyShop,
  WeeklyDecorationId,
} from '../types/market';
import {
  createWeeklyShop,
  shouldRefreshWeeklyShop,
} from '../utils/weeklyShop';

const WEEKLY_SHOP_KEY = 'watermelon-weekly-shop';
const AUTO_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;
const INITIAL_WEEKLY_SHOP = createWeeklyShop(Date.now());

interface UseWeeklyShopOptions {
  spendCoins: (amount: number) => boolean;
  onGrantItem: (item: WeeklyItem) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWeeklyItemType(value: unknown): value is WeeklyItemType {
  return value === 'rare-gene-fragment'
    || value === 'legendary-seed'
    || value === 'limited-decoration';
}

function isVarietyId(value: unknown): value is VarietyId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(VARIETY_DEFS, value);
}

function isWeeklyDecorationId(value: unknown): value is WeeklyDecorationId {
  return value === 'star-lamp'
    || value === 'melon-scarecrow'
    || value === 'nebula-banner'
    || value === 'mini-windmill'
    || value === 'meteor-stone';
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeWeeklyItem(raw: unknown): WeeklyItem | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (!isWeeklyItemType(raw.type)) return null;
  if (typeof raw.name !== 'string') return null;

  const price = Math.max(0, Math.floor(normalizeNumber(raw.price, 0)));
  const stock = Math.max(0, Math.floor(normalizeNumber(raw.stock, 0)));
  if (price <= 0) return null;

  if (!isRecord(raw.data)) return null;

  if (raw.type === 'rare-gene-fragment') {
    if (!isVarietyId(raw.data.varietyId)) return null;
    if (raw.data.rarity !== 'epic' && raw.data.rarity !== 'legendary') return null;
    const emoji = typeof raw.data.emoji === 'string' ? raw.data.emoji : VARIETY_DEFS[raw.data.varietyId].emoji;
    return {
      id: raw.id,
      type: raw.type,
      name: raw.name,
      price,
      stock,
      data: {
        varietyId: raw.data.varietyId,
        rarity: raw.data.rarity,
        emoji,
      },
    };
  }

  if (raw.type === 'legendary-seed') {
    if (!isVarietyId(raw.data.varietyId)) return null;
    const emoji = typeof raw.data.emoji === 'string' ? raw.data.emoji : VARIETY_DEFS[raw.data.varietyId].emoji;
    return {
      id: raw.id,
      type: raw.type,
      name: raw.name,
      price,
      stock,
      data: {
        varietyId: raw.data.varietyId,
        emoji,
      },
    };
  }

  if (!isWeeklyDecorationId(raw.data.decorationId)) return null;
  const emoji = typeof raw.data.emoji === 'string' ? raw.data.emoji : '🏮';
  return {
    id: raw.id,
    type: raw.type,
    name: raw.name,
    price,
    stock,
    data: {
      decorationId: raw.data.decorationId,
      emoji,
    },
  };
}

function migrateWeeklyShop(raw: unknown): WeeklyShop {
  const nowTimestamp = Date.now();
  if (!isRecord(raw) || !Array.isArray(raw.items)) {
    return createWeeklyShop(nowTimestamp);
  }

  const items = raw.items
    .map((item) => normalizeWeeklyItem(item))
    .filter((item): item is WeeklyItem => item !== null);

  const refreshAt = typeof raw.refreshAt === 'string' ? raw.refreshAt : '';
  const lastRefreshAt = typeof raw.lastRefreshAt === 'string' ? raw.lastRefreshAt : '';
  const hasValidRefreshAt = Number.isFinite(Date.parse(refreshAt));
  const hasValidLastRefreshAt = Number.isFinite(Date.parse(lastRefreshAt));

  if (items.length === 0 || !hasValidRefreshAt || !hasValidLastRefreshAt) {
    return createWeeklyShop(nowTimestamp);
  }

  const candidate: WeeklyShop = {
    items,
    refreshAt,
    lastRefreshAt,
  };
  return shouldRefreshWeeklyShop(candidate, nowTimestamp)
    ? createWeeklyShop(nowTimestamp)
    : candidate;
}

export function useWeeklyShop(options: UseWeeklyShopOptions) {
  const { spendCoins, onGrantItem } = options;
  const [weeklyShop, setWeeklyShop] = useLocalStorage<WeeklyShop>(
    WEEKLY_SHOP_KEY,
    INITIAL_WEEKLY_SHOP,
    migrateWeeklyShop,
  );

  const refreshWeeklyShopIfNeeded = useCallback(() => {
    const nowTimestamp = Date.now();
    setWeeklyShop((prev) => (
      shouldRefreshWeeklyShop(prev, nowTimestamp)
        ? createWeeklyShop(nowTimestamp)
        : prev
    ));
  }, [setWeeklyShop]);

  useEffect(() => {
    refreshWeeklyShopIfNeeded();
  }, [refreshWeeklyShopIfNeeded]);

  useEffect(() => {
    const timerId = window.setInterval(refreshWeeklyShopIfNeeded, AUTO_REFRESH_CHECK_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, [refreshWeeklyShopIfNeeded]);

  const buyWeeklyItem = useCallback((itemId: string): boolean => {
    if (shouldRefreshWeeklyShop(weeklyShop, Date.now())) {
      refreshWeeklyShopIfNeeded();
      return false;
    }

    const item = weeklyShop.items.find((entry) => entry.id === itemId);
    if (!item || item.stock <= 0) return false;

    const spent = spendCoins(item.price);
    if (!spent) return false;

    onGrantItem(item);
    setWeeklyShop((prev) => ({
      ...prev,
      items: prev.items.map((entry) => (
        entry.id === itemId
          ? { ...entry, stock: Math.max(0, entry.stock - 1) }
          : entry
      )),
    }));
    return true;
  }, [weeklyShop, refreshWeeklyShopIfNeeded, spendCoins, onGrantItem, setWeeklyShop]);

  return {
    weeklyShop,
    buyWeeklyItem,
  };
}
