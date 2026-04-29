# @dnd/character-creation-runtime

Character creation runtime owns durable draft, hole, fill, and finalization shapes for the Surface/Unit green path.

The MCP green composition root installs the runtime by passing the SRD Unit
library built from `@dnd/surface`; it stores drafts and finalized Character
Sheets at the MCP session boundary, not inside this package.

This package intentionally imports Surface catalog and Unit identities, not authored content records or Core battle/projected vocabulary. The runtime exports `CharacterSheet` as the finalized player-character boundary. Battle seed construction belongs to the battle runtime and composition root.

`character-creation-runtime-slice.qnt` is the deterministic Quint parity slice for the current Orc Soldier Fighter vertical. It models draft state, stable hole ids, atomic batch fill, rediscovery, and finalization status for the same first-vertical behavior that the TypeScript reducer exposes.

The current implementation covers the CAM9 Orc Soldier Fighter finalization slice:

- `createCharacterDraft` creates an empty revision-0 draft.
- `discoverCreationHoles` derives the first Orc Soldier Fighter vertical holes from the draft plus the Surface Unit catalog.
- `fillCreationHoles` validates an entire batch against the current draft revision and hole set before applying anything.
- Accepted batches return a new draft with `revision + 1` and rediscovered holes.
- Rejected batches return the original draft unchanged, the original holes, and every stale-revision/fill issue diagnosable from the submitted batch.
- `finalizeCharacterDraft` returns `incomplete` while required holes remain, `invalid` for contradictory completed draft state, and `ready` with a legal `CharacterSheet` for the complete phase-1 manifest.

Fill-level issues carry a real submitted `fillIndex`. Batch protocol issues, such as `staleRevision`, are reported as `CreationBatchIssue` so the API does not invent a non-fill index for a batch-wide failure.

Finalization issues are reported as `CreationFinalizationIssue` because they describe completed draft legality rather than a submitted fill or batch protocol problem.

Duplicate fills for the same hole are rejected. Current creation holes accept multiple selected options only inside one `multiChoice` fill; no Phase 1 hole accepts multiple separate fills in one batch.

The fill reducer uses the same package-private Phase 1 support gates as hole discovery. A fill can therefore be syntactically valid for a discovered hole while still returning `unsupportedChoice` when it selects a valid SRD option outside the Orc Soldier Fighter manifest.

Unit-backed selections are projected from the accepted hole option's `unitRef`, not from the submitted option id. Option ids are protocol choices; Unit ids are durable draft selections.

The phase-0 draft used the name `UnitLibrary`; the current Surface package exposes `UnitCatalog`. This package exports `UnitLibrary` as a type alias to `UnitCatalog` so the runtime API can keep the durable boundary language without adding an adapter or duplicated catalog state.

The public selection types keep SRD/domain facts structured at the runtime boundary: ability assignments reuse Surface `SixAbilityScores`, class advancement entries use `CharacterClassLevel`, starting languages are Common plus two distinct selectable Standard Languages, alignment is the SRD morality/order pair, and background ability-score increases cannot select the same ability twice.

The finalized `CharacterSheet` carries selected Unit refs plus the character-sheet facts needed by the next runtime boundary: final ability scores, level-1 Hit Point maximum and Hit Die, saving throw/skill/weapon/armor/tool proficiencies, granted feature refs, activation resources such as Fighter Second Wind, and the purchased equipment/loadout refs. These facts are derived from the accepted draft and Surface Units during finalization; the package still does not export a battle seed type or battle-current HP state.

`createCharacterDraft` also accepts an optional caller-supplied `draftId`. Omitting it uses a process-local generated id for tests and simple composition roots; persisted callers should provide their stored draft identity.

Hole ids are stable domain ids. Draft-owned holes use `cc:draft:<draft path>`, and Unit-granted holes use `cc:unit:<unit id>:<choice key>`. The current support gates are package-private and intentionally narrow: Fighter, Soldier, Orc, Defense Fighting Style, Fighter Weapon Mastery over authored Simple/Martial weapon Units, Soldier Dice Set, the two starting-equipment coin/package choices, and the manifest purchase/loadout choices for Chain Mail, Longsword, and Shield.
