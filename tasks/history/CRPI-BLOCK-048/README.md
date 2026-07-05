# CRPI-BLOCK-048 History

Task 94 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-048.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet Ability Check
Proficiency Bonus `qRoute` projection to public Character Sheet
projection-with-route entrypoint calls. The harness calls
`characterSheetAbilityCheckProficiencyBonusProjection`, which returns the public
Ability Check Proficiency Bonus `qRoute` event after deriving the semantic
projection through `characterSheetAbilityCheckProficiencyBonus` for Jack of All
Trades, rounded half-Proficiency-Bonus, skill proficiency, Expertise, the typed
other-bonus exclusion, and the missing-feature case.

No duplicate durable state was introduced. The replay reuses existing
`CharacterBuild` progression, proficiency choice, feature grant, total-level,
and typed other-bonus facts. SRD authored identity remains at catalog/source
selection boundaries; runtime behavior reads the typed passive grant shape and
build facts.

Plan Impact:

- Status: `none`
- Affected task: Task 94 / `CRPI-BLOCK-048` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
