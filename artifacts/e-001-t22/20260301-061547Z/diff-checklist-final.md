# E-001-T22 Step B Diff Checklist (Final)

## Scope
- Task: E-001-T22 Step B（仅恢复三类点击交互）
- Branch: `feature/e002-t01-pixi-phase0-baseline`
- Artifact run: `20260301-061547Z`

## 交互恢复结果

### 1) 空地点击 -> 种植流程可用
- 在 V2 地块上点击 `empty` 状态：
  - 有种子时打开 `PlantModal`
  - 选择种子后可成功种下（地块进入生长状态）
  - 无种子时保持跳转瓜棚逻辑
- 代码位置：
  - `src/components/FarmPage.tsx`（`onPlotClick` empty 分支）
  - `src/components/farm-v2/FarmPlotBoardV2.tsx`
  - `src/components/farm-v2/FarmPlotTileV2.tsx`

### 2) 生长中点击 -> 阶段 + 进度 + 累计分钟可查看（实时刷新）
- 点击 `growing` 状态地块后展示生长信息面板：
  - 当前阶段 `t.farmStage(...)`
  - 当前进度百分比
  - 累计分钟 / 成熟所需分钟 `t.farmGrowthTime(...)`
  -（有追踪器时）展示追踪器状态
  -（进度较早期）展示专注加速提示
- 面板依赖 `nowTimestamp` 每秒刷新，实现显示层实时更新。
- 代码位置：`src/components/FarmPage.tsx`

### 3) 成熟点击 -> 点击即可收获
- 点击 `mature` 状态地块直接触发 `handleHarvest(plotId)`
- 收获动效与结果链路保持复用现有逻辑（HarvestOverlay + 收获结果入账）
- 代码位置：`src/components/FarmPage.tsx`

## 兼容与可用性
- V2 tile 增加键盘可达性：`role="button"` + `tabIndex` + `Enter/Space` 触发点击。
- desktop/mobile 双端均通过录屏验证三类点击链路。

## 不回退项复核
- [x] 连续山丘带视觉保持（Step A R2）
- [x] 地块下方留白收敛保持（Step A R2）
- [x] 底部重复业务入口条继续移除
- [x] 作物放大精修保持

## Artifact 清单
- 对比图：
  - `E-001-T22-compare-desktop.png`
  - `E-001-T22-compare-mobile.png`
- 交互录屏：
  - `E-001-T22-step-b-interaction-desktop.webm`
  - `E-001-T22-step-b-interaction-mobile.webm`
- 录屏摘要：
  - `E-001-T22-step-b-interaction-summary.json`
- 终版清单：
  - `diff-checklist-final.md`

## Validation
- `npm run build` ✅
- `npm run compare:e001-t22` ✅
- `npm run capture:e001-t22-interactions -- --output-dir=.../20260301-061547Z` ✅
