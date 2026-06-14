# Work Loop Instructions

Use this file when you are a fresh agent with no conversation context.

## First Reads

Read these files, in this order:

1. `AGENTS.md`
2. `cleanroom-input/MANIFEST.md`
3. `tasks/LEVEL_1_2_SCOPE.md`
4. `tasks/VALIDATION_REPORT.md`
5. `tasks/BLOCKERS.md`

Do not read any file outside this repository. Do not read sibling repos.

## Pick The Next Driver

`tasks/LEVEL_1_2_SCOPE.md` is the backlog and ordering source. Only drivers in
its `In-Scope Queue` are eligible. Drivers marked `out` or `flagged` in the
decision table are not Work Loop tasks until the scope file is explicitly
revised.

`tasks/VALIDATION_REPORT.md` is the completion ledger. A queued driver is
complete only when that report contains an entry that:

- names the exact `.mbt.qnt` driver;
- records the current manifest source commit SHA from
  `cleanroom-input/MANIFEST.md`;
- lists the allowed inputs used;
- records the behavior implemented;
- records MBT/QNT coverage, including seed when applicable;
- records verification results for:
  - `cargo fmt --check`
  - `cargo test`
  - `cargo clippy --all-targets -- -D warnings`

If a report entry names an old manifest SHA, treat it as historical unless it
also has a current-manifest revalidation note.

To select work:

1. Find the first queued driver in `tasks/LEVEL_1_2_SCOPE.md`.
2. Skip it only if `tasks/VALIDATION_REPORT.md` proves it complete for the
   current manifest SHA.
3. Implement the first queued driver that is not proven complete.

## Current Cursor

- Manifest source commit SHA:
  `8460cff717f7b1e66c8a1f96a9db4a206366e2bc`
- Last completed current-manifest queued driver:
  `cleanroom-input/qnt/character-creation-runtime/character-creation-runtime.mbt.qnt`
- Next queued driver:
  `cleanroom-input/qnt/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`

## Implementation Rules

For the selected driver:

1. Read the `.mbt.qnt` driver and its imported QNT files from
   `cleanroom-input/qnt/**`.
2. Read the relevant RAW from `cleanroom-input/raw/srd-5.2.1/**`.
3. Check `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md`.
4. Check `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md`.
5. Implement the smallest Rust slice in `engine/` that makes the driver
   conform.
6. Wire applicable executable QNT/MBT coverage through `quint-connect`.
7. Add focused Rust tests when they clarify RAW/QNT behavior or cover a
   documented conformance gap.
8. Run all required verification commands.
9. Update `tasks/VALIDATION_REPORT.md`.
10. Update `tasks/BLOCKERS.md` only if the allowed corpus is insufficient.

If the selected driver cannot be implemented from the allowed inputs, record a
blocker with the exact missing fact and move to the next eligible queued driver.
Do not guess, and do not ask the owner during the run.

## Required Report Shape

Append a new section to `tasks/VALIDATION_REPORT.md` for each completed or
blocked implementation task. Use this shape:

```md
## TNNN: <driver basename or short behavior name>

- Manifest source commit SHA: `<current manifest SHA>`
- Driver: `<exact queued .mbt.qnt path>`
- Allowed inputs used:
  - `<path>`

Behavior implemented:

- ...

MBT/QNT coverage:

- Exercised `<exact .mbt.qnt path>` with `<quint-connect attribute>`.
- Reproduction seed: `<seed>`.

Remaining gaps:

- ...

Verification results:

- `cargo fmt --check` passed.
- `cargo test` passed: `<summary>`.
- `cargo clippy --all-targets -- -D warnings` passed.
```

When you finish, also update the `Work Loop Status` section near the top of
`tasks/VALIDATION_REPORT.md` so the next fresh agent can resume without
conversation context.
