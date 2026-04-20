# Issue #121 Proof

## Scope
- Default `FarmPlotBoardV2` V2 main scene only
- Trigger source stays at the incoming `weather` prop, no data-chain or truth-source changes
- No HUD, weather badge, board matrix, or plot interaction layout changes
- Transition stays lightweight: previous-weather overlay fade only, no new particle system or full-screen effect

## Trigger Contract
- `src/components/farm-v2/FarmPlotBoardV2.tsx` now treats post-mount `weather` changes as the only transition trigger
- First render does not create an overlay
- Each change keeps only one previous-weather overlay, resets the transition token on rapid switch, and clears after the fade window closes
- Scene test hooks now expose `data-transition-active`, `data-last-transition-from`, `data-last-transition-to`, `data-last-transition-token`, `data-last-transition-mounted-token`, and `data-last-transition-cleared-token`

## Motion + Layering
- Fade duration is `WEATHER_TRANSITION_MS = 320`
- Overlay cleanup runs after `320ms + 40ms` guard time
- Overlay lives inside `farm-v2-scene`, above `FarmBackdropV2`, below HUD / board, and remains `pointer-events-none`
- Previous-weather visuals reuse `FarmBackdropV2` under a dedicated `farm-v2-weather-transition-overlay` test id

## Code Entry
- `src/components/farm-v2/FarmPlotBoardV2.tsx`
- `e2e/farm-weather-transition.spec.ts`
- `e2e/farm-weather-badge.spec.ts`
- `e2e/farm-weather-visuals.spec.ts`

## Verification
- `npm run build`
- `npx playwright test e2e/farm-weather-transition.spec.ts --project=desktop --timeout=60000`
- `npx playwright test e2e/farm-weather-transition.spec.ts --project=mobile --timeout=60000`
- `npx playwright test e2e/farm-weather-badge.spec.ts e2e/farm-weather-visuals.spec.ts --project=desktop --timeout=60000`
- `npx playwright test e2e/farm-weather-badge.spec.ts e2e/farm-weather-visuals.spec.ts --project=mobile --timeout=60000`

## Desktop Acceptance
- Debug `切换天气` and `清除天气` both drive the same scene transition metadata and overlay lifecycle
- Rapid switch keeps a single transition token instead of stacking overlays
- Plot click still opens the seed modal while a transition is active, so the overlay does not intercept interaction
- Real production weather rotation also emits the same transition metadata and lands on the expected next weather scene

## Mobile Acceptance
- After rainy and rainbow transitions settle, weather decor still stays above the first row of plots
- Badge remains above the board and the board keeps its original interaction area
- Existing weather split proof still differentiates sunny / cloudy / rainy / night / rainbow on mobile without pushing the board down

## Notes
- `farm-v2-weather-transition-overlay` keeps backdrop-only visuals, so plot tiles and HUD stay untouched during fade
- Backdrop test ids now support a transition-specific prefix to avoid duplicate selector collisions during proof runs
- Weather badge / visuals suites now use the current farm-entry locator and a larger per-suite timeout budget for screenshot-based proof runs

## Version Gate
- `package.json` version: `0.61.18`
- `package-lock.json` top-level version: `0.61.18`
- `package-lock.json` root package (`packages[""]`) version: `0.61.18`
- Build verification: `npm run build` prints `pomodoro@0.61.18 build`
