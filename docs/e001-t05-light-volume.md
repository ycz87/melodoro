# E-001-T05 地块明暗体积重建

## 本轮范围

仅调整地块顶部与侧面的明暗关系；保留 T04 轮廓与排布；未改构图、配景比例、接地阴影。

## 明暗层次原则（本轮 3+ 条）

1. **顶面高光聚焦**：顶面 `topLight -> topDark` 拉开差值，亮面用于定义受光平面，避免“糊成一片”。
2. **侧面明暗分离**：左/右侧面分别保持“主暗面 + 次暗面”梯度，右侧略亮于左侧，强化体块朝向。
3. **边缘不过黑**：边线与软边统一下压但不进死黑区，保证体积边界清晰且不生硬。
4. **状态一致性**：empty/growing/mature/withered/stolen/locked 全状态沿同一明暗逻辑，仅做色相差异，不做逻辑跳变。

## 调整位置

文件：`src/components/farm/IsometricPlotShell.tsx`

- 仅调整 `PALETTES` 中的 `top* / left* / right* / edge* / highlight`。
- 未调整几何参数（`topHeight/depth/points`），未调整地块排布（slot/gap），未改接地阴影参数（`shadow/groundTint/contactShadow`）。

## 三联对比

```bash
npm run compare:e001-t05
```

输出：`artifacts/e-001-t05/<runId>/E-001-T05-compare-{desktop|mobile|detail}.png`
