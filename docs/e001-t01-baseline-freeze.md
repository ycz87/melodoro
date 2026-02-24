# E-001-T01 Baseline Freeze

## Scope Lock
- Task: E-001-T01
- In scope: reference lock, viewport lock, anchor lock, baseline screenshots
- Out of scope: all visual optimization (color, lighting, decoration ratio, shadows)

## Main Reference
- Locked reference image: `/home/ycz87/.openclaw/workspace-coder/cosmelon/farm-plot-reference.jpg`
- Source resolution: `858 x 1280`

## Viewport Baseline (Fixed)
All baseline screenshots use `cover` crop on the locked reference image.

| Viewport | Resolution | Camera (object-position) | Crop params (resized/crop) | Output |
| --- | --- | --- | --- | --- |
| desktop | 1366 x 768 | x=50.00%, y=50.65% | resized=1366x2038, left=0, top=648 | `/home/ycz87/.openclaw/workspace-coder/cosmelon/baseline/e001-t01/e001-t01-baseline-desktop.png` |
| mobile | 390 x 640 | x=50.00%, y=56.00% | resized=429x640, left=20, top=0 | `/home/ycz87/.openclaw/workspace-coder/cosmelon/baseline/e001-t01/e001-t01-baseline-mobile.png` |
| detail | 1024 x 1024 | x=50.00%, y=56.00% | resized=1024x1528, left=0, top=344 | `/home/ycz87/.openclaw/workspace-coder/cosmelon/baseline/e001-t01/e001-t01-baseline-detail.png` |

## Anchor Baseline (5 points)
Canonical anchor coordinates are fixed on the source reference image:

| ID | Anchor | Source px (x, y) | Source normalized |
| --- | --- | --- | --- |
| A1 | 太阳 (sun) | (120, 434) | (14.00%, 33.91%) |
| A2 | 主云 (main cloud) | (480, 451) | (56.00%, 35.25%) |
| A3 | 左房屋 (left house) | (146, 837) | (17.00%, 65.40%) |
| A4 | 右谷仓 (right barn) | (721, 837) | (84.00%, 65.40%) |
| A5 | 地块群中心 (plot cluster center) | (429, 889) | (50.00%, 69.42%) |

Anchor coordinates mapped to each baseline viewport:

| Anchor | Desktop (1366x768) | Mobile (390x640) | Detail (1024x1024) |
| --- | --- | --- | --- |
| A1 太阳 | (191, 43) | (40, 217) | (143, 174) |
| A2 主云 | (765, 70) | (220, 226) | (573, 195) |
| A3 左房屋 | (232, 685) | (53, 419) | (174, 655) |
| A4 右谷仓 | (1147, 685) | (340, 419) | (860, 655) |
| A5 地块群中心 | (683, 767) | (195, 444) | (512, 717) |

## Reproduce
Run the baseline generator:

```bash
cd /home/ycz87/.openclaw/workspace-coder/cosmelon
node scripts/e001-t01-freeze-baseline.mjs
```

Artifacts:
- Screenshots: `/home/ycz87/.openclaw/workspace-coder/cosmelon/baseline/e001-t01/`
- Metadata: `/home/ycz87/.openclaw/workspace-coder/cosmelon/baseline/e001-t01/capture-metadata.json`
