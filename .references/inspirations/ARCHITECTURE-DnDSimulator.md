# Architecture: DnDSimulator (DanielK314/DnDSimulator)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Python |
| Framework | Tkinter GUI + standalone simulator scripts |
| Edition target | D&D 5e, loose and mixed-source rather than SRD-traceable |
| License | MIT |
| LOC (engine + GUI + tests) | ~8,600 Python LOC |
| LOC (entity + spells + AI core) | ~5,800 (`Entity_class.py`, `Spell_class.py`, `AI_class.py`, `Token_class.py`, `Choice_class.py`) |
| LOC (simulation loop) | 364 (`Encounter_Simulator.py`) |
| LOC (GUI) | 1,415 (`Encounter_GUI.py`) |
| LOC (tests) | 472 (`run_functionality_test.py`) |
| Test coverage | Ad hoc script-based functionality checks, no automated test runner/CI |
| Active development | Last cloned commit `023566c`; README points to release `v1.2.1` |

## Core Architecture Pattern

**Mutable combatant monolith with heuristic choice scoring and token-linked status effects.**

`DnDSimulator` centers nearly all combat logic in one huge mutable `entity` class. Each combatant carries stats, spell slots, conditions, class features, action state, positioning state, and combat bookkeeping directly on the object (`Entity_class.py`). Turn resolution is imperative: the simulator loops initiative order in `Encounter_Simulator.py`, calls `start_of_turn()`, lets the AI score and execute one choice at a time, then calls `end_of_turn()`. Long-lived effects are tracked through a `TokenManager` / token graph (`Token_class.py`), which is the one notable attempt at architectural factoring inside an otherwise monolithic design.

## State Model

### Authoritative state: mutable `entity` objects

Every creature is instantiated from a JSON sheet in `Entities/` or `Archive/` and loaded into an `entity` object (`Entity_class.py`). The object directly owns:

- core combat stats: AC, HP, to-hit, average damage, attacks, speed, position
- six ability scores and modifiers
- spellcasting state: slots, known spells, spellbook objects
- damage typing: resistances, immunities, vulnerabilities
- combat action state: `action`, `bonus_action`, `reaction`, attack counters
- class/subclass feature flags and resource counters
- status booleans for conditions and temporary modes
- battle bookkeeping like initiative, team, death state, damage dealt

This is effectively a giant record, but implemented as a highly stateful Python object with hundreds of mutable fields instead of explicit nested state structures.

### Condition/effect state via token graph

The engine's more interesting subsystem is the token manager (`Token_class.py`). Tokens encode linked state such as:

- concentration ownership (`type == "con"`)
- target-linked status effects like restrained, stunned, paralyzed
- parent/child relationships for effects like Hex, Hunter's Mark, Haste, Guiding Bolt

`TokenManager.subtype_dict` maps token subtypes to concrete entity attributes like `restrained`, `is_stunned`, and `is_paralyzed`, and token resolution propagates cleanup. This gives the simulator a reversible effect graph instead of only boolean flags. It is the closest thing in the repo to a first-class effect system.

### Serializable, but not snapshot-clean

Combatants originate from JSON entity sheets, but live combat state is not modeled as a standalone serializable battle snapshot. Runtime state is spread across:

- mutable `entity` instances
- spell objects embedded in `SpellBook`
- token graphs in `TokenManager`
- global fight arrays passed between functions

That makes the setup data serializable, but the live state is not structured for replay, diffing, or deterministic inspection.

## Action / Event System

### Initiative loop

`Encounter_Simulator.py` runs the combat:

1. Roll and sort initiative with `roll_for_initiative()`
2. For the active combatant, call `start_of_turn()`
3. Ask `player.AI.do_your_turn(fight)` to spend actions/bonus actions
4. If a hero is unconscious, perform death saves
5. Call `end_of_turn()`
6. Repeat until only one team has conscious members left

There is no explicit event bus. The action system is a procedural loop over mutable actors.

### Choice-scored AI instead of action pipelines

The AI (`AI_class.py`) builds a list of `Choice` objects from `Choice_class.py`, such as:

- attack
- offhand attack
- monster ability
- heal
- dodge
- spellcasting
- inspiration
- action surge
- turn undead
- wild shape

Each choice exposes a `score(fight)` method and an `execute(fight)` method. The AI repeatedly picks the highest-scoring available choice until it runs out of action economy. This is a practical pattern for Monte Carlo encounter simulation: actions are not legality-checked through a formal action graph, they are ranked heuristically by expected value.

### Reactions are direct callbacks, not first-class interrupts

The engine does support reactions, but in an ad hoc way:

- `AI.do_opportunity_attack()` handles OAs
- `AI.want_to_cast_shield()` decides when to cast Shield
- smite and sneak attack are injected directly inside attack resolution
- deflect missiles and interception are invoked from specific code paths

This gets useful fidelity, but the reaction model is distributed across many special cases rather than one explicit interrupt system.

## Condition / Effect System

### Hybrid model: booleans on entity + tokens for lifecycle

Conditions are represented in two layers:

1. booleans and counters on `entity` (`restrained`, `prone`, `is_stunned`, `is_paralyzed`, etc.)
2. token links in `Token_class.py` that set and clear those flags

This hybrid design gives the code lifecycle cleanup, but mechanical effects are still mostly checked inline inside attack rolls, movement checks, or save logic in `Entity_class.py`.

### Concentration is one of the stronger subsystems

Concentration is handled through concentration tokens and token-linked cleanup:

- casting concentration spells creates linked tokens
- taking damage can break concentration
- token resolution clears associated target effects and summon state
- tests in `run_functionality_test.py` specifically exercise Haste, Entangle, Hex, Hunter's Mark, and Conjure Animals concentration behavior

For a project this size, concentration is comparatively well thought through.

### Damage typing is centralized

`Dmg_class.py` groups damage by type, applies resistance/immunity/vulnerability, and allows subtraction for shields/reductions. It is a small but useful typed damage accumulator instead of scattering raw numbers everywhere.

## Spatial Model

### Abstract line-based positioning, not a real grid

The simulator intentionally avoids squares/hexes. Its README and `Entity_class.py` use a three-line position system:

- front
- middle
- back

Movement and reach are approximated by:

- line positions
- speed thresholds
- whether a move would provoke an opportunity attack
- whether a combatant needs to dash to reach a target

This is a major architectural choice. It gives the simulator enough structure for melee/ranged distinctions and OAs, without committing to a tactical board.

### Why this matters

This makes `DnDSimulator` closer to a probabilistic encounter balancer than a strict combat engine. It models broad tactical pressures without attempting geometrically exact movement, line of sight, or area placement.

## Content vs Engine Boundary

### Weak boundary

The engine/content split is porous:

- entity data lives in JSON files
- spell implementations are hardcoded classes in `Spell_class.py`
- feature logic is embedded directly in `Entity_class.py` and `AI_class.py`
- adding a new ability requires touching entity init, feature logic, AI scoring, and sometimes GUI wiring (`How_to.txt`)

This is workable for a solo project, but content does not plug into a stable engine boundary cleanly.

### Positive pattern: data-driven entity sheets

The JSON entity sheets in `Entities/`, `Archive/`, and `BenchmarkEntities/` are useful. They make encounter simulation and manual GUI-driven what-if analysis easy, even though the mechanics layer remains code-heavy.

## Verification Story

### What exists

- `run_functionality_test.py` contains manual regression-style checks for concentration, Haste, Hex/Hunter's Mark target transfer, Guiding Bolt, summons, and similar mechanics
- the simulator itself is built for repeated Monte Carlo runs via `run_simulation()`, which gives behavioral sampling for encounter balance
- benchmark scripts and benchmark entities exist for runtime measurement

### What does not exist

- no unit test framework
- no CI
- no property/invariant testing
- no deterministic replay traces
- no formal separation between rules model and runtime implementation

The functionality script proves the author cared about regressions in a few high-value areas, but it is still fundamentally manual validation around a mutable engine.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Choice scoring as a simulation policy layer.** The `Choice.score()` / `Choice.execute()` split is a clean way to separate "what options exist?" from "which option is best for this simulation policy?" That is useful for encounter simulation, even if it is not our correctness mechanism.

2. **Token-linked lifecycle cleanup.** The token graph is the strongest subsystem in the repo. Linked tokens for concentration, Haste, Hex, Hunter's Mark, Guiding Bolt, and summons are a real pattern worth remembering: long-lived effects often need relational cleanup, not just flags.

3. **Line-based spatial abstraction.** Their front/middle/back model validates that there is useful middle ground between exact grid tactics and no spatial model at all. We intentionally abstract spatial input entirely; `DnDSimulator` shows a concrete alternative point in the design space.

4. **Damage accumulator object.** `Dmg_class.py` is small but effective. Grouping typed damage before application avoids some duplication and makes resistance handling more inspectable.

### Anti-Patterns (For Us)

1. **Monolithic entity state.** `Entity_class.py` owns nearly everything: rules, state, feature flags, resources, conditions, movement, attacks, and spell support. This is exactly the kind of state blob our Quint + XState split is meant to avoid.

2. **Inline rule coupling.** Sneak Attack, Smite, Shield, opportunity attacks, stun, prone, and concentration all cut into direct imperative code paths. That makes global reasoning and verification extremely hard.

3. **Expectation-value combat instead of rule-accurate resolution.** Attacks and spells often use mean damage and heuristic scoring. That is useful for balancing, but it is a poor correctness oracle for a formal combat model.

4. **No replayable battle trace.** A Monte Carlo engine without explicit traces leaves you with aggregate outcomes, not a trustworthy explanation of why a specific combat unfolded.

5. **GUI and engine co-evolution.** `How_to.txt` shows that adding abilities often requires coordinated updates across engine logic, AI, and GUI metadata. That coupling slows architectural clarity.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `Entity_class.py` | 2,186 | Authoritative combatant state and most combat mechanics |
| `Spell_class.py` | 1,642 | Spell hierarchy and concrete spell implementations |
| `Encounter_GUI.py` | 1,415 | Tkinter UI for encounter setup, DM mode, and editing |
| `AI_class.py` | 800 | Turn policy, target selection, reaction heuristics |
| `Token_class.py` | 704 | Token graph for concentration and reversible status links |
| `Choice_class.py` | 518 | Scored action choices used by the AI |
| `run_functionality_test.py` | 472 | Manual regression checks for key mechanics |
| `Encounter_Simulator.py` | 364 | Initiative loop, repeated simulation, and summary stats |
| `README.md` | 255 | Project scope and supported features overview |
| `How_to.txt` | 146 | Contributor notes for extending features/spells/GUI |
| `Dmg_class.py` | 83 | Typed damage bundle with R/V/I application |
| `Dm_class.py` | 45 | Logging/printing helper used during simulation |
