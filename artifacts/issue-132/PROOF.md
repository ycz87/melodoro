# Issue #132 Proof

- Issue: #132 `农场地块页：手机端收口中景层级，解决栅栏过矮与页面显示失衡`
- Version: `v0.61.20`
- Main path: `FarmPage -> FarmPlotBoardV2`
- Core change file: `src/components/farm-v2/FarmPlotBoardV2.tsx`
- Proof harness: `artifacts/issue-132/proof-capture.mjs`

## Scope

按最新 spec 只收口手机竖屏默认主路径 `useTightMobileSpacing` 的整体页面节奏，不扩到 legacy 路径或玩法层。

本轮联调集中在：
- 窄屏 HUD 与天气 badge 的纵向节奏
- `tightBackdropMetrics` 中房子 / 小路 / 树 / 栅栏 / 前景草地的相对位置
- `sceneMinHeight`、`boardPaddingTop`、`boardPaddingBottom`
- 手机端 proof hook，补栅栏位置量测与代表性点击验证

## Code Change

### `src/components/farm-v2/FarmPlotBoardV2.tsx`
- 仅在 `useTightMobileSpacing` 命中时，重新平衡顶部 HUD、天气 badge 与棋盘之间的节奏
- 把中景元素整体重新锚定：小路 / 树 / 房子 / 栅栏上提，前景草地下沉厚一点
- 让棋盘重新落进前景草地区域，拉开 `fence -> board` 的过渡带
- 补 `farm-v2-fence` test id，便于 proof 直接量测中景厚度

### `package.json` / `package-lock.json`
- 版本号从 `0.61.19` 升到 `0.61.20`

## Visual Proof

### Required screenshots
- `artifacts/issue-132/final/farm-390x844.png`
- `artifacts/issue-132/final/farm-360x800.png`
- `artifacts/issue-132/final/farm-1440x900.png`

### Before/after reference
- Before: `artifacts/issue-132/baseline-head/farm-390x844.png`
- Before: `artifacts/issue-132/baseline-head/farm-360x800.png`
- Before: `artifacts/issue-132/baseline-head/farm-1440x900.png`
- After: `artifacts/issue-132/final/farm-390x844.png`
- After: `artifacts/issue-132/final/farm-360x800.png`
- After: `artifacts/issue-132/final/farm-1440x900.png`

## Measured Result

### `390x844`
- final `badgeToFenceGap`: `164.875`
- final `fenceToBoardGap`: `70.45208740234375`
- final `sceneScrollBottomGap`: `-8`
- full 3x3 board remains visible in `artifacts/issue-132/final/farm-390x844.png`

### `360x800`
- final `badgeToFenceGap`: `155.5`
- final `fenceToBoardGap`: `66.64013671875`
- final `sceneScrollBottomGap`: `-6`
- full 3x3 board remains visible in `artifacts/issue-132/final/farm-360x800.png`

### `1440x900`
- `boardRect.top` stays `284.986083984375`
- `boardRect.bottom` stays `906.081787109375`
- `weatherBadgeRect.top` stays `174`
- desktop framing stays aligned with the pre-change baseline

## Click Verification

Phone proof run covers 3 representative tiles on both `390x844` and `360x800`:
- left-top empty tile -> seed picker opens
- center growing tile -> growth info card opens
- right-bottom mature tile -> harvest interaction completes and slot becomes empty

Artifacts:
- `artifacts/issue-132/final/click-empty-390x844.png`
- `artifacts/issue-132/final/click-growing-390x844.png`
- `artifacts/issue-132/final/click-mature-390x844.png`
- `artifacts/issue-132/final/click-empty-360x800.png`
- `artifacts/issue-132/final/click-growing-360x800.png`
- `artifacts/issue-132/final/click-mature-360x800.png`

JSON check output:
- `artifacts/issue-132/final/farm-390x844.json`
- `artifacts/issue-132/final/farm-360x800.json`
- `artifacts/issue-132/final/farm-1440x900.json`

## Validation

Executed:

```bash
npm run lint
npm run build
node artifacts/issue-132/proof-capture.mjs artifacts/issue-132/final
```

Result:
- `npm run lint` passed
- `npm run build` passed
- proof capture completed for `390x844` / `360x800` / `1440x900`

## Notes

- `npm run build` still reports the existing Tailwind-generated CSS warning around `.rounded-[var(--radius-*)]`; this is pre-existing and did not block the build in this issue.
