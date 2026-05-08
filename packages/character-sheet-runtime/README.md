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

- `maximumHp` stores the sheet's HP capacity at the session boundary; callers
  derive it from `CharacterBuild` when creating the sheet, and later handoffs
  must match it before changing current HP.
- `hitPoints` owns current HP, Temporary Hit Points, the zero-HP Death Saving
  Throw lifecycle, Stable state, death, and Knock Out's positive-HP Unconscious
  state. Current HP cannot exceed `maximumHp`.
- `spentHitDice` stores only spent player-character Hit Dice by class. Hit Die
  capacity and die size remain derived from `CharacterBuild` through
  `characterBuildHitPoints`, so rest state cannot duplicate build Hit Die
  facts.
- `spellSlotExpenditures` is present only for spellcasting builds and stores
  spent Spell Slots against build-derived capacity.
- `pactSlotExpenditure` is stored separately from ordinary Spell Slots for
  builds that have Pact Magic, preserving the SRD distinction between Spell
  Slots and Pact Slots.
- `completeShortRest` requires at least 1 current HP, can spend Hit Dice to
  restore HP, restores Pact Slots, and can apply one Wizard Arcane Recovery
  Spell Slot refund. Arcane Recovery uses Wizard level to enforce the
  half-level rounded-up recovery budget, rejects level 6+ slots, and records a
  distinct rest feature use until Long Rest.
- `completeLongRest` requires at least 1 current HP, restores HP to
  `maximumHp`, clears Temporary Hit Points, restores spent Hit Dice, restores
  ordinary Spell Slots and Pact Slots, and recharges tracked rest feature uses
  such as Arcane Recovery.
- `characterSheetArmorClassState` projects build ability scores, current
  loadout armor and Shield facts, and installed class-feature AC formulas into
  a single current Armor Class calculation. Barbarian and Monk Unarmored
  Defense are read from Surface class-feature mechanics; a multiclass build
  with multiple available class-feature base formulas must provide one
  `baseChoice`.
- `parseCharacterSheet` is the boundary parser for serialized sheets before app
  or MCP code consumes them.

Deferred homes:

- non-spell feature resources belong in a future resource module that can spend
  and restore them outside battle.
- mutable carried/equipped equipment belongs in a future equipment module,
  initialized from `CharacterBuild.equipment` once equipment-change workflows
  exist.
