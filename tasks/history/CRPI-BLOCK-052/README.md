# CRPI-BLOCK-052 History

Task 98 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-052.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet healing-resource
selected-identity `qRoute` projection to the public Character Sheet
`applyLayOnHandsWithRoute` entrypoint. The public entrypoint delegates to the
canonical `applyLayOnHands` reducer path, then exposes the feature-resource
spend, Hit Point projection, and feature-resource fact-recording route events.

No duplicate durable state was introduced. The Lay On Hands pool remains owned by
`CharacterSheet.resourceExpenditures`, Hit Points remain owned by
`CharacterSheet.hitPoints`, and Poisoned removal uses the existing
`CharacterSheet.conditions` list.

Plan Impact:

- Status: `none`
- Affected task: Task 98 / `CRPI-BLOCK-052` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
