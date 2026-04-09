# Architecture: OpenCombatEngine (jamesplotts/opencombatengine)

## Snapshot

| Attribute | Value |
|---|---|
| Language | C# 12, .NET 8.0 |
| Framework | None (pure library); xUnit + FluentAssertions + NSubstitute for tests |
| Edition target | D&D 5e SRD 5.1 (OGL 1.0a) |
| License | MIT (code), OGL 1.0a (game mechanics) |
| LOC (engine core) | ~14,300 (`src/`) across Core (interfaces/enums/models) + Implementation |
| LOC (tests) | ~10,800 (`tests/`) across 93 test files |
| Test coverage | Substantial -- ~75% test-to-source ratio; xUnit with FluentAssertions throughout; NSubstitute mocks for dice; but no property testing or invariant fuzzing |
| Active development | Active (sole author, AI-assisted development methodology, extensive ADR trail) |

## Core Architecture Pattern

**Interface-Segregated Composition with C# Events** -- thin `Core` interfaces define contracts; `Implementation` provides mutable OOP implementations wired together via constructor injection and C# `event` delegates.

The codebase has a hard two-assembly split:

1. **`OpenCombatEngine.Core`** -- pure interfaces (`ICreature`, `IAction`, `ICondition`, `IActiveEffect`, `ITurnManager`, `ICombatManager`, `IGridManager`, `IReaction`), enums (`ConditionType`, `DamageType`, `StatType`), record DTOs for state/events, and a `Result<T>` monad.
2. **`OpenCombatEngine.Implementation`** -- concrete classes (`StandardCreature`, `StandardCombatManager`, `StandardTurnManager`, `Condition`, `AttackAction`, `CastSpellAction`, `StandardGridManager`, etc.).

Cross-cutting concerns (turn lifecycle, reactions, condition effects) are coordinated through C# `event EventHandler<T>` subscriptions rather than a central event bus or state machine. The architecture is explicitly designed for extensibility via interface substitution ("swap any component") at the cost of diffuse control flow.

## State Model

### Creature Composition

`ICreature` is a fat interface (~40 members) that aggregates subsystems via composition. `StandardCreature` holds concrete instances of each:

```
StandardCreature : ICreature, IStateful<CreatureState>
  ├── AbilityScores    : IAbilityScores (6 scores + GetModifier)
  ├── HitPoints        : IHitPoints (current/max/temp, death saves, hit dice)
  ├── CombatStats      : ICombatStats (AC, initiative, speed, R/V/I sets)
  ├── Conditions       : IConditionManager (list of ICondition, Tick())
  ├── Effects          : IEffectManager (list of IActiveEffect, stat pipeline)
  ├── ActionEconomy    : IActionEconomy (HasAction/BonusAction/Reaction flags)
  ├── Movement         : IMovement (speed, remaining, grid notify)
  ├── Checks           : ICheckManager (ability checks, saves, death saves)
  ├── Equipment        : IEquipmentManager (MainHand, Armor, Shield, slots)
  ├── Inventory        : IInventory (items, weight, encumbrance)
  ├── Spellcasting     : ISpellCaster? (slots, known/prepared spells, concentration)
  ├── ReactionManager  : IReactionManager (OA registration + trigger check)
  ├── LevelManager     : ILevelManager (class levels, proficiency bonus, XP)
  ├── Features         : List<IFeature> (Sneak Attack, Rage, etc.)
  ├── Actions          : computed (Move + Unarmed + Spells + Custom + MagicItems)
  └── Senses           : Dictionary<string, int> (e.g. "Darkvision" -> 60)
```

All subsystems are **mutable**. State changes happen via method calls (`TakeDamage`, `UseAction`, `AddCondition`) that mutate internal fields and fire C# events.

### Serialization via Memento Pattern

Components implement `IStateful<TState>` with `GetState()` returning immutable `record` DTOs:
- `CreatureState` (Id, Name, Team, AbilityScoresState, HitPointsState, CombatStatsState, ConditionManagerState, LevelManagerState)
- `CombatState` (List<CreatureState>, TurnManagerState, WinConditionType)

Deserialization constructs new `StandardCreature(CreatureState)` from the DTO. This is a manual snapshot-restore pattern -- no automatic change tracking, no event sourcing, no undo/redo. The separation between "base values" and "calculated values" is imperfect (e.g., CombatStats serializes `_baseArmorClass` but the code includes comments acknowledging the ambiguity).

### Combat State

`StandardCombatManager` holds:
- `List<ICreature>` participants (mutable, not indexed)
- `ITurnManager` (initiative order + round counter)
- `IGridManager?` (optional spatial layer)
- `IWinCondition` (pluggable predicate)

No global registry -- creature references are passed explicitly. But the grid maintains its own `Dictionary<Guid, ICreature>` for spatial queries, creating a second ownership path.

**Comparison with us:** Our Quint spec models combat state as a single immutable record. OpenCombatEngine's mutable OOP approach makes replay and verification fundamentally harder -- there is no way to snapshot state at arbitrary points (except by calling `GetState()` explicitly), no deterministic replay without seed control, and no formal reasoning about state transition correctness.

## Event/Action System

### Action Pattern (Command)

Actions implement `IAction` with a single `Execute(IActionContext) -> Result<ActionResult>` method. The context provides source creature, target (creature or position), grid reference, cover, and obscurement.

**Key actions:**
- `AttackAction` -- full attack resolution in one method: action economy check -> advantage/disadvantage calculation (conditions, effects, flanking) -> d20 roll -> damage roll -> critical doubling -> `ModifyOutgoingAttack` (features) -> `ResolveAttack` on target (AC, R/V/I, HP reduction)
- `CastSpellAction` -- preparation check -> slot consumption -> concentration set -> spell execution (single target or AOE via grid) -> saving throw -> damage/healing/condition application
- `MoveAction` -- pathfinding via grid -> movement cost -> position update -> reaction triggers
- `OpportunityAttack` -- reaction-triggered attack using creature's first available attack action

Action economy is enforced inside each action's `Execute` method: check `HasAction`/`HasBonusAction`/`HasReaction`, then call `UseAction()`/etc. Reset happens at `StartTurn()`.

### Turn Management

`StandardTurnManager` implements a simple cyclic turn loop:
1. `StartCombat(creatures)` -- roll initiative (1d20 + bonus), sort descending, set round 1, call `NextTurn()`
2. `NextTurn()` -- increment index (wrapping to round start), skip dead creatures, call `creature.StartTurn()`, fire `TurnChanged` event
3. Dead creature detection: loops through order, skipping `IsDead`, with a safety bound of `count * 2` iterations

The turn manager does NOT orchestrate actions -- it only tracks whose turn it is and fires events. Action execution is driven externally (by AI controllers or game loop code).

### C# Event Wiring

Control flow is mediated by `event EventHandler<T>`:
- `HitPoints.Died` -> `StandardCombatManager.OnParticipantDied` -> `CheckWinCondition()`
- `HitPoints.DamageTaken` -> `StandardCreature.OnDamageTaken` -> concentration save
- `GridManager.CreatureMoved` -> `StandardReactionManager.OnCreatureMoved` -> OA check
- `TurnManager.TurnChanged` / `RoundChanged` / `CombatEnded` -- observation hooks

**Comparison with us:** Our battle.qnt models the full combat loop as explicit state machine transitions. OpenCombatEngine's event-driven approach is more flexible (any code can subscribe to any event) but creates diffuse control flow -- tracking "what happens when a creature takes damage" requires following event subscriptions across StandardCreature, StandardCombatManager, and potentially any IFeature. Our approach makes all state transitions explicit and verifiable.

## Condition/Effect System

### Two-Layer Design

OpenCombatEngine separates **conditions** (named game states like Blinded, Paralyzed) from **active effects** (stat modifiers that conditions inject):

**Layer 1: Conditions** (`ICondition` / `IConditionManager`)
- `Condition` class: name, type (enum), duration (rounds, -1 for permanent), description
- `StandardConditionManager`: list of active conditions, `Tick()` decrements durations and removes expired ones, `AddCondition()` fires `OnApplied()` and registers condition's effects with `IEffectManager`
- `ConditionFactory`: creates `Condition` instances from name/type strings (used by spell resolution)
- Conditions are checked by type enum in action code: `source.Conditions.HasCondition(ConditionType.Blinded)`

**Layer 2: Active Effects** (`IActiveEffect` / `IEffectManager`)
- `IActiveEffect.ModifyStat(StatType, int) -> int`: each effect modifies a specific stat via a pipeline
- `StandardEffectManager.ApplyStatBonuses(stat, baseValue)`: iterates all effects, chaining `ModifyStat` calls
- `StatBonusEffect`: generic "+N to stat" for a duration
- `ConditionEffectBase` subclasses: `AdvantageOnIncomingAttacksEffect`, `DisadvantageOnOutgoingAttacksEffect` -- return flag values (1) for advantage/disadvantage stat queries

**Stat pipeline in practice:**
```
CombatStats.ArmorClass:
  base AC (10) -> equipment.Armor.AC + dex -> Effects.ApplyStatBonuses(StatType.ArmorClass, ac)

AttackAction.Execute:
  hasAdvantage |= source.Effects.ApplyStatBonuses(StatType.AttackAdvantage, 0) > 0
  hasDisadvantage |= source.Effects.ApplyStatBonuses(StatType.AttackDisadvantage, 0) > 0
```

**Condition effects on attack rolls are DUAL-PATHED:** The `AttackAction` checks both `source.Conditions.HasCondition(ConditionType.X)` directly AND `source.Effects.ApplyStatBonuses(StatType.AttackDisadvantage)`. This means condition effects can be injected either by hard-coded condition checks in action code or by the effects pipeline. The hard-coded checks exist for standard 5e conditions (Blinded, Poisoned, Restrained, Prone, etc.); the effects pipeline exists for custom/spell effects.

**Comparison with us:** We model condition effects as explicit guards and modifiers in the Quint spec -- `if hasCondition(Blinded) then disadvantage`. OpenCombatEngine's dual-path approach (hard-coded condition checks + effects pipeline) creates redundancy risks -- a condition could be modeled in both paths, or only one, and there is no verification that they agree. Our approach is more rigid but provably consistent.

## Spatial Model

**Grid-based with A* pathfinding.**

`StandardGridManager` implements `IGridManager` with:
- `Dictionary<Guid, Position>` (creature -> position) and reverse mapping
- `Position` is a `record struct` with `(int X, int Y, int Z)`
- Distance: Chebyshev metric (max of |dx|, |dy|) * 5 feet
- A* pathfinding with difficult terrain (cost 2x) and obstacles (impassable)
- Line of sight: Bresenham line check against obstacle positions
- Flanking: checks if two hostile creatures are on opposite sides of a target
- AoE shapes: `SphereShape`, `ConeShape`, `CubeShape`, `LineShape` implementing `IShape`
- Events: `CreatureMoved` event triggers reaction checks on all other creatures

The grid is optional -- `IGridManager?` is nullable throughout, and actions fall back to range-less/LOS-less behavior when no grid is present. This makes the system usable both with and without spatial simulation.

**Comparison with us:** We intentionally abstract spatial concerns as caller-provided inputs (range, LOS, cover are external inputs to the combat spec). OpenCombatEngine commits to a concrete grid implementation but makes it optional. Their approach is more complete for simulation but couples combat rules to a specific spatial model.

## Content vs Engine Boundary

**Strong interface boundary, leaky implementation.**

The Core assembly is genuinely pure -- no concrete classes, only interfaces, enums, records, and `Result<T>`. The Implementation assembly contains all game logic. This separation enables:
- Dependency injection (test with mocked `IDiceRoller`, `IGridManager`, etc.)
- Alternative implementations (the architecture ADRs discuss swapping AI controllers, win conditions, etc.)

However, the boundary leaks in practice:
- `ICreature` is a fat interface (~40 members) that encodes D&D assumptions (ability scores, action economy, spellcasting, equipment slots)
- `AttackAction.Execute` hard-codes D&D-specific condition checks (Blinded, Poisoned, etc.)
- `StandardCreature` constructor hard-wires `OpportunityAttackReaction` into every creature
- Content import (JSON spells, monsters, races) is tightly coupled to the Standard* classes

**Feature system** (`IFeature`): a pluggable hook pattern with 4 lifecycle methods (`OnApplied`, `OnRemoved`, `OnStartTurn`, `OnOutgoingAttack`). Concrete features include SneakAttack, Rage, AttributeBonus, DamageAffinity, LifeStealing, Proficiency, Spellcasting, Sense, etc. `FeatureFactory` creates features from parsed description strings (keyword matching like "advantage", "resistance", "darkvision"). This is the primary extensibility point for class/race features.

## Verification Story

**Good unit test coverage, no formal verification.**

- **93 test files** (~10,800 LOC) covering creatures, actions, spells, conditions, effects, reactions, spatial, serialization, AI, content import, and end-to-end combat
- **FluentAssertions** for readable assertions throughout
- **NSubstitute** for mocking `IDiceRoller` (deterministic rolls), `IActionContext`, `IGridManager`
- **Deterministic dice**: `StandardDiceRoller` accepts optional seed for reproducible tests, but most tests use mocked dice rather than seeded randomness
- **Test patterns**: unit tests for individual subsystems (HP, conditions, effects), integration tests for action resolution (attack + conditions + effects), end-to-end tests for full combat scenarios (AI controllers running complete encounters)

**What's missing:**
- No property-based testing or invariant fuzzing
- No state machine model or transition verification
- No formal proof that condition effects are correctly applied/removed
- No replay/snapshot testing -- tests set up state, execute actions, and check results, but don't verify state transition sequences
- Serialization tests verify round-trip but not behavioral equivalence after restore
- Some tests have comments acknowledging limitations ("If the Roll is mocked, the dice are deterministic but randomized for the rest of the test")

**Comparison with us:** Our MBT parity tests and Quint invariant fuzzing provide fundamentally stronger guarantees. OpenCombatEngine's test suite is comprehensive for a traditional OOP project but cannot prove properties like "a condition's effects are always fully removed when the condition expires" -- it can only test specific scenarios.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Interface-segregated creature subsystems** -- decomposing creature state into `IHitPoints`, `IAbilityScores`, `ICombatStats`, `IActionEconomy`, `IConditionManager`, `IEffectManager`, `IMovement`, `ICheckManager` is a clean separation. Each subsystem has a focused API. Worth studying for our TS-side creature state decomposition, even though our authoritative state lives in Quint.

2. **StatType-indexed effect pipeline** -- `IActiveEffect.ModifyStat(StatType, int) -> int` with `IEffectManager.ApplyStatBonuses(stat, base)` chaining all effects is a pragmatic pattern for runtime stat calculation. The `StatType` enum (`ArmorClass`, `Speed`, `AttackRoll`, `DamageRoll`, `AttackAdvantage`, `IncomingAttackAdvantage`, etc.) cleanly enumerates all modifiable stats. Our TS features could adopt a similar pipeline for computing derived values.

3. **Result<T> monad for action outcomes** -- every action returns `Result<ActionResult>` instead of throwing. The `Result<T>` class provides `OnSuccess`, `OnFailure`, `Map` combinators. This is similar to our use of `Effect` library but lighter-weight. The pattern of returning failure strings ("No spell slots available for level 2") provides good error tracing.

4. **Optional grid with graceful degradation** -- `IGridManager?` is nullable throughout, and all spatial checks (range, LOS, flanking, AoE) are skipped when no grid is present. This lets the engine work both as a full tactical simulator and as a pure combat resolver. Our architecture similarly abstracts spatial concerns, and this confirms the value of that choice.

5. **Feature lifecycle hooks** -- `IFeature` with `OnApplied/OnRemoved/OnStartTurn/OnOutgoingAttack` is a clean extensibility pattern for class features. The `SneakAttackFeature` implementation (check advantage, check weapon properties, add damage, track once-per-turn) is concise and well-separated. Our TS features follow a similar pattern but could borrow the explicit `OnStartTurn` hook.

6. **Reaction system via event subscription** -- `IReaction.CanReact(eventArgs, context) -> bool` + `React(eventArgs, context) -> Result<ActionResult>` is a clean trigger-check-execute pattern. The `OpportunityAttackReaction` checks reach-leaving via grid positions. This validates our own reaction eligibility design.

### Anti-Patterns (For Us)

1. **Mutable state throughout** -- all subsystem state is mutable via method calls. No snapshots, no undo, no deterministic replay without external seed control. Fatal for formal verification. Our Quint immutable records avoid this entirely.

2. **Dual-path condition effects** -- conditions are checked both via hard-coded `HasCondition(ConditionType.Blinded)` in action code AND via the effects pipeline (`ApplyStatBonuses(StatType.AttackDisadvantage)`). This creates divergence risk -- a condition could be partially modeled in one path but not the other. Our spec models conditions as single-source-of-truth guards.

3. **Fat creature interface** -- `ICreature` has ~40 members and is expected by nearly every component. Adding a subsystem (e.g., environmental effects, mounted combat) requires modifying this central interface. Our composition via Quint records avoids interface bloat.

4. **Event-driven control flow obscures execution order** -- when a creature takes damage, the flow is: `HitPoints.TakeDamage` -> fires `DamageTaken` event -> `StandardCreature.OnDamageTaken` -> concentration save -> potentially `BreakConcentration` -> remove spell effects. Meanwhile, `HitPoints.Died` fires -> `StandardCombatManager.OnParticipantDied` -> `CheckWinCondition`. This is spread across 3+ files with no central place to see the full sequence. Our state machine makes all transitions explicit.

5. **No formal action economy enforcement** -- each action individually checks and consumes resources in its `Execute` method. There is no central validation that a creature's turn is legal (e.g., "used Action for Attack, then tried to use Action again for Dodge"). The AI controller loop has a safety bound of `maxActions = 2` but this is a heuristic, not a formal constraint. Our Quint spec models action economy as explicit state guards.

6. **Constructor wiring complexity** -- `StandardCreature` has a 14-parameter constructor with most parameters optional, creating default instances that mutually reference each other (`StandardCombatStats(creature: this)`, `StandardMovement(CombatStats, Conditions)` + `stdMove.Creature = this`). The second constructor (from `CreatureState`) duplicates this logic. This is fragile and hard to test. Our typed context approach avoids circular references.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `src/.../Creatures/StandardCreature.cs` | 552 | Central creature implementation, subsystem wiring, attack resolution, turn lifecycle |
| `src/.../Spatial/StandardGridManager.cs` | 510 | Grid, pathfinding, LOS, flanking, AoE, reaction triggering |
| `src/.../Actions/CastSpellAction.cs` | 362 | Full spell resolution: preparation, slots, concentration, AOE, saves, damage, conditions |
| `src/.../Dice/StandardDiceRoller.cs` | 331 | Dice notation parser and roller with seeded randomness |
| `src/.../AI/RoleBasedAiController.cs` | 288 | Tier 3 AI: Artillery kiting, Brute rushing, role-based decision trees |
| `src/.../Spells/StandardSpellCaster.cs` | 249 | Spell slots, known/prepared lists, concentration tracking, multiclass slot calc |
| `src/.../Actions/AttackAction.cs` | 242 | Full melee/ranged attack resolution with conditions, effects, flanking, advantage |
| `src/.../Creatures/StandardHitPoints.cs` | 225 | HP, temp HP, death saves (success/failure/critical), stabilization, hit dice |
| `src/.../Features/FeatureFactory.cs` | 214 | Keyword-based feature construction from parsed text descriptions |
| `src/.../Items/StandardEquipmentManager.cs` | 208 | Equipment slots, armor/shield/weapon management, attunement |
| `src/.../AI/TacticalAiController.cs` | 195 | Tier 2 AI: threat assessment, self-preservation, target prioritization |
| `src/.../Creatures/StandardCombatStats.cs` | 185 | AC calculation (armor, dex, effects), initiative, speed, R/V/I sets |
| `src/.../StandardTurnManager.cs` | 150 | Initiative rolling, cyclic turn order, round tracking, dead-skip |
| `src/.../Conditions/StandardConditionManager.cs` | 145 | Condition list management, tick/expiry, effect registration |
| `src/.../Combat/StandardCombatManager.cs` | 142 | Encounter lifecycle, win condition checking, participant management |
| `src/.../Effects/StandardEffectManager.cs` | 95 | Active effect list, stat bonus pipeline, tick/expiry |
| `src/.../Reactions/OpportunityAttackReaction.cs` | 95 | OA trigger: reach-leaving detection, reaction consumption, attack execution |
| `src/.../Reactions/StandardReactionManager.cs` | 92 | Reaction registry, event-driven trigger checking |
| `src/.../Conditions/ConditionFactory.cs` | 73 | Create conditions from name/type strings, duration parsing |
| `src/.../Effects/ConditionEffects.cs` | 52 | Base class + advantage/disadvantage effects for condition-injected stat mods |
| `src/...Core/Interfaces/Creatures/ICreature.cs` | 197 | Fat creature interface: ~40 members across all subsystems |
| `src/...Core/Results/Result.cs` | 142 | Result<T> monad: Success/Failure, OnSuccess/OnFailure, Map |
| `tests/.../Combat/CombatLoopTests.cs` | 211 | Initiative ordering, dead-skipping, win condition trigger tests |
| `tests/.../Reactions/ReactionTests.cs` | 133 | OA trigger/non-trigger scenarios: reach-leaving, ally immunity |
| `tests/.../Spells/SpellConditionTests.cs` | 131 | Spell-applied conditions: failed save -> Paralyzed, successful save -> no condition |
