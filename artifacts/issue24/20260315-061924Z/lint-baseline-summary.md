# Issue #24 lint baseline debt summary

- Version: `v0.61.13`
- Branch: `feature/issue24-lint-baseline`
- Commit: `2092246c217084abd644b3b324355c260c4302b8`
- Raw lint command: `npm run lint > artifacts/issue24/20260315-061924Z/lint-raw.txt 2>&1`
- JSON lint command: `npx eslint . -f json -o artifacts/issue24/20260315-061924Z/lint-report.json`

## Totals

- Files with debt: 32
- Total messages: 67
- Errors: 59
- Warnings: 8
- Built-in ESLint auto-fixable messages: 0

## Main concentration

### Top modules
- src/components: 39
- e2e: 13
- src/hooks: 9
- src/App.tsx: 5
- auth: 1

### Top rules
- react-hooks/purity: 18
- react-hooks/set-state-in-effect: 16
- @typescript-eslint/no-unused-vars: 9
- react-hooks/exhaustive-deps: 8
- @typescript-eslint/no-explicit-any: 7
- react-hooks/refs: 5
- react-hooks/rules-of-hooks: 1
- react-hooks/static-components: 1
- react-refresh/only-export-components: 1
- react-hooks/immutability: 1

### Top files
- src/components/CelebrationOverlay.tsx: 8
- e2e/debug-toolbar.spec.ts: 7
- src/components/AchievementCelebration.tsx: 7
- src/App.tsx: 5
- src/components/FarmPage.tsx: 5
- src/components/GeneLabPage.tsx: 5
- src/components/AmbienceMixerModal.tsx: 2
- src/components/farm/SkyLayer.tsx: 2
- src/hooks/useProjectTimer.ts: 2
- src/hooks/useTimer.ts: 2

## Auto-fixability split

- Auto-fixable now: 0
- Partially auto-fixable: 0
- Manual-only in current baseline: 67

## Short governance policy

- This issue is baseline inventory + split planning only, not repo-wide cleanup.
- New changes should not introduce new lint debt.
- Historical lint debt should be retired through dedicated cleanup issues, not mixed into feature work.
