# Issue #6 Regression Note

## 本轮修复
- 修复收获时瓜币未正确联动的问题：现在每次收获都会按品种售价结算瓜币，变异体按 3x 售价结算。

## 浏览器侧人工验收结论
- **收获联动**：已通过。
  - 修复后在浏览器里实际验证：瓜币 `20 -> 28`，成熟地块回到 `empty`，成熟计数 `4 -> 3`。
  - 说明收获结果与顶部状态、collection、瓜币结算已经联动正确。
- **刷新恢复**：已通过。
  - growing 中地块刷新后仍保留 `state / varietyId / seedQuality / plantedDate / lastUpdateDate / progress`。
- **无种子边界**：已通过。
  - 打开种植弹窗后，三个种子按钮均显示 `×0` 且禁用，不会产生错误种植状态。
- **移动端回归**：已通过 smoke check。
  - `390x844` 首屏未回退 Issue #3 已通过的农场构图。
- **锁定地块口径**：当前产品形态下，农场页仅渲染已解锁地块；地块锁定入口在 `MarketPage` 的 Plot Expansion 卡片中处理，不在农场页直接渲染 locked shell。本轮未扩展新交互形态，只保持现有口径不回退。

## Proof 文件
- `harvest-before.png`
- `harvest-after.png`
- `refresh-before.png`
- `refresh-after.png`
- `no-seed-modal.png`
- `mobile-390x844-regression.png`
