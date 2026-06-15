# Work Loop Instructions

Use this file when you are a fresh agent with no conversation context.

## First Reads

Read these files, in this order:

1. `AGENTS.md`
2. `BOOTSTRAP_QUERY.md`
3. `cleanroom-input/MANIFEST.md`
4. `cleanroom-input/branch-coverage/source-branch-inventory.json`
5. `tasks/LEVEL_1_2_SCOPE.md`
6. `tasks/ACTIVE_WORK.json`
7. `tasks/IMPLEMENTER_TASK.md`
8. `tasks/VALIDATION_REPORT.md`
9. `tasks/BLOCKERS.md`

Do not read any file outside this repository. Do not read sibling repos.

## Pick The Next Branch Set

`tasks/ACTIVE_WORK.json` is the active assignment source. If the owner query
names an `assignmentId`, use that assignment. If it does not and exactly one
assignment exists, use that assignment. If more than one assignment exists and
none is named, stop and record a bootstrap blocker rather than choosing.

Only drivers in the selected assignment's lane queues are eligible. Drivers in
future queues, or drivers marked `out` or `flagged` in
`tasks/LEVEL_1_2_SCOPE.md`, are not Work Loop tasks until the source-owned
active work file, scope file, and source branch inventory are revised together.

Do not reorder or edit `tasks/LEVEL_1_2_SCOPE.md` in the target repo. It is a
source-owned snapshot; if the queue is wrong, record a blocker and have the
source repo update the scope snapshot and branch inventory together.

`cleanroom-input/branch-coverage/source-branch-inventory.json` is the branch
denominator. A queued driver is complete only when every in-scope replayable
branch obligation for that driver has passing harness-generated target replay
evidence.

`tasks/VALIDATION_REPORT.md` is the completion ledger. A queued branch set is
complete only when that report contains an entry that:

- names the exact `.mbt.qnt` driver;
- records the current manifest source commit SHA from
  `cleanroom-input/MANIFEST.md`;
- records the source branch inventory SHA;
- lists the allowed inputs used;
- records the behavior implemented;
- renders the generated branch coverage table from target replay evidence;
- records verification results for:
{{verificationChecklistMarkdown}}

If a report entry names an old manifest source commit SHA or source branch
inventory SHA, treat it as historical unless it also has a current-snapshot
revalidation note.

To select work:

1. Find the selected assignment in `tasks/ACTIVE_WORK.json`.
2. Walk its lanes in listed order and each lane's queue in listed order.
3. Read each queued driver's in-scope branch obligations from source branch
   inventory.
4. Skip a queued driver only if `tasks/VALIDATION_REPORT.md` proves every in-scope
   replayable branch complete for the current manifest and source branch
   inventory.
5. Implement the first queued branch set that is not proven complete.

## Current Cursor

- Manifest source commit SHA: `{{currentManifestSourceCommitSha}}`
- Source branch inventory SHA: `{{sourceBranchInventorySha}}`
- Last completed current-snapshot queued branch set: `<none>`
- Active assignment: `{{defaultAssignmentId}}`
- Next queued driver: `{{firstAssignedDriver}}`
- Next task id: `{{nextTaskId}}`

## Implementation Rules

For the selected branch set:

1. Write `tasks/START_GATE.json` with the next task id from the Current Cursor,
   current `HEAD`, clean pre-implementation worktree status, and selected
   assignment, lane, and drivers. Stop before implementation if the worktree is
   not clean before task edits begin.
2. Read the `.mbt.qnt` driver and its imported QNT files from
   `cleanroom-input/qnt/**`.
3. Read the relevant RAW from `cleanroom-input/raw/srd-5.2.1/**`.
4. Check `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`.
5. Check `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md`.
6. Check the relevant guidance files in `cleanroom-input/guidance/**`.
7. Implement the smallest {{targetLabel}} slice in `{{enginePath}}` that makes
   the branch set conform.
8. Record or update `tasks/ENGINE_DEPTH_MANIFEST.json` for the production
   modules, domain APIs, adapter modules, quarantined witness names, and next
   reuse.
9. Record or update `tasks/STATE_OWNER_MANIFEST.json` for every durable field
   introduced or changed by the task.
10. Wire applicable executable QNT/MBT coverage through {{quintBindingName}}.
11. Add focused target-language tests only when they clarify RAW/QNT behavior or
   diagnose a documented conformance gap; these tests do not close branch
   coverage.
12. Run all required verification commands.
13. Write target replay evidence under `tasks/target-replay-evidence/`.
14. Update `tasks/VALIDATION_REPORT.md`.
15. Update `tasks/BLOCKERS.md` only if the allowed corpus or target
    implementation remains insufficient.

If the selected branch set cannot be implemented from the allowed inputs,
record a blocker with the exact missing fact and move to the next eligible
queued branch set. Do not guess, and do not ask the owner during the run.

## Required Report Shape

Append a new section to `tasks/VALIDATION_REPORT.md` for each completed or
blocked implementation task. Use this shape:

```md
## TNNN: <driver basename or short behavior name>

- Manifest source commit SHA: `{{currentManifestSourceCommitSha}}`
- Source branch inventory SHA: `{{sourceBranchInventorySha}}`
- Driver: `<exact queued .mbt.qnt path>`
- Branch obligations:
  - `<branch family>:<branch action>`
- Allowed inputs used:
  - `<path>`

Behavior implemented:

- ...

Generated branch coverage:

| Obligation | Target replay evidence | Diagnostic tests | Status |
| --- | --- | --- | --- |
| `<driver path>#<branch family>:<branch action>` | `tasks/target-replay-evidence/<file>.json#<trace id>#<branch family>:<branch action>` | `<diagnostic test path or none>` | `<covered|blocked>` |

Target replay evidence:

- Evidence file: `tasks/target-replay-evidence/<file>.json`
- Target profile SHA-256: `{{targetProfileSha256}}`
- Reproduction seed or trace id: `<seed or trace id>`

Remaining gaps:

- ...

Verification results:

{{verificationResultsMarkdown}}
```

When you finish, also update the `Work Loop Status` section near the top of
`tasks/VALIDATION_REPORT.md` so the next fresh agent can resume without
conversation context.
