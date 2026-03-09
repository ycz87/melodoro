# Issue #14 Proof

- Issue: #14 `农场手机竖屏地块下沉与底部异常绿色条带修复`
- Version: `v0.61.9`
- Core fix commit: `d704cef`
- Version bump commit: `9d98ffb`
- Branch: `feature/issue14-mobile-farm-settle`

## Problem Statement

After Issue #12, mobile portrait composition still had two visible problems:
- the 3x3 board still sat too high relative to the fence / foreground grass;
- a dark green strip appeared behind the last row on narrow portrait screens.

This round follows the stricter rule: `场景层级正确 > 九块地强行全露出`.

## Core Fix

The final fix in `src/components/farm-v2/FarmPlotBoardV2.tsx` does three focused things for the normal narrow-screen mobile branch (`useTightMobileSpacing`):

1. Move the board lower by increasing top spacing from `clamp(188px, 24vh, 214px)` to `clamp(214px, 27vh, 238px)`.
2. Increase bottom breathing room from `clamp(18px, 3vh, 28px)` to `clamp(24px, 3.8vh, 34px)`.
3. Remove the narrow-screen board shadow decor (`FarmBoardSceneDecorV2`) that was creating the green strip behind the last row, while keeping desktop / compact-shell behavior unchanged.

A small width trim from `min(calc(100% - 18px), 480px)` to `min(calc(100% - 26px), 470px)` keeps the lower framing stable after the board is pushed down.

## Proof Assets

- Baseline before fix: `artifacts/issue-14/baseline-main/`
- Final screenshots after fix: `artifacts/issue-14/after-r2/`
- Bottom-row click checks: `artifacts/issue-14/click-check/`

## Acceptance Facts

### Mobile 390x844
- Board top moved from `316.49px` to `341.75px` (`+25.26px` lower).
- Last row bottom moved from `681.38px` to `698.44px`.
- Bottom clearance remains `145.56px` (`844 - 698.44`).
- `scrollWidth === innerWidth` (`390`), so no new horizontal overflow.
- Visual result: the board sits lower in the foreground grass and the dark green strip behind the last row is cleared.

### Mobile 360x800
- Board top moved from `305.70px` to `329.64px` (`+23.94px` lower).
- Last row bottom moved from `639.93px` to `655.69px`.
- Bottom clearance remains `144.31px` (`800 - 655.69`).
- `scrollWidth === innerWidth` (`360`), so no new horizontal overflow.
- Visual result: the board settles below the fence line more naturally and the bottom green strip no longer shows as a separate band.

### Bottom-Row Clickability
- `390x844`: plot 6 `empty -> growing`, plot 8 `mature -> empty`.
- `360x800`: plot 6 `empty -> growing`, plot 8 `mature -> empty`.
- The last row remains fully clickable after the composition change.

### Desktop 1440x900 Regression Check
- Metrics are identical to baseline.
- Board top: `250.99px` (unchanged).
- Last row bottom: `879.02px` (unchanged).
- No obvious desktop regression introduced.

## Regression Note

- This change only touches the narrow-screen normal farm branch.
- Compact review shell keeps its previous behavior.
- Desktop layout remains unchanged.
- Build passes with the same pre-existing CSS/chunk warnings seen before this issue.
