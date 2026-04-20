# Issue #122 Proof

## Scope
- Clarify the default `FarmPage -> FarmPlotBoardV2` weather E2E truth source only
- Keep the existing Playwright `preview + desktop/mobile` foundation, without adding a new screenshot matrix
- Retire old sky-layer acceptance semantics and separate compatibility coverage from main-path proof
- Preserve the unrelated normal-seed icon regression under a non-weather suite

## Canonical Main-Path Weather Suites
- `e2e/farm-weather-badge.spec.ts`
- `e2e/farm-weather-visuals.spec.ts`
- `e2e/farm-weather-transition.spec.ts`

## Old Suite Disposition
- Deleted `e2e/farm-sky-layer.spec.ts`
  - Reason: it still depended on old sky-layer selectors, legacy `.farm-grid-perspective`, and the non-canonical `stormy` weather truth
  - Its only still-useful interaction assertion, weather layers not blocking clicks, already lives in `e2e/farm-weather-transition.spec.ts`
- Renamed `e2e/phase6-step3-weather-life.spec.ts` -> `e2e/farm-weather-life-compat.spec.ts`
  - Reason: the file still has value for `weatherState`, `weatherDebugOverride`, `creatures`, and `alienVisit` migration/storage repair
  - It no longer represents default main-path weather acceptance, only compatibility / migration / storage coverage
- Added `e2e/farm-seed-ui.spec.ts`
  - Reason: move the old `🌱` normal-seed icon assertion out of the retired weather suite into a dedicated non-weather regression test

## Assertion Split
- Main-path E2E must keep:
  - weather badge icon + localized name sync
  - five canonical V2 weather visual splits (`sunny / cloudy / rainy / night / rainbow`)
  - debug switch and production rotation using the same V2 scene transition hooks
  - weather decor / transition layers not blocking plot clicks or overlapping the board on mobile
- Compatibility coverage keeps:
  - `weatherState` initialization and canonical repair
  - legacy weather migration (`snowy`, malformed timestamps, invalid values)
  - rainbow gate rotation rules and debug override separation
  - `creatures` / `alienVisit` storage schema sanity
- Non-weather UI regression keeps:
  - `🌱` normal-seed icon in the current V2 HUD + plant picker flow

## Docs Synced
- `CHANGELOG.md`
- `DEVLOG.md`
- `artifacts/issue-122/PROOF.md`

## Verification
- `npm run build`
- `npx playwright test e2e/farm-weather-badge.spec.ts e2e/farm-weather-visuals.spec.ts e2e/farm-weather-transition.spec.ts --project=desktop --timeout=60000`
- `npx playwright test e2e/farm-weather-badge.spec.ts e2e/farm-weather-visuals.spec.ts e2e/farm-weather-transition.spec.ts --project=mobile --timeout=60000`
- `npx playwright test e2e/farm-weather-life-compat.spec.ts --project=desktop --timeout=60000`
- `npx playwright test e2e/farm-seed-ui.spec.ts --project=desktop --timeout=60000`

## Stability + Cost Boundary
- The existing suite-local `60s` timeout remains enough for screenshot-based weather proof; no global Playwright timeout change is needed
- `desktop` + `mobile` stay the canonical proof targets for main-path weather; `mobile-wide` is intentionally left out of the minimum gate
- Compatibility and seed-icon checks stay on `desktop` only to avoid unnecessary duplicate cost

## Observed Results
- `npm run build` passed and printed `pomodoro@0.61.19 build`
- `desktop`: 13 passed, 3 skipped for canonical/compat/seed suites (`farm-weather-badge`, `farm-weather-visuals`, `farm-weather-transition`, `farm-weather-life-compat`, `farm-seed-ui`)
- `mobile`: 3 passed, 4 skipped for the canonical weather suites

## Version Gate
- `package.json` version: `0.61.19`
- `package-lock.json` top-level version: `0.61.19`
- `package-lock.json` root package (`packages[""]`) version: `0.61.19`
