# Correction Application Vocabulary

Technical vocabulary for the Correction Application Migration plan.
Domain rules language remains in [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
This file names repository architecture terms that cross Surface, character
creation, battle runtime, and MCP composition.

Status: migration vocabulary. Stable package-owned terms should move into the
owning package docs as packages mature; this file preserves cross-package
planning language and restore-work context.

## Terms

authored Surface content - static rules content decoded from `@dnd/surface`.
It has provenance. It is a broad category, not a synonym for Unit. Authored
Surface content includes multiple record families, including Units and monster
Stat Blocks. It is not reducer state, session state, battle creature state, or
a projected executable IR. Lookup catalogs are an implementation detail for
installing authored content, not the main domain distinction.

Unit - one authored Surface content record family: selectable or ownable game
objects that can be referenced as a capability, option, or grant. Current
examples include class, background, species aggregate, feature, feat, spell,
weapon, armor, shield, mastery, item, and similar records. A Unit is not
"anything authored in Surface"; monster Stat Blocks are authored Surface
content but are not Units.

Stat Block record - one authored Surface content record family for monsters and
NPCs in the SRD Stat Block sense. Despite the name, a Stat Block is not only
numeric stats: it is the authored rules record for a monster, including traits,
actions, resources, senses, languages, and other entries the SRD places in a
monster stat block. It is authored content, but it is not selectable/ownable
Unit content. A Stat Block may later reuse shared Surface sub-shapes for
actions, attacks, damage, or resources, but it remains a monster-authored Stat
Block record and is not a Unit.

Unit lookup - implementation mechanism for finding authored Units.
Character creation reads authored Unit content to discover legal holes and
finalize selected Unit references. Battle composition may read selected
character Unit refs to derive init facts such as armor, shield, weapon, or
feature bonuses.

Stat Block lookup - implementation mechanism for finding authored monster Stat
Blocks.

Battle Creature Init - one-time runtime input used to initialize a creature in
battle. Character creature-init inputs are projected from a Character Sheet plus
selected Unit lookups at the MCP composition boundary. Stat Block creature-init
inputs are projected from a Stat Block record plus encounter-local facts such
as combatant identity and current HP. A creature-init input is not the creature;
it is consumed by `startBattle` to build battle creature state.

Battle Creature State - durable runtime combat view of a creature inside one
battle. Character-derived and Stat Block-derived participants both become
Battle Creature State. This is the shared combat abstraction; Unit, Character
Sheet, Stat Block, and Battle Creature Init are source or initialization
boundaries, not participant state.

shared sub-shape reuse - reuse of a common Surface shape inside different
authored record families. For example, a future Stat Block attack may use the same
damage expression shape as a weapon or spell effect. That reuse does not make
the monster Stat Block a Unit.

support gate - package-private narrowing from all authored content to the
implemented runtime slice. Support gates are allowed while a runtime package is
narrow. They must not become public semantic classifications and should
disappear as support widens.

## Boundary Flow

```text
Character creation:
character creation runtime -> CharacterSheet with Unit refs

Stat Block selection:
authored Stat Block -> StatBlockRecord

Battle composition:
CharacterSheet + Unit lookups -> CharacterBattleCreatureInit
StatBlockRecord -> StatBlockBattleCreatureInit
CharacterBattleCreatureInit + StatBlockBattleCreatureInit -> BattleState
```

## Invariants

- Do not model monster Stat Blocks as Units.
- Do not model a Stat Block as a Character Sheet.
- Do not use Unit, Stat Block, Character Sheet, or Battle Creature Init as the
  shared battle participant type; use creature/combatant-level battle state.
- Do not let Stat Block-derived creatures own Units merely because Stat Blocks
  reuse shared Surface sub-shapes.
- Do not introduce a new executable IR between Surface and runtime packages.
- Put cross-runtime mapping at the MCP composition boundary unless there is a
  deliberate package ownership change.

## Example Checks

Question: should Goblin Warrior be a Unit so battle can find it next to Fighter
and Longsword?

Answer: no. Goblin Warrior is an authored Stat Block. Fighter and Longsword are
Units. Battle may consume both authored record families through composition, but
mixing the records collapses the monster/player-character boundary.

Question: can a Stat Block attack use the same damage-expression shape as a weapon
Unit?

Answer: yes, as shared sub-shape reuse. The Stat Block remains a Stat Block.
