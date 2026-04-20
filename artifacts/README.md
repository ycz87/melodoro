# Artifacts

## Very Small Issue Proof Bundles

This rule only applies to `artifacts/issue-*` directories used as proof bundles for very small issues.

- Keep the minimum stable tracked bundle needed for closed-issue proof and public references.
- Default bundle: `PROOF.md` plus the final proof files directly cited from that markdown or from public issue/PR text.
- Do not keep local runner residue after the issue is closed, such as helper scripts, raw JSON dumps, copied temp files, or other one-off execution outputs.
- If a public issue or PR already points at a proof path, preserve that path or update the public reference in the same change.

This rule does not apply to richer artifact trees such as `artifacts/e-001-*` or other task-specific capture directories.

## Root Visual Work Products

- Temporary visual screenshots, compare HTML pages, and iteration artifacts should live under `artifacts/<task-or-issue>/...`, not in the repository root.
- The repository root should keep only the small set of files still directly required by current scripts, build/config flows, or top-level brand entry assets.
