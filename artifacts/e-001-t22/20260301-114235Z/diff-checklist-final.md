# E-001-T22 Step A R6 Diff Checklist (Final)

## Scope
- Task: E-001-T22 Step A R6（继续返工，仅此步）
- Branch: `feature/e002-t01-pixi-phase0-baseline`
- Artifact run: `20260301-114235Z`

## 本轮唯一代码改动
- File: `src/components/farm-v2/FarmPlotBoardV2.tsx`
- 变更点：移动端九宫格下移位移从 `vh` 驱动改为 `vw` 驱动，避免在 360x800 移动仿真口径下被 `vh` 放大导致底部裁切。
  - before: `translateY(clamp(168px, 20vh, 184px))`
  - after:  `translateY(clamp(156px, calc(26.7vw + 63px), 170px))`

## 验收结果（按 PM 口径）
- 文件：`E-001-T22-R6-safezone-summary.json`
- `390x844`：
  - maxBottom = `829.0`
  - bottom gap = `15.0px`（满足 `4~16px`）
- `360x800`：
  - maxBottom = `781.7`
  - bottom gap = `18.3px`（`>= 0`，最下排完整可见）

## 不回退复核
- [x] R4 裁切修复与外框融合保持
- [x] R5 田地/果树/庄园位置语义保持
- [x] Step B 三类点击交互保持

## Artifact 清单
- 对比图：
  - `E-001-T22-compare-desktop.png`
  - `E-001-T22-compare-mobile.png`
- 安全区标注：
  - `E-001-T22-R6-safezone-mobile-390x844.png`
  - `E-001-T22-R6-safezone-narrow-360x800.png`
- 口径截图：
  - `E-001-T22-R6-mobile-390x844.png`
  - `E-001-T22-R6-narrow-360x800.png`
- 汇总：
  - `E-001-T22-R6-safezone-summary.json`
- 终版清单：
  - `diff-checklist-final.md`

## Validation
- `npm run build` ✅
- `npm run compare:e001-t22` ✅
