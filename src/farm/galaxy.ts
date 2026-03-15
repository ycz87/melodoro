/**
 * 星系解锁与地块扩展计算。
 */
import type { CollectedVariety, GalaxyId, VarietyId } from '../types/farm';
import { GALAXY_VARIETIES, PLOT_MILESTONES, VARIETY_DEFS } from '../types/farm';

const GALAXY_UNLOCK_ORDER: GalaxyId[] = ['thick-earth', 'fire', 'water', 'wood', 'metal', 'rainbow', 'dark-matter'];
const CORE_GALAXIES: GalaxyId[] = ['thick-earth', 'fire', 'water', 'wood', 'metal'];
const FIRE_UNLOCK_REQUIRED_COUNT = 5;
const WATER_UNLOCK_REQUIRED_COUNT = GALAXY_VARIETIES['thick-earth'].length;
const WOOD_UNLOCK_REQUIRED_COMPLETED_GALAXIES = 2;
const METAL_UNLOCK_REQUIRED_COMPLETED_GALAXIES = 3;
const RAINBOW_UNLOCK_REQUIRED_CORE_GALAXIES = CORE_GALAXIES.length;
const RAINBOW_UNLOCK_REQUIRED_HYBRIDS = 3;
const DARK_MATTER_UNLOCK_REQUIRED_COUNT = GALAXY_VARIETIES.rainbow.length;

export interface UnlockProgressSegment {
  current: number;
  target: number;
}

export interface GalaxyUnlockState {
  galaxyId: GalaxyId;
  isUnlocked: boolean;
  progressSegments: UnlockProgressSegment[];
}

export interface GalaxyProgressSnapshot {
  collectedVarietyIds: Set<VarietyId>;
  collectedByGalaxy: Map<GalaxyId, number>;
  harvestedHybridVarietyCount: number;
  completedCoreGalaxyCount: number;
  coreGalaxiesWithCollectionCount: number;
  unlockStateByGalaxy: Record<GalaxyId, GalaxyUnlockState>;
  unlockedGalaxies: GalaxyId[];
}

function getCollectedVarietyIdSet(collection: CollectedVariety[]): Set<VarietyId> {
  const varietyIds = new Set<VarietyId>();

  for (const record of collection) {
    if (!VARIETY_DEFS[record.varietyId]) continue;
    varietyIds.add(record.varietyId);
  }

  return varietyIds;
}

function getCollectedVarietyCountByGalaxy(collectedVarietyIds: Set<VarietyId>): Map<GalaxyId, number> {
  const counts = new Map<GalaxyId, number>();

  for (const varietyId of collectedVarietyIds) {
    const varietyDef = VARIETY_DEFS[varietyId];
    if (!varietyDef) continue;
    counts.set(varietyDef.galaxy, (counts.get(varietyDef.galaxy) ?? 0) + 1);
  }

  return counts;
}

export function getCollectedUniqueVarietyCount(collection: CollectedVariety[]): number {
  return getCollectedVarietyIdSet(collection).size;
}

export function getCollectedHybridVarietyCount(collection: CollectedVariety[]): number {
  let hybridCount = 0;

  for (const varietyId of getCollectedVarietyIdSet(collection)) {
    if (VARIETY_DEFS[varietyId]?.breedType === 'hybrid') hybridCount += 1;
  }

  return hybridCount;
}

export function getGalaxyProgressSnapshot(collection: CollectedVariety[]): GalaxyProgressSnapshot {
  const collectedVarietyIds = getCollectedVarietyIdSet(collection);
  const collectedByGalaxy = getCollectedVarietyCountByGalaxy(collectedVarietyIds);
  const thickEarthCount = collectedByGalaxy.get('thick-earth') ?? 0;
  const rainbowCount = collectedByGalaxy.get('rainbow') ?? 0;
  const harvestedHybridVarietyCount = getCollectedHybridVarietyCount(collection);

  const completedCoreGalaxyCount = CORE_GALAXIES.reduce((count, galaxyId) => {
    const totalVarieties = GALAXY_VARIETIES[galaxyId]?.length ?? 0;
    const collectedCount = collectedByGalaxy.get(galaxyId) ?? 0;
    return collectedCount >= totalVarieties ? count + 1 : count;
  }, 0);

  const coreGalaxiesWithCollectionCount = CORE_GALAXIES.reduce((count, galaxyId) => {
    return (collectedByGalaxy.get(galaxyId) ?? 0) > 0 ? count + 1 : count;
  }, 0);

  const unlockStateByGalaxy: Record<GalaxyId, GalaxyUnlockState> = {
    'thick-earth': {
      galaxyId: 'thick-earth',
      isUnlocked: true,
      progressSegments: [],
    },
    fire: {
      galaxyId: 'fire',
      isUnlocked: thickEarthCount >= FIRE_UNLOCK_REQUIRED_COUNT,
      progressSegments: [{ current: thickEarthCount, target: FIRE_UNLOCK_REQUIRED_COUNT }],
    },
    water: {
      galaxyId: 'water',
      isUnlocked: thickEarthCount >= WATER_UNLOCK_REQUIRED_COUNT,
      progressSegments: [{ current: thickEarthCount, target: WATER_UNLOCK_REQUIRED_COUNT }],
    },
    wood: {
      galaxyId: 'wood',
      isUnlocked: completedCoreGalaxyCount >= WOOD_UNLOCK_REQUIRED_COMPLETED_GALAXIES,
      progressSegments: [{ current: completedCoreGalaxyCount, target: WOOD_UNLOCK_REQUIRED_COMPLETED_GALAXIES }],
    },
    metal: {
      galaxyId: 'metal',
      isUnlocked: completedCoreGalaxyCount >= METAL_UNLOCK_REQUIRED_COMPLETED_GALAXIES,
      progressSegments: [{ current: completedCoreGalaxyCount, target: METAL_UNLOCK_REQUIRED_COMPLETED_GALAXIES }],
    },
    rainbow: {
      galaxyId: 'rainbow',
      isUnlocked: coreGalaxiesWithCollectionCount >= RAINBOW_UNLOCK_REQUIRED_CORE_GALAXIES
        && harvestedHybridVarietyCount >= RAINBOW_UNLOCK_REQUIRED_HYBRIDS,
      progressSegments: [
        { current: coreGalaxiesWithCollectionCount, target: RAINBOW_UNLOCK_REQUIRED_CORE_GALAXIES },
        { current: harvestedHybridVarietyCount, target: RAINBOW_UNLOCK_REQUIRED_HYBRIDS },
      ],
    },
    'dark-matter': {
      galaxyId: 'dark-matter',
      isUnlocked: rainbowCount >= DARK_MATTER_UNLOCK_REQUIRED_COUNT,
      progressSegments: [{ current: rainbowCount, target: DARK_MATTER_UNLOCK_REQUIRED_COUNT }],
    },
  };

  return {
    collectedVarietyIds,
    collectedByGalaxy,
    harvestedHybridVarietyCount,
    completedCoreGalaxyCount,
    coreGalaxiesWithCollectionCount,
    unlockStateByGalaxy,
    unlockedGalaxies: GALAXY_UNLOCK_ORDER.filter((galaxyId) => unlockStateByGalaxy[galaxyId].isUnlocked),
  };
}

// 根据图鉴 collection 计算已解锁的星系
export function getUnlockedGalaxies(collection: CollectedVariety[]): GalaxyId[] {
  return getGalaxyProgressSnapshot(collection).unlockedGalaxies;
}

// 神秘种子池仍只扩展五行常规星系；幻彩 / 暗物质继续走各自的专属获取路径。
export function getUnlockedSeedPoolGalaxies(collection: CollectedVariety[]): GalaxyId[] {
  const snapshot = getGalaxyProgressSnapshot(collection);
  return CORE_GALAXIES.filter((galaxyId) => snapshot.unlockStateByGalaxy[galaxyId].isUnlocked);
}

// 根据图鉴品种数计算当前地块数（按 varietyId 去重，mutant 不额外加成）
export function getPlotCount(collection: CollectedVariety[]): number {
  const collectedCount = getCollectedUniqueVarietyCount(collection);
  let totalPlots = PLOT_MILESTONES[0]?.totalPlots ?? 4;

  for (const milestone of PLOT_MILESTONES) {
    if (collectedCount >= milestone.requiredVarieties) totalPlots = milestone.totalPlots;
  }

  return totalPlots;
}

// 检查某星系是否已解锁
export function isGalaxyUnlocked(galaxyId: GalaxyId, collection: CollectedVariety[]): boolean {
  return getGalaxyProgressSnapshot(collection).unlockStateByGalaxy[galaxyId].isUnlocked;
}
