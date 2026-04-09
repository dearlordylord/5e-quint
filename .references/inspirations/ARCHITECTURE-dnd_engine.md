# Architecture: dnd_engine (furlat/dnd_engine)

## Snapshot

| Attribute | Value |
|---|---|
| Language | Python 3.x |
| Framework | Pydantic v2 (data models), FastAPI (optional web API) |
| Edition target | D&D 5e, loosely — not tightly edition-disciplined |
| License | MIT |
| LOC (engine core) | ~8,000 (dnd/core/ + dnd/*.py) |
| LOC (app layer) | ~2,000 (app/) |
| Test coverage | Minimal — example scripts, no formal test suite |
| Active development | Moderate (sole author, architecture-first) |

## Core Architecture Pattern

**Entity-Component-Event** with global UUID registries.

The architecture is organized in three layers:

1. **Core framework** (`dnd/core/`) — generic primitives: `BaseObject`, `BaseValue`/`ModifiableValue`, `Event`/`EventQueue`, `BaseCondition`, `BaseAction`, `Modifier` hierarchy
2. **D&D domain** (`dnd/`) — concrete D&D types: `Entity`, `Attack`, `Move`, conditions (Blinded, Charmed, etc.), reactions (opportunity attacks)
3. **App layer** (`app/`) — FastAPI REST surface + Pydantic API models

The critical insight: the core framework is genuinely generic — it could model any turn-based game. D&D rules live entirely in layer 2.

## State Model

### Global Registries (Static Class Dicts)

Everything is UUID-addressable via class-level registries:

- `BaseObject._registry: Dict[UUID, BaseObject]` — all game objects
- `BaseValue._registry: Dict[UUID, BaseValue]` — all computed values
- `Entity._entity_registry: Dict[UUID, Entity]` — all entities
- `Entity._entity_by_position: DefaultDict[Tuple, List[Entity]]` — spatial index
- `EventQueue._events_by_*` — multiple indices (lineage, type, phase, source, target, timestamp)
- `EventQueue._event_handlers*` — trigger-indexed handler registry

**Trade-off**: Maximum cross-reference flexibility, zero serialization discipline. State is a mutable global graph — no snapshots, no rollback, no deterministic replay. This is the exact opposite of our Quint immutable-record approach.

### Entity Composition

An `Entity` is a container of **blocks** (sub-components):

```
Entity
├── ability_scores: AbilityScores (6 abilities, each a ModifiableValue)
├── skill_set: SkillSet (18 skills, each with proficiency + bonus)
├── saving_throws: SavingThrowSet (6 saves)
├── health: Health (HP, temp HP, hit dice, death saves)
├── equipment: Equipment (weapons, armor, shield, AC computation)
├── action_economy: ActionEconomy (actions, bonus actions, reactions, movement)
├── senses: Senses (FOV, paths, visible entities)
├── proficiency_bonus: ModifiableValue
└── active_conditions: Dict[str, BaseCondition]
```

Each block is a `BaseBlock` (subclass of `BaseObject`) with its own condition/modifier attachment points.

### ModifiableValue — The Modifier Algebra

The most architecturally distinctive feature. Every numeric value (AC, attack bonus, skill bonus, movement speed, etc.) is a `ModifiableValue` with **four modifier channels**:

1. **`self_static`** — modifiers from the owning entity, always active (e.g., proficiency)
2. **`self_contextual`** — modifiers from the owning entity, context-dependent (e.g., Charmed preventing attacks against charmer)
3. **`to_target_static`** — modifiers projected onto attackers/targets, always active (e.g., Blinded giving advantage to attackers)
4. **`to_target_contextual`** — modifiers projected onto attackers/targets, context-dependent

Each channel holds typed modifiers:
- `NumericalModifier` — flat +/- bonus
- `AdvantageModifier` — advantage/disadvantage
- `CriticalModifier` — auto-crit/no-crit
- `AutoHitModifier` — auto-hit/auto-miss
- `ResistanceModifier` — R/V/I per damage type
- `SizeModifier`, `DamageTypeModifier`

**Resolution**: `ModifiableValue.normalized_score` combines all channels. When two entities interact, `set_from_target()` merges the target's `to_target_*` channels into the source's resolution — this is how "attacks against blinded creatures have advantage" works without the attacker knowing about the condition.

**Comparison with us**: We model these as explicit fields and invariant-checked state transitions. dnd_engine's approach is more compositional but harder to verify — modifiers can silently stack, and there's no formal proof that resolution order is correct.

## Event System

### Event Pipeline (4 Phases)

Every game action flows through:

```
DECLARATION → EXECUTION → EFFECT → COMPLETION
                                    (or CANCEL at any point)
```

- **DECLARATION**: Intent announced. Handlers can inspect/cancel.
- **EXECUTION**: Cost committed. Attack rolls happen here.
- **EFFECT**: Damage applied, conditions applied. Last chance for reactions.
- **COMPLETION**: Finalized. No further modification.

Each phase transition creates a **new Event object** (immutable lineage via `lineage_uuid`), registered in `EventQueue`, which notifies matching `EventHandler`s.

### Event Hierarchy

Events form parent-child trees:
- An attack action creates an `AttackEvent`
- Damage application creates child `TakeDamageEvent`s
- A reaction (opportunity attack) creates a child `AttackEvent` under the triggering `MovementEvent`

### EventHandler / Trigger / Reaction

```python
EventHandler:
  trigger_conditions: List[Trigger]  # (event_type, phase, optional source/target UUID)
  event_processor: Callable[[Event, UUID], Optional[Event]]
```

Triggers match on `(EventType, EventPhase)` pairs. Handlers can modify or cancel events. This is how reactions work:

- Opportunity attack: handler on `(MOVEMENT, EFFECT)` checks if moving entity leaves threatened squares, fires a child Attack action
- Condition application: handler on `(CONDITION_APPLICATION, DECLARATION)` can cancel (immunity)

**Comparison with us**: Our battle.qnt models interrupt points explicitly in the state machine. dnd_engine's approach is more extensible (any code can register handlers) but less verifiable (handler ordering is insertion-order, no priority system, no formal analysis of handler interactions).

## Action System

Two implementation patterns:

### BaseAction (direct)

Override `_validate()` and `_apply()`:

```python
class Attack(BaseAction):
    def _validate(self, event) -> Optional[Event]:
        # Check range, LOS
    def _apply(self, event) -> Optional[Event]:
        # Roll attack, apply damage
    def _apply_costs(self, event) -> Optional[Event]:
        # Deduct action economy
```

### StructuredAction (declarative)

Pipeline of named `EventProcessor` callables:

```python
StructuredAction(
    prerequisites=OrderedDict({"range": validate_range, "los": validate_los}),
    consequences=OrderedDict({"attack": attack_consequences}),
    cost_applier=apply_costs
)
```

Prerequisites run sequentially; any can cancel. Consequences run after execution phase. Optional re-validation after each consequence.

**Comparison with us**: Our actions are state-machine transitions with guards. dnd_engine's approach is more flexible for content authoring (LLMs can compose StructuredActions from primitives) but lacks the exhaustiveness guarantees of XState/Quint.

## Condition System

Conditions are first-class objects with lifecycle:

```
BaseCondition
├── duration: Duration (ROUNDS | PERMANENT | UNTIL_LONG_REST | ON_CONDITION)
├── application_saving_throw: Optional[SavingThrowEvent]
├── removal_saving_throw: Optional[SavingThrowEvent]
├── modifers_uuids: Dict[UUID, List[UUID]]  # what modifiers this condition injected
├── sub_conditions: List[UUID]  # hierarchical conditions
├── event_handlers_uuids: List[UUID]  # reactive handlers registered by this condition
```

Application: `_apply()` injects modifiers into target entity's `ModifiableValue` channels, registers event handlers, creates sub-conditions.

Removal: removes all injected modifiers by UUID, removes event handlers, cascades to sub-conditions.

**Implemented conditions**: Blinded, Charmed, Dashing, Deafened, Dodging, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious, Exhaustion (6 levels with sub-conditions).

**Comparison with us**: We model conditions as enum flags with explicit mechanical effects in the spec. dnd_engine's approach is more granular (each condition is a class that self-describes its modifier injections) but creates a verification challenge — you can't easily prove that removing a condition correctly undoes all its effects without running it.

## Spatial Model

Tile-based grid with:
- **Shadowcasting** (`dnd/core/shadowcast.py`) for field-of-view computation
- **Dijkstra** (`dnd/core/dijkstra.py`) for pathfinding
- **Senses block** per entity: visible cells, walkable cells, known paths, visible entities

Movement costs are computed from path length. Opportunity attacks check if movement path leaves threatened squares.

**Comparison with us**: We intentionally abstract spatial concerns as caller-provided inputs. dnd_engine commits to a specific grid implementation.

## Content vs Engine Boundary

**Moderate separation.** The core framework (`dnd/core/`) is genuinely generic. D&D content lives in:
- `dnd/conditions.py` — condition implementations
- `dnd/actions.py` — action implementations  
- `dnd/reactions.py` — reaction implementations
- `dnd/blocks/` — D&D-specific block configurations
- `dnd/monsters/` — monster-specific condition variants

However, the boundary leaks: `Entity` hardcodes D&D ability scores, equipment slots, and skill lists. The framework assumes a D&D-shaped entity.

## Verification Story

**Weak.** No formal test suite, no property testing, no invariant checking. The examples/ directory has integration scripts. The architecture is designed for interactive exploration and LLM-assisted content authoring, not proof.

## Key Inspirations For Our Project

### High-Signal Patterns

1. **4-channel modifier algebra** — the self/contextual × own/target decomposition is architecturally clean for representing "attacks against blinded creatures have advantage" without the attacker explicitly checking conditions. We achieve this differently (explicit condition checks in the spec), but the decomposition is worth studying for TS feature composition.

2. **Event phase pipeline with cancellation** — the DECLARATION→EXECUTION→EFFECT→COMPLETION pipeline with cancel-at-any-point is a clean model for interrupt windows. Our battle.qnt models this more rigidly (specific interrupt points), but the dnd_engine approach shows what a more extensible model looks like.

3. **Condition as modifier injector** — conditions self-describe their mechanical effects by injecting typed modifiers. On removal, they clean up by UUID. This is a different decomposition than our "condition implies these rules" approach — worth considering if we ever need runtime condition effect debugging.

4. **StructuredAction for content authoring** — the prerequisite/consequence pipeline pattern is interesting for future TS feature functions. Our features are currently pure functions; a more structured pipeline might help with complex multi-step features.

5. **Opportunity attack as event handler** — registering OA detection as a movement-phase handler is elegant. Our spec models OA triggers differently (nondeterministic powerset of threatening creatures), but the handler-based approach shows one concrete resolution.

### Anti-Patterns (For Us)

1. **Global mutable registries** — fine for interactive exploration, fatal for formal verification
2. **No snapshot/rollback** — impossible to replay or diff states
3. **Handler ordering by insertion** — no priority system, no formal reasoning about handler conflicts
4. **Deep copy for cross-entity interaction** — `model_copy(deep=True)` everywhere suggests the architecture struggles with shared mutable state
5. **No tests** — the architecture is interesting but unverified

## File Index (Key Files)

| File | LOC | Role |
|---|---|---|
| `dnd/core/values.py` | 2,359 | ModifiableValue and 4-channel modifier algebra |
| `dnd/core/modifiers.py` | 997 | Typed modifier hierarchy (numerical, advantage, critical, etc.) |
| `dnd/conditions.py` | 734 | All 14 SRD conditions + exhaustion + custom conditions |
| `dnd/entity.py` | 696 | Entity composition, attack/AC/save resolution |
| `dnd/core/events.py` | 637 | Event, EventQueue, EventHandler, Trigger |
| `dnd/core/base_block.py` | 630 | BaseBlock with condition/modifier attachment |
| `dnd/actions.py` | 431 | Attack, Move actions |
| `dnd/core/dice.py` | 365 | Dice rolling, advantage resolution |
| `dnd/core/base_conditions.py` | 302 | BaseCondition lifecycle |
| `dnd/core/base_object.py` | 235 | Global UUID registry |
| `dnd/core/base_actions.py` | 215 | BaseAction, StructuredAction |
| `dnd/reactions.py` | 53 | Opportunity attack handler |
