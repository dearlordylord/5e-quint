# @dnd/battle-runtime

Battle runtime owns durable battle state, battle subjects, replay-from-root
hole/fill resolution, and snapshots for Surface-authored runtime inputs.

This package intentionally imports generic Surface `StatBlockRecord`s and shared algebras. It does not import legacy engine packages, SRD-specific stat-block collection types, or projected-executable vocabulary.

The application composition layer installs this runtime with authored Surface
content for character Units and monster Stat Blocks. It stores durable
`BattleState` separately from transient battle fills so `resolveBattleSubject`
can remain replay-from-root.

Domain boundary: battle consumes combatant seeds. Character combatant seeds are
projected from Character Sheets plus selected Unit lookups at the composition
boundary. Monster combatant seeds are projected from `StatBlockRecord`s. Battle
state must not treat a Character Sheet as a Stat Block, a Stat Block as a Unit,
or a battle seed as authored content.

## Runtime Contract

- `startBattle` accepts caller-built combatant seeds and creates sorted Initiative state.
- Character Sheet to battle-seed mapping belongs to the application composition layer, not this package. `@dnd/battle-runtime` accepts battle-owned seed data and must not import `@dnd/character-creation-runtime`.
- Character initialization consumes battle seed facts derived by the composition boundary: Hit Point maximum/current HP, Temporary Hit Points from the optional seed override or `0`, Initiative score, selected loadout, selected Unit refs, and `usesDeathSavingThrows` as the typed zero-HP lifecycle policy.
- Character Armor Class is structured `ArmorClassState`, not a copied scalar: armor base and category come from the loaded armor Unit, trained Shield bonus comes from the loaded Shield Unit and sheet armor training, and the Defense Fighting Style bonus comes from the loaded feat Unit as a conditional wearing-armor bonus.
- Monster initialization derives display name, Armor Class, Hit Points, and Initiative score from the supplied generic `StatBlockRecord`; the runtime does not import Core monster catalogs or SRD-specific collection types.
- `BattleState.currentTurnResources` uses `RuntimeActionResource[]` plus bonus-action availability from `@dnd/shared-algebras/action-economy-algebra`; it does not store a scalar action quota.
- `discoverBattleActs` exposes `srdAction.attack` for the current actor when the actor can take actions, an Attack-compatible action resource is present, and a supported character weapon attack profile is present. `runtimeCommand.endTurn` remains discoverable for the current actor.
- `resolveBattleSubject` is replay-from-root: callers pass the root `BattleState`, the selected `BattleSubject`, and all accumulated `BattleFill`s. Fills are caller/session state and are not stored in `BattleState`.
- Attack replay uses shared runtime holes and fills: target choice, attack roll, and on-hit rolled-dice damage. The damage hole id and instance key are derived at the hole boundary from the dice-result protocol and the selected weapon damage expression, for example `battle:attack:damage-result:1d8+3-slashing`.
- Filled Attack resolution uses the shared attack-roll algebra: natural 1 misses, natural 20 hits, otherwise the total is compared to the target's current Armor Class. A miss spends the Attack action and leaves HP unchanged. A hit asks for weapon damage dice before spending the action; Critical Hits require the doubled weapon damage dice hole. Once valid damage dice are supplied, the runtime sums the rolled dice plus the attack ability modifier, applies Temporary Hit Points first, clamps HP at `0`, and then spends the Attack action.
- Zero-HP lifecycle state is a typed union on the combatant and the snapshot projects that one lifecycle object. Stat Block combatants use `diesAtZeroHp`; their dead status is derived from `0` HP. Character Sheet combatants use `usesDeathSavingThrows`; when damage drops them to `0` HP and does not kill instantly by Massive Damage, the runtime applies the Unconscious condition and initializes the death-save counters. Later damage at `0` HP records Death Saving Throw failures, including the Critical Hit two-failure case, and projects death once failures reach three. Damage that equals or exceeds the target's Hit Point maximum after reducing current HP to `0`, including damage taken while already at `0` HP, applies instant death. Start-turn Death Saving Throw rolls remain outside the CAM15 runtime slice.
- `endTurn` is a runtime command, not an SRD Action. It accepts no holes or fills, advances the current actor through the shared Initiative algebra, increments the round after the last actor in the order acts, and resets the next actor's per-turn action resources.
- `battle-runtime-slice.qnt` is the executable package-local spec for this runtime. Its covered slice is Initiative/current actor, End Turn, Attack replay holes, hit/miss, action spend, damage, Temporary Hit Points, HP clamp, and the supported zero-HP lifecycle policy.
- `snapshotBattle` projects a JSON-friendly read model without exposing mutable `Map` internals.

## RAW Traceability For Retained Phase-1 Behavior

- Initiative order and the current actor are traced to SRD 5.2.1 `Playing-the-Game.md` "Combat" / "Initiative": combat is organized into rounds and turns, everyone rolls Initiative at the beginning of combat, the GM ranks combatants from highest to lowest Initiative, and that order remains the same from round to round. `UBIQUITOUS_LANGUAGE.md` defines Initiative as the Dexterity check that determines turn order.
- Deterministic initialization uses Initiative scores for the phase-1 fixture: SRD 5.2.1 `Rules-Glossary.md` "Initiative" defines the Initiative score as `10 + Dexterity modifier`, and `Rules-Glossary.md` "Stat Block" says monster AC, Initiative, and HP entries appear in the monster's stat block.
- Character Hit Point maximum and Initiative are traced to SRD 5.2.1 `Character-Creation.md` "Hit Points" and "Initiative": level-1 Hit Points come from class plus Constitution modifier, and Initiative written on the character sheet is the Dexterity modifier. This runtime consumes finalized sheet facts rather than recalculating character creation legality.
- Character Armor Class is traced to SRD 5.2.1 `Playing-the-Game.md` "Armor Class" and `Equipment.md` "Armor": base AC can come from armor, Shield benefit requires Shield training, and the Defense feat says wearing Light, Medium, or Heavy armor grants +1 AC.
- `endTurn` is exposed as a runtime command, not an SRD Action. SRD combat has participants take turns in Initiative order and starts a new round after everyone has taken a turn. `ASSUMPTIONS.md` A2 records the repository's explicit modeling decision to expose a discrete End Turn transition because D&D has end-of-turn trigger points even though "end turn" is not itself an SRD action.
- Per-turn action resources are traced to SRD 5.2.1 `Playing-the-Game.md` "Your Turn" / "Actions" and "Bonus Actions": on your turn you can take one action, and at most one Bonus Action when a rule grants one. `UBIQUITOUS_LANGUAGE.md` defines Action and Bonus Action using those same per-turn resource boundaries.
- Attack replay is traced to SRD 5.2.1 `Rules-Glossary.md` "Attack [Action]" and `Playing-the-Game.md` "Making an Attack": taking the Attack action permits one weapon or Unarmed Strike attack roll, attacks choose a target, and resolving the attack makes an attack roll. `Playing-the-Game.md` "Attack Rolls" says an attack roll hits when it equals or exceeds the target's Armor Class, with natural 20 and natural 1 overriding the total.
- Attack availability for a 0-HP character is traced to SRD 5.2.1 `Rules-Glossary.md` "Incapacitated [Condition]" and "Unconscious [Condition]": Incapacitated prevents actions, and Unconscious includes Incapacitated. `UBIQUITOUS_LANGUAGE.md` preserves the same condition relationship.
- Longsword damage-hole naming is traced to SRD 5.2.1 `Equipment.md` "Weapons" and `Playing-the-Game.md` "Damage Rolls": weapon damage specifies the amount and type dealt on a hit, the Longsword row is `1d8 Slashing` with the Versatile `1d10` property, and weapon damage rolls add the same ability modifier used for the attack roll. The first vertical uses the character sheet's one-handed Longsword loadout with Strength +3, so the selected damage expression is `1d8+3-slashing`; on a Critical Hit, the weapon dice are doubled before adding the modifier, so the selected damage expression is `2d8+3-slashing`.
- Damage application is traced to SRD 5.2.1 `Playing-the-Game.md` "Hit Points" and "Temporary Hit Points": current HP can range down to `0`, damage subtracts from HP, and Temporary Hit Points are lost before leftover damage carries over to HP.
- Zero-HP lifecycle is traced to SRD 5.2.1 `Playing-the-Game.md` "Dropping to 0 Hit Points": Monster Death happens instantly at `0` HP, while a character that reaches `0` HP and does not die instantly gains the Unconscious condition and faces Death Saving Throws; Massive Damage can kill instantly, and damage at `0` HP causes one failure, or two from a Critical Hit. `ASSUMPTIONS.md` A12 fixes the phase-1 boundary: Stat Block monsters die at `0` HP and Character Sheet participants use the death-save track. The runtime does not yet model nonlethal melee knockout or start-turn Death Saving Throw rolls.
