# Issue #6 Rework Note — no-seed empty plot behavior

## PM 返工点
- 无种子时点击空地，之前会直接跳转到瓜棚页面。
- 预期应改为：弹出种植弹窗，并明确显示三类种子均为 `×0` 且 `disabled`。
- 已通过内容不得回退：
  - 首次收获奖励
  - 重复收获不自动卖出
  - 刷新后状态保留

## 本轮修复
- `src/components/FarmPage.tsx`
  - `FarmPlotBoardV2.onPlotClick(empty)`：移除 `else onGoWarehouse()`，统一改为 `setPlantingPlotId(plotId)`
  - `SimpleFarmGrid.onPlant`：同样移除无种子时跳瓜棚分支，统一打开 PlantModal

## 复验结果
- 在全空地 + 三类种子均为 0 的状态下，点击空地：
  - 不再跳转瓜棚
  - 正常弹出种植弹窗
  - `Normal / Epic / Legendary` 三个按钮均显示 `×0`
  - 三个按钮均为 `disabled`
- 其余已通过口径未改动：
  - `handleFarmHarvest` 仍是仅 `result.isNew` 发首次奖励
  - growing 地块刷新恢复逻辑未修改

## Proof
- `no-seed-modal-fix.png`
