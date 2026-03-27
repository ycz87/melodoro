# Issue #34 Proof — 视觉层与插件专项 lint 收尾

- **Branch:** `feature/issue34-visual-plugin-lint`
- **Issue:** `#34`
- **PR:** pending
- **Date:** 2026-03-16 13:52 UTC

## 1. Targeted Lint Proof

```bash
$ npx eslint src/components/farm/SkyLayer.tsx \
  src/components/SlicingScene.tsx \
  src/components/farm-v2/FarmPlotTileV2.tsx \
  src/hooks/useWeeklyShop.ts \
  src/hooks/useAuth.ts \
  auth/src/routes/auth.ts \
  src/components/FarmPixiPhase0Prototype.tsx

(no output)
```

- Target 7 files are lint-clean.
- In-scope 8 messages removed.

## 2. Repo-wide Lint Delta Proof

- **Before (`origin/main` baseline):** 8 problems
- **After (this branch):** 0 problems
- **Delta:** -8 ✅

```bash
$ npx eslint .

(no output)
```

## 3. Build Proof

```bash
$ npm run build

vite v7.3.1 building client environment for production...
✓ 131 modules transformed.
✓ built in 4.07s
```

- Build passes.
- Remaining output is the pre-existing CSS optimizer warning / chunk-size warning, not ESLint or TypeScript failures.

## 4. Diff Check Proof

```bash
$ git diff --check

(no output)
```

- Patch formatting is clean.

## 5. Changed Files

```text
auth/src/routes/auth.ts
src/components/FarmPixiPhase0Prototype.tsx
src/components/SlicingScene.tsx
src/components/farm-v2/FarmPlotBoardV2.tsx
src/components/farm-v2/FarmPlotTileV2.tsx
src/components/farm/SkyLayer.tsx
src/hooks/useAuth.ts
src/hooks/useWeeklyShop.ts
artifacts/issue34/20260316-135219Z/PROOF.md
```

Notes:
- The 7 target files were edited as requested.
- `src/components/farm-v2/FarmPlotBoardV2.tsx` is the only extra code file: it is the sole consumer of `mapPlotStateToTileState`, so moving the helper usage there was the smallest strongly-coupled change needed to satisfy `react-refresh/only-export-components` without creating a new shared file.
- The artifact file is proof-only.

## 6. Fix Strategy Proof

### `react-hooks/purity` x3

- `src/components/farm/SkyLayer.tsx`
  - Replaced render-time `Math.random()` cloud placement with deterministic per-count cloud layouts.
- `src/hooks/useWeeklyShop.ts`
  - Replaced render-time `createWeeklyShop(Date.now())` with a module-scope initial snapshot used only as the `useLocalStorage` fallback value.

### `react-hooks/static-components` x1

- `src/components/SlicingScene.tsx`
  - Hoisted the watermelon SVG renderer to a file-level component and passed `isGold` as an explicit prop.

### `react-refresh/only-export-components` x1

- `src/components/farm-v2/FarmPlotTileV2.tsx`
  - Stopped exporting the non-component helper from the component file.
- `src/components/farm-v2/FarmPlotBoardV2.tsx`
  - Inlined the strongly-coupled plot-state mapping helper at the single call site.

### `react-hooks/immutability` x1

- `src/hooks/useAuth.ts`
  - Reworked token-refresh recursion to use an inner named helper (`scheduleTokenRefresh`) instead of self-referencing the `useCallback` variable during initialization.

### `@typescript-eslint/no-unused-vars` x1

- `auth/src/routes/auth.ts`
  - Removed the unused `verifyAccessToken` import.

### `react-hooks/exhaustive-deps` x1

- `src/components/FarmPixiPhase0Prototype.tsx`
  - Captured the mount element once inside the effect and reused that stable variable in async boot logic and cleanup instead of reading `mountRef.current` during cleanup.

## 7. Regression Notes

- No rules were relaxed, no ignores were added, and no lint comments were used to suppress debt.
- No intended product behavior, visuals, or interaction goals were changed beyond making previously-random helper state deterministic.
- I did not run extra runtime/browser regression flows beyond lint + build; risk is low because each change is localized to helper generation / export structure / cleanup safety / import cleanup.

## 8. Known Issues

- None in scope.
- Repo-wide lint is now clean.
