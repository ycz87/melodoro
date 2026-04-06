import type { FarmStorage, Plot, StolenRecord, ThiefStatus } from '../types/farm';
import type { ShopItemId } from '../types/market';
import type { ShedStorage } from '../types/slicing';

export const CAUGHT_THIEF_SETTLEMENT_PREFIX = 'caught-thief';

export const TRAP_NET_THIEF_REWARD_ITEM_POOL = [
  'star-dew',
  'trap-net',
  'lullaby',
  'crystal-ball',
  'guardian-barrier',
  'mutation-gun',
  'moon-dew',
  'drift-bottle',
  'gene-modifier',
  'supernova-bottle',
  'star-tracker',
  'nectar',
] as const satisfies ReadonlyArray<Exclude<ShopItemId, 'mystery-seed' | 'premium-seed'>>;

export type TrapNetThiefRewardItemId = typeof TRAP_NET_THIEF_REWARD_ITEM_POOL[number];

export function rollTrapNetThiefRewardItemId(random: () => number = Math.random): TrapNetThiefRewardItemId {
  const index = Math.floor(random() * TRAP_NET_THIEF_REWARD_ITEM_POOL.length);
  return TRAP_NET_THIEF_REWARD_ITEM_POOL[index] ?? TRAP_NET_THIEF_REWARD_ITEM_POOL[0];
}

export function applyTrapNetCaughtThiefReward(
  shed: ShedStorage,
  itemId: TrapNetThiefRewardItemId,
): ShedStorage {
  const items = shed.items as Record<string, number>;
  return {
    ...shed,
    seeds: {
      ...shed.seeds,
      epic: shed.seeds.epic + 2,
    },
    items: {
      ...items,
      [itemId]: (items[itemId] ?? 0) + 1,
    } as ShedStorage['items'],
  };
}

export function getCaughtThiefSettlementId(plotId: number, thief: ThiefStatus): string {
  return [
    CAUGHT_THIEF_SETTLEMENT_PREFIX,
    plotId,
    Math.floor(thief.appearedAt),
    Math.floor(thief.stealsAt),
  ].join(':');
}

export function clearPersistedCaughtThieves(plots: Plot[], stolenRecords: StolenRecord[]): Plot[] {
  const settledIds = new Set(
    stolenRecords
      .filter((record) => record.id.startsWith(`${CAUGHT_THIEF_SETTLEMENT_PREFIX}:`))
      .map((record) => record.id),
  );

  if (settledIds.size === 0) return plots;

  return plots.map((plot) => {
    if (!plot.thief) return plot;
    const settlementId = getCaughtThiefSettlementId(plot.id, plot.thief);
    return settledIds.has(settlementId)
      ? { ...plot, thief: undefined }
      : plot;
  });
}

export function settleCaughtThiefSnapshot(
  farm: FarmStorage,
  plotId: number,
  settledAt: number = Date.now(),
): { nextFarm: FarmStorage; settled: boolean } {
  const plot = farm.plots.find((item) => item.id === plotId);
  if (!plot?.thief || !plot.varietyId) {
    return {
      nextFarm: farm,
      settled: false,
    };
  }

  const settlementId = getCaughtThiefSettlementId(plot.id, plot.thief);
  const settlementExists = farm.stolenRecords.some((record) => record.id === settlementId);
  const nextPlots = farm.plots.map((item) => {
    if (item.id !== plotId || !item.thief) return item;
    return getCaughtThiefSettlementId(item.id, item.thief) === settlementId
      ? { ...item, thief: undefined }
      : item;
  });

  if (settlementExists) {
    return {
      nextFarm: nextPlots.some((item, index) => item !== farm.plots[index])
        ? { ...farm, plots: nextPlots }
        : farm,
      settled: false,
    };
  }

  return {
    nextFarm: {
      ...farm,
      plots: nextPlots,
      stolenRecords: [
        ...farm.stolenRecords,
        {
          id: settlementId,
          plotId: plot.id,
          varietyId: plot.varietyId,
          stolenAt: Math.max(plot.thief.appearedAt, Math.min(settledAt, plot.thief.stealsAt)),
          resolved: true,
          recoveredCount: 0,
          recoveredAt: settledAt,
        },
      ],
    },
    settled: true,
  };
}
