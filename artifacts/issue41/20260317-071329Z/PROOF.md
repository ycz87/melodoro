# Issue #41 Review Rework Proof — Milestone Ledger i18n

## Rework Goal

Fix reviewer blocker on PR #42: the milestone reward ledger in `src/components/CollectionPage.tsx` had hard-coded Chinese strings, causing a visible regression when switching to English / Japanese / other supported locales.

## What Was Fixed

- Ledger title now uses i18n: `collectionMilestoneRewardsTitle`
- Plot reward label now reuses localized `marketPlotName()`
- Five-element reward label now reuses localized `geneFiveElementTitle`
- Theme / ambience reward labels now use dedicated i18n keys
- Reward status text now uses i18n for:
  - granted
  - backfilled
  - not earned
  - content pending
- Added locale coverage in all 9 supported locales:
  - `zh`
  - `zhTW`
  - `en`
  - `ja`
  - `ko`
  - `es`
  - `fr`
  - `de`
  - `ru`

## Verification

### `npm run lint`

Passed.

### `npm run build`

Passed.

Known existing warnings only:
- Vite CSS warning for `rounded-[var(--radius-*)]`
- bundle chunk size warning

### `git diff --check`

Passed (clean).

## UI Proof

Browser verification with `language = 'en'` and a seeded milestone reward ledger:

```json
{
  "hasTitle": true,
  "hasBackfilled": true,
  "hasFocusTheme": true,
  "hasCosmicWhiteNoise": true,
  "hasChineseLedger": false
}
```

Meaning:
- ledger title renders as `Milestone Rewards`
- backfill status renders as `Backfilled`
- reward names like `Focus Theme` and `Cosmic White Noise` are localized
- the old Chinese title `里程碑奖励` no longer leaks into the English UI

## Screenshot

- `ledger-en-mobile-390x844.jpg`
