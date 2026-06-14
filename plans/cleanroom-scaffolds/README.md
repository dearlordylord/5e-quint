# Cleanroom Instruction Scaffolds

This directory preserves reusable cleanroom instruction scaffolds from the
Rust cleanroom rerun. They are source-repo planning assets, not active
instructions for this repository.

Use these files when bootstrapping or refreshing a separate cleanroom repo such
as `/workspace/typescript/dnd-cleanroom-rust`.

## Files

- `AGENTS.template.md` — cleanroom repo agent contract. Copy to the cleanroom
  repo root as `AGENTS.md`.
- `README.template.md` — cleanroom repo README and owner kickoff prompt. Copy
  to the cleanroom repo root as `README.md`.
- `tasks/WORK_LOOP.template.md` — durable fresh-agent Work Loop instructions.
  Copy to `tasks/WORK_LOOP.md`.
- `tasks/LEVEL_1_2_SCOPE.snapshot.md` — current level-1-2 driver scope filter
  snapshot. Copy to `tasks/LEVEL_1_2_SCOPE.md` only when the synced corpus
  manifest matches the snapshot or after revalidating the decisions against the
  new manifest.
- `tasks/VALIDATION_REPORT.example.md` — example completion ledger and cursor.
  Use as a starting format; reset or revalidate task entries for the cleanroom
  repo's current manifest SHA.
- `tasks/BLOCKERS.template.md` — blocker ledger template. Copy to
  `tasks/BLOCKERS.md`.

## Bootstrap Use

1. Create or reset the sibling cleanroom repo.
2. Run `scripts/sync-cleanroom-input.cjs` from this source repo to populate
   `cleanroom-input/` and write `cleanroom-input/MANIFEST.md`.
3. Copy the scaffold files above into the cleanroom repo using their target
   names.
4. Update manifest SHAs and cursors in copied task files to match the newly
   synced `cleanroom-input/MANIFEST.md`.
5. Launch a fresh agent in the cleanroom repo with:

   ```text
   Read AGENTS.md and tasks/WORK_LOOP.md, then implement the next in-scope
   driver from tasks/LEVEL_1_2_SCOPE.md following the Work Loop.
   ```

Do not copy `cleanroom-input/**` back into this directory. The corpus should be
recreated by `scripts/sync-cleanroom-input.cjs`, not preserved by hand.
