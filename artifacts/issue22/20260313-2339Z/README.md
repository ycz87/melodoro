# Issue #22 proof — milestone free plot unlocks

Version: `v0.61.13`
Worktree: `/tmp/cosmelon-issue22`
Branch: `feature/issue22-milestone-plot-unlock`

## Captured states

- `pre-threshold-2var-market-390x844.png`
  - 2 unique varieties collected, balance stays `10000`, Plot 5 still locked with free unlock hint at 3 varieties.
- `mutant-no-bonus-market-390x844.png`
  - Collection includes one normal + one mutant of the same `varietyId` plus one second variety; Plot 5 remains locked, proving mutant does not add an extra milestone point.
- `threshold-3-market-390x844.png`
  - 3 unique varieties collected, auto catch-up to 5 total plots, Plot 5 no longer purchasable, balance still `10000`.
- `threshold-5-market-390x844.png`
  - 5 unique varieties collected, auto catch-up to 6 total plots.
- `threshold-8-market-390x844.png`
  - 8 unique varieties collected, auto catch-up to 7 total plots.
- `threshold-15-market-390x844.png`
  - 15 unique varieties collected, auto catch-up to 8 total plots.
- `threshold-22-market-390x844.png`
  - 22 unique varieties collected, auto catch-up to 9 total plots on mobile.
- `threshold-22-market-1440x900.png`
  - Desktop spot-check for the 22-variety / 9-plot state.
- `farm-plot5-seed-modal-390x844.png`
  - After the 3-variety milestone unlock, Plot 5 enters the normal plant flow and opens the seed picker.
- `dual-track-free-5-buy-6-market-390x844.png`
  - Milestone track has already unlocked Plot 5 for free; purchase track has advanced to Plot 6 with balance `9500`; Plot 7 remains locked, proving the two tracks take the union without duplicate grants or skipping ahead.
- `reload-persist-3var-market-390x844.png`
  - After a reload, the 3-variety milestone state still persists at 5 total plots.

## Notes

- Proof was captured against `npm run preview` on `http://127.0.0.1:4173` with seeded localStorage states for deterministic milestone thresholds.
- The mobile proof viewport is `390x844`; desktop spot-check is `1440x900`.
