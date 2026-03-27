# Mobile Regression Note (Issue #3 Composition)

- Compared Issue #4 code changes in working tree.
- Changed tracked file: `src/App.tsx`
- Farm mobile composition files from Issue #3 remain untouched in this task:
  - `src/components/farm-v2/FarmPlotBoardV2.tsx`
  - `src/components/farm/SimpleFarmGrid.tsx`
  - `src/components/farm/FarmDecorations.tsx`
  - `src/components/farm/IsometricPlotShell.tsx`

Conclusion:
- No layout/CSS edits were introduced to the `390x844` / `360x800` farm first-screen composition paths.
- Issue #4 patch is logic-only (`src/App.tsx`) and does not modify mobile scene composition code.
