# Issue #115 Proof

## Final keep / move / delete manifest

### Keep in root

- `watermelon-logo-transparent.png` — 当前脚本直接依赖的入口级品牌资产。

### Move out of root

- `logo-source.png` → `artifacts/issue-115/root-visual-archive/brand/logo-source.png` — 历史品牌 PNG 源文件，保留但不再占根目录；DEVLOG 引用已同步更新。
- `farm-step6-compare-e1f12de.html` → `artifacts/issue-115/root-visual-archive/compare-step6-e1f12de/farm-step6-compare-e1f12de.html` — 保留 Step 6 主 compare 页面；迁移后继续可本地打开。
- `farm-step6-final-desktop-e1f12de.png` → `artifacts/issue-115/root-visual-archive/compare-step6-e1f12de/farm-step6-final-desktop-e1f12de.png` — Bundle A 当前图，随 compare 页面一起归档。
- `farm-step6-compare-visualonly-3d047f0.html` → `artifacts/issue-115/root-visual-archive/compare-step6-visualonly-3d047f0/farm-step6-compare-visualonly-3d047f0.html` — 保留 Step 6 visualOnly compare 页面；迁移后继续可本地打开。
- `farm-step6-visualonly-full-3d047f0.png` → `artifacts/issue-115/root-visual-archive/compare-step6-visualonly-3d047f0/farm-step6-visualonly-full-3d047f0.png` — Bundle B 当前图，随 compare 页面一起归档。
- `farm-step6-reference-base.jpg` → `artifacts/issue-115/root-visual-archive/compare-step6-visualonly-3d047f0/farm-step6-reference-base.jpg` — Bundle B reference 图，仅被 visualOnly compare 页面使用。

### Delete from root

- Deleted **141** root PNG files with no remaining in-repo dependency and no selected archive value:
  - `farm-2p5d-phase1-desktop.png`
  - `farm-2p5d-phase1-mobile.png`
  - `farm-after-detail.png`
  - `farm-after-full.png`
  - `farm-before-detail.png`
  - `farm-before-full.png`
  - `farm-compare-detail.png`
  - `farm-compare-full.png`
  - `farm-r2-after-desktop-detail.png`
  - `farm-r2-after-desktop.png`
  - `farm-r2-after-mobile-detail.png`
  - `farm-r2-after-mobile.png`
  - `farm-r2-before-desktop-detail.png`
  - `farm-r2-before-desktop.png`
  - `farm-r2-before-mobile-detail.png`
  - `farm-r2-before-mobile.png`
  - `farm-r2-compare-desktop.png`
  - `farm-r2-compare-detail.png`
  - `farm-r2-compare-mobile.png`
  - `farm-r3-no-artifact-desktop-detail.png`
  - `farm-r3-no-artifact-desktop.png`
  - `farm-r3-no-artifact-mobile-detail.png`
  - `farm-r3-no-artifact-mobile.png`
  - `farm-r4-after-desktop-detail.png`
  - `farm-r4-after-desktop.png`
  - `farm-r4-after-mobile-detail.png`
  - `farm-r4-after-mobile.png`
  - `farm-r4-compare-desktop.png`
  - `farm-r4-compare-detail.png`
  - `farm-r4-compare-mobile.png`
  - `farm-r5-after-desktop.png`
  - `farm-r5-after-detail.png`
  - `farm-r5-after-mobile.png`
  - `farm-r5-compare-desktop.png`
  - `farm-r5-compare-detail.png`
  - `farm-r5-compare-mobile.png`
  - `farm-r5b-after-desktop.png`
  - `farm-r5b-after-detail.png`
  - `farm-r5b-after-mobile.png`
  - `farm-r5b-compare-desktop.png`
  - `farm-r5b-compare-detail.png`
  - `farm-r5b-compare-mobile.png`
  - `farm-r6-after-desktop.png`
  - `farm-r6-after-detail.png`
  - `farm-r6-after-mobile.png`
  - `farm-r6-compare-desktop.png`
  - `farm-r6-compare-detail.png`
  - `farm-r6-compare-mobile.png`
  - `farm-r7-endgame-compare-desktop.png`
  - `farm-r7-endgame-compare-detail.png`
  - `farm-r7-endgame-compare-mobile.png`
  - `farm-r7-endgame-reference-desktop.png`
  - `farm-r7-endgame-reference-detail.png`
  - `farm-r7-endgame-reference-mobile.png`
  - `farm-r7-endgame-rework-desktop.png`
  - `farm-r7-endgame-rework-detail.png`
  - `farm-r7-endgame-rework-mobile.png`
  - `farm-r7-final-after-desktop.png`
  - `farm-r7-final-after-detail.png`
  - `farm-r7-final-after-mobile.png`
  - `farm-r7-final-compare-desktop.png`
  - `farm-r7-final-compare-detail.png`
  - `farm-r7-final-compare-mobile.png`
  - `farm-r7-finalproof-compare-desktop.png`
  - `farm-r7-finalproof-compare-detail.png`
  - `farm-r7-finalproof-compare-mobile.png`
  - `farm-r7-finalproof-compare2-desktop.png`
  - `farm-r7-finalproof-compare3-desktop.png`
  - `farm-r7-finalproof-compare3-detail.png`
  - `farm-r7-finalproof-compare3-mobile.png`
  - `farm-r7-finalproof-reference-desktop.png`
  - `farm-r7-finalproof-reference-detail.png`
  - `farm-r7-finalproof-reference-mobile.png`
  - `farm-r7-finalproof-rework-desktop.png`
  - `farm-r7-finalproof-rework-detail.png`
  - `farm-r7-finalproof-rework-mobile.png`
  - `farm-r7-gate-compare-desktop.png`
  - `farm-r7-gate-compare-detail.png`
  - `farm-r7-gate-compare-mobile.png`
  - `farm-r7-gate-reference-desktop.png`
  - `farm-r7-gate-reference-detail.png`
  - `farm-r7-gate-reference-mobile.png`
  - `farm-r7-gate-rework-desktop.png`
  - `farm-r7-gate-rework-detail.png`
  - `farm-r7-gate-rework-mobile.png`
  - `farm-r7-last-after-desktop.png`
  - `farm-r7-last-after-detail.png`
  - `farm-r7-last-after-mobile.png`
  - `farm-r7-last-compare-desktop.png`
  - `farm-r7-last-compare-detail.png`
  - `farm-r7-last-compare-mobile.png`
  - `farm-r7-last2-compare-desktop.png`
  - `farm-r7-last2-compare-detail.png`
  - `farm-r7-last2-compare-mobile.png`
  - `farm-r7-last2-reference-desktop.png`
  - `farm-r7-last2-reference-detail.png`
  - `farm-r7-last2-reference-mobile.png`
  - `farm-r7-last2-rework-desktop.png`
  - `farm-r7-last2-rework-detail.png`
  - `farm-r7-last2-rework-mobile.png`
  - `farm-r7-proof-compare-desktop.png`
  - `farm-r7-proof-compare-detail.png`
  - `farm-r7-proof-compare-mobile.png`
  - `farm-r7-proof-reference-desktop.png`
  - `farm-r7-proof-reference-detail.png`
  - `farm-r7-proof-reference-mobile.png`
  - `farm-r7-proof-rework-desktop.png`
  - `farm-r7-proof-rework-detail.png`
  - `farm-r7-proof-rework-mobile.png`
  - `farm-r7-ultimate-compare-desktop.png`
  - `farm-r7-ultimate-compare-detail.png`
  - `farm-r7-ultimate-compare-mobile.png`
  - `farm-r7-ultimate-reference-desktop.png`
  - `farm-r7-ultimate-reference-detail.png`
  - `farm-r7-ultimate-reference-mobile.png`
  - `farm-r7-ultimate-rework-desktop.png`
  - `farm-r7-ultimate-rework-detail.png`
  - `farm-r7-ultimate-rework-mobile.png`
  - `farm-r7-wireframe-desktop.png`
  - `farm-r7-wireframe-mobile.png`
  - `farm-r7-wireframe-v2-desktop.png`
  - `farm-r7-wireframe-v2-mobile.png`
  - `farm-r7-wireframe-v3-desktop.png`
  - `farm-r7-wireframe-v3-mobile.png`
  - `farm-step3-fix-desktop-a45c693.png`
  - `farm-step3-fix-mobile-a45c693.png`
  - `farm-step4-states-desktop-9f5850f.png`
  - `farm-step4-states-mobile-9f5850f.png`
  - `farm-step5-interactive-desktop-bca9b20.png`
  - `farm-step6-polish-desktop-3f7eaaa.png`
  - `farm-step6-polish-mobile-3f7eaaa.png`
  - `farm-step6-side-by-side-anchors-e1f12de.png`
  - `farm-step6-visualonly-side-by-side-anchors-3d047f0.png`
  - `farm-visual-preview-desktop.png`
  - `farm-visual-render-ok-desktop.png`
  - `pixi-optimized-desktop.png`
  - `pixi-optimized-mobile.png`
  - `pixi-phase0-desktop-deploy.png`
  - `pixi-phase0-desktop.png`
  - `pixi-phase0-mobile-deploy.png`
  - `pixi-phase0-mobile.png`

## Migration and cleanup summary

- Root PNG count: `145 -> 1` (`watermelon-logo-transparent.png` only).
- Root compare HTML count: `2 -> 0` (both archived under `artifacts/issue-115/root-visual-archive/`).
- `farm-step6-reference-base.jpg` moved with Bundle B.
- `farm-plot-reference.jpg` stays in root because it is still referenced by existing script/baseline/docs truth sources; Bundle A HTML now points to it via a new relative path.

## Reference recheck commands and result summary

```bash
rg -n --glob "!node_modules/**" --glob "!.git/**" --glob "!.worktrees/**" "logo-source\.png|watermelon-logo-transparent\.png|farm-step6-compare-e1f12de\.html|farm-step6-compare-visualonly-3d047f0\.html|farm-step6-final-desktop-e1f12de\.png|farm-step6-visualonly-full-3d047f0\.png|farm-step6-reference-base\.jpg|farm-plot-reference\.jpg|farm-step6-side-by-side-anchors-e1f12de\.png|farm-step6-visualonly-side-by-side-anchors-3d047f0\.png|farm-step6-polish-desktop-3f7eaaa\.png|farm-step6-polish-mobile-3f7eaaa\.png" .
find . -maxdepth 1 -type f \( -name "*.png" -o -name "*.html" -o -name "*.jpg" \) -printf "%P\n" | sort
```

- Remaining in-repo references now match the intended boundary only:
  - `scripts/generate-icons.mjs` -> `watermelon-logo-transparent.png`
  - `DEVLOG.md` -> archived `logo-source.png` path
  - archived compare HTML files -> their archived assets, plus shared root `farm-plot-reference.jpg` for Bundle A
  - existing baseline/doc/script truth sources -> `farm-plot-reference.jpg`
- No remaining repo references to deleted step6 side-by-side / polish files or deleted farm/pixi PNGs.

## Convention landing note

- Added a minimal repository rule to `artifacts/README.md`: temporary visual screenshots, compare HTML pages, and iteration artifacts should go under `artifacts/<task-or-issue>/...`, while the repository root keeps only files still required by current scripts/build/config or top-level brand entry flows.
