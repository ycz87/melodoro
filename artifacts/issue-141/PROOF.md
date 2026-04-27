# Issue #141 Proof — Farm weather realism + local time day/night

## Environment
- Worktree: `/home/ycz87/projects/cosmelonclock/.worktrees/issue-141`
- Branch: `feature/issue-141`
- Baseline: `origin/main=fd00e286b44f818ab907992bc5d3241b1206be3a`
- Version: `0.61.24`

## Proof entry points
- UI: open app → Farm tab (`[data-testid="farm-v2-scene"]`, `[data-testid="farm-plot-board-v2"]`).
- Debug hooks: `weatherDebugOverride` controls only effective weather; `debugTimeOfDayOverride` controls only effective day/night.
- Production storage: `weatherState.current` / `weatherState.next` remain `sunny | cloudy | rainy | rainbow` only.

## Commands run
- `npm run lint` ✅
- `npm run build` ✅
  - Existing build warnings only: generated CSS `.rounded-[var(--radius-*)]` parse warning and Rollup chunk-size warning.
- `npx playwright test e2e/farm-weather-life-compat.spec.ts e2e/farm-weather-badge.spec.ts e2e/farm-weather-transition.spec.ts e2e/farm-weather-visuals.spec.ts --project=desktop --project=mobile --reporter=line` ✅
  - Result: 37 passed, 7 skipped (project-specific proof cases skip on the opposite project).
- `git diff --check` ✅

## Coverage notes
- Production weather init / roll / rotate / catch-up no longer produce `night`.
- Legacy `weatherState.current/next/previousWeather === 'night'` migrates to safe production weather / `null`.
- Legacy `debugWeatherOverride === 'night'` migrates to `debugTimeOfDayOverride === 'night'`, while `weatherDebugOverride` becomes `null`.
- Local time day/night uses local 06:00/18:00 boundaries and updates while the app stays open across 18:00 without Farm V2 layout jump.
- HUD/badge exposes production current, production next, effective weather, timeOfDay, debug weather override, and debug time-of-day override data attrs.
- Forecast shows only next production weather; E2E asserts it does not show “夜晚”.
- Weather/timeOfDay/rain layers remain pointer-transparent; E2E verifies plot click path under rain/overlay.
- Mobile proof asserts no horizontal overflow.

## Screenshot artifacts
Stored under `artifacts/issue-141/screenshots/`:

### Desktop scene states
- `desktop-day-sunny.png`
- `desktop-day-rainy.png`
- `desktop-night-sunny.png`
- `desktop-night-rainy.png`
- `desktop-day-rainbow-aftermath.png`
- `desktop-night-moonbow-aftermath.png`

### Mobile scene states
- `mobile-day-sunny.png`
- `mobile-day-rainy.png`
- `mobile-night-sunny.png`
- `mobile-night-rainy.png`
- `mobile-day-rainbow-aftermath.png`
- `mobile-night-moonbow-aftermath.png`

### Additional automation screenshots
- `desktop-farm-weather-badge.png`
- `mobile-farm-weather-badge.png`
- `desktop-transition-debug-cloudy.png`
- `desktop-transition-rainy-sunny.png`
- `desktop-transition-real-rotation.png`
- `mobile-transition-cloudy.png`
- `mobile-transition-rainy.png`
- `mobile-transition-rainy-sunny.png`
- `mobile-transition-rainbow.png`
- `mobile-transition-moonbow.png`
