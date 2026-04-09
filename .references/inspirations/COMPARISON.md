# D&D 5e Engine Comparison

## Purpose

This document compares all analyzed D&D 5e rule engines against each other and against our project. It is structured for two audiences:

1. **Our team** — what can we learn, what validates our approach, what should we steal?
2. **Anyone evaluating the D&D 5e open-source engine landscape** — what exists, what are the trade-offs?

See [METHODOLOGY.md](./METHODOLOGY.md) for the analysis rubric. See individual `ARCHITECTURE-*.md` files for deep dives per engine.

---

## The Landscape at a Glance

### Competitor Inventory

| Engine | Language | LOC (core) | LOC (tests) | Edition | License | Pattern | Tier |
|---|---|---|---|---|---|---|---|
| **Our project** | Quint + TypeScript | ~8K spec + ~12K TS | ~5K + MBT | SRD 5.2.1 | Apache 2.0 | Formal spec + state machine | — |
| `dnd_engine` | Python | ~8,000 | ~0 | 5e (loose) | MIT | Entity-Component-Event | A |
| `foundryvtt-dnd5e` | JavaScript | ~86,000 | ~0 | SRD 5.2.1 | MIT | Document-DataModel-Activity | A |
| `natural_20` | Ruby | ~12,050 | ~2,850 | SRD 5.1 | MIT | Resolve-then-Commit | A |
| `opencombatengine` | C# | ~14,300 | ~10,800 | SRD 5.1 | MIT | Interface-Segregated Composition | A |
| `avrae` | Python | ~55,400 | ~7,400 | 5e (bot + licensed content) | GPL-3.0 | Automation tree interpreter | A |
| `libsrd5` | C# | ~3,250 + 19.7K content | ~4,400 | SRD 5.1 | AGPL-3.0 | Mutable OOP + enum effects | B |
| `DnDSimulator` | Python | ~8,600 | ~472 script checks | 5e (loose) | MIT | Mutable entity monolith + token graph | B |
| `rpg-toolkit` | Go | ~57,600 src | ~57,000 test | 5e (work-in-progress) | GPL-3.0 | Typed event system | B+ |
| `ShiningSword` | F# | ~1,830 src (+~180 scratch) | ~380 | AD&D 2e + DFRPG + generic RPG tools | Not specified | Functional-reactive menu algebra | B |
| `dnd-5e-core` | Python | ~17,800 | ~3,300 | 5e (loose) | MIT | Mutable-Dataclass CRUD | B |
| `cmdli/dndsim` | TypeScript + Python | ~4,064 TS core (+5.3K legacy Python) | ~217 | D&D 2024 / 5e DPR | MIT | Typed event-loop DPR simulator | B |
| `Py5e` | Python | 292 | 0 | 5e (stub) | MIT | Flat procedural | C |

**Expanded corpus analyzed after the initial scan**:

| Engine | Language | Stars | Pattern | Tier (est.) |
|---|---|---|---|---|
| `avrae` | Python | 451 | Automation tree + scripting (Draconic) | A |
| `DnDSimulator` | Python | 46 | GUI-first combat simulator, token-driven effects, line battlefield | B |
| `rpg-toolkit` | Go | 2 | Typed event system, 93.5% test coverage | B+ |
| `ShiningSword` | F# | 21 | Functional-reactive RPG toolkit | B |
| `cmdli/dndsim` | TypeScript | 6 | Typed event-loop DPR simulator | B |

**Tier definitions**: A = substantive combat engine with clear architecture, useful for pattern mining; B = partial engine or content library, useful for specific aspects; C = too minimal to be useful.

---

## Architecture Comparison

### Core Design Patterns

| Engine | State Model | Mutability | Serializable? | Action Pipeline | Interrupt Model |
|---|---|---|---|---|---|
| **Ours** | Immutable records (Quint + XState context) | Immutable | Full (ITF traces) | State machine transitions with guards | Explicit interrupt points in spec |
| `dnd_engine` | UUID-registry object graph | Mutable | No | 4-phase events (DECL→EXEC→EFFECT→COMPL) | Event handlers on EventQueue |
| `foundryvtt-dnd5e` | Foundry document tree | Mutable | Partial (Foundry docs) | Activity lifecycle + hooks | Foundry hook system |
| `natural_20` | Entity + per-battle state hash | Mutable | No | Resolve→Commit two-phase | Entity event hooks |
| `opencombatengine` | Interface-segregated subsystems | Mutable | Partial (DTOs) | Action.Execute → Result<T> | C# event subscriptions |
| `avrae` | Mongo-persisted combat + combatant/effect objects | Mutable | Partial (combat full, character-linked partial) | Automation tree interpreter | Manual buttons / automation branches |
| `DnDSimulator` | Monolithic mutable entity objects + token graph | Mutable | Partial setup only | Initiative loop + scored choices | Ad hoc callbacks |
| `rpg-toolkit` | Mutable character aggregate + typed event bus | Mutable | Partial (JSON API boundary) | Staged chains + turn manager | Event subscriptions |
| `ShiningSword` | Immutable Elmish models + CQRS history | Immutable | Partial | Elmish update loop | N/A (not a combat engine) |
| `libsrd5` | Flat mutable fields | Mutable | No | Phase-ordered turn (MOVE→ACTION→BA) | None (no reactions) |
| `dnd-5e-core` | Mutable dataclasses | Mutable | No | Imperative combat loop | None |
| `cmdli/dndsim` | Mutable character + abstract target | Mutable | Partial | Ordered turn operations + event loop | None |
| `Py5e` | Flat mutable fields | Mutable | No | None | None |

### Key Observation

**Every serious combat-engine competitor uses mutable state.** `ShiningSword` is an immutable outlier, but it is not a 5e combat engine and its strongest work is chargen/menu algebra rather than combat resolution. Our project is still the only system in the field combining immutable state records, deterministic replay capability, and formal verification. This is not incidental — it is a fundamental architectural divergence that enables our entire verification story.

---

## Mechanics Coverage Comparison

### Combat Fundamentals

| Mechanic | Ours | dnd_engine | foundry | nat_20 | OCE | avrae | DnDSimulator | rpg-toolkit | ShiningSword | libsrd5 | dnd-5e-core | cmdli/dndsim |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Initiative / turn order | Yes | No (no battle loop) | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Yes | Yes | No |
| Action economy (A/BA/R/M) | Yes | Yes | Partial | Yes | Yes | Partial (tracker, not strict engine) | Yes | Yes | N/A | Partial (no R) | Partial | Partial |
| Attack roll → AC | Yes | Yes | Yes (via Activity) | Yes | Yes | Yes | Yes | Yes | N/A | Yes | Yes | Yes |
| Damage types (13) | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Yes | Partial | Partial |
| Resistance / Vulnerability / Immunity | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | N/A | Yes | Partial | Partial |
| Temp HP absorption | Yes | Partial | Yes | Yes | Yes | Yes | Unclear | Unclear | N/A | Yes | No | No |
| Death saves | Yes | No | Yes | Yes | Yes | Partial | Yes | Yes | N/A | Yes (enum flags) | No | No |
| Massive damage / instant death | Yes | No | No | No | No | No | No | No | N/A | No | No | No |
| Concentration | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes | N/A | No | No | Partial |

### Conditions

| Condition | Ours | dnd_engine | foundry | nat_20 | OCE | avrae | DnDSimulator | rpg-toolkit | ShiningSword | libsrd5 | dnd-5e-core | cmdli/dndsim |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Blinded | Yes | Yes | Yes | Partial | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Charmed | Yes | Yes | Yes | No | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Deafened | Yes | Yes | Yes | No | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Frightened | Yes | Yes | Yes | No | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Grappled | Yes | Partial | Yes | Yes | Yes | Via effects | Yes | Partial | N/A | Yes (DC enum) | No | Yes |
| Incapacitated | Yes | Yes | Yes | Yes | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Invisible | Yes | Yes | Yes | Yes | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Paralyzed | Yes | Yes | Yes | No | Yes | Via effects | Yes | Partial | N/A | Yes | Desc only | No |
| Petrified | Yes | Yes | Yes | No | Yes | Via effects | Unclear | No | N/A | Yes | Desc only | No |
| Poisoned | Yes | Yes | Yes | No | Yes | Via effects | Unclear | Partial | N/A | Yes | Desc only | No |
| Prone | Yes | Yes | Yes | Yes | Yes | Via effects | Yes | Partial | N/A | Yes | No | Yes |
| Restrained | Yes | Yes | Yes | Yes | Yes | Via effects | Yes | Partial | N/A | Yes | Desc only | No |
| Stunned | Yes | Yes | Yes | No | Yes | Via effects | Yes | Partial | N/A | Yes | Desc only | No |
| Unconscious | Yes | Yes | Yes | Yes | Yes | Via effects | Yes | Partial | N/A | Yes | Desc only | No |
| Exhaustion (6 levels) | Yes | Yes | Yes (singleton) | No | No | Unclear | No | No | N/A | No | No | No |

### Advanced Combat

| Feature | Ours | dnd_engine | foundry | nat_20 | OCE | avrae | DnDSimulator | rpg-toolkit | ShiningSword | libsrd5 | dnd-5e-core | cmdli/dndsim |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reactions (generic) | Yes | Yes (event handlers) | Via hooks | Yes (hooks) | Yes (event sub) | Partial (automation/manual) | Partial (ad hoc callbacks) | Yes (event sub) | N/A | No | No | No |
| Opportunity attacks | Yes | Yes | No (manual) | Yes | Yes | Partial | Yes | Partial | N/A | No | No | No |
| Shield (reaction spell) | Yes | No | No | Yes | No | Yes | Yes | Unclear | N/A | No | No | No |
| Counterspell (recursive) | Yes | No | No | No | No | Via automation content | No | No | N/A | No | No | No |
| Legendary actions | Yes | No | No | No | No | No | No | No | N/A | No | No | No |
| Legendary resistance | Yes | No | No | No | No | Via automation content | No | No | N/A | No | No | No |
| AoE resolution | Yes | No | Yes (template) | Yes (map) | Yes (grid) | Yes | Partial | Partial | N/A | No | Partial | No |
| Extra Attack | Yes | No | No | Yes | Yes | Via automation content | Yes | Partial | N/A | Yes | Yes | Partial |
| Two-weapon fighting | Planned | No | Yes | Yes | No | Via automation content | Unclear | Yes | N/A | No | No | Partial |
| Multiclass spell slots | Yes | No | Yes | No | No | Via sheet model | No | Unclear | N/A | No | No | No |
| Class resources (all 12) | Yes | No | No | No | Partial | Partial | Partial | Partial | N/A | Partial | Partial | Partial |

### Spatial Model

| Engine | Spatial Model | Grid Type | LOS | Cover | Pathfinding |
|---|---|---|---|---|---|
| **Ours** | Abstracted (caller inputs) | None (by design) | Caller-provided | Caller-provided | N/A |
| `dnd_engine` | Tile grid | Square | Shadowcasting FOV | Implicit | Dijkstra |
| `foundryvtt-dnd5e` | Canvas integration | Square/hex | Via Foundry canvas | Via canvas | Via canvas |
| `natural_20` | ASCII tile map | Square | Shadowcasting | Half/3/4/full | BFS/Dijkstra |
| `opencombatengine` | IGridManager | Square (optional) | Yes | No | Range-based |
| `avrae` | Abstract target selection only | None | No | No | No |
| `DnDSimulator` | Front/middle/back line bands | Line bands | No | No | No |
| `rpg-toolkit` | Toolkit spatial modules + optional rooms | Square-like toolkit | Partial | Unclear | Partial |
| `ShiningSword` | N/A (not combat-focused) | N/A | N/A | N/A | N/A |
| `libsrd5` | Minimal positions | Abstract | No | No | No |
| `dnd-5e-core` | Front/back row | None (index-based) | No | No | No |
| `cmdli/dndsim` | None | None | No | No | No |
| `Py5e` | None | None | No | No | No |

---

## Verification Comparison

This is where our project diverges most dramatically from the field.

| Dimension | Ours | dnd_engine | foundry | nat_20 | OCE | avrae | DnDSimulator | rpg-toolkit | ShiningSword | libsrd5 | dnd-5e-core | cmdli/dndsim |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Formal specification** | Quint (battle.qnt) | None | None | None | None | None | None | None | None | None | None | None |
| **Safety invariants** | 52 (41 creature + 11 battle) | None | None | None | None | None | None | None | None | None | None | None |
| **Model-based testing** | Yes (MBT parity proof) | None | None | None | None | None | None | None | None | None | None | None |
| **Property-based testing** | Quint nondeterministic fuzzing | None | None | None | None | None | None | None | None | None | None | None |
| **Deterministic replay** | ITF traces + seed-based | None | None | srand (fragile) | None | None | None | None | CQRS-style history (non-combat) | Settable RNG | None | None |
| **Unit tests** | Yes | None | None | RSpec | xUnit | Yes (unit + e2e) | Script checks | Yes | Yes (non-combat) | xUnit | pytest (weak) | Jest |
| **Test count** | 52 invariants + 274 libsrd5-style + MBT seeds | 0 | 0 | ~60 | ~400+ | ~7.4K LOC tests | ~472 LOC script checks | ~57K LOC tests | ~380 LOC | 274 | ~30 (many stubs) | ~217 LOC |
| **Edition discipline** | SRD 5.2.1 only, per-rule traceability | Loose | 5.2.1 (Foundry-shaped) | SRD 5.1 | SRD 5.1 | Loose / bot-content shaped | Loose | Loose / partial | Mixed RPG, not 5e engine | SRD 5.1 | Loose | 2024 DPR subset |
| **Rules traceability** | UBIQUITOUS_LANGUAGE.md + ASSUMPTIONS.md | None | Via config labels | None | ADR trail | None | None | None | None | None | None | None |

### The Verification Chasm

No competitor has anything resembling our verification approach:

- **No formal specification** — every competitor's rules are embedded in imperative code. There is no separate model to verify against.
- **No safety invariants** — no competitor proves that HP stays bounded, that dead creatures have 0 HP, that exhaustion 6 implies death, or any similar property.
- **No parity testing** — no competitor has two independent implementations of the same rules that are automatically checked against each other.
- **No nondeterministic exploration** — no competitor tests with abstract ranges like `DAMAGE_RANGE = 0.to(60)` to hit edge cases that realistic inputs never reach.

This is the single most important finding: **our project occupies a fundamentally different point in the design space** from every open-source D&D 5e engine we've found.

---

## Cross-Cutting Pattern Analysis

### Pattern: Modifier Algebra

How engines compose numeric bonuses/penalties:

| Engine | Approach | Channels | Typed? | Reversible? |
|---|---|---|---|---|
| **Ours** | Explicit fields in spec + pure feature functions | N/A (field-level) | Yes (Quint types) | Immutable (no need) |
| `dnd_engine` | 4-channel ModifiableValue (self/target × static/contextual) | 4 | Yes (typed modifiers) | By UUID tracking |
| `foundryvtt-dnd5e` | ActiveEffect key-path mutations + `prepareDerivedData` | Unlimited (any path) | No (string keys) | By effect removal |
| `natural_20` | Inline computation with advantage/disadvantage arrays | N/A | No | N/A |
| `opencombatengine` | StatType-indexed effect pipeline | ~15 StatTypes | Yes (enum) | By effect removal |
| `avrae` | Passive effect descriptors folded over active effects | ~20 passive fields | Partial | By effect removal |
| `DnDSimulator` | Typed damage bundle + token-triggered flags | N/A | Partial | By token cleanup |
| `rpg-toolkit` | Staged chain modifiers on typed topics | 5 attack stages + more | Yes | By unsubscribe/remove |
| `ShiningSword` | N/A (no combat modifier algebra) | N/A | N/A | N/A |
| `libsrd5` | Flat Effect enum flags | N/A | Yes (enum) | By Apply/Unapply |
| `cmdli/dndsim` | Feature listeners mutate attack/damage events | Event hooks | Yes | By effect end/remove |

**Insight**: `dnd_engine`'s 4-channel system is the most architecturally ambitious modifier model. Our approach is simpler but more verifiable — explicit fields checked by invariants beat composable modifiers that could silently stack.

### Pattern: Action Pipeline

How engines structure the flow from "I want to attack" to "damage applied":

| Engine | Phases | Cancel/Modify? | Reactions? |
|---|---|---|---|
| **Ours** | State machine guard → transition → update | Via spec guards | Explicit interrupt points |
| `dnd_engine` | DECLARATION → EXECUTION → EFFECT → COMPLETION | Yes (any phase) | Via EventHandler triggers |
| `foundryvtt-dnd5e` | use() → consume() → roll() → message() | Via Foundry hooks | Via hooks (manual) |
| `natural_20` | resolve() → commit() → apply!() | Cancel in resolve | Via entity hooks |
| `opencombatengine` | Validate → Execute → Result<T> | Via Result failure | Via C# event subscriptions |
| `avrae` | Target → Attack/Save/Condition → Damage/IEffect | Yes (branching nodes) | Partial/manual |
| `DnDSimulator` | StartTurn → scored choices → EndTurn | Implicit in choice scoring | Ad hoc |
| `rpg-toolkit` | Turn stages + chained event stages | Yes (chain mutation) | Via event subscriptions |
| `ShiningSword` | Elmish Msg → update → view | N/A | N/A |
| `libsrd5` | Direct method calls per phase | No | No |
| `cmdli/dndsim` | turn_start → before_action → action → after_action → turn_end | Yes (operation eligibility + listeners) | No |

**Insight**: `dnd_engine`'s 4-phase pipeline is the closest to our Quint interrupt-point model. The key difference: their handlers are dynamically registered Python callables; our interrupt points are statically analyzed Quint actions.

### Pattern: Condition-Effect Relationship

How engines connect "the creature is poisoned" to "attack rolls have disadvantage":

| Engine | Approach | Central? | Self-cleaning? |
|---|---|---|---|
| **Ours** | Condition flags checked in spec transition guards | Yes (spec) | Immutable (no cleanup) |
| `dnd_engine` | Conditions inject typed modifiers into ModifiableValue channels | Per-condition | Yes (UUID-tracked removal) |
| `foundryvtt-dnd5e` | conditionEffects central lookup table + ActiveEffect mutations | Central table | Via ActiveEffect lifecycle |
| `natural_20` | Condition flags checked inline throughout codebase | Scattered | Manual |
| `opencombatengine` | Dual: ConditionManager flags + EffectManager stat pipeline | Split | Manual + event-based |
| `avrae` | InitiativeEffect + passive modifiers + parent/child links | Central effect model | Yes |
| `DnDSimulator` | Boolean flags on entities + token graph for cleanup | Split | Yes (token-linked) |
| `rpg-toolkit` | Features create event-subscribing conditions | Split but explicit | Yes |
| `ShiningSword` | N/A | N/A | N/A |
| `libsrd5` | Effect enum flags with Apply/Unapply methods | Partial | Method symmetry |
| `cmdli/dndsim` | Counted target conditions + character `Effect` objects | Partial | Yes |

**Insight**: FoundryVTT's `conditionEffects` central lookup table is the cleanest declarative approach. Our spec-level condition guards are even cleaner but less extensible. `dnd_engine`'s injection approach is the most compositional but hardest to verify.

---

## What Each Engine Does Best (For Us)

### Tier A: Substantive Architecture Inspirations

#### dnd_engine — "The Architect"
**Best for**: Event phase pipeline, modifier channel decomposition, condition hierarchy
- 4-phase event pipeline (DECLARATION→EXECUTION→EFFECT→COMPLETION) is the closest external model to our Quint interrupt points
- 4-channel modifier algebra (self/target × static/contextual) is an interesting alternative decomposition for modifier composition
- Condition-as-modifier-injector with UUID-tracked cleanup shows a self-describing condition model
- Opportunity attack as event handler validates our OA modeling approach

#### foundryvtt-dnd5e — "The Ecosystem"
**Best for**: Action vocabulary, field discovery, content registry, condition effect mapping
- Activity system types (attack, save, damage, heal, cast, etc.) provide the most complete action vocabulary in the field
- `conditionEffects` central lookup table is the cleanest condition-to-mechanical-effect mapping
- Actor/Item data schemas reveal which fields real users expect to persist
- `ConsumptionTargetsField` shows sophisticated resource consumption modeling with undo
- Exhaustion-as-leveled-singleton is simpler than stacked sub-conditions

#### natural_20 — "The Tactician"
**Best for**: Scenario tests, spatial cases, combat flow, advantage tracking
- Resolve/Commit separation validates our spec-then-runtime architecture
- Result items as typed event records are essentially our ITF trace format
- Advantage/disadvantage with named reasons provides debugging-grade detail
- OA via movement path analysis is a concrete implementation of our abstract OA model
- Strongest test suite among the action-focused engines

#### opencombatengine — "The Engineer"
**Best for**: Subsystem decomposition, test coverage, feature hooks, optional spatial
- Interface-segregated creature subsystems (IHitPoints, IActionEconomy, IConditionManager, etc.) are a clean decomposition model
- StatType-indexed effect pipeline is a pragmatic runtime stat calculation pattern
- Optional grid (IGridManager?) validates our spatial abstraction choice
- Feature lifecycle hooks (OnApplied/OnStartTurn/OnOutgoingAttack) inform our TS feature function design
- Highest test-to-source ratio in the field (~75%)

#### avrae — "The Automator"
**Best for**: Automation trees, content-as-data, production-scale combat tooling
- JSON automation trees make attacks, spells, and features serializable effect programs instead of one-off code
- Branching attack/save/condition nodes are the cleanest content-authoring pattern in the field
- Metavar dataflow between effect nodes solves multi-step automation dependencies elegantly
- Initiative effects with parent/child cleanup are a strong practical effect-lifecycle model

### Tier B: Partial Value

#### libsrd5 — "The Cataloger"
**Best for**: Spell implementation patterns, effect enum design, test fixtures
- Spell-as-metadata+delegate is a concise content authoring pattern
- Turn event delegates for duration tracking are clean and self-cleaning
- Effect enum with Apply/Unapply symmetry is a lightweight reversible-effect pattern
- 274 xUnit tests provide decent scenario coverage

#### dnd-5e-core — "The Data Hoarder"
**Best for**: Content corpus, monster data, condition regex parsing
- Bundled 332 monsters + 319 spells + 65 weapons as JSON test fixtures
- ConditionParser regex extraction from SRD descriptions is a creative data pipeline
- Multi-attack as recursive Action composition is a clean tree model

#### DnDSimulator — "The Monte Carlo DM"
**Best for**: Encounter-balancing heuristics, token-linked lifecycle cleanup, line-based spatial abstraction
- Choice scoring gives a usable simulation policy layer over a fairly broad 5e feature surface
- Token-linked concentration and status cleanup is stronger than the surrounding monolith suggests
- Front/middle/back positioning is a pragmatic midpoint between grid tactics and no spatial model
- Statistical recaps make it useful for repeated encounter tuning, even without a formal rules model

#### rpg-toolkit — "The Typed Generalist"
**Best for**: Typed event decomposition, reusable combat substrate, test-conscious engineering
- Event-driven architecture with strong typing is one of the cleaner extensibility stories in the field
- The repo takes automated testing more seriously than most hobby engines
- Good reference point for separating generic engine primitives from D&D-specific rulebooks

#### ShiningSword — "The Functional Outlier"
**Best for**: Functional combat modeling, tactical reasoning outside mainstream OOP
- Rare evidence that tactical combat can be expressed coherently in a functional-first style
- Useful contrast against our Quint/XState design because the functional instincts are closer than typical mutable engines

#### cmdli/dndsim — "The DPR Workbench"
**Best for**: Class build composition, event-listener feature wiring, snapshot DPR regression, simple concentration spell modeling
- TS-first library surface with a small engine core and a legacy Python simulator
- Class bundles are composed from feature objects and choice selectors instead of hard-coded build scripts
- Snapshot tests give a lightweight regression fence around 20-level DPR curves
- The tradeoff is narrow scope: no initiative system, no spatial model, and no tactical enemy model

### Tier C: Minimal Value

#### Py5e — baseline contrast only

---

## Comparison With Our Project

### Where We Are Stronger Than Every Competitor

1. **Formal specification** — Quint spec is a first in the D&D 5e open-source space. No competitor has a formal model of any kind.
2. **Safety invariants** — 52 properties that must hold for all reachable states. No competitor has any.
3. **Parity testing** — MBT bridges that prove XState matches Quint. Unique in the field.
4. **Nondeterministic exploration** — abstract ranges stress-test edge cases no real weapon produces.
5. **Immutable state model** — enables deterministic replay, diffing, and trace analysis.
6. **Edition discipline** — SRD 5.2.1 only, with per-rule traceability via UBIQUITOUS_LANGUAGE.md and ASSUMPTIONS.md.
7. **Reaction modeling depth** — Counterspell recursive stack (depth 5), 10 reaction types with correct resource consumption. No competitor approaches this.
8. **Class resource tracking** — all 12 SRD classes with rage charges, focus points, smite slots, etc. Most competitors model 0-2 class resources.

### Where Competitors Have Patterns We Lack

1. **Spatial model** — natural_20, opencombatengine, and dnd_engine all have concrete grid implementations. We intentionally abstract this, but their implementations inform what "caller-provided spatial inputs" look like concretely.
2. **Content corpus** — foundryvtt-dnd5e and dnd-5e-core bundle extensive monster, spell, and item data. We have SRD JSON references but not a structured content database.
3. **Modifier composition** — dnd_engine's 4-channel modifier algebra is more compositional than our explicit-field approach. This matters less for verification but more for extensibility.
4. **Action type vocabulary** — foundryvtt-dnd5e's Activity system provides a richer action taxonomy than our current event types. Could inform our action reporting/UI.
5. **Named advantage reasons** — natural_20 tracks *why* advantage/disadvantage applies (`:prone`, `:unseen_attacker`). Our spec doesn't preserve reason chains — useful for debugging and UX.
6. **Self-describing conditions** — dnd_engine and opencombatengine have conditions that declare their own mechanical effects. Our conditions are pure flags interpreted by the spec. Both work; theirs is more self-documenting.

### Where We Agree With the Field

1. **Conditions as the core mechanic** — every engine models the 14 SRD conditions as a central game concept.
2. **Action economy matters** — every substantive engine tracks actions, bonus actions, reactions, and movement.
3. **Damage pipeline complexity** — R/V/I, temp HP absorption, and death saves are uniformly the hardest part to get right.
4. **Content/engine separation** — every mature engine attempts to separate rules from content, with varying success.

---

## Consolidated High-Signal Patterns

These are the patterns most worth studying across the entire competitor landscape:

| # | Pattern | Source | Applicability |
|---|---|---|---|
| 1 | 4-phase event pipeline (DECL→EXEC→EFFECT→COMPL) | dnd_engine | Validates our interrupt-point model; could inform a more structured action audit trail |
| 2 | Activity as typed action with shared lifecycle | foundryvtt-dnd5e | Could improve our action/event type taxonomy for UI and reporting |
| 3 | Resolve/Commit two-phase actions | natural_20 | Directly validates our spec-then-runtime architecture |
| 4 | Interface-segregated creature subsystems | opencombatengine | Could improve our TS-side creature state decomposition |
| 5 | conditionEffects central lookup table | foundryvtt-dnd5e | A clean alternative to scattered condition checks |
| 6 | StatType-indexed effect pipeline | opencombatengine | Pragmatic pattern for runtime derived-value computation |
| 7 | Named advantage/disadvantage reasons | natural_20 | Useful for debugging and UX — our spec could preserve reason chains |
| 8 | Spell-as-metadata+delegate | libsrd5 | Concise content authoring pattern for our TS features |
| 9 | Optional spatial model with graceful degradation | opencombatengine | Confirms our spatial abstraction choice |
| 10 | Consumption as first-class composable concept | foundryvtt-dnd5e | Could improve our resource consumption modeling |
| 11 | 4-channel modifier algebra | dnd_engine | Interesting alternative for modifier composition |
| 12 | OA via movement path analysis | natural_20, dnd_engine | Concrete implementation of our abstract OA model |
| 13 | Result<T> monad for action outcomes | opencombatengine | Similar to our Effect library usage |
| 14 | Bundled SRD data corpus | dnd-5e-core | Could provide test fixture data |
| 15 | Build-map pattern for action parameterization | natural_20 | Could inform our AvailableAction UI protocol |

---

## Consolidated Anti-Patterns (Things We Correctly Avoid)

| # | Anti-Pattern | Seen In | Why We're Right to Avoid It |
|---|---|---|---|
| 1 | Global mutable state | All competitors | Prevents formal verification, deterministic replay, and state diffing |
| 2 | No test suite | dnd_engine, foundryvtt-dnd5e | Architecture without verification is unverifiable |
| 3 | Unbounded key-path mutations | foundryvtt-dnd5e | Cannot enumerate possible states if effects can write to any field |
| 4 | Scattered condition effect checks | natural_20, libsrd5 | Adding a condition requires finding every place that should check it |
| 5 | Dynamic field injection | dnd-5e-core | Defeats type checking and makes state shape unpredictable |
| 6 | Exception swallowing | dnd-5e-core | Hides bugs; antithetical to formal methods |
| 7 | No reaction/interrupt model | libsrd5 | Fundamentally limits combat fidelity |
| 8 | Dual-path condition effects | opencombatengine | Divergence risk between flag checks and effect pipeline |
| 9 | srand-based test determinism | natural_20 | Fragile — any code change shifts all subsequent rolls |
| 10 | Tight grid coupling | natural_20, dnd_engine | Our spatial abstraction is more flexible and verifiable |

---

## Newly Discovered Engines

Web searches across 17+ query strategies (direct GitHub, language-specific, academic, Monte Carlo, AI/RL, community lists) discovered ~25 additional projects. They are organized below by relevance.

### Tier 1: Substantive Combat Engines (Worth Monitoring)

| Name | Language | Stars | Last Active | Key Feature | Analysis Status |
|---|---|---|---|---|---|
| **avrae/avrae** | Python | 451 | 2026-04 | Discord bot with full combat automation tree, scripting (Draconic), condition tracking, concentration. Maintained by D&D Beyond. Most mature open-source 5e automation. | Deep dive complete |
| **DanielK314/DnDSimulator** | Python | 46 | 2024-08 | Broadest standalone combat simulator. Spell slots, concentration, 18+ spells, class features (Action Surge, Sneak Attack, Smite), R/V/I, conditions, positional system, monster abilities, feats (GWM, PAM). GUI. | Deep dive complete |
| **KirkDiggler/rpg-toolkit** | Go | 2 | 2026-04 | Event-driven architecture with typed topics, 93.5% test coverage. D&D 5e module with Rage, Concentration (Bless), attack/damage chains, action economy, TWF. Extracted from live Discord bot. | Deep dive complete |
| **jedld/natural_20.py** | Python | 5 | 2026-02 | Python port of natural_20 (Ruby) for RL research. Gymnasium-compatible environment. Used in published paper (arxiv 2503.15726). Map simulation, LOS, cover, classes, spells. | Maybe — RL-specific fork of known engine |
| **MaxWilson/ShiningSword** | F# | 21 | 2024-06 | Functional-reactive RPG toolkit in F#/Fable. Strongest code is menu algebra and chargen rather than a standalone combat engine. | Deep dive complete |
| **YellowCoat1/dnd_lib** | Rust | 3 | 2026-03 | Rust crate with Action trait, Feature/FeatureEffect system, multiclassing, SRD API integration. | Maybe — Rust, early stage |
| **matteoferla/DnD-battler** | Python | 84 | 2022-01 | Encounter simulator. Weapons, multiattack, TWF, spells (healing, buffs), dodging, grappling, advantage/disadvantage, concentration. Web interface. Dimensionless (no grid). | No — inactive, simpler model |

### Tier 2: Simpler Simulators and Niche Projects

| Name | Language | Stars | Description |
|---|---|---|---|
| `5ecombatsimulator/dnd_combat_simulation` | Python | 26 | Docker/API combat simulator with modular actions |
| `Eddykasp/dnd-combat-sim` | JavaScript | 3 | npm-published API for encounter win ratios |
| `laxd/dnd-5e-simulator` | Kotlin | 2 | Statistical combat analysis with JSON class features |
| `asahala/DnD5e-CombatSimulator` | Python | 6 | 2D grid creature combat with conditions and recharges |
| `alexeagleson/rs5e` | Rust | 0 | Rust+web SRD physical combat (proof of concept) |
| `dlukt/dnd5e-engine` | Go | 0 | "Deterministic command→result→event flow" — architecturally thoughtful, very early |
| `BenjiAU/DnD5E_Battle_Simulator` | Python | 1 | Equipment, bonus actions, Action Surge, end-of-turn damage |
| `beaurancourt/sim-5e` | Clojure | 4 | APL simulation in Clojure |
| `incomingstick/OpenRPG` | C++ | 138 | d20 toolkit with npm bindings, content generation focus |
| `fedefreak92/dungeon-master-ai-project` | Python | 28 | Stack-based FSM for game phases, D&D-inspired but not SRD-compliant |
| `daviddellarossa/DnD-SDK` | C# (Unity) | 4 | D&D 2024 rules in Unity ScriptableObjects, educational |

### Tier 3: Academic / RL Research

| Paper/Project | Description |
|---|---|
| **arxiv 2503.15726** (Jedld et al., 2025) | RL environment with LLM-controlled adversary. Uses natural_20.py. DQN vs GPT-4o/LLaMA in 5e combat. |
| **arxiv 2506.19530** (2025) | NTRL: RL-based encounter generation. +200% combat longevity vs DM heuristics. No public code. |
| **Stanford AA228 RAWR** (2020) | Branch-and-bound online planning for D&D combat strategy. Course project. |
| `iwd32900/dnd-battle-ai` | PPO RL for combat optimization. Discovered wizard-prefers-ranged, focus-fire strategies. |
| `AndrewLim1990/dungeonsNdata` | RL bot with 6 algorithms (PPO, etc.). Basic combat. |

### Notable Negative Results

- **No Haskell, OCaml, Elixir, or Scala D&D combat implementations exist.** Zero results across all searches.
- **No TLA+, Alloy, or formal verification of D&D rules found anywhere.** Our project is unique.
- **No other XState or statechart-based D&D combat implementations found.** Only simple FSMs (fedefreak92) or conceptual (JanPokorny bachelor's thesis).
- **Rust D&D space is entirely combat trackers** — not rules engines. rs5e and dnd_lib are both very early.
- **The functional-language + D&D intersection is almost empty** — only ShiningSword (F#, 21 stars).

### Landscape Summary

The D&D 5e open-source engine space is broader than our original 7-engine corpus suggested, but **no additional engine changes the fundamental picture**:

1. **VTT-embedded systems** (foundryvtt-dnd5e) — rich but platform-coupled
2. **Standalone engines** (dnd_engine, natural_20, opencombatengine, libsrd5) — varied architectures, all mutable OOP
3. **Combat simulators** (DnDSimulator, DnD-battler, sim-5e, etc.) — statistical/Monte Carlo, simplified rule models
4. **Discord/bot automation** (avrae) — rich automation but bot-shaped, not engine-shaped
5. **RL research environments** (natural_20.py) — academic, subset of rules
6. **Content libraries** (dnd-5e-core) — breadth over depth
7. **Early-stage experiments** (rpg-toolkit, rs5e, dnd_lib, dnd5e-engine) — promising but incomplete

**No project with formal verification, model-based testing, a specification language, or statechart-based state management was found in any search. Our project is unique in the field.**

### Projects Worth Watching

1. **avrae** — for its automation tree architecture and production-scale combat resolution
2. **KirkDiggler/rpg-toolkit** — for its typed event system in Go with 93.5% test coverage
3. **MaxWilson/ShiningSword** — for functional-language combat implementation in F#
4. **DanielK314/DnDSimulator** — for a broad simulator surface with token-driven effects, line-based movement, and heuristic AI
5. **cmdli/dndsim** — for TypeScript + D&D 2024 rules overlap with our tech stack

---

## Methodology

See [METHODOLOGY.md](./METHODOLOGY.md) for the full analysis methodology, including:
- Analysis rubric (10 dimensions per engine)
- Comparison dimensions
- Discovery methodology (existing corpus + web search + transitive discovery)
- Quality tier definitions

## Scenario Mining

See [SCENARIO-MINING.md](./SCENARIO-MINING.md) for 30 high/medium priority mechanical interactions mined from competitor test suites, organized by priority with suggested test types.

## Per-Engine Deep Dives

Each engine has a detailed architecture analysis:

### Original Corpus (deeply analyzed from cloned source)
- [ARCHITECTURE-dnd_engine.md](./ARCHITECTURE-dnd_engine.md) — Entity-Component-Event with 4-channel modifier algebra
- [ARCHITECTURE-foundryvtt-dnd5e.md](./ARCHITECTURE-foundryvtt-dnd5e.md) — Document-DataModel-Activity on Foundry platform
- [ARCHITECTURE-natural_20.md](./ARCHITECTURE-natural_20.md) — Resolve-then-Commit with YAML content
- [ARCHITECTURE-opencombatengine.md](./ARCHITECTURE-opencombatengine.md) — Interface-segregated composition with C# events
- [ARCHITECTURE-libsrd5.md](./ARCHITECTURE-libsrd5.md) — Mutable OOP with enum effects and spell delegates
- [ARCHITECTURE-dnd-5e-core.md](./ARCHITECTURE-dnd-5e-core.md) — Mutable-dataclass CRUD with bundled JSON data
- [ARCHITECTURE-Py5e.md](./ARCHITECTURE-Py5e.md) — Minimal procedural helpers (baseline)

### Newly Discovered (cloned and analyzed)
- [ARCHITECTURE-avrae.md](./ARCHITECTURE-avrae.md) — Discord bot with automation tree (451 stars, D&D Beyond)
- [ARCHITECTURE-rpg-toolkit.md](./ARCHITECTURE-rpg-toolkit.md) — Go typed event system (93.5% test coverage)
- [ARCHITECTURE-ShiningSword.md](./ARCHITECTURE-ShiningSword.md) — F# functional combat (only functional-language engine found)
- [ARCHITECTURE-DnDSimulator.md](./ARCHITECTURE-DnDSimulator.md) — Python GUI-first combat simulator with token effects and statistical recaps
- [ARCHITECTURE-cmdli-dndsim.md](./ARCHITECTURE-cmdli-dndsim.md) — TypeScript DPR simulator with event listeners and staged turns
