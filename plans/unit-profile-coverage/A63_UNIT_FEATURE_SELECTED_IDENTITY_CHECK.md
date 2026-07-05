# A63 Unit Feature Selected Identity Check

Task: `A63-UNIT-FEATURE-SELECTED-IDENTITY-CHECK`

Status: closed with checker evidence.

This task is evidence-only. It does not add or change selected-identity policy,
feature behavior, QNT semantics, Surface admission, or reducer logic. No SRD
rule text was modeled in this task.

## Closure Evidence

`pnpm unit-profile-coverage:check` builds and validates the selected-identity
replay metrics in `plans/unit-profile-coverage/unit-matrix.json` and
`plans/unit-profile-coverage/UNIT_REPORT.md`.

The generated matrix is green after the unit-feature ownership splits:

- `selectedIdentityReplayCoverage` is `144/144`.
- `selectedIdentityReplayGaps.rowCount` is `0`.
- The report lists no selected-identity replay gap rows.
- A read-only scan of supported `unit-feature.` Units found 37 supported
  feature Units and 0 missing `selected-identity-replay` evidence rows.

The matrix still contains one deferred selected-identity non-applicable row for
a spell profile-subset case. That row is visible in the deferred bucket, is not
a replay gap, and is outside Lane A unit-feature ownership.

## Follow-Up Tasks

No Lane C selected-identity gap assignment is required for the current
unit-feature split fallout.

## Verification

Run:

```sh
pnpm rules-kernel-coverage:check && pnpm unit-profile-coverage:check
```

Expected result:

- `Rules kernel coverage OK: 97 obligations.`
- `Unit profile coverage OK: 257 Units, 132 profiles.`
