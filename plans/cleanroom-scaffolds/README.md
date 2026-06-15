# Cleanroom Instruction Scaffolds

This directory preserves reusable cleanroom instruction scaffolds for future
target-language cleanroom runs. They are source-repo planning assets, not
active instructions for this repository.

The purpose of a cleanroom run is to improve confidence in the source-owned QNT
corpus, scaffold, harness, and process for future unsupervised runs. The target
implementation is useful evidence, but it is not the source repo's artifact to
polish. When a run exposes a problem, prefer source-side improvements to the
QNT, copied guidance, scaffold templates, target profile, replay evidence
contract, checker, or decider gate. Do not turn a harness shakedown into an
unbounded target implementation review.

Use these files when preparing or refreshing a separate cleanroom repo such as
a sibling target-language experiment directory. This source repo prepares the
transferable package; the project owner starts the cleanroom session manually in
the target repo.

## Files

- `AGENTS.template.md` — cleanroom repo agent contract. Copy to the cleanroom
  repo root as `AGENTS.md`.
- `README.template.md` — cleanroom repo README and owner bootstrap
  instructions. Copy to the cleanroom repo root as `README.md`.
- `BOOTSTRAP_QUERY.template.md` — owner-facing query to paste into a cleanroom
  session after the copied corpus and scaffold files are present. Copy to the
  cleanroom repo root as `BOOTSTRAP_QUERY.md`.
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
When `cleanroom-input/` is already synced in the target directory, the renderer
also materializes the current manifest source SHA, source branch inventory SHA,
first queued driver, and target profile SHA in rendered task files.

## Manual Transfer Bootstrap

1. Create or reset the sibling cleanroom repo, or create a temporary transfer
   directory if the owner wants to move files by hand.
2. Run `scripts/sync-cleanroom-input.cjs` from this source repo to populate
   `<target>/cleanroom-input/` and write
   `<target>/cleanroom-input/MANIFEST.md`.
3. Render the scaffold files above into the same target directory using a
   target profile.
4. Validate that rendered `tasks/LEVEL_1_2_SCOPE.md` still matches the synced
   corpus. If it needs changes, update this source snapshot and source branch
   inventory together, then rerender.
5. Confirm rendered task files contain the current manifest source SHA, source
   branch inventory SHA, first queued driver, and target profile SHA. If the
   synced corpus or target profile changes, rerender the scaffold.
6. If a temporary transfer directory was used, move only the generated
   cleanroom files into the cleanroom repo:
   `AGENTS.md`, `README.md`, `BOOTSTRAP_QUERY.md`, `target-profile.json`,
   `tasks/**`, and `cleanroom-input/**`.
7. When pasting the query from `BOOTSTRAP_QUERY.md`, replace
   `<TARGET_BASE_SHA>` with the 40-character Git SHA that the cleanroom task
   branch must be based on. The file itself may remain a reusable template.
8. Start the cleanroom session manually with the cleanroom repo as the only
   working root, and paste the query from `BOOTSTRAP_QUERY.md`. The minimal
   query is:

   ```text
   Read AGENTS.md and tasks/WORK_LOOP.md, then implement the next in-scope
   driver from tasks/LEVEL_1_2_SCOPE.md following the Work Loop.
   ```

## Optional Offline Transfer Archive

The normal workflow is the direct manual-transfer bootstrap above. An archive
is only a convenience for moving the same generated files through an offline or
restricted channel; it is not a separate source of truth.

To prepare a copyable archive without writing into the cleanroom repo, run:

```bash
pnpm cleanroom-refresh:package -- \
  --profile plans/cleanroom-scaffolds/target-profiles/rust.json \
  --output /workspace/typescript/dnd-cleanroom-rust-refresh-<source-sha>.tar.gz
```

The packager syncs the allowlisted corpus into a temporary directory, renders
the scaffold with the target profile, writes a `.sha256` file next to the
archive, validates required archive entries, and deletes the temporary
directory. It refuses to run when scaffold packaging inputs have uncommitted
changes, so the package is tied to a committed source snapshot.

## Disposable Harness Shakedown

A source-side dry run may start a temporary cleanroom session only to shake down
the scaffold and harness mechanics before the real cleanroom repo is used. This
is not the normal implementation workflow.

For that shakedown:

1. Sync and render into a temporary directory, not the durable cleanroom repo.
2. Use the same `BOOTSTRAP_QUERY.md` query against that temporary directory.
3. Record only source-side scaffold, corpus, harness, or blocker-shape defects
   that need fixes here.
4. Delete the temporary directory after the shakedown.

Do not treat implementation code, target replay evidence, validation reports,
or reviewer artifacts from a shakedown as acceptance evidence for the real
cleanroom run.

Do not copy `cleanroom-input/**` back into this directory. The corpus should be
recreated by `scripts/sync-cleanroom-input.cjs`, not preserved by hand.
