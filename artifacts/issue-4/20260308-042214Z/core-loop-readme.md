# Core Loop Proof Notes

This artifact set verifies the minimum farm loop state transition for one plot:

1. 空地 (`empty`)
2. 种植 (`growing`, `progress=0`)
3. 生长反馈 (`growing`, `progress>0`)
4. 成熟 (`mature`, `progress=1`)
5. 收获 (`empty` + collection count increment)

`core-loop-simulation.json` contains the stage-by-stage state snapshots and boolean checks for each transition.

Initial environment limitation:
- Browser launch was blocked in the earlier sandbox run (`chromium` process sandbox failure), so the first proof set was delivered as deterministic state snapshots.

Later supplemental proof:
- Real browser screenshots were captured afterwards under `artifacts/issue-4/20260308-browser-proof/` to show the in-app plant / mature / harvest flow visually.
