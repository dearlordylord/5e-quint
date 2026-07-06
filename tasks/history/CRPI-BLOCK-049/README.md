# CRPI-BLOCK-049 History

Task 95 reducer-routed replay was accepted against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRPI-BLOCK-049.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence compares the copied Character Sheet Arcane Recovery
selected-identity `qRoute` projection to public Character Sheet rest-with-route
entrypoints. The harness calls `completeShortRestArcaneRecoveryWithRoute` for
ordinary Spell Slot recovery and Pact Slot rejection, and
`completeLongRestArcaneRecoveryResetWithRoute` for Long Rest reset. Those
entrypoints call the existing Short Rest and Long Rest reducers, then return the
observed route projection only when the Arcane Recovery owner-boundary state
proves a route was observed. Revision round 3 tightened this boundary so
already-used Arcane Recovery failures route to Feature Resource, Pact Slot routes
are limited to pact-slot-shaped shortages, and unrelated successful Long Rests
return no route.

No duplicate durable state was introduced. Ordinary Spell Slot and Pact Slot
capacities remain derived from `CharacterBuild`; ordinary Spell Slot expenditure,
Pact Slot expenditure, and Arcane Recovery rest-feature lockout remain the
durable runtime state owners.

Plan Impact:

- Status: `none`
- Affected task: Task 95 / `CRPI-BLOCK-049` is unblocked by accepted copied
  `qRoute` replay evidence.
- Dependent route task `L15-RR09-CHARACTER-SHEET-ROUTES` remains unchanged.
- Required plan edits: none.
