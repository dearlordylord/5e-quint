# @dnd/character-sheet-runtime

Local Character Sheet runtime for player-character in-play state.

`CharacterBuild` remains the durable build/progression boundary owned by
`@dnd/character-creation-runtime`. `CharacterSheet` owns the playable character
state that can change through adventuring, rests, battle handoff, or future
equipment/resource workflows.

This package intentionally does not depend on `@dnd/battle-runtime`. Battle
projection and battle handoff settlement belong to
`@dnd/character-battle-runtime`.
