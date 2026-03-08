# Issue #10 Proof

- Issue: #10 `农场手机竖屏底部遮挡修复`
- Version: `v0.61.7`
- Core fix commit hash: `8f02bc3`
- Version-bump commit hash: `724e17c`
- Proof metadata sync commit hash: `a07bbf1`
- Branch: `feature/issue10-mobile-bottom-occlusion`
- PR: #11

## Core fix

- Removed the extra `transform: translateY(clamp(156px, calc(26.7vw + 63px), 170px))` from the normal mobile `useTightMobileSpacing` branch in `src/components/farm-v2/FarmPlotBoardV2.tsx`.
- This stops the whole 3x3 farm board from being pushed down into the bottom green foreground area on narrow portrait screens.

## Proof assets

- Baseline review-shell screenshots: `artifacts/issue-10/baseline/`
- Normal farm-shell screenshots after fix: `artifacts/issue-10/normal-shell-baseline/`
- Bottom-row click checks: `artifacts/issue-10/click-check/`

## Acceptance facts

- `390x844`: all 9 plots are fully visible in the first screen.
- `360x800`: all 9 plots are fully visible in the first screen.
- Bottom green foreground no longer covers the last row.
- Bottom-row interactions were rechecked:
  - plot 6 empty -> plant modal opens and planting succeeds
  - plot 7 growing -> growth info card opens
  - plot 8 mature -> harvest succeeds and plot returns to empty
- No new horizontal overflow: `scrollWidth === innerWidth` in the verified mobile proofs.
- Desktop regression snapshot was rechecked at `1440x900`.

## Regression note

- This rework only adds the required version bump and delivery-proof metadata for acceptance completeness.
- App version is now `v0.61.7`.
- This proof explicitly records the delivery-relevant commit hashes for Issue #10: core fix `8f02bc3`, version bump `724e17c`, and proof metadata sync `a07bbf1`.
- Current PR head commit is maintained in the PR description, so the proof document stays truthful even when the proof file itself needs a follow-up edit.
