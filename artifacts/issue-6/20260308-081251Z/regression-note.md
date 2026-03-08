# Issue #6 Re-review Note

## 修复点
- 将 `handleFarmHarvest` 收回到产品既有口径：**仅 `result.isNew` 时发首次收获奖励**。
- 重复收获继续保留：图鉴 count 增加、地块回空、片段联动；**不在 harvest 阶段自动结算 sellPrice**。

## 人工复核结论（浏览器直连验证）
- **首次收获奖励：通过**
  - 初始：`瓜币 20`，`collection=[]`，`plot0=mature(jade-stripe)`
  - 收获后：`瓜币 28`，`plot0=empty`，`collectionCount=1`
- **重复收获不自动卖出：通过**
  - 初始：`瓜币 20`，`collection[jade-stripe].count = 1`，`plot0=mature(jade-stripe)`
  - 收获后：`瓜币 20`，`plot0=empty`，`collection[jade-stripe].count = 2`
- **刷新恢复：通过**
  - `growing` 地块刷新后仍保留 `state / varietyId / progress / plantedDate / lastUpdateDate`
- **无种子边界：通过**
  - 种植弹窗中三类种子均显示 `×0` 且按钮禁用
- **移动端回归：通过 smoke check**
  - `390x844` 首屏构图未回退 Issue #3 基线

## 口径说明
- 项目当前经济闭环仍然是：
  1. **首次收获奖励**（新品种首次收获时，额外获得等额 sellPrice）
  2. **商城卖瓜**（图鉴 count-1 → 瓜币 +sellPrice）
- 本轮未改成“收获即自动卖出”，因此不会再出现双重结算。
