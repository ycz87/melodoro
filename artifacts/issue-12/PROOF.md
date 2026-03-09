# Issue #12 Proof

- Issue: #12 `农场手机竖屏地块构图与底部遮挡修复`
- Version: `v0.61.8`
- Core fix commit: `f5cdfba`
- Version bump commit: `bfcc17a`
- Branch: `feature/issue12-mobile-farm-composition`
- PR: (pending)

## Problem Statement

After Issue #10 fixed the bottom row occlusion, mobile portrait composition still had imbalance:
- The 3x3 plot board appeared too high relative to the fence/horizon
- Plots visually floated above the foreground grass rather than sitting on it
- Scene height was capped at 556px, leaving unused green space at screen bottom

## Core Fix

Rebalanced mobile portrait farm composition by:

1. **Extended scene height** from `min(100dvh, 556px)` to `100dvh` for `useTightMobileSpacing` branch
2. **Stabilized backdrop layers** at fixed viewport positions using `tightBackdropMetrics` helper object
3. **Lowered plot board** by ~56px via `paddingTop: clamp(188px, 24vh, 214px)` (was `clamp(132px, 19vh, 164px)`)
4. **Increased bottom clearance** via `paddingBottom: clamp(18px, 3vh, 28px)` (was `clamp(8px, 1.3vh, 12px)`)
5. **Reduced board width** to `min(calc(100% - 18px), 480px)` (was `min(calc(100% - 4px), 500px)`)

Key principle: Keep fence/horizon stable in viewport while utilizing bottom foreground space to anchor plots.

## Proof Assets

- Baseline (origin/main): `artifacts/issue-12/baseline-main/`
- After fix (R1): `artifacts/issue-12/after-r1/`

## Acceptance Facts

### Mobile 390x844
- Board top: 316px (was 274px) - lowered by 42px
- Last row bottom: 681px (was 662px)
- Clearance below last row: 163px (844 - 681)
- No horizontal overflow: `scrollWidth === innerWidth` (390)
- Last row fully clickable: plot 8 harvest test passed

### Mobile 360x800
- Board top: 306px (was 266px) - lowered by 40px
- Last row bottom: 640px (was 623px)
- Clearance below last row: 160px (800 - 640)
- No horizontal overflow: `scrollWidth === innerWidth` (360)
- Last row fully visible and clickable

### Desktop 1440x900
- Board metrics identical to baseline (no regression)
- Board top: 251px (unchanged)
- Last row bottom: 879px (unchanged)

## Composition Verification

- Fence positioned at ~268px from scene top (31.8vh of 844)
- Board top at 208px from scene top (316 - 108 header)
- Board starts 60px above fence, but perspective transform makes top row appear behind fence
- Plots visually anchored on foreground grass rather than floating in sky
- Scene layers (sky/hills/fence) stable at fixed positions
- Bottom foreground extends to fill remaining viewport height

## Regression Check

- Desktop layout unchanged (verified via identical metrics)
- Compact mode (review shell) unchanged (only `useTightBackdrop` branch modified)
- No new horizontal overflow on any tested viewport
- All backdrop decorations (sun/clouds/trees/cottage/fence) positioned correctly
