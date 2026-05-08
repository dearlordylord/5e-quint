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
- `spellSlotExpenditures` is present only for spellcasting builds and stores
  spent Spell Slots against build-derived capacity.
- `characterSheetArmorClassState` projects build ability scores, current
  loadout armor and Shield facts, and installed class-feature AC formulas into
  a single current Armor Class calculation. Barbarian and Monk Unarmored
  Defense are read from Surface class-feature mechanics; a multiclass build
  with multiple available class-feature base formulas must provide one
  `baseChoice`.
- `parseCharacterSheet` is the boundary parser for serialized sheets before app
  or MCP code consumes them.

Deferred homes:

- remaining Hit Dice belong in a future Hit Dice module, initialized from the
  build-derived pool once Short/Long Rest workflows exist.
- non-spell feature resources belong in a future resource module that can spend
  and restore them outside battle.
- mutable carried/equipped equipment belongs in a future equipment module,
  initialized from `CharacterBuild.equipment` once equipment-change workflows
  exist.
