# @dnd/character-creation-runtime

Character creation runtime owns durable draft, hole, fill, and finalization shapes for the Surface/Unit green path.

This package intentionally imports Surface catalog and Unit identities, not authored content records or Core battle/projected vocabulary. The runtime exports `CharacterSheet` as the finalized player-character boundary. Battle seed construction belongs to the battle runtime and composition root.

The current implementation covers the CAM7 hole-discovery slice:

- `createCharacterDraft` creates an empty revision-0 draft.
- `discoverCreationHoles` derives the first Orc Soldier Fighter vertical holes from the draft plus the Surface Unit catalog.
- `fillCreationHoles` applies atomic batch semantics for stale revisions, duplicate fills, unknown fills, and currently unsupported known fills without mutating rejected drafts.
- `finalizeCharacterDraft` returns an incomplete result until hole discovery and legal sheet construction land.

Fill-level issues carry a real submitted `fillIndex`. Batch protocol issues, such as `staleRevision`, are reported as `CreationBatchIssue` so the API does not invent a non-fill index for a batch-wide failure.

The phase-0 draft used the name `UnitLibrary`; the current Surface package exposes `UnitCatalog`. This package exports `UnitLibrary` as a type alias to `UnitCatalog` so the runtime API can keep the durable boundary language without adding an adapter or duplicated catalog state.

The public selection types keep SRD/domain facts structured at the runtime boundary: ability assignments reuse Surface `SixAbilityScores`, class advancement entries use `CharacterClassLevel`, starting languages are Common plus two distinct selectable Standard Languages, alignment is the SRD morality/order pair, and background ability-score increases cannot select the same ability twice.

`createCharacterDraft` also accepts an optional caller-supplied `draftId`. Omitting it uses a process-local generated id for tests and simple composition roots; persisted callers should provide their stored draft identity.

Hole ids are stable domain ids. Draft-owned holes use `cc:draft:<draft path>`, and Unit-granted holes use `cc:unit:<unit id>:<choice key>`. The current support gates are package-private and intentionally narrow: Fighter, Soldier, Orc, Defense Fighting Style, Fighter Weapon Mastery over authored Simple/Martial weapon Units, Soldier Dice Set, the two starting-equipment coin/package choices, and the manifest purchase/loadout choices for Chain Mail, Longsword, and Shield.
