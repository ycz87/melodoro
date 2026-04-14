# Issue #90 Proof

## Legacy inventory normalization

Source script: `artifacts/issue-90/proof-check.ts`
Output snapshot: `artifacts/issue-90/proof-check.output.json`

Verified with source-backed assertions:
- legacy-only inventory: `alien-flare=2`, `drift-bottle=0` reloads into `drift-bottle=2`
- mixed inventory: `alien-flare=2`, `drift-bottle=3` reloads into `drift-bottle=5`
- current consumption path: consuming one `drift-bottle` from normalized stock succeeds and leaves `drift-bottle=4`
- reload stability: re-running migration after consumption keeps `drift-bottle=4` and does not recreate `alien-flare`
- redirected output path: the active common drop pool now contains `drift-bottle`, and active warehouse item ids no longer contain `alien-flare`

## Interactive check

Preview build verified in browser with `localStorage['watermelon-shed'] = { items: { 'alien-flare': 2, 'drift-bottle': 0 } }`:
- first load into Farm shows `🍾 Interstellar Drift Bottle · 2`
- using the existing Farm chip once decrements it to `🍾 Interstellar Drift Bottle · 1`
- reload + returning to Farm still shows `🍾 Interstellar Drift Bottle · 1`

## Validation

Executed in `/home/ycz87/projects/cosmelonclock/.worktrees/issue-90`:

```bash
npm run lint
npm run build
git diff --check
```

Results:
- `npm run lint` ✅
- `npm run build` ✅
- `git diff --check` ✅
- existing Vite/Tailwind build warnings remain unchanged (`rounded-[var(--radius-*)]` CSS parse warning, large chunk warning)
