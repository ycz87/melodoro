## Summary

- Issue:
- PR type: feature / lint cleanup / other
- Scope:

## Lint Statement

- Lint posture: neutral / improving / dedicated cleanup
- Repo-wide lint result:
- Does this PR touch ESLint config, ignore behavior, or PR guard logic? yes / no
- If yes, explain exactly what changed and why:

## Validation

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `git diff --check`
- [ ] `PR_GUARD_BASE_REF=origin/main npm run guard:pr:patch-check`

## Guardrail Checklist

- [ ] This PR does not introduce new lint problems.
- [ ] If this is feature work, it stays lint-neutral or lint-improving.
- [ ] If this is lint cleanup work, it is handled as dedicated cleanup scope.
- [ ] Historical lint debt is not mixed into unrelated feature work.
- [ ] Any ESLint / ignore / guard workflow change is called out explicitly in this PR.

## Notes for Reviewers

Reviewer checklist: `.github/review-checklist.md`
Guardrail policy: `docs/lint-guardrails.md`
