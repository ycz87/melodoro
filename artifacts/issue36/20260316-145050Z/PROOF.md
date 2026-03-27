# Issue #36 Proof — lint 护栏与 PR 守门规则

- **Branch:** `feature/issue36-lint-guardrails`
- **Commit:** `c0c5210`
- **PR:** https://github.com/ycz87/cosmelon/pull/37
- **Date:** 2026-03-16 14:50 UTC

## 1. Guard Execution Proof

GitHub Actions run: https://github.com/ycz87/cosmelon/actions/runs/23149689883

Run ID: `23149689883`
Workflow: `PR Guard`
Trigger: `pull_request` → `main`
Conclusion: `success`

Steps:
- ✅ Set up job
- ✅ Checkout
- ✅ Setup Node.js
- ✅ Install dependencies
- ✅ Fetch PR base ref
- ✅ Lint
- ✅ Build
- ✅ Diff check (working tree)
- ✅ Diff check (PR patch)
- ✅ Post Setup Node.js
- ✅ Post Checkout
- ✅ Complete job

## 2. Current Baseline Proof

Baseline command run on `origin/main` HEAD (`ed77e1a`) before this PR:

```bash
$ npx eslint .

(no output)
```

Exit code: 0 — repo-wide lint = 0 problems.

Baseline is recorded in `docs/lint-guardrails.md`:
- Baseline commit: `ed77e1a`
- Baseline value: `0` problems

## 3. Config / Docs Delta Proof

Changed files:

| File | Purpose |
|------|---------|
| `.github/workflows/pr-guard.yml` | PR guard workflow: lint + build + diff-check on every PR to main |
| `scripts/pr-diff-check.mjs` | Base-aware patch hygiene check (`git diff --check <base>...HEAD`) |
| `package.json` | Added `guard:pr`, `guard:pr:lint`, `guard:pr:build`, `guard:pr:diff-check`, `guard:pr:patch-check` scripts |
| `docs/lint-guardrails.md` | Baseline record, PR policy, enforcement status, admin follow-up |
| `.github/pull_request_template.md` | PR description template with lint statement + guardrail checklist |
| `.github/review-checklist.md` | Reviewer checklist for lint guardrail review |
| `README.md` | Added PR guard section with local commands and doc links |

## 4. Basic Validation Proof

Local `npm run guard:pr` output (all 4 checks):

```
> guard:pr:lint → eslint . → (no output, exit 0)
> guard:pr:build → tsc -b && vite build → ✓ 131 modules transformed, built in 4.15s
> guard:pr:diff-check → git diff --check → (no output, exit 0)
> guard:pr:patch-check → node scripts/pr-diff-check.mjs
  [pr-diff-check] Checking patch hygiene for origin/main...HEAD
  [pr-diff-check] Patch is clean.
```

Exit code: 0

## 5. Enforcement Proof / Blocker Proof

### Workflow exists and runs ✅

The `PR Guard / guard` check ran successfully on PR #37.

### Branch protection: NOT configured ⚠️ BLOCKER

```bash
$ gh api repos/ycz87/cosmelon/branches/main/protection
{"message":"Branch not protected","status":"404"}
```

`main` branch protection / required checks / ruleset are not configured.

This means:
- The workflow runs on every PR and provides a visible check.
- But GitHub does not currently block merges when the check fails.
- A repo admin must complete the following to fully enforce the guardrail:

**Required admin follow-up:**
1. Go to GitHub → Settings → Branches → Add branch protection rule for `main`
2. Enable "Require status checks to pass before merging"
3. Add `PR Guard / guard` as a required status check
4. Optionally enable "Require branches to be up to date before merging"

Until this is done, the guardrail is advisory, not enforced.

## 6. Known Issues

- Branch protection not configured (blocker documented above).
- No other known issues.
