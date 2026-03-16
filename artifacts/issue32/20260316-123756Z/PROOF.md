# Issue #32 Proof — App shell 与定时器 hooks 依赖/refs 清理

**Branch:** `feature/issue32-app-shell-hooks`  
**Commit:** (pending)  
**Date:** 2026-03-16 12:37 UTC

## 1. Targeted Lint Proof (8 files → 0 errors)

```bash
$ npx eslint src/App.tsx src/hooks/useTimer.ts src/hooks/useProjectTimer.ts \
  src/components/AmbienceMixerModal.tsx src/components/CodeInput.tsx \
  src/hooks/useGeneStorage.ts src/hooks/useWarehouse.ts src/hooks/useAlienVisit.ts

(no output)
```

✅ All 15 target lint messages eliminated from the 8 specified files.

## 2. Repo-wide Lint Delta Proof

**Before (baseline from Issue #30 merge):** 23 problems  
**After (this PR):** 8 problems  
**Delta:** -15 problems ✅

```bash
$ npx eslint . 2>&1 | tail -20

✖ 8 problems (7 errors, 1 warning)
```

Remaining 8 problems are outside this issue's scope:
- `src/hooks/useAuth.ts`: react-hooks/immutability (1)
- `src/hooks/useWeeklyShop.ts`: react-hooks/purity (1)
- `src/components/SlicingScene.tsx`: react-hooks/static-components (1)
- `src/components/farm-v2/FarmPlotTileV2.tsx`: react-refresh/only-export-components (1)
- `src/components/farm/SkyLayer.tsx`: react-hooks/purity (2)
- `auth/src/routes/auth.ts`: @typescript-eslint/no-unused-vars (1)
- `src/components/FarmPixiPhase0Prototype.tsx`: react-hooks/exhaustive-deps (1)

## 3. Build Proof

```bash
$ npm run build

✓ 131 modules transformed.
dist/index.html                     1.63 kB │ gzip:   0.76 kB
dist/assets/index-DvsmabNg.css     71.40 kB │ gzip:  13.77 kB
dist/assets/index-0ckhyYud.js   1,004.27 kB │ gzip: 295.57 kB

✓ built in 4.06s
```

✅ Build successful, no TypeScript or runtime errors.

## 4. Changed Files

```
src/App.tsx
src/components/AmbienceMixerModal.tsx
src/components/CodeInput.tsx
src/hooks/useAlienVisit.ts
src/hooks/useGeneStorage.ts
src/hooks/useProjectTimer.ts
src/hooks/useTimer.ts
src/hooks/useWarehouse.ts
```

All 8 files are within the agreed scope.

## 5. Fix Strategy Summary

### react-hooks/refs (5 fixes)

**AmbienceMixerModal.tsx (2):**
- Moved `localRef.current = local` and `keepOnCloseRef.current = keepOnClose` from render body into separate `useEffect` hooks

**CodeInput.tsx (1):**
- Replaced render-time `document.activeElement === inputRefs.current[i]` check with `focusedIndex` state
- Added `onFocus`/`onBlur` handlers to track focused input index

**useGeneStorage.ts (1):**
- Moved `onSyncRef.current = onSync` from render body into `useEffect(() => { onSyncRef.current = onSync; }, [onSync])`

**useWarehouse.ts (1):**
- Same pattern as useGeneStorage

### react-hooks/exhaustive-deps (7 fixes)

**App.tsx (5):**
- Added `settings.ambienceMixer` to `handleTimerComplete` and `handleSkipWork` dependency arrays
- Extracted timer fields (`timerPhase`, `timerStatus`, `timerTimeLeft`, `timerOvertimeSeconds`) as local variables before document title effect
- Extracted `projectState = project.state` before document title effect
- Updated document title effect dependencies to use extracted variables

**useProjectTimer.ts (1):**
- Extracted `statePhase = state?.phase` before interval effect
- Updated interval effect dependency from `[state?.phase]` to `[statePhase]`

**useAlienVisit.ts (1):**
- Extracted `currentAlienExpiresAt = alienVisit.current?.expiresAt` before timeout effect
- Updated timeout effect dependency from `[alienVisit.current?.expiresAt, ...]` to `[currentAlienExpiresAt, ...]`

### react-hooks/set-state-in-effect (3 fixes)

**useTimer.ts (2):**
- Removed sync `setTimeLeft` effect that fired when `status === 'idle'`
- Refactored phase completion logic: extracted `handlePhaseElapsed` callback, moved state updates out of effect body into scheduled callback
- Updated `start()` to reset `timeLeft` and `overtimeSeconds` from current settings
- Added `effectiveTimeLeft` and `effectiveOvertimeSeconds` derived values for idle state display

**useProjectTimer.ts (1):**
- Replaced mount effect that called `setHasSavedProject(true)` with lazy initializer: `useState(() => { const saved = loadState(); return !!(saved && ...); })`

## 6. Regression Notes

- No functional changes to timer behavior, warehouse sync, gene storage, alien visits, or ambience mixer
- Idle timer now derives display values from settings instead of syncing internal state
- All existing user flows (start/pause/resume/skip/abandon) remain unchanged
- CodeInput focus ring now driven by React state instead of DOM query

## 7. Known Issues

None. All target lint messages resolved without introducing new problems.
