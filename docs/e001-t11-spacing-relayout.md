# E-001-T11 地块间距与落位返工

## 参数前后对照

文件：`src/components/farm/SimpleFarmGrid.tsx`

### 1) 地块整体继续下移（相对 `a991648`）
- `sceneTopPadding`
  - compact mobile: `2.42x -> 2.60x`
  - mobile: `2.44x -> 2.64x`
  - desktop/tablet: `2.24x -> 2.42x`
- `sceneBottomPadding`
  - compact mobile: `0.56x -> 0.50x`
  - mobile: `0.54x -> 0.48x`
  - desktop/tablet: `0.48x -> 0.42x`

### 2) 地块间距继续压缩（更密）
- `gap`
  - compact mobile: `3 -> 2`
  - mobile: `4 -> 3`
  - tablet: `7 -> 6`
  - desktop: `9 -> 8`

### 3) 地块群排布继续内聚（相对 `a991648`）
- slot `xOffset`
  - row2: `±16 -> ±18`
  - row4: `±26 -> ±30`
- slot `yOffset`
  - row2: `-10 -> -12`
  - row3: `-18 -> -22`
  - row4: `-30 -> -36`
  - row5: `-40 -> -48`

### 4) 验收口径改为 7 块地
- 对比生成脚本在 `E-001-T11` 下以 `plotCount=7` 注入，避免 4+3 锁定口径。

> 结果：7 块地整体进一步下沉，稳定位于山体下方；横纵间距较 `a991648` 继续收紧，视觉更密且不重叠。

## 版本号证明

- `package.json` 版本：`0.60.2`
- `CHANGELOG.md` 已新增 `0.60.2` 记录

## 产物

- 三联对比：`artifacts/e-001-t11/20260224-235833Z/E-001-T11-compare-{desktop|mobile|detail}.png`
- detail 放大（含标注）：`artifacts/e-001-t11/20260224-235833Z/E-001-T11-zoom-detail-annotated.png`
