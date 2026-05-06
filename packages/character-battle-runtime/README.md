# @dnd/character-battle-runtime

Composition package for Character Sheet and battle-runtime integration.

This package owns Character Sheet to battle creature initialization and battle
handoff settlement back onto an existing Character Sheet. `@dnd/battle-runtime`
must not import Character Sheet types directly.

Owned boundary functions:

- `characterSheetBattleInit` projects an existing Character Sheet plus caller
  battle facts into battle-runtime creature initialization.
- `applyBattleHandoffToCharacterSheet` settles battle-owned HP, Knock Out,
  zero-HP lifecycle, and Spell Slot expenditure state back onto the same
  Character Sheet identity after confirming the battle combatant's max HP still
  matches the sheet's HP capacity.

MCP and app code should call this package instead of owning parallel
Character Sheet/battle projection logic.
