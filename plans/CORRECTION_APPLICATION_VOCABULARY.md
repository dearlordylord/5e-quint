# Correction Application Vocabulary

Technical vocabulary for the Correction Application Migration green path.
Domain rules language remains in [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).
This file names repository architecture terms that cross Surface, character
creation, battle runtime, and MCP composition.

## Terms

authored Surface content - static rules content decoded from `@dnd/surface`.
It has provenance. It is not reducer state, session state, a battle seed, or a
projected executable IR. Lookup catalogs are an implementation detail for
installing authored content, not the main domain distinction.

Unit - authored Surface content record for a selectable or ownable game object:
class, background, species aggregate, feature, feat, spell, weapon, armor,
shield, mastery, item, and similar records. A player character can select or
reference Units during creation and finalization. A character, character draft,
character sheet, combatant, monster, and monster Stat Block are not Units.

Unit lookup - current implementation mechanism for finding authored Units.
Character creation reads authored Unit content to discover legal holes and
finalize selected Unit references. Battle composition may read selected
character Unit refs to derive seed facts such as armor, shield, weapon, or
feature bonuses.

Stat Block lookup - current implementation mechanism for finding authored
monster Stat Blocks. Stat Blocks are a separate record family from Units. A Stat
Block may later reuse shared Surface sub-shapes for actions, attacks, damage, or
resources, but it remains a monster-authored Stat Block record and is not a
Unit.

Character Draft - session-owned mutable character-creation state with holes
still to fill. It is not authored content and not a Unit. Draft holes may be
opened by missing draft structure (`cc:draft:<path>`) or by selected Units
(`cc:unit:<unit id>:<choice key>`). Filling a draft can reveal more holes.

Character Sheet - finalized player-character boundary produced from a complete
legal Character Draft. It carries selected Unit references plus derived
player-character facts such as ability scores, proficiencies, HP maximum, and
loadout. It is not a Unit, not a Stat Block, and not a battle seed.

Battle Seed - runtime input used to initialize a combatant in battle. Character
battle seeds are projected from a Character Sheet plus selected Unit lookups in
the MCP green package. Monster battle seeds are projected from a Stat Block
record. A battle seed is not authored content and must not become a second
executable content language.

shared sub-shape reuse - reuse of a common Surface shape inside different
authored record families. For example, a future monster attack may use the same
damage expression shape as a weapon or spell effect. That reuse does not make
the monster Stat Block a Unit.

support gate - package-private narrowing from all authored content to the
currently implemented runtime slice. Support gates are allowed while the green
path is narrow. They must not become public semantic classifications and should
disappear as support widens.

## Boundary Flow

```text
Character creation:
authored Units -> CharacterDraft holes/fills -> CharacterSheet with Unit refs

Monster selection:
authored Stat Block -> StatBlockRecord

Battle composition:
CharacterSheet + Unit lookups -> CharacterCombatantSeed
StatBlockRecord -> MonsterCombatantSeed
CharacterCombatantSeed + MonsterCombatantSeed -> BattleState
```

## Invariants

- Do not model monster Stat Blocks as Units.
- Do not model a Character Draft or Character Sheet as a Unit.
- Do not model a Stat Block as a Character Sheet.
- Do not use Unit, Stat Block, or Character Sheet as the shared battle
  participant type; use creature/combatant-level battle state.
- Do not introduce a new executable IR between Surface and runtime packages.
- Put cross-runtime mapping in the MCP green package unless there is a
  deliberate package ownership change.

## Example Checks

Question: should Goblin Warrior be a Unit so battle can find it next to Fighter
and Longsword?

Answer: no. Goblin Warrior is an authored Stat Block. Fighter and Longsword are
Units. Battle may consume both authored record families through composition, but
mixing the records collapses the monster/player-character boundary.

Question: during character creation, does selecting Fighter make the character a
Unit?

Answer: no. Fighter is a Unit selected by the Character Draft. The draft remains
mutable player-character creation state. Finalization produces a Character Sheet
with Unit references and derived facts.

Question: can a monster attack use the same damage-expression shape as a weapon
Unit?

Answer: yes, as shared sub-shape reuse. The Stat Block remains a Stat Block.
