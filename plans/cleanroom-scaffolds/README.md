# Cleanroom Instruction Scaffolds

This directory preserves reusable cleanroom instruction scaffolds for future
target-language cleanroom runs. They are source-repo planning assets, not
active instructions for this repository.

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
- `tasks/ACTIVE_WORK.template.json` — machine-readable active assignment and
  lane queues. Render to `tasks/ACTIVE_WORK.json`. The reducer-spine diagnostic
  assignment is generated from
  `plans/cleanroom-branch-coverage/reducer-route-inventory.json`.
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
  runs must not reorder it by hand. Its reducer-spine diagnostic queue is
  generated from `plans/cleanroom-branch-coverage/reducer-route-inventory.json`.
  The filename is historical; the route inventory's
  `level-1-5-cleanroom-route-v1.freshCleanroomPackageGate` record owns the
  fresh level-1 through level-5 route package acceptance slice.
- `tasks/VALIDATION_REPORT.example.md` — example readable validation report
  and cursor. Use as a starting format; reset or revalidate task entries for
  the cleanroom repo's current manifest source commit SHA.
- `tasks/RUN_LEDGER.example.template.json` — machine-readable append-only run
  ledger example. The accepted task history in `tasks/history/<taskId>/` and
  this ledger are the durable audit source; `VALIDATION_REPORT.md` is the
  readable view.
- `tasks/*example.template.json` — machine-readable artifact examples for the
  implementer start gate, engine-depth manifest, state-owner manifest, reviewer
  loop, run ledger, and decider decision.
- `tasks/BLOCKERS.template.md` — blocker ledger template. Copy to
  `tasks/BLOCKERS.md`.
- `target-profiles/*.json` — target profile examples for scaffold rendering.
  Synthetic profiles are renderer fixtures, not implementation recommendations.
- `QNT_DOMAIN_CONCEPTS_HARNESS_PLAN.md` — source-side plan for turning
  domain concepts such as holes/fills, support-profile admission, character
  layer ownership, authored-identity separation, and Encounter Side into
  future QNT/task/harness pressure.
- `QNT_DOMAIN_CONCEPTS_COVERAGE_AUDIT.md` — unreviewed draft audit of which
  planned domain concepts are already source-owned QNT, source TS/MBT tied,
  copied into cleanroom input, branch-selected, partial, or non-QNT remainder.
- `QNT_DOMAIN_CONCEPTS_IMPLEMENTATION_RESEARCH.md` — unreviewed task-local
  research for this harness-shaping task only. Do not use it as cleanroom
  bootstrap input, reviewed harness guidance, or implementation authority.

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
7. Commit the generated cleanroom files in the target repo if they are not
   already committed.
8. Start the cleanroom session manually with the cleanroom repo as the only
   working root, and paste the query from `BOOTSTRAP_QUERY.md`. The minimal
   query is:

   ```text
   Read AGENTS.md and tasks/WORK_LOOP.md, then implement the next in-scope
   driver from tasks/LEVEL_1_2_SCOPE.md following the Work Loop.
   ```

## Transfer Archive

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
The package is fresh-cleanroom input only: dirty cleanroom reports, ledgers,
adapters, target code, and implementation history must not be copied into the
archive or used as acceptance evidence.

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
