# Lint Guardrails

## Purpose

This repository uses repo-wide lint as a default PR gate.

The goal is simple:
- keep `main` lint-neutral or lint-improving by default;
- prevent historical lint debt from leaking back into feature PRs;
- make lint expectations explicit in workflow, docs, and PR review.

## Current Baseline

- `main` repo-wide lint baseline: `0` problems.
- Baseline commit recorded for this guardrail rollout: `ed77e1a` (`Merge pull request #35 from ycz87/feature/issue34-visual-plugin-lint`).
- Baseline command:

```bash
npx eslint .
```

If a future PR intentionally changes ESLint rules, ignore files, or guard behavior, that PR must explicitly explain:
- what changed;
- why the change is needed;
- whether the expected lint baseline remains `0`.

## Default PR Guard

The repository-level PR guard is split into four checks:

1. `npm run lint`
2. `npm run build`
3. `git diff --check`
4. `git diff --check <base>...HEAD` via `npm run guard:pr:patch-check`

Commands:

```bash
npm run guard:pr
npm run guard:pr:lint
npm run guard:pr:build
npm run guard:pr:diff-check
PR_GUARD_BASE_REF=origin/main npm run guard:pr:patch-check
```

Notes:
- `git diff --check` keeps the working tree patch clean.
- The extra patch check exists because CI checkouts are clean by default; plain `git diff --check` alone would not validate the committed PR patch against `main`.
- The GitHub Actions workflow is `.github/workflows/pr-guard.yml`.
- The check name to bind as a required status check is `PR Guard / guard`.

## PR Policy

### Feature PRs

Feature PRs must be lint-neutral or lint-improving.

That means:
- no new lint problems;
- no hidden lint regressions bundled with feature work;
- no quiet rule relaxations or new ignore entries.

### Lint Cleanup PRs

Historical lint debt must be handled in dedicated cleanup work only.

That means:
- use a dedicated cleanup issue / PR;
- keep proof scoped to the cleanup change;
- do not mix historical lint debt cleanup into unrelated product work unless explicitly approved.

### Sensitive Changes

If a PR touches any of the following, the PR description must call it out explicitly:
- ESLint rules or parser config;
- ignore files / ignore entries;
- PR guard workflow or guard scripts;
- the lint baseline statement itself.

## PR Description Requirements

Every PR should state:
- whether it is a feature PR or a cleanup PR;
- whether lint is neutral, improving, or dedicated cleanup;
- whether ESLint config, ignore behavior, or PR guard behavior changed;
- what local validation was run.

Use `.github/pull_request_template.md`.

## Review Checklist

Reviewers should use `.github/review-checklist.md`.

Minimum reviewer questions:
- Is this PR correctly classified as feature work or cleanup work?
- If it is feature work, is it lint-neutral or lint-improving?
- Did the author quietly mix historical lint debt into unrelated work?
- Did the PR touch ESLint config, ignore behavior, or guard logic, and if so, is that explained clearly?
- Did the PR guard run cleanly?

## Enforcement Status / Blocker

Repository files can provide the workflow, scripts, and documentation.

Repository files cannot by themselves force GitHub to block merges.

Current blocker:
- `main` branch protection / required checks / ruleset are not configured yet.

Until a repository admin binds `PR Guard / guard` as a required check for `main`, the workflow exists and runs, but merge blocking is not fully enforced.

## Required Admin Follow-up

A repository admin must configure GitHub settings for `main`:
- enable branch protection or rulesets;
- require status checks before merge;
- bind `PR Guard / guard` as a required check.

Only after that step is complete can this guardrail be considered fully enforced by default.
