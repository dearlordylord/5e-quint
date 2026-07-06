# CRP06-SRO-02 History

Task 100 route replay was recorded against source commit
`895539634f9595f8e4650d3c95aaee7084afe8b5` and source branch inventory SHA
`5c13304a2b520e2138438b840310c0080f116dba58aead4b68ab944c9731afdf`.

Current immutable artifacts for this run:

- Evidence: `tasks/target-replay-evidence/CRP06-SRO-02.json`
- Engine depth manifest: `tasks/ENGINE_DEPTH_MANIFEST.json`
- State owner manifest: `tasks/STATE_OWNER_MANIFEST.json`
- Run ledger: `tasks/RUN_LEDGER.json`
- Validation report: `tasks/VALIDATION_REPORT.md`

The target replay evidence covers the Character Sheet HP/rest/Hit Dice branch
obligations for
`packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`.
Replay observes semantic `qState` through public Character Sheet rest
entrypoints and helper projections in
`packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`, and
observes copied `qRoute` through
`packages/character-sheet-runtime/src/reducer-route-connectors.mbt.test.ts`.

Durable ownership remains split by domain fact: `CharacterSheetHitPointOwner`
owns current HP, Temporary Hit Points, Hit Point Maximum reduction, and Long
Rest HP restoration; `CharacterSheetHitDiceOwner` owns spent Hit Dice and Short
Rest Hit Die spending; `CharacterSheetStateOwner` owns rest duration and Long
Rest calendar gates. Normal Hit Point Maximum, Hit Die size, and Hit Die
capacity remain projections from `CharacterBuild` and installed Unit facts.
