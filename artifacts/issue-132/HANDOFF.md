# Issue #132 Handoff

## What changed
- `src/components/farm-v2/FarmPlotBoardV2.tsx:318` tightens the narrow-screen HUD rhythm only when `useTightMobileSpacing` is active, so the weather badge sits lower and reads as part of the whole mobile composition.
- `src/components/farm-v2/FarmPlotBoardV2.tsx:688` re-anchors the narrow-screen backdrop metrics for hills, path, trees, cottage, fence, and foreground grass, with a `farm-v2-fence` proof hook at `src/components/farm-v2/FarmPlotBoardV2.tsx:942`.
- `src/components/farm-v2/FarmPlotBoardV2.tsx:1103` rebalances `sceneMinHeight`, `boardPaddingTop`, `boardPaddingBottom`, and `hudWeatherBadgeOffset` for the mobile portrait main path.
- `package.json:4` and `package-lock.json:4` bump the app version to `0.61.20`.

## Self-check
- `npm run lint`
- `npm run build`
- `node artifacts/issue-132/proof-capture.mjs artifacts/issue-132/final`

## Proof
- Main proof: `artifacts/issue-132/PROOF.md:1`
- Final screenshots: `artifacts/issue-132/final/farm-390x844.png`, `artifacts/issue-132/final/farm-360x800.png`, `artifacts/issue-132/final/farm-1440x900.png`
- Before/after baseline: `artifacts/issue-132/baseline-head/farm-390x844.png`, `artifacts/issue-132/baseline-head/farm-360x800.png`, `artifacts/issue-132/baseline-head/farm-1440x900.png`
- Representative click checks: `artifacts/issue-132/final/click-empty-390x844.png`, `artifacts/issue-132/final/click-growing-390x844.png`, `artifacts/issue-132/final/click-mature-390x844.png`

## Result
- Commit: `6bf2e7f`
- PR: `https://github.com/ycz87/melodoro/pull/133`

## Notes
- `npm run build` still prints the existing Tailwind warning around `.rounded-[var(--radius-*)]`; this issue did not introduce a new build blocker.
