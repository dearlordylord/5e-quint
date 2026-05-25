# A65 Unit Feature Strict Denominator Audit

Task: `A65-UNIT-FEATURE-STRICT-DENOMINATOR-AUDIT`

Status: closed with checker evidence.

This task is evidence-only. It does not add or change D&D rule behavior,
Surface admission, support-profile classification policy, QNT semantics, or
runtime reducer logic. No new SRD rule text was modeled in this task.

## Closure Evidence

`pnpm unit-profile-coverage:check` builds and validates the strict level-support
reports in `plans/unit-profile-coverage/level1-full-support.json` and
`plans/unit-profile-coverage/level1-2-full-support.json`.

The generated strict gates remain green after the unit-feature ownership
changes:

- Level 1 full-support claim gate is `pass`.
- Level 1 strict target closure is `94/94`.
- Level 1 selected-identity readiness is `83/83`.
- Level 1 SRD-authored readiness blockers are `0`.
- Level 1-2 full-support claim gate is `pass`.
- Level 1-2 strict target closure is `115/115`.
- Level 1-2 selected-identity readiness is `104/104`.
- Level 1-2 SRD-authored readiness blockers are `0`.

The profile-backed strict unit-feature rows visible in these denominators
remain closed:

- Level 1 has 6 strict unit-feature rows, all `supported-profile`.
- Level 1-2 has 15 strict unit-feature rows:
  - 12 are `supported-profile`.
  - `druid_wild_shape` and `sorcerer_metamagic` are
    `blocked-follow-up-split` with concrete smaller follow-up ownership.
  - `monk_monks_focus` is `closed-runtime-detached-table-adjudication` for the
    ordinary jump-distance residual outside promoted battle-runtime movement
    commands.

The level 1 and level 1-2 reports both list no open frontier rows and no
rules-kernel join rows needing attention.

## Follow-Up Tasks

No additional strict-denominator follow-up is required for the current
unit-feature split fallout.

Task 20 still owns the broader rules-kernel report refresh after unit-feature
closure. This audit intentionally does not revise those generated reports.

## Verification

Run:

```sh
pnpm rules-kernel-coverage:check && pnpm unit-profile-coverage:check
```

Expected result:

- `Rules kernel coverage OK: 97 obligations.`
- `Unit profile coverage OK: 257 Units, 132 profiles.`
