import type { AmbienceSoundId } from '../audio';
import type { AlertSoundId } from '../audio';

/** 翻译字典类型定义 */
export interface Messages {
  appName: string;
  appNameShort: string;
  phaseWork: string;
  phaseShortBreak: string;
  abandon: string;
  quickTimeHint: string;
  toggleTimerMode: string;
  taskPlaceholder: string;
  clearTask: string;
  emptyTitle: string;
  emptySubtitle: string;
  todayRecords: string;
  unnamed: string;
  editHint: string;
  deleteConfirm: string;
  todayHarvest: string;
  totalFocus: (time: string) => string;
  workComplete: (emoji: string) => string;
  skipComplete: (emoji: string) => string;
  breakOver: string;
  breakOverBody: string;
  celebrationRipe: readonly string[];
  celebrationShort: readonly string[];
  // Per-stage celebration text pools (v0.7.1)
  celebrateSeed: readonly string[];
  celebrateSprout: readonly string[];
  celebrateBloom: readonly string[];
  celebrateGreen: readonly string[];
  celebrateRipe: readonly string[];
  celebrateLegendary: readonly string[];

  // Warehouse & Synthesis (v0.8.0)
  warehouseTitle: string;
  warehouseTabShed: string;
  warehouseTabBackpack: string;
  warehouseTotal: string;
  warehouseHighest: string;
  warehouseLocked: string;
  warehouseLockedName: string;
  synthesisTitle: string;
  synthesisYouHave: (n: number) => string;
  synthesisCanMake: (n: number, name: string) => string;
  synthesisNotEnough: string;
  synthesisSynthesize: string;
  synthesisSynthesizeAll: string;
  synthesisSuccess: (name: string) => string;
  warehouseEmpty: string;
  stageNameSeed: string;
  stageNameSprout: string;
  stageNameBloom: string;
  stageNameGreen: string;
  stageNameRipe: string;
  stageNameLegendary: string;
  legendaryUnlocked: string;

  // Anti-AFK & Health (v0.8.1)
  overtimeNoReward: string;
  healthReminder: string;
  settings: string;
  timerRunningHint: string;
  workDuration: string;
  shortBreak: string;
  autoStartBreak: string;
  autoStartWork: string;

  // Alert sound
  alertSound: string;
  alertRepeatCount: string;
  alertVolume: string;
  alertCustomize: string;
  repeatTimes: (n: number) => string;

  // Ambience
  focusAmbience: string;
  ambienceVolume: string;
  ambienceCustomize: string;
  ambienceOff: string;
  ambienceCategoryNature: string;
  ambienceCategoryEnvironment: string;
  ambienceCategoryNoise: string;
  ambienceCategoryClock: string;

  // Ambience sound names
  ambienceNames: Record<AmbienceSoundId, string>;

  // Alert sound names
  alertNames: Record<AlertSoundId, string>;

  // Modal
  modalClose: string;
  modalDone: string;

  theme: string;
  language: string;
  exportData: string;
  minutes: string;
  seconds: string;

  // Theme names
  themeDark: string;
  themeLight: string;
  themeForest: string;
  themeOcean: string;
  themeWarm: string;

  // Growth stages
  stageSeed: string;
  stageSprout: string;
  stageBloom: string;
  stageGreen: string;
  stageRipe: string;

  // Guide
  guideTitle: string;
  guidePomodoro: string;
  guidePomodoroDesc: string;
  guideBasic: string;
  guideBasicItems: readonly string[];
  guideGrowth: string;
  guideGrowthDesc: string;
  guideGrowthStages: readonly string[];
  guideSettings: string;
  guideSettingsDesc: string;
  guideStart: string;

  // Install prompt
  installTitle: string;
  installDesc: string;
  installButton: string;

  // History panel
  historyTab: string;
  statsTab: string;
  streakBanner: (days: number) => string;
  noRecords: string;
  today: string;
  yesterday: string;
  dateFormat: (m: number, d: number) => string;

  // Stats
  currentStreak: string;
  longestStreak: string;
  focusTrend: string;
  thisWeek: string;
  thisMonth: string;
  totalTime: string;
  totalCount: string;
  countUnit: (n: number) => string;
  formatMinutes: (mins: number) => string;
  weekdays: readonly string[];
  weekdaysShort: readonly string[];
  monthFormat: (year: number, month: number) => string;

  // ─── Project mode ───
  modePomodoro: string;
  modeProject: string;

  // Setup
  projectNamePlaceholder: string;
  projectTasks: string;
  projectTaskPlaceholder: string;
  projectAddTask: string;
  projectEstimatedTotal: string;
  projectBreakTotal: string;
  projectCancel: string;
  projectStart: string;

  // Execution
  projectCurrentTask: string;
  projectBreakTime: string;
  projectOvertime: string;
  projectEstimated: string;
  projectContinue: string;
  projectMarkDone: string;
  projectPause: string;
  projectResume: string;
  projectTaskList: string;
  projectInsertTask: string;
  projectInsert: string;
  projectAbandon: string;
  projectAbandonConfirm: string;
  projectAbandonYes: string;

  // Summary
  projectComplete: string;
  projectTotalEstimated: string;
  projectTotalActual: string;
  projectAheadOfSchedule: string;
  projectBehindSchedule: string;
  projectTaskBreakdown: string;
  projectCompleted: string;
  projectSkipped: string;
  projectDone: string;

  // Confirm modal
  confirmExitTitle: string;
  confirmExitMessage: string;
  confirm: string;
  cancel: string;

  // Default task name
  defaultTaskName: (n: number) => string;

  // Project exit modal
  projectExitConfirmTitle: string;
  projectExitConfirm: string;
  projectExitAll: string;
  projectExitChooseTitle: string;
  projectExitRestart: string;
  projectExitNext: string;
  projectExitPrevious: string;
  projectExitFinish: string;
  projectAbandoned: string;
  projectOvertimeContinued: string;

  // Recovery
  projectRecoveryTitle: string;
  projectRecoveryDesc: string;
  projectRecoveryResume: string;
  projectRecoveryDiscard: string;

  // History
  projectHistory: string;
  projectHistoryEstimated: string;
  projectHistoryActual: string;

  // Settings section headers
  sectionTimer: string;
  sectionAlerts: string;
  sectionAppearance: string;
  sectionGeneral: string;

  // Empty state
  emptyTodayHint: string;

  // Guide in settings
  settingsGuide: string;

  // Encouragement banner
  encourageEmpty: readonly string[];
  encourageFirst: readonly string[];
  encourageSecond: readonly string[];
  encourageThird: readonly string[];
  encourageMany: readonly string[];  // {n} placeholder for count
  encourageBeatYesterday: (count: number, diff: number) => string;
  encourageTiedYesterday: (count: number) => string;
  streakShort: (days: number) => string;
  streakMedium: (days: number) => string;
  streakLong: (days: number) => string;

  // Week trend chart
  weekTrend: string;
  weekTotal: (time: string) => string;

  // Long-press buttons
  holdToFinish: string;
  holdToGiveUp: string;

  // Auth (v0.11.0)
  authTitle: string;
  authEmailPlaceholder: string;
  authSendCode: string;
  authSendFailed: string;
  authVerifyFailed: string;
  authOr: string;
  authGoogle: string;
  authMicrosoft: string;
  authLoginToSync: string;
  authLogout: string;

  // Profile editing (v0.13.0)
  profileEditName: string;
  profileSaving: string;
  profileUploadAvatar: string;

  // Achievements (v0.17.0)
  achievementsTitle: string;
  achievementsButton: string;
  achievementsProgress: (unlocked: number, total: number) => string;
  achievementsSeriesProgress: (unlocked: number, total: number) => string;
  achievementsUnlocked: string;
  achievementsLocked: string;
  achievementsHiddenLocked: string;
  achievementsHiddenHint: string;
  achievementsComingSoon: string;
  achievementsUnlockedAt: (date: string) => string;
  achievementsCondition: string;
  achievementsCurrentProgress: string;
  achievementsCelebrationTitle: string;
  achievementsSeriesStreak: string;
  achievementsSeriesFocus: string;
  achievementsSeriesHouse: string;
  achievementsSeriesFarm: string;
  achievementsSeriesHidden: string;

  // ─── Slicing system (v0.21.0) ───
  sliceHint: string;
  slicePerfect: string;
  sliceResult: string;
  sliceGoldResult: string;
  sliceSeedsObtained: (n: number) => string;
  slicePerfectBonus: string;
  sliceRare: string;
  sliceCollect: string;
  sliceContinue: string;
  sliceButton: string;
  itemName: (id: string) => string;
  itemDescription: (id: string) => string;
  itemFlavor: (id: string) => string;
  seedQualityLabel: (quality: string) => string;
  comboExpert: string;
  comboGod: string;

  // Shed sections
  shedSeedsTitle: string;
  shedSeedsCount: (n: number) => string;
  shedGoFarm: string;
  shedFarmComingSoon: string;
  shedItemsTitle: string;
  shedNoItems: string;
  shedSliceSection: string;
  shedTotalSliced: string;

  // ─── Nav tabs ───
  tabFocus: string;
  tabWarehouse: string;
  tabFarm: string;
  tabMarket: string;

  // Market (v0.29.0)
  marketTitle: string;
  marketBalance: string;
  marketTabBuy: string;
  marketTabSell: string;
  marketTabWeekly: string;
  marketBuyComingSoon: string;
  marketBuyConfirmTitle: string;
  marketBuyConfirmMessage: (name: string, price: number, balance: number) => string;
  marketBuyConfirmButton: string;
  marketBuyCancelButton: string;
  marketBuySuccess: string;
  marketPlotSection: string;
  marketPlotName: (index: number) => string;
  marketPlotUnlocked: string;
  marketPlotFreeUnlockHint: (required: number, current: number) => string;
  marketPlotConfirmTitle: string;
  marketPlotConfirmMessage: (name: string, price: number, balance: number) => string;
  marketSellEmpty: string;
  marketSellOwned: (count: number) => string;
  marketSellConfirmTitle: string;
  marketSellConfirmMessage: (name: string, price: number) => string;
  marketSellConfirmButton: string;
  marketSellCancelButton: string;
  marketWeeklyTitle: string;
  marketWeeklyRefreshIn: (days: number, hours: number) => string;
  marketWeeklyStock: (stock: number) => string;
  marketWeeklyBuyButton: string;
  marketWeeklySoldOut: string;
  marketWeeklyTypeRareGene: string;
  marketWeeklyTypeLegendarySeed: string;
  marketWeeklyTypeDecoration: string;
  marketWeeklyGeneName: (varietyName: string, stars: number) => string;
  marketWeeklySeedName: (varietyName: string) => string;
  marketWeeklyDecorationName: (decorationId: string) => string;

  // ─── Farm ───
  farmPlotsTab: string;
  farmCollectionTab: string;
  farmTabLab: string;
  hybridDexTab?: string;
  hybridDexTitle?: string;
  farmTodayFocus: (minutes: number) => string;
  farmPlant: string;
  farmHarvest: string;
  farmWithered: string;
  mutationRevealed: string;
  mutationPositive: string;
  mutationNegative: string;
  mutationWithered: string;
  mutationDowngraded: string;
  mutationPositiveToast?: (varietyName: string) => string;
  mutationGunUse: string;
  mutationChanceLabel: string;
  farmClear: string;
  farmSelectGalaxy: string;
  farmSelectSeed: string;
  farmSeedHint: string;
  farmNoSeeds: string;
  farmGoSlice: string;
  farmWeatherName: (weather: string) => string;
  farmReveal: string;
  farmNewVariety: string;
  farmNewFlash: string;
  farmAlreadyCollected: string;
  farmStage: (stage: string) => string;
  farmGrowthTime: (accumulated: number, total: number) => string;
  farmRemainingTime: (remaining: number) => string;
  farmFocusBoostHint: string;
  farmHelpTitle: string;
  farmHelpPlant: string;
  farmHelpGrow: string;
  farmHelpHarvest: string;
  farmHelpWither: string;
  farmHelpUnlock: string;
  formatDuration: (minutes: number) => string;
  farmGoFarm: string;
  farmUnlockHint: (requiredVarieties: number) => string;
  alienMelonGreeting: string;
  alienMutationDoctor: string;

  // ─── Thief & Items (v0.32.0) ───
  thiefAppeared: string;
  thiefStealing: (minutes: number) => string;
  thiefStolen: string;
  thiefCaught: string;
  thiefNote: string;
  thiefRecoveryActive: string;
  thiefRecoveryTask: string;
  thiefRecovered: string;
  itemGuardianBarrierActive: string;
  itemStarTrackerActive: string;
  itemNectarSuccess: string;
  itemMoonDewSuccess: string;
  itemMoonDewFail: string;
  itemTrapNetSuccess: string;

  // ─── Collection ───
  collectionTabPure: string;
  collectionTabHybrid: string;
  collectionTabPrismatic: string;
  collectionTabDarkMatter: string;
  starJourneyTitle: string;
  collectionProgress: (collected: number, total: number) => string;
  collectionLocked: string;
  collectionUnlockHint: (galaxyId: string) => string;
  galaxyName: (id: string) => string;
  varietyName: (id: string) => string;
  varietyStory: (id: string) => string;
  varietyDetailTitle: string;
  varietyDetailFirstObtained: string;
  varietyDetailHarvestCount: (count: number) => string;
  collectionAcquireHintTitle: string;
  collectionGuideCurrentStage: string;
  collectionGuideNextMilestone: string;
  collectionGuideFiveElementTitle: string;
  collectionGuideStageCoreDiscovery: string;
  collectionGuideStageCoreExpansion: string;
  collectionGuideStageResonance: string;
  collectionGuideStagePrismatic: string;
  collectionGuideStageDarkMatter: string;
  collectionGuideStageComplete: string;
  collectionGuideUnlockGalaxy: (galaxyName: string) => string;
  collectionGuideCompleteDarkMatter: string;
  collectionGuideAllMilestonesComplete: string;
  collectionGuideGalaxyProgress: (galaxyName: string, current: number, target: number, remaining: number) => string;
  collectionGuideCompletedCoreGalaxiesProgress: (current: number, target: number, remaining: number) => string;
  collectionGuideResonanceCoreProgress: (current: number, target: number) => string;
  collectionGuideResonanceHybridProgress: (current: number, target: number) => string;
  collectionGuideResonanceMissingGalaxies: (names: string) => string;
  collectionGuideResonanceReady: string;
  collectionGuideDone: string;
  collectionMilestoneRewardsTitle: string;
  collectionMilestoneRewardFocusTheme: string;
  collectionMilestoneRewardUltimateTheme: string;
  collectionMilestoneRewardCosmicAmbience: string;
  collectionMilestoneRewardGranted: (date: string) => string;
  collectionMilestoneRewardBackfilled: (date: string) => string;
  collectionMilestoneRewardNotEarned: string;
  collectionMilestoneRewardContentPending: string;
  darkMatterGuideVoid: string;
  darkMatterGuideBlackHole: string;
  darkMatterGuideCosmicHeart: string;
  darkMatterGuideProgress: (collected: number, total: number) => string;

  // ─── Gene Lab (v0.26.0) ───
  geneLabTab: string;
  geneLabTitle: string;
  geneLabEmpty: string;
  geneLabFragments: string;
  geneLabFragmentCount: (count: number) => string;
  geneLabVarietySource: string;
  geneLabObtainedAt: string;
  geneLabGalaxySection: (galaxyName: string, count: number) => string;

  // ─── Gene Injection (v0.27.0) ───
  geneInjectTitle: string;
  geneInjectDesc: string;
  geneInjectSelectGalaxy: string;
  geneInjectSelectSeed: string;
  geneInjectButton: string;
  geneInjectSuccess: string;
  geneInjectNoFragments: string;
  geneInjectNoSeeds: string;
  geneInjectCost: string;
  injectedSeedLabel: (galaxyName: string) => string;
  injectedSeedHint: string;
  hybridSeedHint: string;
  prismaticSeedHint: string;
  prismaticSeedLabel: (varietyName: string) => string;
  prismaticSeedCountLabel: (count: number) => string;
  darkMatterSeedHint: string;
  darkMatterSeedLabel: (varietyName: string) => string;
  darkMatterSeedCountLabel: (count: number) => string;

  // ─── Gene Fusion (v0.28.0) ───
  geneFusionTitle: string;
  geneFusionDesc: string;
  geneFusionSelectFirst: string;
  geneFusionSelectSecond: string;
  geneFusionRate: (rate: number) => string;
  geneFusionButton: string;
  geneFusionSuccess: string;
  geneFusionFail: string;
  geneFusionSameGalaxy: string;
  geneFusionNoFragments: string;
  hybridSeedLabel: (pairName: string) => string;
  hybridGalaxyPairLabel: (pair: string) => string;
  hybridGalaxyPairName: (pair: string) => string;
  geneFiveElementTitle: string;
  geneFiveElementDesc: string;
  geneFiveElementHybridRequirement: (count: number) => string;
  geneFiveElementResonanceLocked: string;
  geneFiveElementResonanceReady: string;
  geneFiveElementRate: (rate: number) => string;
  geneFiveElementButton: string;
  geneFiveElementSuccess: (varietyName: string) => string;
  geneFiveElementFail: string;
  geneFiveElementFailReturn: (varietyName: string) => string;
  geneFiveElementPityReady: string;
  geneDarkMatterTitle: string;
  geneDarkMatterDesc: string;
  geneDarkMatterVoidProgress: (count: number, total: number) => string;
  geneDarkMatterBlackHoleProgress: (count: number, total: number) => string;
  geneDarkMatterVoidButton: string;
  geneDarkMatterBlackHoleButton: string;
  geneDarkMatterSuccess: (varietyName: string) => string;
  geneDarkMatterFail: string;

  varietyDetailClose: string;
  cosmicHeartUnlockTitle: string;
  cosmicHeartUnlockDesc: string;
  cosmicHeartUnlockAction: string;
}
