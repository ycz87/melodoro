# Issue #56 Proof

## Scope
- Add dark-matter sell-state display to the shared dex detail modal.
- Show real sell price when `variety.breedType === 'dark-matter' && sellPrice > 0`.
- Show a localized `Not sellable` state when `variety.breedType === 'dark-matter' && sellPrice <= 0`.
- Leave existing `pure / hybrid / prismatic` sell-price behavior unchanged.

## Validation
- `npm run lint` -> fail due existing repo-wide lint issue in `android/app/build/intermediates/assets/debug/mergeDebugAssets/native-bridge.js` (`@typescript-eslint/no-unused-vars` rule not found) plus 2 warnings; unrelated to this issue
- `npx eslint src/components/CollectionPage.tsx src/i18n/types.ts src/i18n/locales/*.ts` -> pass
- `npm run build` -> pass
- `git diff --check` -> pass

## Interaction Proof
Artifacts captured from local dev preview `http://127.0.0.1:4176/` with a seeded save that unlocks Dark Matter, includes one collected dark-matter variety (`void-melon`), and leaves `cosmic-heart` uncollected.

1. Sellable dark-matter variety, desktop -> `artifacts/issue-56/desktop-sellable.png`
   - detail modal shows `Sell Price: 1000 💰`
   - sell-state chip remains in the existing metadata row with galaxy / rarity information
2. Non-sellable special variety, desktop -> `artifacts/issue-56/desktop-not-sellable.png`
   - detail modal shows `Not sellable`
   - special-state chip is distinct from the gold sell-price chip, so it does not read as `0 💰`
3. Sellable dark-matter variety, mobile -> `artifacts/issue-56/mobile-sellable.png`
   - detail modal shows `Sell Price: 1000 💰`
   - modal remains readable on mobile viewport with the existing scrollable container
4. Non-sellable special variety, mobile -> `artifacts/issue-56/mobile-not-sellable.png`
   - detail modal shows `Not sellable`
   - mobile layout remains readable and keeps the state chip distinct from price semantics

## Semantics Proof
- `void-melon` uses `sellPrice = 1000`, so the modal renders a standard sell-price chip.
- `cosmic-heart` uses `sellPrice = 0`, and the modal renders `Not sellable` instead of `0 💰`, blank state, or missing data.
- This keeps `sellPrice <= 0` special handling scoped only to `breedType === 'dark-matter'`.

## Boundary Proof
- Existing `pure / hybrid / prismatic` sell-price logic remains unchanged.
- No new price/state mapping table was introduced; the modal still reads directly from `VARIETY_DEFS[varietyId].sellPrice`.
- No CTA, story, acquisition, or other detail fields were expanded in this issue.
