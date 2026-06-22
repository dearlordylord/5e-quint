# @dnd/character-sheet-runtime

Local Character Sheet runtime for player-character in-play state.

`CharacterBuild` remains the durable build/progression boundary owned by
`@dnd/character-creation-runtime`. `CharacterSheet` owns the playable character
state that can change through adventuring, rests, battle handoff, or future
equipment/resource workflows.

This package intentionally does not depend on `@dnd/battle-runtime`. Battle
projection and battle handoff settlement belong to
`@dnd/character-battle-runtime`.

Current executable state:

- Hit Point Maximum is derived from `CharacterBuild` and the current
  `hitPointMaximumReduction` through `characterSheetHitPointMaximum`. The sheet
  does not store normal HP capacity; fresh sheets default current HP to the
  derived effective maximum when no current HP state is supplied.
- `hitPoints` owns current HP, Temporary Hit Points, the zero-HP Death Saving
  Throw lifecycle, Stable state, death, and Knock Out's positive-HP Unconscious
  state. Current HP cannot exceed the derived effective Hit Point Maximum.
- `hitPointMaximumReduction` stores mutable play-state reductions to Hit Point
  Maximum. It is retained separately from normal build-derived capacity and
  cleared by Long Rest when the SRD says a reduced maximum returns to normal.
- `conditions` owns active sheet-visible conditions outside the HP-owned
  Unconscious lifecycle. Battle handoff projects non-Unconscious battle
  conditions back into the sheet.
- `spentHitDice` stores only spent player-character Hit Dice by class. Hit Die
  capacity and die size remain derived from `CharacterBuild` through
  `characterBuildHitPoints`, so rest state cannot duplicate build Hit Die
  facts.
- `resourceExpenditures` stores spent resource state. Resource capacity remains
  derived from `CharacterBuild` and Surface Units, so sheet state cannot diverge
  from the authored pool, and unsupported non-spell feature resources are not
  representable here.
- `spellSlotExpenditures` is present only for spellcasting builds and stores
  nonzero spent ordinary Spell Slots against build-derived capacity. Absence of
  a spell level means zero ordinary Spell Slots are expended at that level.
- `createdSpellSlots` stores only temporary Spell Slot delta state created by
  sheet features such as Font of Magic. Ordinary Spell Slot capacity still comes
  from `CharacterBuild`, and created Spell Slots vanish on Long Rest.
- `pactSlotExpenditure` stores only spent Pact Slot state for builds that have
  Pact Magic. Pact Slot level and count remain derived from `CharacterBuild`,
  preserving the SRD distinction between Spell Slots and Pact Slots without
  duplicating Pact Magic capacity. Absence means zero Pact Slots are expended.
- `completeShortRest` requires at least 1 current HP, can spend Hit Dice to
  restore HP, restores Pact Slots, and can apply one Wizard Arcane Recovery
  Spell Slot refund. Arcane Recovery uses Wizard level to enforce the
  half-level rounded-up recovery budget, rejects level 6+ slots, and records a
  distinct rest feature use until Long Rest.
- `applyCharacterSheetSpellRestBenefit` consumes an installed spell
  rest-benefit Surface shape and caller-provided completed-cast recipient
  eligibility, spends the Spell Slot at completion, applies existing Short Rest
  benefits and capped spell healing to each recipient, records a same-spell
  recipient lockout, and leaves range maintenance and interruption tracking to
  caller/table facts.
- `completeLongRest` requires at least 1 current HP, restores HP to
  the post-rest build-derived normal Hit Point Maximum, clears Temporary Hit
  Points and `hitPointMaximumReduction`, restores spent Hit Dice, clears
  ordinary Spell Slot and Pact Slot expenditures, and recharges tracked rest
  feature uses such as Arcane Recovery and spent feature pools such as Lay On
  Hands. When supplied with Weapon Mastery reselections, it replaces the
  existing `CharacterBuild` selected class-choice refs using the installed
  Surface feature's Long Rest change count and weapon eligibility facts.
- `applyLayOnHands` spends the Paladin Lay On Hands healing pool as a
  character-sheet resource action. The same pool spend restores target HP and
  pays the SRD 5 HP cost to remove Poisoned, so those costs cannot drift into
  separate balances.
- `characterSheetSpellInvocation` admits Wizard Ritual Adept ritual casting by
  projecting a ritual invocation from existing build spellbook Spell Access, a
  ritual-tagged Surface Spell Definition, and the installed spellbook Ritual
  Access feature. It does not store a separate ritual spell list or treat the
  retained feature Unit reference as execution evidence by itself.
- `characterSheetArmorClassState` projects build ability scores, current
  loadout armor and Shield facts, and installed class-feature AC formulas into
  a single current Armor Class calculation. Barbarian and Monk Unarmored
  Defense are read from Surface class-feature mechanics; a multiclass build
  with multiple available class-feature base formulas must provide one
  `baseChoice`.
- `parseCharacterSheet` is the boundary parser for serialized sheets before app
  or MCP code consumes them.

Deferred homes:

- non-spell feature resources beyond the promoted Lay On Hands sheet action
  belong in future resource modules that can spend and restore them outside
  battle.
- mutable carried/equipped equipment belongs in a future equipment module,
  initialized from `CharacterBuild.equipment` once equipment-change workflows
  exist.

Rules-kernel coverage for current sheet reducer semantics is tracked in
`plans/rules-kernel-coverage/`. New sheet reducer behavior should add or extend
a semantic obligation and connect QNT ownership to production TS through MBT or
deterministic QNT replay.
