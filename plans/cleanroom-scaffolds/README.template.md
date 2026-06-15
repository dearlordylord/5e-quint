# Cleanroom {{targetLabel}} Engine

Cleanroom experiment: implement a {{targetLabel}} D&D SRD 5.2.1
{{implementationKind}} for character levels 1-2 from the copied
formal/domain corpus only (`cleanroom-input/`), without reading the production
implementation. Success means the corpus is sufficient implementation
guidance; failures and blockers are research data.

All agent rules live in `AGENTS.md`. The corpus snapshot and its source commit
SHA live in `cleanroom-input/MANIFEST.md`. The source branch inventory lives in
`cleanroom-input/branch-coverage/source-branch-inventory.json`.

Target profile: `{{targetProfileId}}`. Target package/tooling:
{{packageManager}}. Target source extensions: {{sourceFileExtensionsMarkdown}}.

## Layout

- `cleanroom-input/` — the only rules corpus (RAW, QNT, domain, source branch
  inventory, and guidance pack). Read-only; populated by the source repo's sync
  script.
- `BOOTSTRAP_QUERY.md` — owner-facing query for starting a cleanroom session
  after the corpus and scaffold files have been copied here.
- `{{enginePath}}` — target implementation and its tests.
- `tasks/` — active work assignment, task specs, `VALIDATION_REPORT.md`,
  `BLOCKERS.md`, and generated target replay evidence.
- `scripts/` — copied harness validators; run these from inside the cleanroom
  repo only.

## Owner Bootstrap

1. Copy or render the cleanroom package into this repo: `AGENTS.md`,
   `README.md`, `BOOTSTRAP_QUERY.md`, `target-profile.json`, `tasks/**`, and
   `scripts/**`, and `cleanroom-input/**`.
2. Start a cleanroom session manually with this directory as its only working
   root — ideally with file access restricted to this repo.
3. Commit the generated cleanroom files if they are not already committed.
4. Paste the query from `BOOTSTRAP_QUERY.md`.
5. After the implementation run, review against the same copied corpus using
   `tasks/REVIEWER_CHECKLIST.md`.
6. Have the decider evaluate `tasks/DECIDER_CHECKLIST.md` and the
   machine-readable artifacts before accepting the task.
7. Audit the run for forbidden-path reads before trusting it as cleanroom
   evidence.

## Verification

The target test suite is also the conformance lane: tasks with applicable
`.mbt.qnt` drivers must wire them through {{quintBindingName}} and emit
target replay evidence. Target-language tests may supplement diagnosis, but
they do not close source branch coverage.

{{verificationCommandsMarkdown}}

{{quintReproductionMarkdown}}

## Harness Artifacts

Every accepted task records:

- `tasks/START_GATE.json`
- `tasks/ENGINE_DEPTH_MANIFEST.json`
- `tasks/STATE_OWNER_MANIFEST.json`
- `tasks/REVIEW_LOOP.json`
- `tasks/DECIDER_DECISION.json`
- `tasks/target-replay-evidence/*.json`

The validation report is a human-readable ledger. These JSON artifacts are the
acceptance contract.
