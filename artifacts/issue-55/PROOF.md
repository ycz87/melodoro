# Issue #55 Proof

## Scope
- Extend the shared dex detail sell-price chip so it also appears for `hybrid` and `prismatic` varieties.
- Keep the existing `pure` sell-price behavior intact.
- Do not affect `dark-matter`, `sellPrice <= 0`, or hidden / uncollected handling.

## Validation
- `npm run lint` -> fail due existing repo-wide lint issue in `android/app/build/intermediates/assets/debug/mergeDebugAssets/native-bridge.js` (`@typescript-eslint/no-unused-vars` rule not found) plus 2 warnings; unrelated to this issue
- `npx eslint src/components/CollectionPage.tsx` -> pass
- `npm run build` -> pass
- `git diff --check` -> pass

## Interaction Proof
Artifacts captured from local dev preview `http://127.0.0.1:4176/` with a seeded save that unlocks Rainbow and includes one hybrid variety (`lava-field`) plus one prismatic variety (`prism-melon`).

1. Hybrid variety, desktop -> `artifacts/issue-55/desktop-hybrid.png`
   - detail modal shows `Sell Price: 30 💰`
   - chip row remains aligned with galaxy / rarity metadata
2. Prismatic variety, desktop -> `artifacts/issue-55/desktop-prismatic.png`
   - detail modal shows `Sell Price: 150 💰`
   - price chip stays in the same header metadata row without disrupting story / stats blocks
3. Hybrid variety, mobile -> `artifacts/issue-55/mobile-hybrid.png`
   - detail modal shows `Sell Price: 30 💰`
   - layout remains readable on narrow viewport with wrapped chips
4. Prismatic variety, mobile -> `artifacts/issue-55/mobile-prismatic.png`
   - detail modal shows `Sell Price: 150 💰`
   - modal remains readable on narrow viewport without overlapping the rest of the detail content

## Boundary Proof
- The render guard remains in `src/components/CollectionPage.tsx` and now only allows the sell-price chip for `pure`, `hybrid`, and `prismatic` varieties when `sellPrice > 0`.
- `dark-matter` still does not use this path, and no `sellPrice <= 0` special-state handling was introduced in this issue.
- The displayed value still comes directly from `VARIETY_DEFS[varietyId].sellPrice`.
