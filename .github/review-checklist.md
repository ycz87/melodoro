# Review Checklist

Use this checklist when reviewing PRs that target `main`.

## Lint Guardrail Review

- Is the PR correctly labeled as feature work, lint cleanup, or other?
- If it is feature work, is it lint-neutral or lint-improving?
- Does it quietly bundle historical lint debt cleanup into unrelated scope?
- Does the PR description include a lint statement?
- Did the PR touch ESLint config, ignore behavior, or PR guard logic?
- If it touched those guardrail surfaces, is the change explicit and justified?
- Did `PR Guard / guard` run successfully?
- If the PR changes the lint baseline statement, is the new baseline justified and documented?

## Escalate / Reject When

Reject or block the PR when:
- new lint problems are introduced;
- historical lint debt is mixed into feature work without approval;
- ESLint / ignore / guard changes are hidden or unexplained;
- the PR guard fails or is skipped without a documented blocker.
