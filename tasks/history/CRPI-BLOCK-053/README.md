# CRPI-BLOCK-053 History

Task 99 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-053.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet Hit Point
Maximum `qRoute` projection to the public Character Sheet
`characterSheetHitPointMaximumProjection` entrypoint. The public projection
returns the effective maximum, normal maximum, sheet-owned maximum reduction,
and route events from the same owner boundary used by the reducer route
connector.

No duplicate durable state was introduced. Normal Hit Point Maximum remains
derived from existing `CharacterBuild` progression, Constitution, and feature
facts. Effective Hit Point Maximum applies the canonical
`CharacterSheet.hitPointMaximumReduction` field owned by the Hit Point sheet
state.

Plan Impact:

- Status: `none`
- Affected task: Task 99 / `CRPI-BLOCK-053` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
