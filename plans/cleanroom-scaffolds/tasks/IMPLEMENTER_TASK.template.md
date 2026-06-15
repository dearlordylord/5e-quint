# Implementer Task Contract

Use this before changing `{{enginePath}}`.

## Start Gate

Write `tasks/START_GATE.json` before implementation begins. It must record:

- `taskId`;
- declared Target Base SHA from the owner-pasted bootstrap query;
- current `HEAD`;
- command `git merge-base --is-ancestor <Base SHA> HEAD`;
- ancestor-check result;
- selected `.mbt.qnt` drivers for this task.

If the owner-pasted bootstrap query does not provide a full 40-character Git
SHA, stop before implementation and record a bootstrap blocker in
`tasks/BLOCKERS.md`. If the ancestor check fails, stop. Do not rebase, repair
the branch, or keep working around the mismatch.

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
- Generate target replay evidence under `tasks/target-replay-evidence/`.
  Diagnostic target-language tests are allowed, but they do not close branch
  coverage.
- Update `tasks/VALIDATION_REPORT.md` from target replay evidence, not from
  prose claims.

## Required Outputs

- `tasks/START_GATE.json`
- `tasks/ENGINE_DEPTH_MANIFEST.json`
- `tasks/STATE_OWNER_MANIFEST.json`
- `tasks/target-replay-evidence/*.json`
- `tasks/VALIDATION_REPORT.md`
- `tasks/BLOCKERS.md` when a source or target blocker remains

Run the target verification commands before handback:

{{verificationCommandsMarkdown}}
