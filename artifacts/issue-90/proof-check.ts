import { ALL_ITEM_IDS, COMMON_ITEMS } from '../../src/types/slicing.ts';
import { consumeShopItemSnapshot, migrateShed } from '../../src/hooks/useShedStorage.ts';

function getItemCount(items: Record<string, number>, itemId: string): number {
  return items[itemId] ?? 0;
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const legacyOnly = migrateShed({
  items: {
    'alien-flare': 2,
    'drift-bottle': 0,
  },
});
const legacyOnlyItems = legacyOnly.items as Record<string, number>;
assert(getItemCount(legacyOnlyItems, 'drift-bottle') === 2, 'legacy-only inventory should normalize into drift-bottle');
assert(getItemCount(legacyOnlyItems, 'alien-flare') === 0, 'legacy-only inventory should not keep alien-flare as active stock');

const mixedInventory = migrateShed({
  items: {
    'alien-flare': 2,
    'drift-bottle': 3,
  },
});
const mixedItems = mixedInventory.items as Record<string, number>;
assert(getItemCount(mixedItems, 'drift-bottle') === 5, 'mixed inventory should preserve total quantity');
assert(getItemCount(mixedItems, 'alien-flare') === 0, 'mixed inventory should not double-track alien-flare');

const consumedVisit = consumeShopItemSnapshot(mixedInventory, 'drift-bottle');
assert(consumedVisit.consumed, 'migrated drift-bottle stock should be consumable through the current entry path');
const consumedItems = consumedVisit.nextShed.items as Record<string, number>;
assert(getItemCount(consumedItems, 'drift-bottle') === 4, 'drift-bottle consumption should decrement the normalized stock once');

const reloadedInventory = migrateShed(consumedVisit.nextShed);
const reloadedItems = reloadedInventory.items as Record<string, number>;
assert(getItemCount(reloadedItems, 'drift-bottle') === 4, 'reload should keep the normalized total stable');
assert(getItemCount(reloadedItems, 'alien-flare') === 0, 'reload should remain idempotent for legacy stock');

assert(COMMON_ITEMS.includes('drift-bottle'), 'current common drop pool should include drift-bottle');
assert(!ALL_ITEM_IDS.includes('alien-flare' as never), 'active warehouse item ids should no longer include alien-flare');

console.log(JSON.stringify({
  legacyOnlyDriftBottle: getItemCount(legacyOnlyItems, 'drift-bottle'),
  mixedInventoryDriftBottle: getItemCount(mixedItems, 'drift-bottle'),
  postConsumeDriftBottle: getItemCount(consumedItems, 'drift-bottle'),
  reloadStableDriftBottle: getItemCount(reloadedItems, 'drift-bottle'),
  commonDropPool: COMMON_ITEMS,
  activeWarehouseItemIds: ALL_ITEM_IDS,
}, null, 2));
