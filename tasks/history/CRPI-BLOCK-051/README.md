# CRPI-BLOCK-051 History

Task 97 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-051.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet class-feature selected-identity
`qRoute` projection to public Character Sheet projection-with-route entrypoint calls.
The harness calls `characterSheetClassFeatureSelectedReferenceProjection`, which returns
selected-reference retention and selected-reference build-projection `qRoute` events after
deriving retained class-feature Unit refs and selected subclass/class-choice Unit refs from
existing `CharacterSheet.build` facts. The Druid Circle of the Land branch creates a sheet
with the existing `CharacterSheet.druidCircleLand` fact and reads that fact before projection.

No duplicate durable state was introduced. Selected feature identity remains retained
reference evidence, while Ability Check and spell-access behavior remains derived from
existing build, sheet, and Surface facts.

Plan Impact:

- Status: `none`
- Affected task: Task 97 / `CRPI-BLOCK-051` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
