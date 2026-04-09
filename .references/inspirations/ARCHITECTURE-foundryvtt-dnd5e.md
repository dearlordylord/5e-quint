# Architecture: foundryvtt-dnd5e (FoundryVTT dnd5e system)

## Snapshot

| Attribute | Value |
|---|---|
| Language | JavaScript (ES modules, `.mjs`) |
| Framework | FoundryVTT platform (Document model, Hooks, Application v2) |
| Edition target | D&D 5e SRD 5.2.1 (2024 revision), with 5.1 backward compatibility |
| License | MIT (code), SRD CC-BY-4.0 (content) |
| LOC (module/) | ~86,000 (421 `.mjs` files) |
| LOC breakdown | data/ ~22.5K, applications/ ~31K, documents/ ~16.7K, dice/ ~2.4K, config ~5K |
| Test coverage | None -- no test suite, no test runner in package.json |
| Active development | Very active, official Foundry system, multi-contributor, v5.3.1 |

## Core Architecture Pattern

**Document-DataModel-Activity** layered on FoundryVTT's reactive document pipeline.

The system extends Foundry's core `Document` classes (Actor, Item, ActiveEffect, Combat, Combatant) with D&D-specific logic, while data schemas live in parallel `DataModel` classes under `data/`. The distinctive pattern is a three-layer split:

1. **Data models** (`module/data/`) -- schema definitions using Foundry's `SchemaField` DSL, data preparation (`prepareBaseData`, `prepareDerivedData`), migration logic. These are pure data -- no UI, no I/O.
2. **Document classes** (`module/documents/`) -- lifecycle hooks (`_preCreate`, `_onCreate`, `_onUpdate`, `_onDelete`), business logic (rolling, damage application, resting, concentration), and the Activity system for action execution.
3. **Applications** (`module/applications/`) -- sheet classes, dialogs, configuration UIs. Largest layer by LOC (~31K) but architecturally passive.

The entire system operates within Foundry's **reactive data pipeline**: `source data -> prepareBaseData -> applyActiveEffects -> prepareDerivedData -> render`. Active Effects mutate prepared data between these phases, which is the core extension mechanism for conditions, enchantments, and feature bonuses.

## State Model

### Actor-Item-Effect Composition

State is organized around Foundry's document hierarchy:

```
Actor5e (character | npc | vehicle | group | encounter)
  system: DataModel (CharacterData | NPCData | VehicleData | ...)
    abilities:    { str: { value, mod, save, proficient }, ... }
    attributes:   { ac, hp, death, init, movement, exhaustion, concentration, ... }
    skills:       { acr: { value, ability, mod, passive, ... }, ... }
    spells:       { spell1: { value, max }, spell2: ... }
    bonuses:      { mwak, rwak, msak, rsak, abilities, spell }
  items: EmbeddedCollection<Item5e>
    Item5e (weapon | spell | class | feat | equipment | consumable | ...)
      system: DataModel (WeaponData | SpellData | ClassData | ...)
        activities: ActivitiesField -> Map<Activity>
        uses: UsesField
        damage, range, properties, ...
      effects: EmbeddedCollection<ActiveEffect5e>
  effects: EmbeddedCollection<ActiveEffect5e>
```

Key points:
- **Abilities and skills** are `MappingField`-based, keyed by abbreviation (`str`, `acr`), initialized from `CONFIG.DND5E.abilities` / `CONFIG.DND5E.skills`.
- **HP** uses `{ value, max, temp, tempmax, dt }` -- `max` can be null (auto-calculated) or overridden.
- **Death saves** are `{ success: number, failure: number }` with a `RollConfigField` for bonuses.
- **Exhaustion** is a plain integer on the actor (0-6), with a singleton `ActiveEffect` (static ID `dnd5eexhaustion`) whose level is stored in flags.
- **Concentration** is tracked via the `concentrating` status effect on a special ActiveEffect, linked to the originating item via flags. The actor has a `concentration.limit` (default 1) and `concentration.save` bonus.

### Data Preparation Pipeline

Foundry calls `prepareData()` in phases:

1. **`prepareBaseData()`** -- Initialize derived fields before effects: base AC, base encumbrance, ability modifiers.
2. **`applyActiveEffects("initial")`** -- ActiveEffects with `OVERRIDE`, `ADD`, `MULTIPLY`, `UPGRADE`, `DOWNGRADE` modes mutate the prepared data via dot-path keys (e.g., `system.abilities.str.value`).
3. **`prepareDerivedData()`** -- Compute final values from mutated base: AC formula evaluation, skill totals, spell DC, proficiency bonus, encumbrance.

This is the central architectural insight: **the "engine" is the data preparation pipeline itself**. There is no separate combat resolution engine. Instead, dice rolls query prepared data, and mutations are applied as document updates that re-trigger the pipeline.

### Configuration Registry (`config.mjs`)

A 5,000-line configuration object (`DND5E`) serves as the single source of truth for all game constants: abilities, skills, damage types, conditions, weapon types, spell schools, weapon masteries, etc. Each entry includes labels, icons, compendium references, and behavioral flags. This is the closest thing to a "content database" in the system.

## Event/Action System

### The Activity System

The most architecturally distinctive feature. Activities replace the old "item roll" pattern with a structured, typed action pipeline. An Item can have multiple Activities, each representing a different way to use that item.

**Activity types** (13 total):
- `AttackActivity` -- attack roll + damage
- `SaveActivity` -- saving throw + damage
- `DamageActivity` -- damage only
- `HealActivity` -- healing
- `CheckActivity` -- ability check
- `CastActivity` -- cast a spell from another item
- `EnchantActivity` -- apply enchantments to items
- `SummonActivity` -- summon creatures
- `TransformActivity` -- polymorph/wildshape
- `ForwardActivity` -- delegate to another activity
- `OrderActivity` -- vehicle crew orders
- `UtilityActivity` -- generic usage

**Activity lifecycle** (`mixin.mjs`, ~1,245 LOC):

```
use(usage, dialog, message)
  -> Hook: dnd5e.preUseActivity (can cancel)
  -> _requiresConfigurationDialog? -> show ActivityUsageDialog
  -> _prepareUsageScaling (spell slot scaling, etc.)
  -> consume(usageConfig, messageConfig)
      -> Hook: dnd5e.preActivityConsumption
      -> _prepareUsageUpdates (compute resource changes)
      -> Hook: dnd5e.activityConsumption (can cancel)
      -> #applyUsageUpdates (mutate actor/items)
      -> Hook: dnd5e.postActivityConsumption
  -> beginConcentrating (if applicable)
  -> _createUsageMessage (chat card)
  -> _triggerSubsequentActions (auto-roll attack, etc.)
  -> Hook: dnd5e.postUseActivity
```

Each step is hookable by external modules. The consumption system (`ConsumptionTargetsField`) is highly flexible, supporting consumption of: activity uses, item uses, item quantity, hit dice, spell slots, actor attributes (via dot-path), or external items.

**Key design choice**: Activities belong to Items (via `ActivitiesField`), not to Actors. A weapon's attack activity knows its own damage formula, ability score, attack type, critical threshold, etc. This is a clean content-organization pattern.

### The Hook System

FoundryVTT provides a global pub/sub event system (`Hooks.call()` / `Hooks.callAll()`). The dnd5e system uses this extensively as the primary extension point. Every significant action fires pre/post hooks:

- `dnd5e.preUseActivity` / `dnd5e.postUseActivity`
- `dnd5e.preRoll*` / `dnd5e.roll*` (for all roll types)
- `dnd5e.preApplyDamage` / `dnd5e.applyDamage`
- `dnd5e.preCombatRecovery` / `dnd5e.combatRecovery` / `dnd5e.postCombatRecovery`
- `dnd5e.preRestCompleted` / `dnd5e.restCompleted`
- `dnd5e.preCreateCombatMessage`

Hooks that use `Hooks.call()` (vs `Hooks.callAll()`) allow cancellation by returning `false`.

### Dice System

Three roll classes, each extending Foundry's `Roll`:

- **`BasicRoll`** (`basic-roll.mjs`, 463 LOC) -- base class with a three-phase build pipeline: `buildConfigure` -> `buildEvaluate` -> `buildPost`. Supports multi-roll configs, configuration dialogs, and message creation.
- **`D20Roll`** (`d20-roll.mjs`, 270 LOC) -- d20-based checks/saves/attacks. Handles advantage/disadvantage modes, Elven Accuracy, Halfling Lucky, Reliable Talent. Critical success/failure detection.
- **`DamageRoll`** (`damage-roll.mjs`, 232 LOC) -- damage rolls with critical hit processing, Powerful Critical, and formula preprocessing.

The roll classes use **keybinding-driven fast-forwarding**: holding specific keys skips the configuration dialog and auto-selects advantage/disadvantage.

## Condition/Effect System

### ActiveEffect5e

Extends Foundry's `ActiveEffect` with dnd5e-specific behavior (~1,103 LOC). The core mechanism is **dot-path attribute mutation**: each effect contains an array of `changes`, where each change specifies:

```javascript
{
  key: "system.abilities.str.value",   // dot-path into actor/item data
  mode: CONST.ACTIVE_EFFECT_MODES.ADD, // ADD, MULTIPLY, OVERRIDE, UPGRADE, DOWNGRADE
  value: "2"                           // string value (may be formula)
}
```

Effects are applied during the `applyActiveEffects()` phase of data preparation. The system extends this with:

- **Formula fields**: certain paths (AC bonus, encumbrance bonuses) are treated as deterministic formulas rather than plain numbers.
- **Activity-targeted changes**: effects can target specific activities on items using `activities[type].key` or `system.activities.id.key` syntax.
- **Enchantment effects**: a dedicated `type: "enchantment"` for magic item properties, with a separate data model (`EnchantmentData`) that handles legacy field remapping (e.g., `system.damage.parts` to individual activity damage parts).
- **Rider conditions**: when an effect is created, it can auto-create "rider" conditions (e.g., Unconscious automatically applies Prone via `riders: ["prone"]` in config).
- **Dependent document tracking**: effects can be marked as dependent on other effects. When the parent effect is deleted, dependents are cascade-deleted via the `DependentsRegistry`.
- **Suppression**: effects from unequipped/unattuned items are suppressed (present but inactive).

### Conditions Configuration

Conditions are defined in `config.mjs` as data entries, not as classes:

```javascript
DND5E.conditionTypes = {
  blinded: { name, img, reference, special: "BLIND" },
  paralyzed: { name, img, reference, statuses: ["incapacitated"] },
  unconscious: { name, img, reference, statuses: ["incapacitated"], riders: ["prone"] },
  exhaustion: { name, img, reference, levels: 6, reduction: { rolls: 2, speed: 5 } },
  // ... 23 total conditions (14 core + 9 pseudo-conditions)
};
```

The `conditionEffects` map links mechanical consequences to conditions:

```javascript
DND5E.conditionEffects = {
  noMovement: new Set(["exhaustion-5", "grappled", "paralyzed", "petrified", "restrained", "unconscious"]),
  halfMovement: new Set(["exhaustion-2"]),
  attackDisadvantage: new Set(["poisoned", "exhaustion-3"]),
  // ...
};
```

This is a **declarative condition-to-effect mapping**, not procedural condition logic. The system queries these sets during data preparation and roll building to determine disadvantage, movement restrictions, etc.

### Exhaustion

Modeled as a single singleton `ActiveEffect` with a level stored in `flags.dnd5e.exhaustionLevel`. The `_prepareExhaustionLevel()` method updates the effect's name and image based on level, and adds the `dead` status at the maximum level (6). Mechanical effects are applied via `conditionEffects` lookups (e.g., `exhaustion-3` triggers `attackDisadvantage`).

### Concentration

Tracked via a `concentrating` status effect stored as an `ActiveEffect` on the actor. The effect carries `flags.dnd5e.item` linking back to the originating item. The actor has `attributes.concentration.limit` (usually 1) and `attributes.concentration.save` (bonus to concentration saves). `getConcentrationDC(damage)` computes `max(floor(damage/2), 10)`, capped at 30 for modern rules.

## Spatial Model

Minimal spatial modeling within the system itself. Foundry's core handles the grid, tokens, movement, and templates. The dnd5e system contributes:

- `AbilityTemplate` (`canvas/ability-template.mjs`) -- area-of-effect template placement for spells/abilities
- Cover status effects (`coverHalf`, `coverThreeQuarters`, `coverTotal`) with associated AC bonuses
- Movement types (`walk`, `fly`, `swim`, `climb`, `burrow`) as a `MovementField` with per-type speeds

Combat spatial concerns (range, threatened squares, opportunity attacks) are not modeled -- they are left to the VTT canvas and GM adjudication.

## Content vs Engine Boundary

**Weak separation -- by design.** The system is a FoundryVTT module, not a standalone engine. It assumes the Foundry platform provides:

- Document persistence and reactive updates
- The ActiveEffect pipeline
- Canvas rendering and spatial concerns
- WebSocket multiplayer synchronization
- Permission model

The "engine" is distributed across three layers:

1. **`config.mjs`** (5K LOC) -- the closest thing to a content database, defining every enumeration, constant, and reference
2. **`data/`** (22.5K LOC) -- schemas, data preparation, and derivation logic
3. **`documents/`** (16.7K LOC) -- business logic (rolling, damage, resting, activity execution)

Content (spells, monsters, items) lives in compendium packs (`packs/`) as serialized documents, not in code. The code defines the *shape* of content (schemas) and the *rules* for processing it (data preparation, activities), but specific content entries are external data.

The boundary between "engine rules" and "content" is **blurred**:
- AC calculation formulas are in `config.mjs`, not in the data model
- Condition mechanical effects are in `conditionEffects`, not in the conditions themselves
- Spell scaling rules are split between `SpellData`, `ActivityMixin`, and `ConsumptionTargetsField`

## Verification Story

**No automated tests.** The `package.json` has no test runner. There are no test files in the repository. Verification is entirely:

- **Manual playtesting** via the FoundryVTT client
- **ESLint** for code style
- **Community bug reports** via GitHub issues
- **Regression detection** through the large user base

The system compensates with:
- **Data migration** (`migration.mjs`, 1,113 LOC) -- careful versioned migrations for schema changes
- **Preparation warnings** -- the data preparation pipeline collects warnings (e.g., "multiple armors equipped") rather than failing silently
- **Defensive coding** -- extensive null-checks, optional chaining, fallback values throughout

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Activity as typed action** -- The Activity system (`attack`, `save`, `damage`, `heal`, `cast`, etc.) with a shared lifecycle (`use -> consume -> roll -> message`) is an elegant decomposition of "what can you do with an item." Each activity type carries its own schema (attack bonus, save DC, damage parts) while sharing consumption and messaging logic via the mixin. This maps well to our feature function pattern: a weapon's attack activity is analogous to our `weaponAttack` feature function, but with the action-type hierarchy made explicit.

2. **Declarative condition-effect mapping** -- `conditionEffects` maps mechanical consequences (movement reduction, attack disadvantage) to sets of condition identifiers. This is a clean declarative approach: instead of each condition *knowing* its own effects (the dnd_engine approach), a central lookup table maps consequences to conditions. For our spec, this is close to how we model conditions -- checking `hasCondition(poisoned)` in attack logic rather than having `poisoned` inject modifiers.

3. **Consumption as first-class concept** -- `ConsumptionTargetsField` models resource consumption as a typed, scalable, composable data structure. An activity can consume multiple heterogeneous resources (spell slots + material components + item charges) in one operation, with scaling formulas per target. The `refund()` method enables undo. This is more structured than our current implicit consumption in event handling.

4. **Exhaustion as leveled singleton** -- Using a single ActiveEffect with a flag-stored level, rather than 6 separate effects, keeps the data model clean. The `conditionEffects` map handles the per-level mechanical effects. This is simpler than modeling exhaustion as a stack of sub-conditions.

5. **Rider conditions with cascade delete** -- When `unconscious` is applied, it automatically creates `prone` as a rider. When the parent effect is deleted, dependents are cascade-deleted via the `DependentsRegistry`. This handles condition interdependencies cleanly. Our spec models this explicitly in state transitions, but the rider pattern could inform our TS feature implementation.

6. **Multi-phase data preparation as the "engine"** -- The `prepareBaseData -> applyActiveEffects -> prepareDerivedData` pipeline is essentially a constraint propagation system. Active Effects are declarative constraints (add 2 to STR, override AC formula) applied between computation phases. This is a powerful pattern for extensibility -- new effects don't need new code, just new change entries.

7. **Configuration as single registry** -- `config.mjs` as a single 5K-LOC object containing every game constant, with `preLocalize()` calls for i18n and compendium references for rule lookups. This is the "ubiquitous language" made concrete. We achieve similar goals with our `UBIQUITOUS_LANGUAGE.md` and Quint types, but Foundry's approach shows how to make the registry both human-readable and machine-queryable.

### Anti-Patterns (For Us)

1. **Mutable document graph with no snapshots** -- The entire state model is a mutable object tree updated via `actor.update()` and `item.update()` calls. There is no state snapshot, no rollback, no replay capability. Every mutation is a side effect that triggers the reactive pipeline. This is fundamentally incompatible with our Quint immutable-record approach and deterministic replay.

2. **ActiveEffect key-path mutation** -- Effects mutate arbitrary dot-paths on the actor data model. This means the set of possible mutations is unbounded -- any field can be changed by any effect. There is no schema-level constraint on what effects can touch. This makes formal verification impossible: you cannot enumerate the possible states because any effect can write to any path.

3. **No combat resolution model** -- The `Combat5e` class is 172 LOC and handles only initiative sorting and turn/round lifecycle hooks. There is no action economy enforcement, no turn structure validation, no attack resolution sequence. Rolls happen when users click buttons. The system trusts the players and GM to follow the rules. This is the antithesis of our formal combat model.

4. **Distributed rule logic** -- AC calculation spans `attributes.mjs` (base prep), `config.mjs` (formula definitions), `active-effect.mjs` (modifier application), and `character.mjs` (override handling). A single rule is spread across 4+ files with no central authority. Our spec centralizes each rule in one Quint action.

5. **No exhaustive action typing** -- The 13 activity types are an open set (`CONFIG.DND5E.activityTypes` is extensible by modules). While this is great for Foundry's plugin ecosystem, it means no exhaustive matching is possible. Our `Match.exhaustive` pattern requires closed discriminated unions.

6. **Hook-based extension over verification** -- The system uses 40+ hook points for extensibility by third-party modules. This is the right choice for a VTT platform but creates an unverifiable execution model: any hook handler can cancel, modify, or inject behavior. The actual execution path for "cast a spell" depends on which Foundry modules are installed.

7. **No type safety** -- Plain JavaScript with JSDoc type annotations (no TypeScript, no Flow). Type errors are discovered at runtime. The `@import` JSDoc pattern provides editor support but no compile-time guarantees.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `module/config.mjs` | 4,950 | All game constants, enumerations, condition definitions, damage types |
| `module/documents/actor/actor.mjs` | 3,714 | Actor document: rolling, damage application, resting, concentration |
| `module/documents/item.mjs` | 1,615 | Item document: usage, spell scroll creation, advancement |
| `module/documents/activity/mixin.mjs` | 1,245 | Activity lifecycle: use(), consume(), refund(), scaling, messaging |
| `module/documents/active-effect.mjs` | 1,103 | ActiveEffect: condition handling, enchantments, exhaustion, riders |
| `module/data/activity/base-activity.mjs` | 840 | Activity data schema: activation, consumption, duration, range, target |
| `module/data/actor/npc.mjs` | 877 | NPC data model: CR, legendary actions, lair |
| `module/data/activity/fields/consumption-targets-field.mjs` | 781 | Consumption logic: spell slots, charges, materials, scaling |
| `module/data/item/spell.mjs` | 775 | Spell data model: level, school, components, preparation |
| `module/registry.mjs` | 723 | Runtime registries: dependents, enchantments, summons, spell lists |
| `module/data/item/weapon.mjs` | 595 | Weapon data model: damage, range, mastery, properties, ammunition |
| `module/data/actor/templates/attributes.mjs` | 566 | Shared attribute fields: AC, HP, initiative, movement, concentration |
| `module/dice/basic-roll.mjs` | 463 | Base roll class: build/configure/evaluate/post pipeline |
| `module/data/activity/attack-data.mjs` | 417 | Attack activity data: ability, bonus, critical, damage parts |
| `module/data/actor/character.mjs` | 364 | Character data model: death saves, XP, resources, favorites |
| `module/data/actor/templates/creature.mjs` | 338 | Shared creature fields: skills, tools, spells, bonuses |
| `module/documents/activity/attack.mjs` | 316 | Attack activity document: rollAttack, ammunition, attack modes |
| `module/dice/d20-roll.mjs` | 270 | D20 roll: advantage, Elven Accuracy, Reliable Talent |
| `module/dice/damage-roll.mjs` | 232 | Damage roll: critical damage, formula preprocessing |
| `module/documents/combat.mjs` | 172 | Combat document: initiative, turn lifecycle, resource recovery |
| `module/documents/combatant.mjs` | 183 | Combatant: initiative roll, turn messages, combat recovery |
