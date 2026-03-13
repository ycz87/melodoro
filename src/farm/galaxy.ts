/**
 * 星系解锁与地块扩展计算。
 */
import type { CollectedVariety, GalaxyId } from '../types/farm';
import { PLOT_MILESTONES, VARIETY_DEFS } from '../types/farm';

const MAIN_GALAXY_CHAIN: GalaxyId[] = ['thick-earth', 'fire', 'water', 'wood', 'metal'];
const UNLOCK_REQUIRED_COUNT = 5;

function getCollectedVarietyCountByGalaxy(collection: CollectedVariety[]): Map<GalaxyId, number> {
  const byGalaxy = new Map<GalaxyId, Set<string>>();
  for (const record of collection) {
    const varietyDef = VARIETY_DEFS[record.varietyId];
    if (!varietyDef) continue;
    const set = byGalaxy.get(varietyDef.galaxy) ?? new Set<string>();
    const key = `${record.varietyId}:${record.isMutant === true ? 'mutant' : 'normal'}`;
    set.add(key);
    byGalaxy.set(varietyDef.galaxy, set);
  }

  const result = new Map<GalaxyId, number>();
  for (const [galaxyId, ids] of byGalaxy.entries()) {
    result.set(galaxyId, ids.size);
  }
  return result;
}

export function getCollectedUniqueVarietyCount(collection: CollectedVariety[]): number {
  return new Set(collection.map((record) => record.varietyId)).size;
}

// 根据图鉴 collection 计算已解锁的星系
export function getUnlockedGalaxies(collection: CollectedVariety[]): GalaxyId[] {
  const collectedByGalaxy = getCollectedVarietyCountByGalaxy(collection);
  const unlocked: GalaxyId[] = ['thick-earth'];

  for (let i = 1; i < MAIN_GALAXY_CHAIN.length; i += 1) {
    const prevGalaxyId = MAIN_GALAXY_CHAIN[i - 1];
    const currentGalaxyId = MAIN_GALAXY_CHAIN[i];
    const prevCount = collectedByGalaxy.get(prevGalaxyId) ?? 0;
    if (prevCount >= UNLOCK_REQUIRED_COUNT) unlocked.push(currentGalaxyId);
    else break;
  }

  return unlocked;
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
  return getUnlockedGalaxies(collection).includes(galaxyId);
}
