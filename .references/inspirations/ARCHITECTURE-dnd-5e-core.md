# Architecture: dnd-5e-core (codingame-team/dnd-5e-core)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Python 3.10+ |
| Framework | dataclasses (stdlib), no external framework for models |
| Edition target | D&D 5e (SRD-aligned, 5.1-era data via dnd5eapi.co) |
| License | MIT |
| LOC (engine core) | ~17,800 (71 Python files in `dnd_5e_core/`) |
| LOC (tests) | ~3,300 (23 files, 7 of which are empty stubs) |
| Bundled data | 8.7 MB — 4,233 JSON files (332 monsters, 319 spells, 65 weapons, 30 armors, plus classes, feats, backgrounds, etc.) |
| Test coverage | Low-moderate — integration-style "demo" tests with print output and manual assertions; no property testing, no invariant checking; 7/23 test files are 0 bytes |
| Active development | Alpha (v0.4.4), published to PyPI, sole team, feature-breadth-first |

## Core Architecture Pattern

**Mutable-Dataclass CRUD** with JSON data loading.

The architecture is a straightforward OOP design with three layers:

1. **Data layer** (`data/`) — JSON files bundled from dnd5eapi.co, loaded into Python objects by `loader.py` and `loaders.py`
2. **Domain layer** (`entities/`, `combat/`, `abilities/`, `equipment/`, `spells/`, `classes/`, `races/`, `mechanics/`) — mutable `@dataclass` objects that hold game state and embed behavior as methods
3. **Integration layer** (`combat/combat_system.py`, `examples/`) — procedural combat orchestration with AI-driven turn logic

There is no formal state machine, event system, or command pattern. Combat is driven by imperative method calls that mutate objects in place. The codebase prioritizes feature breadth (332 monsters, 24 class abilities, 49 magic items) over behavioral correctness.

## State Model

### Character (`entities/character.py`, 1,300 LOC)

The largest single file. A `@dataclass` with ~30 fields covering the entire character sheet:

```
Character
  name, race, subrace, ethnic, gender, height, weight, age
  class_type: ClassType
  abilities: Abilities (STR/DEX/CON/INT/WIS/CHA scores)
  ability_modifiers: Abilities (derived modifiers, stored separately)
  hit_points, max_hit_points
  level, xp, gold, speed
  inventory: List[Optional[Equipment]] (fixed 20-slot array, None = empty)
  sc: Optional[SpellCaster] (spell slots + learned spells)
  conditions: Optional[List[Condition]]
  weapon/armor/shield: derived via @property scanning inventory
  ac_bonus, multi_attack_bonus, str_effect_modifier, ...
  status: str ("OK" | "DEAD" | "LOST")
```

Key design choices:
- **Ability modifiers stored separately** from ability scores. The `ability_modifiers` field is a second `Abilities` instance holding `(score - 10) // 2` values, computed at creation and not auto-synced. This is redundant state that can diverge.
- **Inventory is a fixed-size list** with `None` sentinel values for empty slots. Equipment is found via `isinstance` checks and `.equipped` flags scanning the entire list.
- **AC computed dynamically** from inventory scan (`armor_class` property), checking armor, shields, magic items, and `ac_bonus` field.
- **Class-specific fields added dynamically** via `setattr` in `simple_character_generator` (e.g., `rage_active`, `sneak_attack_dice`, `ki_points`). These are not declared in the dataclass — they exist only at runtime.

### Monster (`entities/monster.py`, 445 LOC)

Simpler than Character. A `@dataclass` with:

```
Monster
  index, name, abilities, proficiencies
  armor_class: int (flat value, not computed)
  hit_points, max_hit_points
  hit_dice: str (e.g., "2d8+2")
  xp, speed, challenge_rating
  actions: List[Action]
  sc: Optional[SpellCaster]
  sa: Optional[List[SpecialAbility]]
  creature_type: Optional[str]
  source: Optional[str]
```

Monsters embed their own `attack()`, `cast_attack()`, `special_attack()`, `saving_throw()`, `take_damage()` methods. Attack logic includes dice rolling, hit/miss resolution, damage application, and condition application — all in one method. No separation between decision and resolution.

### Combat State

There is no explicit combat state object. `CombatSystem` is stateless — it takes `alive_chars`, `alive_monsters`, `party`, and `round_num` as parameters. Combat state is implicit in the mutable entities and the lists passed around.

## Event/Action System

### No Event System

There is no event, command, or action queue. Combat is purely procedural:

1. `CombatSystem.monster_turn()` / `character_turn()` is called with mutable lists
2. The method checks priorities (heal > spell > special attack > melee)
3. It calls entity methods that directly mutate state
4. Dead creatures are removed from `alive_*` lists in-place
5. Results are logged via `log_message()` (print or callback)

### AI Decision Logic (`combat/combat_system.py`, 500 LOC)

`CombatSystem` contains hardcoded AI priorities:

**Monster priority**: heal injured allies > cast attack spell > use special ability > normal melee attack > simple fallback (1d8 bludgeoning)

**Character priority**: heal party members (HP < 50%) > drink potion (HP < 30%) > use magic item action (40% chance) > weapon/spell attack

Target selection: characters are divided into "melee" (index < 3) and "ranged" (index >= 3) by list position. Monsters target the lowest-HP creature. This is a positional model, not a spatial one.

### Action (`combat/action.py`, 82 LOC)

Actions are data containers, not behavioral objects:

```
Action
  name, desc, type: ActionType (MELEE/RANGED/MIXED/SPECIAL)
  damages: List[Damage]
  effects: List[Condition]
  multi_attack: List[Action | SpecialAbility]
  attack_bonus: int
  normal_range, long_range: int
```

Multi-attack is recursive: an Action's `multi_attack` field contains child Actions that are executed in sequence.

### SpecialAbility (`combat/special_ability.py`, 122 LOC)

Similar to Action but with recharge mechanics (`recharge_on_roll`), area of effect, and saving throw parameters. Death-triggered abilities are identified by name matching ("death" or "burst" in name).

## Condition/Effect System

### Condition (`combat/condition.py`, 395 LOC)

Conditions are `@dataclass` objects with:

```
Condition
  index: str (e.g., "restrained", "poisoned")
  name, desc: str (human-readable description of effects)
  dc_type: Optional[AbilityType]
  dc_value: Optional[int]
  creature: Optional[Monster] (source creature for grapple/charm/etc.)
  duration: Optional[int] (rounds, None = until saved)
```

**Critical design issue**: Condition mechanical effects are described in the `desc` string field but **not mechanically enforced**. The `Condition` class itself does not modify attack rolls, saving throws, or movement. Mechanical effects are partially hardcoded in the combat system (e.g., `_select_target_monster` handles restrained by forcing attacks against the grappler) but most condition effects are simply not implemented.

Factory functions create specific conditions: `create_restrained_condition()`, `create_poisoned_condition()`, `create_paralyzed_condition()`, etc. These set the correct DC type and description but do not wire up mechanical effects.

### ConditionParser (`combat/condition_parser.py`, 232 LOC)

Regex-based parser that extracts conditions from monster action description text:

1. Scans description for condition keywords ("restrained", "poisoned", etc.)
2. Extracts DC value and ability type via regex (`DC\s*(\d+)\s*(\w+)`)
3. Creates `Condition` objects using factory functions
4. Attached to loaded monsters as `action.effects`

This is an interesting approach to data extraction but fragile — it depends on consistent SRD description formatting.

### Condition Application

Conditions are appended to `creature.conditions` list. Duplicate prevention is by `index` matching. Removal filters the list. There is no modifier injection, no stacking logic, no interaction between conditions (e.g., Unconscious implying Incapacitated + Prone is not modeled).

## Spatial Model

**Positional only, not spatial.** Characters are ordered in a list — indices 0-2 are "melee" (front row), indices 3+ are "ranged" (back row). There is no grid, no distance calculation, no movement system, no opportunity attacks. The `Monster.attack()` method accepts a `distance` parameter for ranged disadvantage but `CombatSystem` defaults it to 5.0.

The `Sprite` class in `entities/sprite.py` holds x/y coordinates and image data for UI rendering, but this is purely presentational — combat logic does not use spatial positions.

## Content vs Engine Boundary

**Heavy content, thin engine.** The project's main value proposition is the bundled data corpus:

- **4,233 JSON files** in `dnd_5e_core/data/` covering monsters, spells, weapons, armors, classes, races, feats, backgrounds, conditions, damage types, equipment categories, magic items, and more
- Data sourced from dnd5eapi.co (official SRD API) and 5e.tools (extended bestiary)
- `loader.py` (1,652 LOC) contains all JSON-to-object conversion: `load_monster()`, `load_spell()`, `load_weapon()`, `load_armor()`

The engine code (`combat/`, `mechanics/`) is relatively thin compared to the data loading infrastructure. Monster parsing alone (`_create_monster_from_data`) handles abilities, proficiencies, actions with damage types, spellcasting, special abilities with recharge mechanics, and condition extraction from descriptions.

**Serialization** (`data/serialization.py`, 286 LOC) provides JSON round-trip via `DndJSONEncoder` but deserialization back to typed objects is partial.

## Verification Story

**Weak.** The test suite has structural problems:

- **7 of 23 test files are empty** (0 bytes): `test_combat.py`, `test_conditions.py`, `test_character.py`, `test_monster.py`, `test_equipment.py`, `test_spells.py`, `__init__.py`
- **Non-empty tests are integration demos**, not unit tests. They create characters/monsters, run combat, and print results with emoji. Assertions exist but test broad outcomes (e.g., "Level 5 fighter should have 2 attacks").
- **Tests use hardcoded `sys.path`** to a developer's local machine (`/Users/display/PycharmProjects/dnd-5e-core`)
- **No pytest fixtures, no mocking, no property-based testing**
- **No invariant checking** — conditions like "HP never exceeds max_hit_points" are not validated
- **Exception swallowing**: `CombatSystem` wraps nearly every operation in `try/except Exception: pass` or fallback logic, masking bugs

The combat system's `_simple_monster_attack` fallback (random 1d8 bludgeoning) is called when any exception occurs during normal attack resolution, making it impossible to distinguish correct behavior from error recovery.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Bundled data corpus as package asset** — Shipping 332 monsters, 319 spells, and 65 weapons as JSON alongside the engine is a practical pattern for offline-first design. Our project could benefit from a similar bundled SRD data set for test fixtures and content authoring, though our source of truth remains the Quint spec.

2. **ConditionParser — regex extraction from SRD descriptions** — Automatically parsing conditions, DC values, and ability types from monster action descriptions is a pragmatic approach to data extraction. While fragile, it solves the real problem of converting prose rules into structured data. Could inspire a similar parser for our SRD reference corpus to generate Quint test cases.

3. **Multi-attack as recursive Action composition** — The `Action.multi_attack: List[Action | SpecialAbility]` pattern cleanly represents "Multiattack: The dragon makes three attacks: one with its bite and two with its claws" as a tree of actions. Worth considering for how we model Extra Attack and Multiattack in the XState machine.

4. **Encounter builder with CR-based tables** — `mechanics/encounter_builder.py` encodes the DMG encounter building tables as structured data (Fraction-based CR ranges per party level). If we ever model encounter difficulty, this table structure is a ready reference.

5. **AI priority system for automated combat** — The heal > spell > special > melee priority chain in `CombatSystem` is a simple but functional pattern for combat automation. Useful as a reference if we build AI opponents for testing or simulation.

### Anti-Patterns (For Us)

1. **Redundant derived state** — Storing `ability_modifiers` as a separate `Abilities` instance duplicates data derivable from `abilities`. In our project, this would violate the "no redundant state" rule and create divergence bugs.

2. **Condition effects as description strings** — Conditions describe their mechanical effects in `desc` but do not implement them. "Disadvantage on attack rolls" is text, not code. Our Quint spec enforces condition effects as state transitions — far superior for correctness.

3. **Dynamic field injection via setattr** — Class-specific fields (`rage_active`, `ki_points`, `sneak_attack_dice`) are added at runtime via `simple_character_generator`, not declared in the dataclass. This defeats type checking and makes the state shape unpredictable. Our typed discriminated unions (class-specific state variants) are strictly better.

4. **Blanket exception swallowing** — `try/except Exception: pass` throughout `CombatSystem` hides every bug. In a formal-methods project, this is antithetical. Errors must surface, not be silently absorbed.

5. **No state snapshots or replay** — All state is mutable with no snapshot mechanism. Combat cannot be replayed, diffed, or rolled back. Our immutable Quint state and XState context snapshots are fundamental to MBT parity testing.

6. **Positional combat model (index-based front/back row)** — Characters in positions 0-2 are "melee," 3+ are "ranged." This is a Wizardry-era simplification that loses the tactical richness of 5e's spatial rules while also being too concrete (hardcoded indices) for our abstract approach.

7. **Mixed concerns in entity classes** — `Monster.attack()` combines target selection, dice rolling, hit resolution, damage calculation, condition application, and message formatting in a single 120-line method. Our separation of spec (Quint), runtime (XState), and presentation (React) is architecturally cleaner.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `dnd_5e_core/data/loader.py` | 1,652 | JSON-to-object conversion for all entity types |
| `dnd_5e_core/entities/character.py` | 1,300 | Player character: 30-field dataclass with attack, heal, level-up, spell casting |
| `dnd_5e_core/equipment/magic_item_factory.py` | 907 | Factory functions for 49 predefined magic items |
| `dnd_5e_core/equipment/weapon_factory.py` | 658 | Factory functions for weapon creation from JSON |
| `dnd_5e_core/entities/special_monster_actions.py` | 599 | Monster-specific action overrides and special cases |
| `dnd_5e_core/data/loaders.py` | 559 | Character generator, level-up, API-based loading |
| `dnd_5e_core/combat/combat_system.py` | 500 | Stateless combat orchestrator with AI priority logic |
| `dnd_5e_core/mechanics/class_abilities.py` | 495 | 12 class ability implementations (Rage, Sneak Attack, Ki, etc.) |
| `dnd_5e_core/data/collections.py` | 484 | Batch loading of all spells, weapons, armors from JSON |
| `dnd_5e_core/entities/monster.py` | 445 | Monster dataclass with attack, spell, and special ability methods |
| `dnd_5e_core/equipment/magic_item.py` | 438 | Magic item base class with attunement, charges, actions |
| `dnd_5e_core/mechanics/encounter_builder.py` | 427 | DMG encounter tables and random encounter generation |
| `dnd_5e_core/combat/condition.py` | 394 | Condition dataclass + 10 factory functions for SRD conditions |
| `dnd_5e_core/equipment/armor_factory.py` | 374 | Armor creation from JSON with magic armor support |
| `dnd_5e_core/mechanics/subclass_system.py` | 373 | 40+ subclass definitions and feature application |
| `dnd_5e_core/mechanics/racial_traits.py` | 311 | 20 racial trait implementations (Darkvision, Lucky, etc.) |
| `dnd_5e_core/data/serialization.py` | 286 | JSON encoder/decoder for game state persistence |
| `dnd_5e_core/combat/condition_parser.py` | 232 | Regex-based condition extraction from SRD descriptions |
| `dnd_5e_core/mechanics/dice.py` | 146 | DamageDice: parse and roll dice notation (e.g., "2d6+3") |
| `dnd_5e_core/combat/special_ability.py` | 122 | Special abilities with recharge mechanics and AoE |
| `dnd_5e_core/abilities/abilities.py` | 110 | Six ability scores with modifier calculation |
| `dnd_5e_core/equipment/equipment.py` | 98 | Base Equipment class, Cost, EquipmentCategory |
| `dnd_5e_core/combat/action.py` | 82 | Action dataclass with multi-attack composition |
| `dnd_5e_core/combat/damage.py` | 43 | Damage type + dice pairing |
