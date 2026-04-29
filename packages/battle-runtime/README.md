# @dnd/battle-runtime

Battle runtime owns the durable battle state, phase-1 battle subjects, replay-from-root hole/fill boundary, and snapshots for the Surface/Unit green path.

This package intentionally imports generic Surface `StatBlockRecord`s and shared algebras. It does not import legacy engine packages, SRD-specific stat-block collection types, or projected-executable vocabulary.

The current runtime covers the CAM11/CAM12 boundary:

- `startBattle` accepts caller-built combatant seeds and creates sorted Initiative state.
- `startBattleFromCharacterSheetAndStatBlock` accepts the finalized `CharacterSheet` from `@dnd/character-creation-runtime`, the Surface `UnitCatalog`, and a generic `StatBlockRecord`; it derives the character seed and monster seed before calling `startBattle`.
- Character initialization derives Hit Point maximum/current HP from the sheet, Temporary Hit Points from the optional seed override or `0`, Initiative score from Dexterity modifier, the selected loadout from the sheet, and `usesDeathSavingThrows` as the typed zero-HP lifecycle policy.
- Character Armor Class is structured `ArmorClassState`, not a copied scalar: armor base and category come from the loaded armor Unit, trained Shield bonus comes from the loaded Shield Unit and sheet armor training, and the Defense Fighting Style bonus comes from the loaded feat Unit as a conditional wearing-armor bonus.
- Monster initialization derives display name, Armor Class, Hit Points, and Initiative score from the supplied generic `StatBlockRecord`; the runtime does not import Core monster catalogs or SRD-specific collection types.
- `BattleState.currentTurnResources` uses `RuntimeActionResource[]` plus bonus-action availability from `@dnd/shared-algebras/action-economy-algebra`; it does not store a scalar action quota.
- `discoverBattleActs` exposes only the phase-1 `coreAct.attack` and `coreAct.endTurn` subjects for the current actor.
- `resolveBattleSubject` is replay-from-root: callers pass the root `BattleState`, the selected `BattleSubject`, and all accumulated `BattleFill`s. Fills are not stored in `BattleState`.
- CAM11 has no battle hole/fill protocol yet: `BattleHole` and `BattleFill` are `never`, so unsupported Unit/effect-shaped asks are not publicly representable through this package.
- `snapshotBattle` projects a JSON-friendly read model without exposing mutable `Map` internals.

Attack and End Turn resolution beyond act discovery are intentionally left as later tasks. Until CAM13 adds target/roll/damage replay and CAM15 adds End Turn state advancement, resolving either subject returns `invalid` with `unsupportedSubject` rather than mutating state or inventing placeholder holes.

## RAW Traceability For Retained Phase-1 Behavior

- Initiative order and the current actor are traced to SRD 5.2.1 `Playing-the-Game.md` "Combat" / "Initiative": combat is organized into rounds and turns, everyone rolls Initiative at the beginning of combat, the GM ranks combatants from highest to lowest Initiative, and that order remains the same from round to round. `UBIQUITOUS_LANGUAGE.md` defines Initiative as the Dexterity check that determines turn order.
- Deterministic initialization uses Initiative scores for the phase-1 fixture: SRD 5.2.1 `Rules-Glossary.md` "Initiative" defines the Initiative score as `10 + Dexterity modifier`, and `Rules-Glossary.md` "Stat Block" says monster AC, Initiative, and HP entries appear in the monster's stat block.
- Character Hit Point maximum and Initiative are traced to SRD 5.2.1 `Character-Creation.md` "Hit Points" and "Initiative": level-1 Hit Points come from class plus Constitution modifier, and Initiative written on the character sheet is the Dexterity modifier. CAM12 consumes those finalized sheet facts rather than recalculating character creation legality.
- Character Armor Class is traced to SRD 5.2.1 `Playing-the-Game.md` "Armor Class" and `Equipment.md` "Armor": base AC can come from armor, Shield benefit requires Shield training, and the Defense feat says wearing Light, Medium, or Heavy armor grants +1 AC.
- `endTurn` is exposed only as a discoverable subject in this skeleton. SRD combat has participants take turns in Initiative order and starts a new round after everyone has taken a turn. `ASSUMPTIONS.md` A2 records the repository's explicit modeling decision to expose a discrete End Turn transition because D&D has end-of-turn trigger points even though "end turn" is not itself an SRD action. CAM15 owns the state transition.
- Per-turn action resources are traced to SRD 5.2.1 `Playing-the-Game.md` "Your Turn" / "Actions" and "Bonus Actions": on your turn you can take one action, and at most one Bonus Action when a rule grants one. `UBIQUITOUS_LANGUAGE.md` defines Action and Bonus Action using those same per-turn resource boundaries.
- Snapshot `defeated` is a read-model projection from `hp === 0`. SRD 5.2.1 `Playing-the-Game.md` "Dropping to 0 Hit Points" distinguishes Monster Death from player-character death saves; the durable state keeps the explicit `zeroHpLifecyclePolicy` alongside HP so later damage/death-save tasks can refine behavior without encoding death as a copied scalar.
