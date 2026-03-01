# E-001-T22 Step A R3 Diff Checklist (Final)

## Scope
- Task: E-001-T22 Step A R3（仅本步返工）
- Branch: `feature/e002-t01-pixi-phase0-baseline`
- Artifact run: `20260301-082508Z`

## 本轮修正目标与结果

### 1) 移动端底部留白压缩（最后一行地块 -> 底部信息卡）
- 修正前：gap 约 76.9px（未达阈值 32px）
- 修正后：gap 约 **6.1px**（达标，<=32px）
- 量测口径：390x844 视口，取最后一行地块底边与 `farm-v2-growth-info-card` 上缘差值
- 量测文件：
  - `E-001-T22-mobile-gap-summary.json`
  - `E-001-T22-mobile-gap-annotation.png`

### 2) 实施策略
- 农场主场景容器在 V2 非 compact 且移动端使用紧凑流布局（`flex-none sm:flex-1`），避免地块区下方被 flex 拉出大块空白。
- 保持 V2 背景三层和山丘带视觉结构不回退。

## 不回退复核
- [x] Step A R2 背景三层/连续山丘带保留
- [x] 底部重复业务入口条保持移除
- [x] 作物放大精修保持
- [x] Step B 三类点击交互保持可用（空地种植 / 生长中查看进度 / 成熟收获）

## Artifact 清单
- 移动端留白标注：
  - `E-001-T22-mobile-gap-annotation.png`
  - `E-001-T22-mobile-gap-summary.json`
- 对比图：
  - `E-001-T22-compare-mobile.png`
  - `E-001-T22-compare-desktop.png`
- 交互录屏（保留 Step B 不回退佐证）：
  - `E-001-T22-step-b-interaction-mobile.webm`
  - `E-001-T22-step-b-interaction-desktop.webm`
- 终版清单：
  - `diff-checklist-final.md`

## Validation
- `npm run build` ✅
- `npm run compare:e001-t22` ✅
- `npm run capture:e001-t22-interactions -- --output-dir=.../20260301-082508Z` ✅
