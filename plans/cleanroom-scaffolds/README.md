# Cleanroom Instruction Scaffolds

This directory preserves reusable cleanroom instruction scaffolds for future
target-language cleanroom runs. They are source-repo planning assets, not
active instructions for this repository.

Use these files when bootstrapping or refreshing a separate cleanroom repo such
as a sibling target-language experiment directory.

## Files

- `AGENTS.template.md` — cleanroom repo agent contract. Copy to the cleanroom
  repo root as `AGENTS.md`.
- `README.template.md` — cleanroom repo README and owner kickoff prompt. Copy
  to the cleanroom repo root as `README.md`.
- `tasks/WORK_LOOP.template.md` — durable fresh-agent Work Loop instructions.
  Copy to `tasks/WORK_LOOP.md`.
- `tasks/IMPLEMENTER_TASK.template.md` — implementer start gate and required
  task outputs. Render to `tasks/IMPLEMENTER_TASK.md`.
- `tasks/REVIEWER_CHECKLIST.template.md` — reviewer loop checklists. Render to
  `tasks/REVIEWER_CHECKLIST.md`.
- `tasks/DECIDER_CHECKLIST.template.md` — deterministic acceptance gates.
  Render to `tasks/DECIDER_CHECKLIST.md`.
- `tasks/HANDBACK.template.md` — handback summary contract. Render to
  `tasks/HANDBACK.md`.
- `tasks/LEVEL_1_2_SCOPE.snapshot.md` — source-owned level-1-2 driver scope
  filter snapshot. The renderer writes it to `tasks/LEVEL_1_2_SCOPE.md`; target
  runs must not reorder it by hand.
- `tasks/VALIDATION_REPORT.example.md` — example completion ledger and cursor.
  Use as a starting format; reset or revalidate task entries for the cleanroom
  repo's current manifest source commit SHA.
- `tasks/*example.template.json` — machine-readable artifact examples for the
  implementer start gate, engine-depth manifest, state-owner manifest, reviewer
  loop, and decider decision.
- `tasks/BLOCKERS.template.md` — blocker ledger template. Copy to
  `tasks/BLOCKERS.md`.
- `target-profiles/*.json` — target profile examples for scaffold rendering.
  Synthetic profiles are renderer fixtures, not implementation recommendations.

## Rendering

Render target-specific scaffold files with:

```bash
node scripts/render-cleanroom-scaffold.cjs \
  --profile plans/cleanroom-scaffolds/target-profiles/<profile>.json \
  --target <cleanroom-repo>
```

The renderer replaces target-specific commands, path conventions, and
Quint-binding names from the target profile. It rejects unresolved template
variables and its self-test renders two synthetic profiles to guard against
hard-coded target assumptions.
It also writes `target-profile.json` into the cleanroom repo; the acceptance
harness uses that machine-readable profile and its content hash.

## Bootstrap Use

1. Create or reset the sibling cleanroom repo.
2. Run `scripts/sync-cleanroom-input.cjs` from this source repo to populate
   `cleanroom-input/` and write `cleanroom-input/MANIFEST.md`.
3. Render the scaffold files above into the cleanroom repo using a target
   profile.
4. Validate that rendered `tasks/LEVEL_1_2_SCOPE.md` still matches the synced
   corpus. If it needs changes, update this source snapshot and source branch
   inventory together, then rerender.
5. Update manifest source commit SHAs, source branch inventory hashes, and
   cursors in copied task files to match the newly synced
   `cleanroom-input/MANIFEST.md` and
   `cleanroom-input/branch-coverage/source-branch-inventory.json`.
6. Launch a fresh agent in the cleanroom repo with:

   ```text
   Read AGENTS.md and tasks/WORK_LOOP.md, then implement the next in-scope
   driver from tasks/LEVEL_1_2_SCOPE.md following the Work Loop.
   ```

Do not copy `cleanroom-input/**` back into this directory. The corpus should be
recreated by `scripts/sync-cleanroom-input.cjs`, not preserved by hand.
