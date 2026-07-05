# CRPI-BLOCK-050 History

Task 96 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-050.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet Armor Class base
selected-identity `qRoute` projection to public Character Sheet
projection-with-route entrypoint calls. The harness calls
`characterSheetArmorClassProjection`, which returns the public selected-reference
retention and Armor Class build-projection `qRoute` events after deriving Armor
Class through `characterSheetArmorClassState` for selected Barbarian Unarmored
Defense, Barbarian Unarmored Defense with Shield, selected Monk Unarmored
Defense, Light Armor, Medium Armor with Dexterity cap, and Heavy Armor with
Shield.

No duplicate durable state was introduced. Selected Armor Class base references
remain caller/selection evidence, while Armor Class remains derived from
`CharacterBuild` progression, equipment loadout, ability scores, armor training,
and Surface Unit mechanics.

Plan Impact:

- Status: `none`
- Affected task: Task 96 / `CRPI-BLOCK-050` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
