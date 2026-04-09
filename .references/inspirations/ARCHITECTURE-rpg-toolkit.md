# Architecture: rpg-toolkit (KirkDiggler/rpg-toolkit)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Go 1.23 |
| Framework | None (stdlib + testify + gomock) |
| Edition target | D&D 5e, SRD-adjacent (barbarian, fighter, monk, rogue implemented) |
| License | GPL-3.0 |
| LOC (toolkit core) | ~2,700 (events/ + core/ + dice/ + game/) |
| LOC (dnd5e rulebook) | ~33,500 src + ~41,400 test |
| LOC (tools) | ~15,200 src (spatial, environments, spawn, selectables) |
| LOC (mechanics) | ~6,200 src (conditions, effects, proficiency, resources, features, spells) |
| Test coverage | 93.5% claimed; test LOC exceeds src LOC (57k test vs 59k src) |
| Active development | Active (sole author, extracted from live Discord bot) |

## Core Architecture Pattern

**Three-Layer Event-Driven Toolkit** with a typed topics pattern as the architectural centerpiece.

```
Game Server (Discord bot / API)
   |  owns persistence, player interaction
   v
Rulebooks (rulebooks/dnd5e/)
   |  D&D 5e rules, character model, combat resolution
   v
RPG Toolkit (events/ + core/ + dice/ + mechanics/ + tools/)
   |  generic event bus, typed topics, chains, dice, spatial
```

The layers communicate through a typed event bus. The toolkit layer is edition-agnostic: it provides `EventBus`, `TypedTopic[T]`, `ChainedTopic[T]`, `StagedChain[T]`, `Action[T]`, `Entity`, and dice primitives. The rulebook layer defines D&D-specific event types, chain stages, conditions, features, and combat resolution. The game server layer (not in this repo) orchestrates persistence and multiplayer.

The critical architectural insight, stated explicitly in the README: **"Features are dynamic, topics are static!"** Topic definitions are compile-time constants (`var AttackChain = events.DefineChainedTopic[AttackChainEvent](...)`), but which handlers subscribe to them is determined at runtime when features/conditions are applied. This separates type safety (known at compile time) from behavioral flexibility (known at runtime).

## State Model

### Character (Mutable Struct)

The `Character` struct in `rulebooks/dnd5e/character/character.go` (~1,300 lines) is a mutable aggregate:

```
Character
+-- id, name, level, proficiencyBonus
+-- raceID, subraceID, classID, subclassID
+-- abilityScores: AbilityScores (STR/DEX/CON/INT/WIS/CHA)
+-- hitPoints, maxHitPoints, armorClass, hitDice
+-- skills: map[Skill]ProficiencyLevel
+-- savingThrows: map[Ability]ProficiencyLevel
+-- inventory: []InventoryItem
+-- equipmentSlots: EquipmentSlots
+-- spellSlots, classResources
+-- resources: map[ResourceKey]*RecoverableResource
+-- features: []Feature        (Rage, Second Wind, Action Surge, etc.)
+-- combatAbilities: []CombatAbility   (Attack, Dash, Dodge, Disengage)
+-- actions: []Action          (Strike, Move, FlurryStrike, OffHandStrike)
+-- conditions: []ConditionBehavior   (Raging, Dodging, etc.)
+-- deathSaveState
+-- bus: EventBus (nil outside combat)
+-- actionEconomy (nil outside combat)
+-- dirty: bool   (persistence tracking)
```

Character creation uses a two-phase Draft -> Finalize pattern. The draft is mutable and validates incrementally; the finalized character is the runtime entity.

### Combatant Interface

Combat-participating entities implement the `Combatant` interface:

```go
type Combatant interface {
    GetID() string
    GetHitPoints() int
    GetMaxHitPoints() int
    AC() int
    ApplyDamage(ctx, input) *ApplyDamageResult
    AbilityScores() AbilityScores
    ProficiencyBonus() int
    IsDirty() bool
    MarkClean()
}
```

Both `Character` and `Monster` implement this. Combat lookups use `CombatantLookup` injected via Go `context.WithValue`.

### Action Economy (Mutable Struct)

```go
type ActionEconomy struct {
    ActionsRemaining        int   // Usually 1
    BonusActionsRemaining   int   // Usually 1
    ReactionsRemaining      int   // Usually 1
    AttacksRemaining        int   // 0 until Attack ability used
    MovementRemaining       int   // Set from character speed at turn start
    OffHandAttacksRemaining int   // Granted by TwoWeaponGranter
    FlurryStrikesRemaining  int   // Granted by FlurryOfBlows
}
```

Two-level resource model: primary economy (action/bonus/reaction) and capacity (attacks, movement, off-hand, flurry). The Attack combat ability consumes an action and grants attack capacity. Strike actions consume attack capacity.

## Event System

### The Typed Topics Pattern

This is the project's signature contribution. The pattern has four components:

**1. Topic Definition (compile-time)**

```go
// In rulebooks/dnd5e/events/events.go - defined once per event type
var AttackChain = events.DefineChainedTopic[AttackChainEvent]("dnd5e.combat.attack.chain")
var DamageChain = events.DefineChainedTopic[*DamageChainEvent]("dnd5e.combat.damage.chain")
var TurnStartTopic = events.DefineTypedTopic[TurnStartEvent]("dnd5e.turn.start")
```

Each topic is a package-level `var` binding a Go generic type parameter to a string routing key. This is the "static" part -- the topic set is fixed at compile time.

**2. Bus Connection (runtime)**

```go
attacks := dnd5eEvents.AttackChain.On(bus)   // Returns ChainedTopic[AttackChainEvent]
turns := dnd5eEvents.TurnStartTopic.On(bus)  // Returns TypedTopic[TurnStartEvent]
```

The `.On(bus)` call connects a topic definition to a specific bus instance, returning a typed accessor. This is the bridge between compile-time types and runtime wiring.

**3. Subscription (runtime, per-feature)**

```go
// In a condition's Apply() method
attacks.SubscribeWithChain(ctx, func(ctx context.Context, e AttackChainEvent, c chain.Chain[AttackChainEvent]) (chain.Chain[AttackChainEvent], error) {
    if e.TargetID == d.CharacterID {
        // Add disadvantage
        e.DisadvantageSources = append(e.DisadvantageSources, ...)
    }
    return c, nil
})
```

**4. Publication and Chain Execution (runtime, per-event)**

```go
// In combat resolution
chain := events.NewStagedChain[AttackChainEvent](ModifierStages)
modifiedChain, _ := attacks.PublishWithChain(ctx, attackEvent, chain)
finalEvent, _ := modifiedChain.Execute(ctx, attackEvent)
```

### Two Topic Flavors

| | TypedTopic[T] | ChainedTopic[T] |
|---|---|---|
| Purpose | Pure notification (fire-and-forget) | Modifier collection and staged execution |
| Subscribe | `func(ctx, T) error` | `func(ctx, T, Chain[T]) (Chain[T], error)` |
| Publish | `Publish(ctx, T) error` | `PublishWithChain(ctx, T, Chain[T]) (Chain[T], error)` |
| Examples | TurnStart, DamageReceived, ConditionApplied | AttackChain, DamageChain, SavingThrowChain, MovementChain |

### Event Catalog (dnd5e)

**Notification topics** (~20): TurnStart/End, DamageReceived, HealingReceived, ConditionApplied/Removed, ReactionUsed, Rest, ResourceConsumed, DeathSaveRolled, CharacterDied/Stabilized, StrikeExecuted, MoveExecuted, DodgeActivated, DisengageActivated, ActionGranted/Removed, FlurryStrikeRequested/Activated, OffHandStrikeRequested/Activated, PatientDefenseActivated, StepOfTheWindActivated, DeflectMissilesTrigger/Throw.

**Chain topics** (4): AttackChain, DamageChain, SavingThrowChain, MovementChain.

### EventBus Implementation

The bus itself is simple (~120 lines): a `map[Topic][]subscription` protected by `sync.RWMutex`. Handlers are stored as `any` and type-asserted at dispatch. The type safety lives entirely in the `TypedTopic`/`ChainedTopic` wrappers, which handle the `any` cast internally.

The `ChainedTopic` implementation wraps event+chain in a `chainedEvent[T]` struct, passes it through the untyped bus, and the subscriber unwraps it. The chain is mutated in place (pointer) as it passes through subscribers.

## Combat System

### Attack Resolution (ResolveAttack)

The full attack flow in `combat/attack.go` (~570 lines):

1. **Validate** -- AttackInput (attacker, target, weapon, bus)
2. **Look up combatants** -- via `GetCombatantFromContext(ctx, id)`
3. **Calculate base bonus** -- ability modifier + proficiency
4. **Fire AttackChain** -- collect advantage/disadvantage sources, attack bonuses, critical threshold modifiers, reaction consumptions
5. **Roll d20** -- advantage/disadvantage resolution (any+any = cancel), natural 1/20 handling
6. **Determine hit** -- total vs AC, with nat 1/20 overrides
7. **If hit, calculate damage**:
   a. Parse weapon damage notation (e.g., "1d8")
   b. Roll damage dice (doubled on crit)
   c. Build DamageComponents (weapon + ability modifier)
   d. Fire DamageChain via `ResolveDamage` -- collect rage bonus, sneak attack, GWF rerolls, resistance/vulnerability multipliers
   e. Apply multipliers (resistance, vulnerability, immunity with D&D 5e stacking rules)
8. **Publish DamageReceivedEvent** -- notifications for concentration checks, logging

### Damage Chain Stages

```go
var ModifierStages = []chain.Stage{
    StageBase,       // Dice rolls, proficiency, ability modifiers
    StageFeatures,   // Rage damage, sneak attack
    StageConditions, // Bless, bane, prone penalties
    StageEquipment,  // Magic weapon bonuses
    StageFinal,      // Resistance/vulnerability, damage caps
}
```

Each stage executes its modifiers in insertion order. Modifiers are identified by unique string IDs ("rage", "sneak_attack", "rage_resistance") to prevent duplicate registration.

### DealDamage Three-Phase Flow

```
RESOLVE -> APPLY -> NOTIFY
```

1. **RESOLVE**: Publish through DamageChain, collect modifiers, apply multipliers
2. **APPLY**: Call `Target.ApplyDamage()` to reduce HP
3. **NOTIFY**: Publish `DamageReceivedEvent` for reactions

### TurnManager

Orchestrates a single turn: `StartTurn()` -> actions/abilities -> `EndTurn()`. Manages action economy, builds combat context (combatant lookup, room, two-weapon context), and publishes lifecycle events.

## Feature System

### Feature / Condition Split

The project separates *features* (things you activate, like Rage) from *conditions* (active effects that subscribe to events, like Raging). A feature's `Activate()` method creates and publishes a condition:

```
Feature.Activate()
  -> publishes ConditionAppliedEvent
  -> Character receives event, stores ConditionBehavior
  -> Condition.Apply(bus) subscribes to relevant chains
```

### Rage Example (Feature + Condition)

**Feature** (`features/rage.go`, 183 lines):
- Implements `Action[FeatureInput]` -- activatable via action economy
- `CanActivate()`: checks `ResourceAccessor.IsResourceAvailable(RageCharges)`
- `Activate()`: consumes charge, creates `RagingCondition`, publishes `ConditionAppliedEvent`

**Condition** (`conditions/raging.go`, 297 lines):
- Implements `ConditionBehavior` (Apply/Remove/IsApplied/ToJSON)
- `Apply()` subscribes to 5 event topics:
  1. `DamageReceivedTopic` -- track `WasHitThisTurn`
  2. `TurnEndTopic` -- check rage continuation (no combat = ends, 10 rounds = ends)
  3. `ConditionAppliedTopic` -- unconscious ends rage
  4. `DamageChain` -- add rage damage bonus (StageFeatures) and resistance (StageFinal)
  5. `RestTopic` -- rest ends rage
- `onDamageChain()` handles both offense (bonus damage component) and defense (0.5 multiplier for B/P/S)

### Dodging Example (Condition-Only)

`DodgingCondition` subscribes to:
1. `AttackChain` -- adds disadvantage when character is targeted
2. `SavingThrowChain` -- adds advantage on DEX saves
3. `TurnStartTopic` -- self-removes at start of next turn

### Sneak Attack Example

`SneakAttackCondition` subscribes to `DamageChain`:
- Checks attacker is the rogue, attack has advantage or another enemy is adjacent
- Adds sneak attack dice as a damage component at `StageFeatures`
- Once-per-turn tracking via `usedThisTurn` flag, reset on `TurnStartTopic`

### BusEffect Lifecycle

All conditions implement `events.BusEffect`:
```go
type BusEffect interface {
    Apply(ctx context.Context, bus EventBus) error   // Subscribe
    Remove(ctx context.Context, bus EventBus) error  // Unsubscribe
    IsApplied() bool
}
```

Subscription IDs are stored for cleanup. Apply/Remove handle rollback on partial failure.

## Content vs Engine Boundary

**Strong separation.** The toolkit layer (`events/`, `core/`, `dice/`) knows nothing about D&D. It provides:
- `EventBus`, `TypedTopic[T]`, `ChainedTopic[T]`, `StagedChain[T]` -- event infrastructure
- `Entity`, `Action[T]` -- entity and action interfaces
- `Chain[T]`, `Stage`, `Effect[T]` -- modifier chain abstractions
- `Roller`, `Pool`, `Lazy` -- dice evaluation
- Typed constants: `AttackType`, `ArmorType`, `ActionType`, `DamageType` (base types only)

The rulebook layer (`rulebooks/dnd5e/`) contains all D&D knowledge:
- Event type structs (AttackChainEvent, DamageChainEvent, etc.)
- Chain stage definitions (StageBase through StageFinal)
- Character model, combat resolution, conditions, features
- Weapon/armor/spell data, class definitions

**The boundary is enforced by Go modules.** Each directory is its own Go module with explicit `go.mod`. Cross-module imports are one-directional: rulebook imports toolkit, never the reverse. The `core/` package defines typed constants (`combat.AttackType`, `damage.Type`) that the toolkit uses generically and the rulebook populates with specific values.

**JSON serialization as API boundary**: Conditions and features serialize to JSON via `ToJSON()` with `core.Ref` routing keys (`module:type:id`). The game server stores these as opaque blobs and reconstitutes them via `LoadJSON()` dispatch on the Ref. This cleanly separates persistence from behavior.

## Verification Story

### Test Coverage

The project claims 93.5% coverage. Test LOC (57,061) slightly exceeds source LOC (58,922), indicating thorough testing. Key patterns:

**Testify Suite**: All tests use `testify/suite` with `SetupTest`/`SetupSubTest` for per-test/per-subtest fixture reset.

**Mock Roller**: Dice rolls are deterministic in tests via `gomock`-generated `MockRoller`. This enables precise attack/damage verification without randomness.

**Integration Tests**: `combat/integration_test.go` (~3,351 lines in `integration/`) tests full combat flows with real Character objects, mock dice, and event bus wiring. Tests verify exact damage values, advantage/disadvantage resolution, and condition interactions.

**Unit Tests Per Condition**: Each condition has its own `_test.go` (e.g., `raging_test.go`, `dodging_test.go`, `sneak_attack_test.go`) testing chain subscription, modifier application, and lifecycle (apply/remove/turn-end).

### What Is NOT Tested

- No formal specification or model checking
- No property-based testing
- No deterministic replay from traces
- No snapshot/rollback verification
- Test coverage is structural (line coverage), not semantic

### Comparison With Our Approach

| Aspect | rpg-toolkit | Our project |
|---|---|---|
| Verification method | Go unit/integration tests | Quint formal spec + MBT parity tests |
| Coverage metric | Line coverage (93.5%) | Semantic coverage via random trace replay |
| Determinism | Mock dice in tests | Quint evaluator (fully deterministic) |
| State diffing | None (mutable structs) | ITF trace comparison |
| Exhaustiveness | Manual test case design | Nondeterministic exploration + invariant fuzzing |

## Key Inspirations For Our Project

### High-Signal Patterns

1. **Typed topics with `.On(bus)` connection** -- The separation of topic definition (compile-time, type-safe) from bus connection (runtime) is elegant. In our project, XState events serve a similar role but without the explicit connection step. The rpg-toolkit pattern makes event wiring visible and auditable, which is valuable for debugging complex feature interactions.

2. **ChainedTopic for staged modifier collection** -- The two-phase publish-then-execute pattern (collect modifiers via PublishWithChain, then apply via chain.Execute) is a clean solution for ordered modifier application. Our damage pipeline in `battle.qnt` achieves the same semantic result through sequential state transitions, but the chain pattern separates modifier registration from execution more explicitly.

3. **BusEffect lifecycle (Apply/Remove with subscription tracking)** -- Conditions storing their subscription IDs and cleaning up on removal is a robust pattern for dynamic event handler management. Our ActiveEffect system in XState doesn't currently track subscriptions this granularly.

4. **Two-level action economy (primary resources + capacity)** -- The distinction between "spending an action to take the Attack ability" and "each strike consumes one attack from the granted capacity" maps cleanly to our concept of action -> sub-actions. The explicit capacity types (CapacityAttack, CapacityMovement, CapacityOffHandAttack, CapacityFlurryStrike) are a useful taxonomy.

5. **Feature/Condition separation** -- Features are activators (consume resources, create conditions). Conditions are subscribers (listen to events, modify chains). This clean split avoids the common anti-pattern of features that are both triggers and effects. Our `creature.qnt` conflates these somewhat.

6. **DamageComponent with full provenance** -- Each damage component tracks source type, source ref, original dice rolls, final dice rolls, reroll history, flat bonus, damage type, critical flag, and multiplier. This level of transparency is excellent for combat logs and debugging.

### Anti-Patterns (For Us)

1. **Mutable state throughout** -- Character, ActionEconomy, conditions all use mutable structs with no snapshot or rollback capability. This is fundamentally incompatible with our Quint immutable-record model and MBT trace replay. The `dirty` tracking flag on Character is a symptom of the problem: you need explicit change tracking when state is mutable.

2. **`any` type erasure at the bus layer** -- The EventBus interface uses `any` for both handlers and events. Type safety is recovered by the TypedTopic wrapper, but if anything bypasses the wrapper (which is possible since the bus is a public interface), runtime panics can occur. Go generics can't fully close this gap because the bus needs to be topic-heterogeneous.

3. **No formal ordering guarantees across subscribers** -- Within a chain stage, modifiers execute in registration order. Across conditions subscribed to the same chain, the order depends on when `Apply()` was called. There's no priority system and no way to reason about handler conflicts formally. Our Quint spec makes ordering explicit.

4. **Context-based dependency injection** -- Combat dependencies (combatant lookup, room, two-weapon context) are passed via `context.WithValue`, which is essentially untyped dependency injection. This makes the call graph hard to follow and produces runtime errors instead of compile errors when context is missing.

5. **Condition-as-class explosion** -- Each D&D condition/effect is its own Go struct: RagingCondition, DodgingCondition, SneakAttackCondition, UnarmoredDefenseCondition, ImprovedCriticalCondition, etc. (~20 structs, each 150-300 lines). This leads to significant boilerplate (Apply/Remove/ToJSON/loadJSON per condition). A more data-driven approach (which the project's README acknowledges as aspirational) would reduce this.

6. **No turn/round state machine** -- Combat sequencing is procedural (TurnManager with StartTurn/EndTurn). There is no state machine governing valid action sequences within a turn. Our XState/Quint approach provides exhaustive coverage of action ordering.

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `events/bus.go` | 119 | EventBus implementation (untyped pub/sub with RWMutex) |
| `events/topic_def.go` | 77 | TypedTopicDef/ChainedTopicDef with `.On(bus)` factory |
| `events/typed_topic.go` | 60 | TypedTopic[T] interface + implementation |
| `events/chained_topic.go` | 139 | ChainedTopic[T] with chainedEvent wrapper |
| `events/chain.go` | 120 | StagedChain[T] -- ordered stage execution |
| `events/bus_effect.go` | 59 | BusEffect interface (Apply/Remove/IsApplied) |
| `core/entity.go` | 22 | Entity interface (GetID/GetType) |
| `core/action.go` | 51 | Action[T] generic interface |
| `core/ref.go` | 266 | Ref (module:type:id) with validation + JSON |
| `core/chain/types.go` | 28 | Chain[T] interface (Add/Remove/Execute) |
| `dice/lazy.go` | 82 | Lazy dice (fresh roll each call, for Bless) |
| `dice/roller.go` | 70 | Roller interface + CryptoRoller |
| `dice/notation.go` | 145 | Dice notation parser ("2d6+3") |
| `rulebooks/dnd5e/events/events.go` | 760 | All D&D 5e event types + topic definitions |
| `rulebooks/dnd5e/combat/attack.go` | 569 | ResolveAttack -- full attack chain resolution |
| `rulebooks/dnd5e/combat/damage.go` | 408 | DealDamage/ResolveDamage + multiplier math |
| `rulebooks/dnd5e/combat/stages.go` | 42 | ModifierStages (Base/Features/Conditions/Equipment/Final) |
| `rulebooks/dnd5e/combat/action_economy.go` | 217 | ActionEconomy struct + resource management |
| `rulebooks/dnd5e/combat/combatant.go` | 128 | Combatant interface + context lookup |
| `rulebooks/dnd5e/combat/turn_manager.go` | 286 | TurnManager (turn lifecycle orchestration) |
| `rulebooks/dnd5e/conditions/raging.go` | 297 | RagingCondition (damage bonus + resistance) |
| `rulebooks/dnd5e/conditions/dodging.go` | 225 | DodgingCondition (disadvantage + DEX advantage) |
| `rulebooks/dnd5e/conditions/sneak_attack.go` | 287 | SneakAttackCondition (extra damage dice) |
| `rulebooks/dnd5e/features/rage.go` | 182 | Rage feature (activator, creates RagingCondition) |
| `rulebooks/dnd5e/character/character.go` | 1,323 | Character aggregate (mutable, all state) |
| `rulebooks/dnd5e/actions/strike.go` | 158 | Strike action (consume attack, publish event) |
