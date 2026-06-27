# Validation Report

## Work Loop Status

- Current manifest source commit SHA: `{{currentManifestSourceCommitSha}}`
- Source branch inventory SHA: `{{sourceBranchInventorySha}}`
- Scope file: `tasks/LEVEL_1_2_SCOPE.md`
- Work Loop instructions: `tasks/WORK_LOOP.md`
- Machine-readable run ledger: `tasks/RUN_LEDGER.json`
- Last completed current-snapshot queued branch set: `<none>`
- Next queued driver: `{{firstAssignedDriver}}`
- Next task id: `{{nextTaskId}}`

Completion rule: a queued branch set is complete only when this report has an
entry that names the exact `.mbt.qnt` driver, records the current manifest
source commit SHA, records the current source branch inventory SHA, lists the
allowed inputs used, renders branch coverage from harness-generated target
replay evidence, and records verification results. Entries with older manifest
source commit SHAs or inventory SHAs are historical unless they include a
current-snapshot revalidation note.

## T000: Report Shape Example Only

- Manifest source commit SHA: `{{currentManifestSourceCommitSha}}`
- Source branch inventory SHA: `{{sourceBranchInventorySha}}`
- Driver: `cleanroom-input/qnt/<package>/<driver>.mbt.qnt`
- Branch obligations:
  - `step:<branch action>`
- Allowed inputs used:
  - `cleanroom-input/MANIFEST.md`
  - `cleanroom-input/branch-coverage/source-branch-inventory.json`
  - `cleanroom-input/qnt/<package>/<driver>.mbt.qnt`
  - `cleanroom-input/raw/srd-5.2.1/<file>.md`
  - `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`

Behavior implemented:

- Describe the domain behavior implemented in `{{enginePath}}`.
- Cite the QNT and RAW source files that define the behavior.

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `cleanroom-input/qnt/<package>/<driver>.mbt.qnt#<branch family>:<branch action>` | `_pending_` | `_none_` | `pending` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/<file>.json`
- Target profile: `{{targetProfileId}}`
- Target profile SHA-256: `{{targetProfileSha256}}`
- Quint binding: {{quintBindingName}}
- Reproduction seed or trace id: `<seed or trace id>`
- Accepted evidence refs use `tasks/target-replay-evidence/<file>.json#driver:<driver path>#<branch family>:<branch action>#trace:<trace id>`.

Harness artifacts:

- Start gate: `tasks/START_GATE.json`
- Engine depth: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State ownership: `tasks/STATE_OWNER_MANIFEST.json`
- Reviewer loop: `tasks/REVIEW_LOOP.json`
- Decider decision: `tasks/DECIDER_DECISION.json`
- Immutable history: `tasks/history/<taskId>/`
- Run ledger: `tasks/RUN_LEDGER.json`

Diagnostic tests:

- Focused target-language tests may be listed here, but they do not close
  branch coverage.

Remaining gaps:

- `_none_`

Verification results:

{{verificationResultsMarkdown}}
