# Issue #53 Proof

## Scope
- Add sell price to the shared dex detail modal for pure varieties only.
- Read the displayed price directly from `VARIETY_DEFS[varietyId].sellPrice`.
- Keep non-pure varieties unchanged.

## Validation
- `npm run lint` -> fail due existing repo-wide lint issue in `android/app/build/intermediates/assets/debug/mergeDebugAssets/native-bridge.js` (`@typescript-eslint/no-unused-vars` rule not found) plus 2 warnings; unrelated to this issue
- `npx eslint src/components/CollectionPage.tsx src/i18n/types.ts src/i18n/locales/*.ts` -> pass
- `npm run build` -> pass
- `git diff --check` -> pass

## Interaction Proof
Artifacts captured from local dev preview `http://127.0.0.1:4175/` with a seeded clean save containing two pure varieties: `jade-stripe` and `cube-melon`.

1. Common pure variety, desktop -> `artifacts/issue-53/desktop-common.png`
   - detail modal shows `Sell Price: 8 💰`
   - chip row still reads cleanly with galaxy / rarity / price together
2. Legendary pure variety, desktop -> `artifacts/issue-53/desktop-legendary.png`
   - detail modal shows `Sell Price: 300 💰`
   - price remains aligned with existing header metadata
3. Common pure variety, mobile -> `artifacts/issue-53/mobile-common.png`
   - detail modal shows `Sell Price: 8 💰`
   - modal remains readable on narrow viewport and the price chip wraps cleanly with the existing chips
4. Legendary pure variety, mobile -> `artifacts/issue-53/mobile-legendary.png`
   - detail modal shows `Sell Price: 300 💰`
   - layout stays readable without overlapping story / stats content

## Boundary Proof
- The render guard is `variety.breedType === 'pure'` in `src/components/CollectionPage.tsx`, so this issue does not affect hybrid, prismatic, or dark-matter entries.
- The modal reads the value straight from `variety.sellPrice`, which comes from `VARIETY_DEFS[varietyId].sellPrice`.
- No handling was added for `sellPrice <= 0` or special non-sellable states.
