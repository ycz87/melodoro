# E-001-T20 Diff Checklist (Final)

## Scope
- Task: E-001-T20 (天空天气修正 + 地块精修 + 生机动效)
- Branch: `feature/e002-t01-pixi-phase0-baseline`
- Compare run: `20260301-025524Z`

## Implemented changes

### 1. Sun layer/position fix (P0)
- Sun is now a dedicated z-[7] element with radial gradient + glow halo (z-[6]).
- Positioned in the sky area (top ~9%) — fully above the ground/farm layers.
- Gentle float animation (`farmV2SunFloat`) + halo pulse (`farmV2SunHalo`).
- Files: `FarmPlotBoardV2.tsx`, `index.css`

### 2. Sky & background rebuilt toward reference
- Sky gradient: `#88cef2 → #a6e1f7 → #c7edf8` (top 58-62%).
- Ground gradient: `#afe39f → #99d477 → #89c760` (bottom 52-54%).
- Added distant rolling hills (two radial-gradient blobs at ~26-29%).
- Added a road/path shape (clip-path triangle) between hills and fence line.
- Fence line (repeating-linear-gradient dashes) repositioned to ~40-44%.
- House decor (left) and tree bush (right) repositioned to sit above fence.
- Cloud clusters: 3 multi-blob clouds with `farmV2CloudDrift` animation.
- File: `FarmPlotBoardV2.tsx`

### 3. Plot tile art refinement
- Outer border: `3px solid #8b5334`, `borderRadius: 20px` (was 18px).
- Background gradient warmer: `#b06f48 → #874f36`.
- Added subtle highlight strip (top-left corner, rgba white gradient).
- Inner soil: `borderRadius: 14px` (was 13px), warmer tones.
- Sub-cells: added `inset box-shadow` for subtle depth.
- File: `FarmPlotTileV2.tsx`

### 4. Sprout & melon loop animations
- Sprouts: `farmV2SproutSway` — gentle 4° rotation sway, 2.6-3.1s cycle, staggered delays per variant.
- Melons: `farmV2MelonBreath` — 4% scale + 1px lift, 4.6-5.4s cycle, staggered delays.
- Mature canopy: `farmV2CanopySwing` — 1.5° rotation, 6.6s cycle.
- All animations use `ease-in-out` for natural feel.
- File: `FarmPlotTileV2.tsx`, `index.css`

### 5. prefers-reduced-motion support
- All animated elements use `.farm-v2-motion` class.
- CSS rule: `@media (prefers-reduced-motion: reduce) { .farm-v2-motion { animation: none !important; } }`
- Degrades to fully static rendering.
- File: `index.css`

### 6. Board sizing tuned
- Desktop board width: `min(91vw, 840px)` (was 90vw/820px).
- Reduced top/bottom padding for tighter first-screen composition.
- File: `FarmPlotBoardV2.tsx`

## Acceptance check mapping (E-001-T20)
- [x] Sun layer correct: fully in sky, not behind farm tiles (desktop/mobile).
- [x] Background structure: sky gradient + clouds + distant hills + fence + ground layers.
- [x] Plot tile refinement: warmer colors, larger radius, highlight, inner shadow.
- [x] Loop animations: sprout sway, melon breath, canopy swing, cloud drift, sun float.
- [x] prefers-reduced-motion: `.farm-v2-motion { animation: none }` fallback.
- [x] Entry route unchanged: Farm → Plots defaults to V2.

## Artifacts
- `E-001-T20-current-desktop.png`
- `E-001-T20-current-mobile.png`
- `E-001-T20-compare-desktop.png`
- `E-001-T20-compare-mobile.png`
- `E-001-T20-motion-desktop.webm`
- `E-001-T20-motion-mobile.webm`
- `E-001-T20-summary.json`
- `E-001-T20-motion-summary.json`

## Validation
- `npm run build` ✅
- `npm run compare:e001-t20` ✅
- `npm run capture:e001-t20-motion` ✅
