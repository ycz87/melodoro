# Issue #24 follow-up split plan

## Recommended sequencing

1. Start with the lowest-risk manual sweep: E2E tests (`@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`).
2. Then isolate React hook rule clusters in UI components with the highest density (`react-hooks/purity`, `react-hooks/set-state-in-effect`).
3. After the dense component clusters, clean App shell / shared hooks (`react-hooks/exhaustive-deps`, `react-hooks/refs`).
4. Leave singleton leftovers and plugin-specific one-offs to the final sweep.

## Candidate follow-up issues

1. **仓库治理：E2E 测试 lint 低风险手工清理**
   - Scope: `e2e/debug-toolbar.spec.ts`, `e2e/farm-layout-v023.spec.ts`, `e2e/farm-mobile-square.spec.ts`, `e2e/gene-lab.spec.ts`, `e2e/market-buy.spec.ts`, `e2e/market-sell.spec.ts`, `e2e/mutation.spec.ts`
   - Rules: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars`
   - Why: test-only scope, low product risk, 13 messages can be retired without touching runtime code.

2. **仓库治理：庆典/动效组件 React Hooks purity 清理**
   - Scope: `src/components/CelebrationOverlay.tsx`, `src/components/AchievementCelebration.tsx`, `src/components/HistoryPanel.tsx`
   - Rules: `react-hooks/purity`, `react-hooks/rules-of-hooks`
   - Why: 15+ messages are concentrated in a small celebration cluster, making it a self-contained medium-risk cleanup.

3. **仓库治理：农场/实验室页面 set-state-in-effect 清理**
   - Scope: `src/components/FarmPage.tsx`, `src/components/GeneLabPage.tsx`, `src/components/AchievementsPage.tsx`, `src/components/Guide.tsx`, `src/components/InstallPrompt.tsx`, `src/components/ProjectExitModal.tsx`, `src/components/Timer.tsx`
   - Rules: `react-hooks/set-state-in-effect`, plus nearby `no-unused-vars` in `FarmPage.tsx`
   - Why: 13 messages share the same hook lifecycle smell and should be reviewed together for consistent fixes.

4. **仓库治理：App shell 与定时器 hooks 依赖/refs 清理**
   - Scope: `src/App.tsx`, `src/hooks/useTimer.ts`, `src/hooks/useProjectTimer.ts`, `src/components/AmbienceMixerModal.tsx`, `src/components/CodeInput.tsx`, `src/hooks/useGeneStorage.ts`, `src/hooks/useWarehouse.ts`, `src/hooks/useAlienVisit.ts`
   - Rules: `react-hooks/exhaustive-deps`, `react-hooks/refs`, remaining `react-hooks/set-state-in-effect`
   - Why: app shell and shared hooks have cross-cutting timer/state dependencies; fix together to avoid churn.

5. **仓库治理：视觉层与插件专项 lint 收尾**
   - Scope: `src/components/farm/SkyLayer.tsx`, `src/components/SlicingScene.tsx`, `src/components/farm-v2/FarmPlotTileV2.tsx`, `src/hooks/useWeeklyShop.ts`, `src/hooks/useAuth.ts`, `auth/src/routes/auth.ts`, `src/components/FarmPixiPhase0Prototype.tsx`
   - Rules: `react-hooks/purity`, `react-hooks/static-components`, `react-refresh/only-export-components`, `react-hooks/immutability`, `@typescript-eslint/no-unused-vars`, `react-hooks/exhaustive-deps`
   - Why: small-count leftovers span multiple plugin families and are better handled as the final catch-all sweep.

## Rationale

- Split first by **risk surface**: tests before production UI.
- Inside runtime code, split by **rule cluster** so a single issue can apply one consistent fixing strategy.
- Keep this governance rule in force: feature PRs must stay lint-neutral or lint-improving; historical debt belongs to dedicated cleanup issues only.
