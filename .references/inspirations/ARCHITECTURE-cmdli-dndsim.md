# Architecture: cmdli/dndsim (cmdli/dndsim)

## Snapshot

| Attribute | Value |
|---|---|
| Language | TypeScript (primary) with older Python simulator retained in `python/` |
| Framework | Standalone TS library + Jest tests + CLI helper scripts |
| Edition target | D&D 2024 / 5.5e DPR simulation |
| License | MIT |
| LOC (TypeScript core) | ~4,064 (`src/**/*.ts`) |
| LOC (TypeScript tests) | ~217 (`src/**/*.test.ts`) |
| LOC (legacy Python implementation) | ~5,271 (`python/**/*.py`) |
| LOC (event/sim core) | ~940 (`src/sim/`, `src/util/EventLoop.ts`, `src/operations/`) |
| Test coverage | Narrow but real: Jest snapshot-style DPR assertions for several classes |
| Active development | Last cloned commit `c6e929c`; package version `1.0.3` |

## Core Architecture Pattern

**Typed event-loop simulator with feature listeners and ordered turn operations.**

`cmdli/dndsim` models a single attacker repeatedly acting against an abstract target. The distinctive idea is that class features and feats are **listeners on a typed character event bus**:

- the character owns an `EventLoop<CharacterEventName, CharacterEventMapping>`
- `Feature` subclasses register handlers like `beginTurn`, `attackRoll`, `damageRoll`, `enemyTurn`, or `castSpell`
- turn structure is encoded by `CustomTurn`, which runs ordered `Operation`s across stages like `turn_start`, `before_action`, `action`, `after_action`, and `turn_end`

This is a clean compositional runtime architecture. It is much narrower than a full combat engine, but it is internally coherent.

## State Model

### Authoritative state: one mutable `Character` plus one abstract `Target`

The simulator's world is intentionally tiny:

- `Character` (`src/sim/Character.ts`) owns stats, resources, class levels, features, effects, spells, weapons, masteries, minions, and the event loop
- `Target` (`src/sim/Target.ts`) owns AC, a generic save modifier, cumulative damage dealt, and a small condition map
- `Simulation` (`src/sim/Simulation.ts`) repeatedly executes the character against the target over a fixed number of fights and rounds

There is no battle roster, no initiative ordering, no ally/enemy graph, and no persistent world state.

### Mutable but structured

Unlike many mutable engines, `cmdli/dndsim` keeps its state relatively disciplined:

- resources are encapsulated in `Resource`
- persistent spell state is centralized in `Spellcasting`
- temporary effects live in `Map<string, Effect>`
- class progressions are represented via class-specific builders that add features to a base character

The main weakness is scope, not internal chaos.

### Target abstraction drives the whole design

The target model is intentionally generic:

- AC is derived from a DMG-style table by level
- all saves share one save bonus
- conditions are just counters in a small map
- target turns do almost nothing except clear prone

This makes the simulator fast and simple, but it means the engine is modeling expected DPR against a benchmark defender, not actual battle state.

## Action / Event System

### Typed event bus

The event model is the repo's strongest architectural contribution:

- `CharacterEvent.ts` defines the event universe
- `EventLoop.ts` provides a simple typed pub/sub
- `Feature.ts` auto-registers method handlers based on event names

Important events include:

- `begin_turn`
- `before_action`
- `action`
- `after_action`
- `before_attack`
- `attack_roll`
- `attack_result`
- `damage_roll`
- `cast_spell`
- `enemy_turn`
- `short_rest`
- `long_rest`

That gives features many hook points without turning the system into stringly-typed chaos.

### Turn execution via ordered operations

`CustomTurn` stores a per-stage priority list of `Operation`s and repeatedly executes the first eligible operation in a stage until nothing remains eligible. This is a pragmatic compromise between:

- a rigid one-action loop, and
- a full planner

It lets feats, class abilities, and spells compete for action/bonus-action slots in a modular way.

### Attacks are an eventful pipeline

`Character.attack()` breaks attack resolution into explicit steps:

1. emit `before_attack`
2. compute to-hit
3. emit `attack_roll`
4. build `AttackResultEvent`
5. emit `attack_result`
6. roll/apply each damage packet through `damage_roll`

That makes attack modification features composable. It is not formally verified, but it is architecturally clean.

## Condition / Effect System

### Conditions are minimal

Target conditions are tracked as counted flags on the abstract target. In practice the system meaningfully uses only a small subset:

- `prone`
- `grappled`
- some feat-specific untracked assumptions such as poisoned comments

There is no broad 5e condition lattice.

### Effects are first-class on characters

Effects are modeled as `Effect` objects with:

- `name`
- `duration`
- `apply()`
- `end()`

Character effects live in a `Map<string, Effect>`, and concentration spells are integrated with the spellcasting subsystem. This is cleaner than many engines, though still scoped to a DPR simulator rather than a full combat state machine.

### Concentration is present, but simplified

`Spellcasting` tracks:

- normal spell slots
- pact slots
- active spells
- one concentration spell

Casting a new concentration spell automatically ends the previous one. That is a good architectural choice. But concentration disruption from taking damage is mostly absent because the target/enemy model does not actually fight back like a real combatant.

## Spatial Model

### No spatial simulation

There is no geometry, grid, or position model. The repo is explicit about this in `How_it_works.md`:

- spacing and positioning are ignored
- targets take no real actions on their turns
- opportunity attacks are largely omitted

Some feats and comments acknowledge the absence directly:

- `WarCaster.ts`: "Opportunity attacks and concentration is not used"
- `Speedy.ts`: "Movement and opportunity attacks are not used"
- `PolearmMaster_TODO.ts`: reaction attack ignored

This is correct for its purpose: DPR estimation, not battle fidelity.

## Content vs Engine Boundary

### Clean modular boundary

This repo separates content from engine more cleanly than most competitors:

- `src/sim/` provides the runtime substrate
- `src/classes/` assembles class progressions from features
- `src/feats/` and `src/spells/` package concrete content
- `src/operations/` define reusable action choices
- `src/weapons/` are concrete weapon objects

This is one of the cleaner content/engine separations in the field.

### Weakness: duplicated Python legacy tree

The repo also retains a parallel `python/` implementation of similar ideas. That muddies the source of truth:

- README usage still points to Python CLI commands
- the publishable package is TypeScript
- both trees contain class/feat/spell logic

Architecturally, the TypeScript side is clearly the current engine. The Python tree is legacy or transitional baggage.

## Verification Story

### What exists

- Jest tests for at least Barbarian, Fighter, Monk, and Rogue class simulations
- snapshot-style tolerance checks via `expectMatchesSnapshot()` over level 1-20 DPR curves
- strongly typed event and feature interfaces reduce accidental wiring mistakes

These are real tests, not just README claims.

### What those tests actually prove

The tests assert that simulated DPR stays near a stored expected curve for a class builder. They are useful regression alarms for:

- major balance shifts
- broken feature interactions
- event-loop wiring failures

They do **not** prove full combat correctness.

### What is not verified

- no property/invariant testing
- no deterministic replay traces
- no model/spec parity
- no full combat legality checking
- no enemy AI or multi-actor interaction verification

This is a calibrated simulator, not a correctness-focused engine.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Typed event listeners for features.** `Feature` + `EventLoop` is the cleanest part of the design. It gives a modular way for feats and class features to hook attack, spell, and rest lifecycles without giant switch statements.

2. **Ordered turn operations.** `CustomTurn` shows a tidy way to build class behavior as a sequence of eligible operations rather than one monolithic `takeTurn()` method.

3. **Small, explicit runtime substrate.** The separation between `Character`, `Target`, `Feature`, `Operation`, and `Spellcasting` is crisp. For a simulation-oriented engine, this is a strong baseline decomposition.

4. **Snapshot-style DPR regression tests.** Even though this is not our correctness model, checking whole-class output curves across levels is a useful idea for balance-preserving refactors.

### Anti-Patterns (For Us)

1. **Abstract target as rules oracle.** A single benchmark target is fine for DPR work, but it collapses too much of the battle state for our project. We need explicit creature state and multi-actor interactions.

2. **No reaction / interrupt frontier.** The architecture is clean, but the semantics frontier is narrow. Without reactions, enemy behavior, and real turn interplay, many of the hardest 5e correctness problems never appear.

3. **README/source drift due to dual implementations.** A repo that simultaneously advertises Python CLI usage and publishes a TypeScript library makes architecture discovery harder and boundary ownership fuzzier.

4. **Testing output curves instead of rules facts.** Snapshot DPR testing can catch regressions, but it is a weak oracle for individual mechanics compared with rule-traceable invariants and parity tests.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `src/classes/Rogue.ts` | 630 | Largest class builder; layered feature composition |
| `src/classes/Fighter.ts` | 457 | Class progression and attack-feature wiring |
| `src/classes/Monk.ts` | 432 | Resource-heavy class implementation |
| `src/classes/Barbarian.ts` | 362 | Rage-centric class implementation |
| `src/sim/Character.ts` | 359 | Core mutable character state and attack pipeline |
| `src/classes/Ranger.ts` | 227 | Class builder with spell/mark logic |
| `src/sim/spells/Spellcasting.ts` | 173 | Spell slots, pact slots, concentration, active spells |
| `src/sim/Attack.ts` | 120 | Attack and weapon-attack abstractions |
| `src/sim/Target.ts` | 95 | Abstract target benchmark state |
| `src/classes/Barbarian.test.ts` | 61 | Snapshot DPR regression for Barbarian |
| `src/util/EventLoop.ts` | 46 | Typed pub/sub backbone |
| `src/classes/Fighter.test.ts` | 34 | Snapshot DPR regression for Fighter |
| `src/classes/Monk.test.ts` | 34 | Snapshot DPR regression for Monk |
| `src/classes/Rogue.test.ts` | 88 | Snapshot DPR regression for Rogue |
| `src/test/classSnapshot.ts` | 28 | Shared snapshot-tolerance harness |
| `How_it_works.md` | 37 | High-level architecture and limitation notes |
| `README.md` | 39 | Public-facing scope and usage |
