# Issue #45 Proof

## Scope
- Add `Current Owned (entities)` to the dex detail modal.
- Keep `Current Owned` and `Total Harvests` on separate source-of-truth paths.
- Make the detail modal read current owned quantity from real collection inventory, including split normal/mutant entries for the same variety.
- Preserve the existing cumulative harvest semantics from Issue #43.

## Validation
- `npm run build` -> pass
- `git diff --check` -> pass
- `npm run lint` -> fail due existing repo-wide lint issue in `android/app/build/intermediates/assets/debug/mergeDebugAssets/native-bridge.js` (`@typescript-eslint/no-unused-vars` rule not found) plus 2 warnings; unrelated to this issue
- `npx eslint src/components/CollectionPage.tsx src/types/farm.ts src/i18n/types.ts src/i18n/locales/en.ts src/i18n/locales/zh.ts src/i18n/locales/zhTW.ts src/i18n/locales/ja.ts src/i18n/locales/ko.ts src/i18n/locales/fr.ts src/i18n/locales/de.ts src/i18n/locales/es.ts src/i18n/locales/ru.ts` -> pass

## Interaction Proof
Artifacts captured from local preview `http://127.0.0.1:4173/`.

1. First harvest -> `artifacts/issue-45/01-first-harvest-detail.png`
   - localStorage entry: `count=1`, `harvestCount=1`
   - detail text: `Current Owned (entities) = 1`, `Total Harvests: 1`
2. Repeat harvest -> `artifacts/issue-45/02-repeat-harvest-detail.png`
   - localStorage entry: `count=2`, `harvestCount=2`
   - detail text: `Current Owned (entities) = 2`, `Total Harvests: 2`
3. Sell after repeat harvest -> `artifacts/issue-45/03-sell-decrements-owned-count.png`
   - localStorage entry after sell: `count=1`, `harvestCount=2`
   - detail text: `Current Owned (entities) = 1`, `Total Harvests: 2`
4. Reload after sell -> `artifacts/issue-45/04-reload-keeps-owned-count.png`
   - localStorage entry after reload: `count=1`, `harvestCount=2`
   - detail text remains `Current Owned (entities) = 1`, `Total Harvests: 2`
5. Existing save alignment -> `artifacts/issue-45/05-existing-save-alignment.png`
   - input save contained split inventory entries for the same variety: normal `count=1` and mutant `count=2`
   - migrated entries kept real inventory and backfilled harvest history to `harvestCount=1` and `harvestCount=2`
   - detail text shows aggregated per-variety totals: `Current Owned (entities) = 3`, `Total Harvests: 3`

## Data Paths
- Current owned quantity in dex detail reads from `collection[].count`, normalized by `getCollectedVarietyOwnedCount(...)` and aggregated per `varietyId` in `src/components/CollectionPage.tsx`.
- Cumulative harvests in dex detail read from `collection[].harvestCount` via `getCollectedVarietyHarvestCount(...)`, with Issue #43 legacy fallback preserved.
