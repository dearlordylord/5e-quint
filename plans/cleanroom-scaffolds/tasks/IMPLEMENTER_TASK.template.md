# Implementer Task Contract

Use this before changing `{{enginePath}}`.

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
  accepted.
- Generate target replay evidence under `tasks/target-replay-evidence/`.
  Match `tasks/TARGET_REPLAY_EVIDENCE.example.json` exactly. Diagnostic
  target-language tests are allowed, but they do not close branch coverage.
- Copy the accepted task's rolling artifacts into
  `tasks/history/<taskId>/`, then append `tasks/RUN_LEDGER.json` with the
  history artifact hashes, target replay evidence refs, command results,
  manifest source commit SHA, and source branch inventory SHA.
- Update `tasks/VALIDATION_REPORT.md` from target replay evidence, not from
  prose claims. The report is the readable view; `tasks/RUN_LEDGER.json` is
  the machine-readable run ledger.

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
