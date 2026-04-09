# Architecture: natural_20 (jedld/natural_20)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Ruby 2.5+ |
| Framework | Standalone gem (ActiveSupport, TTY for CLI, I18n) |
| Edition target | D&D 5e SRD (2014 era, 5.1) |
| License | MIT |
| LOC (engine core) | ~12,050 (lib/) |
| LOC (content YAML) | ~3,100 (npcs/, items/, char_classes/, races/, maps/) |
| LOC (tests) | ~2,850 (spec/) |
| Test coverage | Moderate -- RSpec scenarios for all action types, map, AI, battle loop |
| Active development | Low (sole author, Joseph Dayo, last major push ~2020-2022) |

## Core Architecture Pattern

**Resolve-then-Commit with YAML-driven content.**

The engine separates combat into two distinct phases per action:

1. **Resolve** (`action.resolve(session, map, opts)`) -- computes outcome (dice rolls, hit/miss, damage) and populates `@result` as an array of plain hash "items." No state mutation occurs.
2. **Commit** (`battle.commit(action)`) -- iterates `action.result`, dispatches each item to every `Action` subclass via polymorphic `apply!(battle, item)`, and each `apply!` method mutates state within a `transaction` block using `txn()` calls.

This pattern provides a clear intent/effect boundary. The `@result` array is essentially an event log -- each item is a hash with `:type`, `:source`, `:target`, `:damage`, etc. The `apply!` methods are the only place state changes happen.

## State Model

### Entity State -- Split Between Entity and Battle

Entity state lives in two locations, creating a dual-ownership pattern:

**Intrinsic state** (on the entity itself via the `Entity` module mixin):
- `@hp`, `@max_hp` -- hit points
- `@ability_scores` -- `{str: 12, dex: 20, ...}`
- `@statuses` -- `Set` of symbols (`:dead`, `:unconscious`, `:prone`, `:stable`, `:grappled`, `:squeezed`)
- `@death_saves`, `@death_fails` -- death saving throw counters
- `@inventory` -- hash of `{item_sym => OpenStruct(qty: N)}`
- `@properties[:equipped]` -- array of equipped item name strings
- `@effects` -- hash of `{effect_type => [effect_descriptor, ...]}` for active spell effects
- `@entity_event_hooks` -- hash of `{event_type => [hook_descriptor, ...]}`
- `@casted_effects` -- array of effects this entity has cast on others
- `@concentration` -- currently concentrated-on spell effect
- `@grappling` -- array of entities this entity is grappling

**Per-battle state** (in `Battle#@entities[entity]` hash):
- `:action`, `:bonus_action`, `:reaction` -- remaining economy (integers, reset to 1 each turn)
- `:movement` -- remaining movement in feet
- `:statuses` -- per-battle status `Set` (`:dodge`, `:hiding`, `:disengage`) -- **separate** from entity `@statuses`
- `:stealth` -- current stealth roll value
- `:target_effect` -- hash tracking Help actions targeting this entity
- `:two_weapon` -- weapon used for first attack (enables bonus action two-weapon attack)
- `:group` -- faction symbol (`:a`, `:b`, `:c`)
- `:controller` -- AI or manual controller
- `:free_object_interaction` -- free interaction budget

This split means turn-scoped resources (action economy, dodge status) live on the battle, while persistent state (HP, conditions, inventory) lives on the entity. The bridge is `reset_turn!`, which refills economy and clears per-turn statuses at the start of each turn.

### Entity Hierarchy

```
Entity (module mixin -- 1,526 lines, the largest file)
  includes EntityStateEvaluator (DSL condition evaluator)
  includes States (transaction infrastructure)

PlayerCharacter (class)
  includes Entity
  includes RogueClass, FighterClass, WizardClass (class feature mixins)
  includes Multiattack, Lootable, HealthFlavor

Npc (class)
  includes Entity
  includes Notable, Lootable, HealthFlavor, Multiattack
```

PCs load from character YAML files; NPCs load from NPC YAML stat blocks. Both share the `Entity` module for combat mechanics (take_damage!, death_saving_throw!, saving_throw!, reset_turn!, etc.).

### Transaction System

State mutations are wrapped in a lightweight transaction/rollback mechanism:

```ruby
# States module provides:
transaction { }       # Opens a thread-local transaction frame
txn(entity, :method, [args])  # Calls entity.method(*args), expects OpenStruct return with :states, :children, :callback

# Transaction.rollback reverses by walking the state tree and restoring saved values
```

Each mutating method (e.g., `take_damage!`, `dead!`, `prone!`) captures before-state in an `OpenStruct` with `{entity:, states: {attr: old_value}, children: [], callback:}`. Rollback traverses this tree in reverse, restoring each attribute. In practice, rollback is rarely used -- the mechanism exists but the engine does not systematically leverage it for speculative evaluation or undo.

## Event/Action System

### Action Lifecycle

```
available_actions(session, battle)   -- entity lists what it CAN do
  each Action subclass has .can?(entity, battle)

action.resolve(session, map, opts)   -- compute results (dice rolls, hit checks)
  populates action.result: Array<Hash>

battle.commit(action)                -- apply results to world state
  for each item in action.result:
    Action.descendants.each { |klass| klass.apply!(battle, item) }
```

The polymorphic dispatch in `commit` means **every** Action subclass gets to inspect every result item. Each `apply!` checks `item[:type]` and handles only the types it recognizes. This is simple but wastes cycles on irrelevant dispatches.

### Action Types Implemented

PCs have ~25 action types in `ACTION_LIST`: attack, move, dash, dodge, hide, disengage, help, grapple, escape_grapple, shove, push, prone, stand, first_aid, use_item, interact, ground_interact, inventory, spell, two_weapon_attack, plus bonus-action variants (dash_bonus, hide_bonus, disengage_bonus) and class-specific special actions.

NPCs generate attack actions from their YAML stat block's `:actions` array and share most other action types with PCs.

### Build Map Pattern (UI Integration)

Actions expose a `build_map` method that returns a chainable parameter-collection structure:

```ruby
# Returns OpenStruct with :param (what the UI needs to collect) and :next (lambda to continue)
cont = AttackAction.build(session, source)
# cont.param => [{type: :select_target, num: 1, weapon: ...}]
# cont.next.call(target) => new OpenStruct with param: [{type: :select_weapon}]
# cont.next.call(weapon) => the fully-configured action
```

This allows any UI (CLI, web, AI) to drive action configuration through a generic parameter-collection loop without knowing action internals.

### Opportunity Attacks

Opportunity attacks are triggered during movement resolution. The `MovementHelper#retrieve_opportunity_attacks` method:

1. Iterates each step of the move path
2. For each opponent, tracks entry into and exit from melee range
3. When an opponent exits melee range, records a potential OA
4. Filters by reaction availability and disengage status
5. `MoveAction#check_opportunity_attacks` calls `battle.trigger_opportunity_attack` for each qualifying enemy

The OA itself goes through the full resolve/commit cycle. If the moving entity is knocked unconscious by the OA, movement stops at the OA location.

NPCs handle OA decisions via their AI controller (`opportunity_attack_listener`), which checks distance, available actions, and hit probability before committing.

### Reaction System

Reactions are not a general-purpose system. They are handled in two specific places:

1. **Opportunity attacks** -- triggered by movement (above)
2. **Spell reactions** (e.g., Shield) -- triggered by `after_attack_roll_hook` in `AttackHelper`. After an attack roll resolves, the target's prepared spells are checked for reaction-timing spells. Each spell class can implement `after_attack_roll(battle, entity, attacker, attack_roll, effective_ac)` to intercede. The Shield spell checks if the attack would hit with AC+5, and if so, applies the AC bonus.

There is no general reaction framework -- each reaction type is hand-coded at its trigger point.

## Condition/Effect System

### Status Conditions

Conditions are modeled as symbols in a `Set`, not objects. There are two parallel status sets:

1. **Entity `@statuses`** -- persistent conditions: `:dead`, `:unconscious`, `:stable`, `:prone`, `:grappled`, `:squeezed`
2. **Battle state `[:statuses]`** -- per-turn tactical statuses: `:dodge`, `:hiding`, `:disengage`

Mechanical effects of conditions are **not** centralized. Each condition's effects are checked inline wherever relevant:

- Prone: checked in `compute_advantages_and_disadvantages` (advantage for melee attacks against, disadvantage for ranged), in `compute_actual_moves` (double movement cost), and in jump validation (can't jump while prone)
- Dodge: checked in `compute_advantages_and_disadvantages` (disadvantage on attacks against)
- Grappled: checked in `available_movement` (returns 0), in movement helpers (double cost when grappling)
- Unconscious: checked in `available_actions` (returns empty), in `take_damage!` (auto-fail death saves), in `death_saving_throw!`

This is the scattered-condition-check pattern -- there is no condition object that declaratively lists its mechanical effects. Adding a new condition requires finding and updating every relevant code path.

### Spell Effects

Spell effects use a more structured approach than status conditions. The `register_effect` / `eval_effect` / `has_effect?` system on entities allows spells to inject named effect hooks:

```ruby
# Shield spell applies:
target.register_effect(:ac_bonus, self, effect: shield_spell, source: caster, duration: 8.hours)
target.register_event_hook(:start_of_turn, self, effect: shield_spell, source: caster)

# When AC is queried, PlayerCharacter#armor_class checks:
if has_effect?(:ac_bonus)
  current_ac + eval_effect(:ac_bonus)
end

# eval_effect calls handler.send(method, entity, opts) -- e.g., Shield.ac_bonus returns 5
```

Effects auto-expire based on `@session.game_time`. The `cleanup_effects` method runs on `reset_turn!` to dismiss expired effects. Concentration is tracked via `@concentration` on the caster.

### Resistances and Vulnerabilities

Defined in YAML stat blocks (e.g., `damage_vulnerabilities: [bludgeoning]`). Applied in `ActionDamage#damage_event`: resistant halves damage (floor), vulnerable doubles it. No immunity modeling observed.

## Spatial Model

### Grid-Based Map

Maps are defined in YAML with ASCII-art layers:

```yaml
map:
  illumination: 0.0
  base:        # terrain layer -- '.' passable, '#' wall
    - "....#."
    - "...##."
  base_1:      # terrain overlay layer
  meta:        # entity/spawn point placement layer
  light:       # light source placement layer
legend:        # maps characters to objects/NPCs/spawn points
```

The `BattleMap` class (1,005 lines) parses these into 2D arrays: `@base_map`, `@base_map_1`, `@meta_map`, `@tokens`, `@objects`, `@area_notes`.

### Distance and Movement

- **Distance**: Euclidean (floor of `sqrt(dx^2 + dy^2)`), compared in grid squares then multiplied by `@feet_per_grid` (default 5)
- **Movement**: Path-based. `MovementHelper#compute_actual_moves` validates each step against budget, difficult terrain (2x cost), squeeze (extra cost), prone (extra cost), grappling (extra cost), and jump mechanics
- **Token sizes**: Small/Medium = 1 square, Large = 2x2, Huge = 3x3. Multi-square entities use `entity_squares` for occupancy

### Line of Sight

`RayTracer` implements Bresenham-style ray tracing over the grid. Steps along the line from source to target, checking `map.opaque?` at each cell. Used for both LOS determination and cover calculation.

### Cover

`Natural20::Cover#cover_calculation` traces rays between source squares and target squares, inspecting objects along the path:
- Half cover: +2 AC
- Three-quarters cover: +5 AC
- Objects on target's square that `can_hide?` provide cover AC
- "Naturally Stealthy" halfling feature interacts with cover via size comparison

### Lighting

`StaticLightBuilder` computes illumination levels from light sources (bright/dim radii defined in YAML). `BattleMap#light_at` returns illumination at a square. Darkvision is checked per-entity when illumination is below 0.5. This affects visibility (`can_see?`) but not combat mechanics directly.

## Content vs Engine Boundary

**Strong separation.** All game content is defined in YAML files:

- `npcs/*.yml` -- NPC stat blocks (AC, HP, abilities, actions with attack/damage formulas, speed, size, skills, features)
- `items/weapons.yml` -- weapon properties (damage, type, range, properties like finesse/thrown/light/versatile)
- `items/equipment.yml` -- armor, shields, consumables
- `items/spells.yml` -- spell definitions (casting time, level, range, damage, school, type)
- `items/objects.yml` -- interactable objects (doors, chests, traps)
- `char_classes/*.yml` -- class feature lists, hit dice, proficiencies
- `races/*.yml` -- racial traits, base speed, darkvision, weapon proficiencies, subraces
- `characters/*.yml` / `fixtures/*.yml` -- pre-built character sheets
- `maps/*.yml` -- ASCII-art maps with legend, lighting, triggers, notes

The `Session` class mediates all content loading with lazy caching (`load_weapon`, `load_spell`, `load_equipment`, etc.). Spell implementations are Ruby classes in `spell_library/` that extend `Natural20::Spell` -- the spell YAML provides data, the Ruby class provides behavior.

NPC YAML stat blocks include an `actions:` array with complete attack formulas (`attack: 4`, `damage_die: 1d6+2`), allowing NPCs to function without any Ruby code. PC attacks derive modifiers from ability scores and proficiency programmatically.

## Verification Story

**Moderate.** RSpec test suite with ~2,850 LOC across 28 spec files covering:

- **Action specs** (14 files): attack, move, dodge, hide, help, disengage, grapple, shove, spell, first aid, use item, interact
- **Battle spec**: combat loop, death saving throws (fail/success/critical), valid targets, controller assignment
- **Battle map spec**: distance, LOS, cover, movement, placement, entity squares, lighting
- **AI controller spec**: path computation, priority queue, standard AI decision-making
- **Player character spec**: ability scores, proficiencies, inventory, equipment, spells
- **NPC spec**: stat block loading, attack generation
- **Die roll spec**: parsing, advantage/disadvantage, critical hits, probability

Tests use `srand(N)` for deterministic dice rolls -- seeding Ruby's built-in PRNG before each test to make outcomes reproducible. This is pragmatic but fragile: any change to the number or order of random calls within a code path invalidates the seed-based expectations.

No property-based testing. No formal invariant checking. No model checking. The test suite validates specific scenarios, not general properties.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Resolve/Commit separation** -- The two-phase action lifecycle (resolve computes `@result` hashes without mutation; commit applies them) is a clean architecture that maps naturally to our Quint model. Our Quint spec's action steps are essentially the "resolve" phase, and XState transitions are the "commit" phase. The insight that resolve should be pure and commit should be the only mutation point is validated here.

2. **Result items as typed event records** -- Each `@result` item is a plain hash with a `:type` discriminant (`:damage`, `:miss`, `:move`, `:dodge`, `:grapple`, etc.). This is essentially what our ITF trace steps capture. The pattern of using discriminated union-like structures for action outcomes is directly applicable to our XState event payloads.

3. **Build-map pattern for UI parameterization** -- The `build_map` method returns a chainable "what do I need next?" structure. This decouples action configuration from any specific UI. Worth studying if we ever need a generic action-parameter-collection protocol for our React layer -- our current `AvailableAction` type serves a similar purpose but is less composable.

4. **YAML content loading with session-level caching** -- Complete separation of game data (weapons, spells, NPCs) from engine logic. Weapons are pure data, not code. Our project achieves similar separation with Quint spec constants, but the YAML approach shows how a more data-driven content pipeline could work if we ever need extensibility.

5. **Advantage/disadvantage as parallel arrays** -- `compute_advantages_and_disadvantages` returns `[advantage_reasons[], disadvantage_reasons[]]`, collapsing to a single modifier. The named reasons (`:prone`, `:unseen_attacker`, `:pack_tactics`, `:target_dodge`, etc.) provide excellent debugging and UI feedback. Our Quint spec tracks advantage/disadvantage but doesn't preserve the reason chain -- this is a useful pattern for debugging combat resolution.

6. **Opportunity attack via path analysis** -- Movement path is analyzed step-by-step, tracking melee range entry/exit per opponent. When an entity leaves an opponent's melee range, the OA fires immediately at that path index, and if the entity drops unconscious, movement truncates. This concrete implementation validates our Quint model's approach of checking OA eligibility during movement resolution.

### Anti-Patterns (For Us)

1. **Mutable state everywhere** -- Entity state is freely mutated by any code path. The `transaction` system exists for rollback but is rarely used. No immutable snapshots, no state diffing, no deterministic replay. This is the fundamental incompatibility with our Quint/XState approach.

2. **Dual status sets** -- Splitting conditions between entity `@statuses` (persistent) and battle state `[:statuses]` (per-turn) creates confusion about where to check a condition. Our unified condition model in the Quint spec is cleaner.

3. **Scattered condition effects** -- Each condition's mechanical effects are checked inline across dozens of methods. Adding "restrained" would require finding every place that checks movement speed, attack rolls, dex saves, etc. Our Quint spec centralizes condition effects in the state transition guards.

4. **Polymorphic dispatch for apply** -- `Action.descendants.each { |klass| klass.apply!(battle, item) }` sends every result item to every action class. This is O(actions * items) and relies on each class silently ignoring unknown item types. A proper dispatch on `:type` would be cleaner.

5. **`srand`-based test determinism** -- Seeding Ruby's global PRNG makes tests brittle. Any code change that adds or removes a random call shifts all subsequent rolls. Our MBT approach with Quint-generated traces is fundamentally more robust: the expected state comes from the spec, not from seed-dependent execution.

6. **No formal spatial abstraction** -- The engine is tightly coupled to its grid map implementation. Distance, LOS, and cover are computed from grid positions. Our project's decision to abstract spatial concerns as caller-provided inputs is validated by seeing how deeply the grid model permeates natural_20's codebase.

7. **Effect system does not self-describe** -- Spell effects register hooks by name (`:ac_bonus`, `:speed_override`) but conditions (prone, dodge, etc.) just set a flag and rely on scattered checks. There is no unified "a condition declares what it modifies" system. This creates maintenance burden when adding new conditions or changing existing ones.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `lib/natural_20/concerns/entity.rb` | 1,526 | Entity module: HP, conditions, death saves, effects, inventory, ability scores, equipment, saves, skills -- the central mixin |
| `lib/natural_20/battle_map.rb` | 1,005 | Grid map: YAML parsing, placement, distance, LOS, cover, lighting, movement validation, entity lookup |
| `lib/natural_20/battle.rb` | 574 | Combat loop: initiative, turn management, commit, entity state, group dynamics, opportunity attacks |
| `lib/natural_20/player_character.rb` | 512 | PC class: YAML loading, AC, speed, proficiencies, spell slots, available_actions, class features |
| `lib/natural_20/actions/attack_action.rb` | 449 | Attack resolution: weapon info, advantage/disadvantage, hit/miss, damage, sneak attack, two-weapon fighting, Protection fighting style |
| `lib/natural_20/die_roll.rb` | 398 | Dice: parsing "1d8+5", rolling with advantage/disadvantage, critical doubles, probability, manual roll support |
| `lib/natural_20/ai_controller/standard.rb` | 341 | NPC AI: target selection, movement planning, action prioritization, perception-based NPC activation |
| `lib/natural_20/cli/action_ui.rb` | 357 | CLI action selection UI (TTY-based) |
| `lib/natural_20/cli/commandline_ui.rb` | 348 | CLI game loop and map rendering integration |
| `lib/natural_20/event_manager.rb` | 308 | Global event bus: register/dispatch pattern for UI notifications |
| `lib/natural_20/actions/move_action.rb` | 234 | Movement resolution: path validation, opportunity attacks, athletics/acrobatics checks, grapple dragging |
| `lib/natural_20/concerns/movement_helper.rb` | 230 | Movement computation: budget tracking, difficult terrain, jumping, squeeze, opportunity attack detection |
| `lib/natural_20/npc.rb` | 199 | NPC class: YAML stat block loading, NPC attack generation, melee distance |
| `lib/natural_20/session.rb` | 202 | Session: YAML content loading/caching (weapons, spells, equipment, classes, races), game time tracking |
| `lib/natural_20/actions/grapple_action.rb` | 181 | Grapple/drop grapple: contested Athletics vs Athletics/Acrobatics check |
| `lib/natural_20/actions/shove_action.rb` | 138 | Shove/push: knock prone or push 5ft, contested Athletics check |
| `lib/natural_20/actions/spell_action.rb` | 92 | Spell action: spell class instantiation, resolve delegation, resource consumption |
| `lib/natural_20/utils/weapons.rb` | 108 | Advantage/disadvantage computation, weapon damage formula calculation |
| `lib/natural_20/utils/ray_tracer.rb` | 90 | Ray tracing for LOS over grid map |
| `lib/natural_20/utils/cover.rb` | 42 | Cover AC calculation from ray trace results |
| `lib/natural_20/concerns/attack_helper.rb` | 53 | After-attack-roll hooks (spell reactions), effective AC with cover |
| `lib/natural_20/concerns/states.rb` | 22 | Transaction/rollback infrastructure |
| `lib/natural_20/spell_library/shield.rb` | 73 | Shield spell: reaction to attack roll, +5 AC until start of next turn |
| `spec/actions/attack_action_spec.rb` | 374 | Attack tests: hit/miss, advantage sources, cover, two-weapon, thrown, resistances |
| `spec/battle_spec.rb` | 183 | Battle tests: combat loop, death saves, valid targets, initiative |
| `spec/battle_map_spec.rb` | 301 | Map tests: distance, LOS, movement, placement, lighting |
