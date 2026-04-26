# Issue #139 Proof — Farm Weather 2.0

## Proof entry
- App route: `/` → Farm tab (`FarmPlotBoardV2` default path)
- Proof artifacts: `artifacts/issue-139/playwright/`

## Commands run
- `npm run lint` ✅
- `npm run build` ✅
- `npx playwright test e2e/farm-weather-life-compat.spec.ts e2e/farm-weather-badge.spec.ts e2e/farm-weather-transition.spec.ts e2e/farm-weather-visuals.spec.ts --project=desktop --project=mobile --output=artifacts/issue-139/playwright` ✅ 29 passed, 7 skipped (project-gated desktop/mobile proof tests)

## Coverage summary
- Production weather plan persists `current`, `next`, `lastChangeAt`, `nextChangeAt`, recent switch metadata, and `rainyAftermathUntil`.
- Forecast UI reads the production plan, not `debugWeatherOverride`; reload keeps the same persisted `next`.
- Catch-up advances multi-slot weather in order: old `next` becomes `current`, then the terminal slot generates a new `next`.
- Rainy aftermath/wetness uses a 60-minute lifecycle, survives reload before expiry, and is cleared after expiry.
- Debug override only changes visual `effectiveWeather`; production `weatherState` and forecast stay unchanged.
- Desktop and mobile checks confirm weather overlays remain `pointer-events-none` / do not block plot clicks.

## Screenshot/proof artifacts
- Desktop badge: `playwright/farm-weather-badge-Farm-we-eb26c-s-and-uses-zh-weather-names-desktop/desktop-farm-weather-badge.png`
- Mobile badge: `playwright/farm-weather-badge-Farm-we-38e81-a-and-uses-en-weather-names-mobile/mobile-farm-weather-badge.png`
- Desktop sunny→cloudy: `playwright/farm-weather-transition-Fa-98af8-nd-never-blocks-plot-clicks-desktop/desktop-transition-debug-cloudy.png`
- Desktop rainy→sunny: `playwright/farm-weather-transition-Fa-98af8-nd-never-blocks-plot-clicks-desktop/desktop-transition-rainy-sunny.png`
- Desktop real rotation: `playwright/farm-weather-transition-Fa-d07ac--same-scene-overlay-trigger-desktop/desktop-transition-real-rotation.png`
- Mobile sunny→cloudy: `playwright/farm-weather-transition-Fa-f587d-rd-after-transitions-settle-mobile/mobile-transition-cloudy.png`
- Mobile cloudy→rainy: `playwright/farm-weather-transition-Fa-f587d-rd-after-transitions-settle-mobile/mobile-transition-rainy.png`
- Mobile rainy→sunny: `playwright/farm-weather-transition-Fa-f587d-rd-after-transitions-settle-mobile/mobile-transition-rainy-sunny.png`
- Mobile rainbow: `playwright/farm-weather-transition-Fa-f587d-rd-after-transitions-settle-mobile/mobile-transition-rainbow.png`
- Desktop five-state visuals: `playwright/farm-weather-visuals-Farm--ad17d-hing-the-interaction-layout-desktop/desktop-{sunny,cloudy,rainy,night,rainbow}.png`
- Mobile five-state visuals: `playwright/farm-weather-visuals-Farm--8a082-ving-the-same-visual-splits-mobile/mobile-{sunny,cloudy,rainy,night,rainbow}.png`

## Notes
- Production canonical weather remains limited to `sunny / cloudy / rainy / night / rainbow`.
- Active planet climate resolution is intentionally `global` only; no collection/seed/gene/harvest inference is introduced.
