# CRPI-BLOCK-054 History

Task 102 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-054.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet spellbook Ritual
selected-identity `qRoute` projection to the public Character Sheet
`characterSheetSpellbookRitualInvocationProjection` entrypoint. The public
projection delegates to the canonical spellbook Ritual access logic, then
returns selected-reference retention and spell-resource projection route events.

No duplicate durable state was introduced. Spellbook membership and prepared
spells remain existing `CharacterBuild.spellcasting` source facts, Ritual
eligibility remains Surface Spell Definition and spellbook Ritual Access feature
data, and no ritual-casting ledger was added.

Plan Impact:

- Status: `none`
- Affected task: Task 102 / `CRPI-BLOCK-054` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
