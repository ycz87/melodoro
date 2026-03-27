import { getCollectedUniqueVarietyCount, getGalaxyProgressSnapshot } from './galaxy';
import {
  ALL_VARIETY_IDS,
  type CollectedVariety,
  type FarmMilestoneId,
  type FarmMilestoneRewardId,
  type FarmMilestoneRewardKind,
  type FarmMilestoneSource,
  type FarmMilestoneState,
  type GalaxyId,
  type VarietyId,
} from '../types/farm';

export interface FarmMilestoneDefinition {
  id: FarmMilestoneId;
  rewardIds: FarmMilestoneRewardId[];
  isAchieved: (input: FarmMilestoneProgressInput) => boolean;
}

export interface FarmMilestoneRewardDefinition {
  id: FarmMilestoneRewardId;
  kind: FarmMilestoneRewardKind;
  icon: string;
  plotCount?: number;
  galaxyId?: GalaxyId;
  varietyId?: VarietyId;
  contentKey?: 'focus-theme' | 'cosmic-ambience' | 'ultimate-theme' | 'five-element-fusion';
}

export interface FarmMilestoneProgressInput {
  collection: CollectedVariety[];
  uniqueVarietyCount: number;
  hasCosmicHeart: boolean;
  hasAllVarietiesExceptCosmicHeart: boolean;
  reachedCosmicHeartLegacyCondition: boolean;
  galaxyProgress: ReturnType<typeof getGalaxyProgressSnapshot>;
}

export interface FarmMilestoneRewardStatus {
  reward: FarmMilestoneRewardDefinition;
  grantedAt?: string;
  source?: FarmMilestoneSource;
}

export const FARM_MILESTONE_REWARD_DEFINITIONS: FarmMilestoneRewardDefinition[] = [
  { id: 'plot-5', kind: 'plot', icon: '🧱', plotCount: 5 },
  { id: 'plot-6', kind: 'plot', icon: '🧱', plotCount: 6 },
  { id: 'fire-galaxy', kind: 'galaxy', icon: '🔥', galaxyId: 'fire' },
  { id: 'water-galaxy', kind: 'galaxy', icon: '💧', galaxyId: 'water' },
  { id: 'plot-7', kind: 'plot', icon: '🧱', plotCount: 7 },
  { id: 'wood-galaxy', kind: 'galaxy', icon: '🌿', galaxyId: 'wood' },
  { id: 'focus-theme', kind: 'theme', icon: '🎨', contentKey: 'focus-theme' },
  { id: 'metal-galaxy', kind: 'galaxy', icon: '⚙️', galaxyId: 'metal' },
  { id: 'plot-8', kind: 'plot', icon: '🧱', plotCount: 8 },
  { id: 'cosmic-ambience', kind: 'ambience', icon: '🎵', contentKey: 'cosmic-ambience' },
  { id: 'rainbow-galaxy', kind: 'galaxy', icon: '🌈', galaxyId: 'rainbow' },
  { id: 'five-element-fusion', kind: 'feature', icon: '✨', contentKey: 'five-element-fusion' },
  { id: 'plot-9', kind: 'plot', icon: '🧱', plotCount: 9 },
  { id: 'dark-matter-galaxy', kind: 'galaxy', icon: '🌌', galaxyId: 'dark-matter' },
  { id: 'cosmic-heart', kind: 'variety', icon: '👑', varietyId: 'cosmic-heart' },
  { id: 'ultimate-theme', kind: 'theme', icon: '🌠', contentKey: 'ultimate-theme' },
];

export const FARM_MILESTONE_DEFINITIONS: FarmMilestoneDefinition[] = [
  {
    id: 'collect-3-varieties',
    rewardIds: ['plot-5'],
    isAchieved: ({ uniqueVarietyCount }) => uniqueVarietyCount >= 3,
  },
  {
    id: 'collect-5-varieties',
    rewardIds: ['plot-6'],
    isAchieved: ({ uniqueVarietyCount }) => uniqueVarietyCount >= 5,
  },
  {
    id: 'unlock-fire-galaxy',
    rewardIds: ['fire-galaxy'],
    isAchieved: ({ galaxyProgress }) => galaxyProgress.unlockStateByGalaxy.fire.isUnlocked,
  },
  {
    id: 'collect-8-varieties',
    rewardIds: ['plot-7'],
    isAchieved: ({ uniqueVarietyCount }) => uniqueVarietyCount >= 8,
  },
  {
    id: 'unlock-water-galaxy',
    rewardIds: ['water-galaxy'],
    isAchieved: ({ galaxyProgress }) => galaxyProgress.unlockStateByGalaxy.water.isUnlocked,
  },
  {
    id: 'complete-2-core-galaxies',
    rewardIds: ['wood-galaxy', 'focus-theme'],
    isAchieved: ({ galaxyProgress }) => galaxyProgress.completedCoreGalaxyCount >= 2,
  },
  {
    id: 'complete-3-core-galaxies',
    rewardIds: ['metal-galaxy'],
    isAchieved: ({ galaxyProgress }) => galaxyProgress.completedCoreGalaxyCount >= 3,
  },
  {
    id: 'collect-15-varieties',
    rewardIds: ['plot-8', 'cosmic-ambience'],
    isAchieved: ({ uniqueVarietyCount }) => uniqueVarietyCount >= 15,
  },
  {
    id: 'reach-five-element-resonance',
    rewardIds: ['rainbow-galaxy', 'five-element-fusion'],
    isAchieved: ({ galaxyProgress }) => galaxyProgress.unlockStateByGalaxy.rainbow.isUnlocked,
  },
  {
    id: 'collect-22-varieties',
    rewardIds: ['plot-9'],
    isAchieved: ({ uniqueVarietyCount }) => uniqueVarietyCount >= 22,
  },
  {
    id: 'complete-prismatic-collection',
    rewardIds: ['dark-matter-galaxy'],
    isAchieved: ({ galaxyProgress }) => galaxyProgress.unlockStateByGalaxy['dark-matter'].isUnlocked,
  },
  {
    id: 'complete-main-collection',
    rewardIds: ['cosmic-heart', 'ultimate-theme'],
    isAchieved: ({ hasCosmicHeart, hasAllVarietiesExceptCosmicHeart, reachedCosmicHeartLegacyCondition }) => (
      hasCosmicHeart || hasAllVarietiesExceptCosmicHeart || reachedCosmicHeartLegacyCondition
    ),
  },
];

const rewardDefinitionById = new Map(
  FARM_MILESTONE_REWARD_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const milestoneDefinitionById = new Map(
  FARM_MILESTONE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getFarmMilestoneProgress(collection: CollectedVariety[]): FarmMilestoneProgressInput {
  const galaxyProgress = getGalaxyProgressSnapshot(collection);
  const uniqueVarietyCount = getCollectedUniqueVarietyCount(collection);
  const collectedNormalVarietyIds = new Set<VarietyId>();

  for (const record of collection) {
    if (record.isMutant === true) continue;
    collectedNormalVarietyIds.add(record.varietyId);
  }

  const hasCosmicHeart = collectedNormalVarietyIds.has('cosmic-heart');
  const hasAllVarietiesExceptCosmicHeart = ALL_VARIETY_IDS
    .filter((varietyId) => varietyId !== 'cosmic-heart')
    .every((varietyId) => collectedNormalVarietyIds.has(varietyId));
  const reachedCosmicHeartLegacyCondition = collectedNormalVarietyIds.size === ALL_VARIETY_IDS.length;

  return {
    collection,
    uniqueVarietyCount,
    hasCosmicHeart,
    hasAllVarietiesExceptCosmicHeart,
    reachedCosmicHeartLegacyCondition,
    galaxyProgress,
  };
}

export function getAchievedFarmMilestoneIds(progress: FarmMilestoneProgressInput): FarmMilestoneId[] {
  return FARM_MILESTONE_DEFINITIONS
    .filter((definition) => definition.isAchieved(progress))
    .map((definition) => definition.id);
}

export function hasFarmMilestoneReward(state: FarmMilestoneState, rewardId: FarmMilestoneRewardId): boolean {
  return state.rewards.some((reward) => reward.rewardId === rewardId);
}

export function getFarmMilestoneRewardStatusList(state: FarmMilestoneState): FarmMilestoneRewardStatus[] {
  return FARM_MILESTONE_REWARD_DEFINITIONS.map((reward) => {
    const record = state.rewards.find((item) => item.rewardId === reward.id);
    return {
      reward,
      grantedAt: record?.grantedAt,
      source: record?.source,
    };
  });
}

export function getFarmMilestoneRewardDefinition(rewardId: FarmMilestoneRewardId): FarmMilestoneRewardDefinition {
  const definition = rewardDefinitionById.get(rewardId);
  if (!definition) throw new Error(`Unknown milestone reward: ${rewardId}`);
  return definition;
}

export function getFarmMilestoneDefinition(milestoneId: FarmMilestoneId): FarmMilestoneDefinition {
  const definition = milestoneDefinitionById.get(milestoneId);
  if (!definition) throw new Error(`Unknown farm milestone: ${milestoneId}`);
  return definition;
}

export function getMaxGrantedPlotCount(state: FarmMilestoneState): number {
  return state.rewards.reduce((maxPlots, rewardRecord) => {
    const rewardDefinition = rewardDefinitionById.get(rewardRecord.rewardId);
    if (!rewardDefinition?.plotCount) return maxPlots;
    return Math.max(maxPlots, rewardDefinition.plotCount);
  }, 4);
}
