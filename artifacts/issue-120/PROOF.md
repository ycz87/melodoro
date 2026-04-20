# Issue #120 Proof

## Scope
- Default `FarmPlotBoardV2` main scene only
- No legacy path changes
- No weather state/data-chain changes
- No HUD / `boardPaddingTop` / `hudWeatherBadgeOffset` / plot-matrix size changes

## Code Entry
- `src/components/farm-v2/FarmPlotBoardV2.tsx`
- `e2e/farm-weather-visuals.spec.ts`

## Verification
- `npm run lint`
- `npm run build`
- `npx playwright test e2e/farm-weather-visuals.spec.ts --project=desktop --project=mobile`

## Desktop Acceptance
- `desktop-sunny.png`, `desktop-cloudy.png`, `desktop-rainy.png`, `desktop-night.png`, `desktop-rainbow.png`
- `sunny -> cloudy`: sky shifts from bright warm blue to cooler gray-blue, cloud count increases, sun/halo intensity drops
- `cloudy -> rainy`: sky and ground mute further, cloud mass thickens again, rain layers appear in the backdrop only, sun/halo weakens to a faint through-cloud read
- `sunny -> rainbow`: keeps a bright day base, but adds a post-rain pastel sky treatment, extra cloud polish, and a visible rainbow body

## Mobile Acceptance
- `mobile-sunny.png`, `mobile-cloudy.png`, `mobile-rainy.png`, `mobile-night.png`, `mobile-rainbow.png`
- Rain layers and rainbow both stay above the first row of plots under narrow-screen `useTightBackdrop`
- Weather decor stays inside the non-interactive backdrop layer and does not push the board or weather badge downward

## Notes
- Weather visuals still consume the existing `weather` prop only
- Rain and rainbow live under the backdrop `pointer-events-none` layer, so plot click / plant / harvest behavior is unchanged
