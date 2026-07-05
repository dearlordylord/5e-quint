# CRP06-SRO-03 History

Task 101 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP06-SRO-03.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Character Sheet Spell Slot, Pact Slot,
and rest-triggered recovery branch obligations for
`packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`.
Replay observes semantic `qState` through public Character Sheet sheet creation,
Short Rest, Long Rest, interruption, slot conversion, and Magical Cunning
entrypoints, and observes copied `qRoute` through
`packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`.

Durable ownership remains split by domain fact:
`CharacterSheetSpellSlotOwner` owns ordinary Spell Slot expenditure deltas,
created Spell Slot delta state, created-slot expiry, and Arcane Recovery
ordinary-slot refunds; `CharacterSheetPactSlotOwner` owns Pact Slot expenditure
and recovery; `CharacterSheetFeatureResourceOwner` owns rest-triggered
feature-use lockouts for Arcane Recovery and Magical Cunning. Ordinary Spell
Slot and Pact Slot capacities remain derived from `CharacterBuild`.
