# E-001-T22 Step A R5 Diff Checklist (Final)

## Scope
- Task: E-001-T22 Step A R5（仅位置校准）
- Branch: `feature/e002-t01-pixi-phase0-baseline`
- Artifact run: `20260301-100759Z`

## 本轮修正（只改位置，不改已通过项）

### 1) 田地区整体锚点位置重排
- 上移田地区整体锚点，使其与山丘带的上下关系更接近参考图语义（田地作为中下景主体，贴近山丘前景）。
- 影响：`FarmPlotBoardV2` 的 `paddingTop`（desktop + mobile 同步校准）。

### 2) 果树与庄园小屋位置关系校准
- 调整为“左树 - 小屋 - 田地中心 - 右树”的稳定左右关系，并统一提升到山丘带前缘位置，减少漂浮/偏移感。
- desktop/mobile 均生效。
- 位置标注校验（summary 通过）：
  - `cottageLeftOfBoardCenter=true`
  - `cottageAboveBoardCenter=true`
  - `leftTreeLeftOfCottage=true`
  - `rightTreeRightOfBoardCenter=true`

### 3) desktop + mobile 双端校准
- 位置标注图：
  - `E-001-T22-R5-position-annotation-desktop.png`
  - `E-001-T22-R5-position-annotation-mobile.png`
- 汇总：`E-001-T22-R5-position-summary.json`

## 不回退复核
- [x] Step A R4 裁切修复（底部/左右安全区）保持
- [x] Step A R4 外框融合保持
- [x] Step B 三类点击交互保持

## Artifact 清单
- 对比图：
  - `E-001-T22-compare-desktop.png`
  - `E-001-T22-compare-mobile.png`
- 位置标注图：
  - `E-001-T22-R5-position-annotation-desktop.png`
  - `E-001-T22-R5-position-annotation-mobile.png`
- 位置汇总：
  - `E-001-T22-R5-position-summary.json`
- 终版清单：
  - `diff-checklist-final.md`

## Validation
- `npm run build` ✅
- `npm run compare:e001-t22` ✅
- `npm run capture:e001-t22-interactions -- --output-dir=.../20260301-100759Z` ✅
