# Issue #43 Proof

## Scope
- Fix dex detail `Total Harvests` so it reads an independent cumulative harvest source of truth.
- Increment cumulative harvests on real harvest.
- Do not decrement cumulative harvests on sell.
- Persist across reload.
- Backfill legacy saves that only had `count`.

## Validation
- `npm run build` -> pass
- `git diff --check -- src/types/farm.ts src/hooks/useFarmStorage.ts src/components/CollectionPage.tsx src/components/HybridDexPage.tsx src/App.tsx src/components/DebugToolbar.tsx` -> pass
- `npm run lint` -> fail due pre-existing repo-wide lint errors unrelated to this issue (for example `auth/src/routes/auth.ts`, multiple `e2e/*.spec.ts`, `src/components/AchievementCelebration.tsx`, `src/hooks/useAuth.ts`)
- `npx eslint src/types/farm.ts src/hooks/useFarmStorage.ts src/components/CollectionPage.tsx src/components/HybridDexPage.tsx src/App.tsx src/components/DebugToolbar.tsx` -> pass with existing warnings in `src/App.tsx`

## Interaction Proof
Artifacts generated from local preview `http://127.0.0.1:4173/` with Playwright script `node_modules/.tmp/issue43-proof.mjs`.

1. First harvest -> `artifacts/issue-43/01-first-harvest-detail.png`
   - localStorage entry: `count=1`, `harvestCount=1`
   - detail text: `Total Harvests: 1`
2. Repeat harvest -> `artifacts/issue-43/02-repeat-harvest-detail.png`
   - localStorage entry: `count=2`, `harvestCount=2`
   - detail text: `Total Harvests: 2`
3. Sell after repeat harvest -> `artifacts/issue-43/03-sell-keeps-harvest-count.png`
   - localStorage entry after sell: `count=1`, `harvestCount=2`
   - detail text remains `Total Harvests: 2`
4. Reload after sell -> `artifacts/issue-43/04-reload-keeps-harvest-count.png`
   - localStorage entry after reload: `count=1`, `harvestCount=2`
   - detail text remains `Total Harvests: 2`
5. Legacy save backfill -> `artifacts/issue-43/05-legacy-backfill-detail.png`
   - input legacy entry: `count=0`, no `harvestCount`
   - migrated entry: `count=0`, `harvestCount=1`
   - detail text: `Total Harvests: 1`

Full raw run output: `artifacts/issue-43/proof.json`

## Backfill Rule
- New field: `harvestCount`
- Legacy save migration: for every existing collection entry, set `harvestCount = max(existing count, stored harvestCount, 1)`
- Rationale: old saves only had `count`, but the existence of a collection record means the variety was harvested at least once
