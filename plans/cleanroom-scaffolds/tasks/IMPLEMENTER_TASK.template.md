# Implementer Task Contract

Use this before changing `{{enginePath}}`.

## Goal

Implement the selected cleanroom branch set named by `tasks/ACTIVE_WORK.json`
and the selected `.mbt.qnt` drivers. The goal must name one driver, fixed driver
group, harness rule, or owner boundary. Do not use generic `improve
architecture` wording as the task goal; name the rule, route, component, or
state owner that must become executable.

## Starting Points

- `tasks/ACTIVE_WORK.json`
- `cleanroom-input/MANIFEST.md`
- `cleanroom-input/branch-coverage/source-branch-inventory.json`
- `cleanroom-input/branch-coverage/reducer-route-inventory.json`
- `cleanroom-input/qnt/**` for the selected drivers and connectors
- `cleanroom-input/raw/srd-5.2.1/**` for rule-bearing behavior
- `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`
- `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md`
- `cleanroom-input/guidance/**`
- existing `{{enginePath}}/**`

## Output

- `tasks/START_GATE.json`
- production changes under `{{enginePath}}/**`
- quarantined adapter or harness changes under `{{enginePath}}/**`
- `tasks/ENGINE_DEPTH_MANIFEST.json`
- `tasks/STATE_OWNER_MANIFEST.json`
- `tasks/target-replay-evidence/*.json`
- `tasks/history/<taskId>/*.json`
- `tasks/RUN_LEDGER.json`
- `tasks/VALIDATION_REPORT.md`
- `tasks/BLOCKERS.md` when a valid blocker remains

## Acceptance

- The selected source driver path, route class, connector path, accepted
  projection (`qRoute`, `qComponentRoute`, or semantic projection), durable
  owner, forbidden shortcuts, and pass/fail condition are all named in the task
  artifacts.
- Rule-bearing tasks cite local RAW and ubiquitous-language/domain inputs.
- Target replay evidence records the required evidence fields from
  `tasks/TARGET_REPLAY_EVIDENCE.example.json`, including target entrypoint
  sequence, observed projection source, and reducer/public API path.
- If a branch cannot be implemented, `tasks/BLOCKERS.md` uses only these
  blocker classes: `source-qnt-corpus`, `source-scope`, or
  `target-implementation`.
- No production runtime semantics branch on authored identity, QNT action names,
  witness field names, fixture labels, or generated report rows.

## Verification

- Run every command from the target profile:
{{verificationCommandsMarkdown}}
- For rule-bearing tasks, run reviewer-loop convergence: RAW traceability,
  ubiquitous-language/domain language, architecture/connascence, and
  code-review passes; fix every reasonable finding or document a concrete
  rejection reason, then repeat until no reasonable findings remain.
- MBT is not a bootstrap verification step. Run MBT only when this
  implementation task explicitly names a focused MBT command for the selected
  behavior.

## Plan Impact

Use `none` when the task does not affect future work. Use `update-required`
when a durable discovery changes task status, dependencies, ordering, blocker
classification, acceptance criteria, verification, or creates follow-up work.
Use `applied` only when the task itself updates the executable queue or
scaffold contract.

## Start Gate

Write `tasks/START_GATE.json` before implementation begins. It must record:

- `taskId`;
- current `HEAD` from `git rev-parse HEAD`;
- clean pre-implementation worktree status from `git status --short`;
- selected assignment and lane from `tasks/ACTIVE_WORK.json`;
- selected `.mbt.qnt` drivers for this task.

If the worktree is not clean before task edits begin, stop before implementation
and record a bootstrap blocker in `tasks/BLOCKERS.md`.

## Implementation Contract

- Implement only from `cleanroom-input/**`, `tasks/**`, allowed target docs,
  and existing `{{enginePath}}/**`.
- Extend or introduce a reusable production rules module for the selected
  branch set. Driver adapters may call that module, but production APIs must
  not expose QNT action names, witness field names, or `mbt::actionTaken`.
- Keep QNT/MBT replay adapters quarantined and record them in
  `tasks/ENGINE_DEPTH_MANIFEST.json`.
- If the task is adapter-only, `tasks/ENGINE_DEPTH_MANIFEST.json` must record
  `completion.tag = "adapter-only-with-paired-engine-task"` and a concrete
  `pairedTaskId` before related drivers continue.
- Record every durable target field introduced or changed in
  `tasks/STATE_OWNER_MANIFEST.json`, including owner and derivability.
- When the selected driver appears in
  `cleanroom-input/branch-coverage/reducer-route-inventory.json`, implement
  the listed route class. `reducer-routed` tasks must replay through the shared
  reducer surface and match the copied route connector's `qRoute`; the
  inventory selects and orders work but is not route evidence. `substrate-first`
  tasks must introduce or identify the durable owner before replay evidence is
  accepted. `component-first` tasks must match the copied `qComponentRoute`
  connector before a later battle route consumes that component owner.
- For the level-1 through level-5 route package, follow the
  `level-1-5-cleanroom-route-v1.freshCleanroomPackageGate` record in
  `cleanroom-input/branch-coverage/reducer-route-inventory.json`. Dirty
  cleanroom ledgers, prior reports, previous adapters, and target code are not
  acceptance evidence.
- Generate target replay evidence under `tasks/target-replay-evidence/`.
  Match `tasks/TARGET_REPLAY_EVIDENCE.example.json` exactly. Passing evidence
  must record the target entrypoint sequence and an `observedProjectionSource`
  tagged as `qRoute`, `qComponentRoute`, or `semantic-projection`. `qRoute`
  and `qComponentRoute` evidence must name the observed route-event source and
  reducer/public API path that produced those events; semantic projections must
  name the semantic projection source and public API path. Equal
  expected/observed projection hashes without that source record do not close
  branch coverage. Diagnostic target-language tests are allowed, but they do
  not close branch coverage.
- Copy the accepted task's rolling artifacts into
  `tasks/history/<taskId>/`, then append `tasks/RUN_LEDGER.json` with the
  history artifact hashes, target replay evidence refs, command results,
  manifest source commit SHA, and source branch inventory SHA.
- Update `tasks/VALIDATION_REPORT.md` from accepted target replay evidence,
  not from prose claims, generated report rows, or adapter-local expected
  routes. The report is the readable view; executable route-event provenance
  lives in `tasks/target-replay-evidence/*.json`, and `tasks/RUN_LEDGER.json`
  is the machine-readable run ledger.

## Required Outputs

- `tasks/START_GATE.json`
- `tasks/ENGINE_DEPTH_MANIFEST.json`
- `tasks/STATE_OWNER_MANIFEST.json`
- `tasks/target-replay-evidence/*.json`
- `tasks/history/<taskId>/*.json`
- `tasks/RUN_LEDGER.json`
- `tasks/VALIDATION_REPORT.md`
- `tasks/BLOCKERS.md` when a source or target blocker remains

Run the target verification commands before handback:

{{verificationCommandsMarkdown}}
