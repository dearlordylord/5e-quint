# Design: Executable Projection Tracer Bullet

> Archival note: this design is preserved history for baseline `39f9ab71`.
> The active Correction Application Migration supersedes the projected
> executable architecture with Surface-runtime reducers; do not treat this
> document as current architecture.

## Status

Archived design doc.

This is not a PRD. It assumes the overall goal is already accepted and narrows the architecture, vocabulary, and first tracer-bullet scope.

## Goal

Define the smallest durable path from authored content surface records to executable battle behavior for one bounded MCP scenario:

- a newly created mage with access to `acid_splash`
- a newly created Fighter 2 with `Second Wind` and `Action Surge`
- goblin and bugbear opponents
- turn starts and turn ends
- normal battle action execution through MCP

The output of this work is a closed design that implementation can follow without inventing runtime-only schemas, spell-only interpreters, or MCP-only mechanics.

This tracer bullet is intentionally narrow in depth and narrow in breadth at first, but it is **not** intended to stay narrow forever. The point of the slice is to establish a durable path that the content surface can then grow through **width-wise expansion over time**:

- more authored units
- more repeated executable patterns
- more persistent patterns
- eventually more mechanics families where real pressure proves they belong

The first slice exists to prove the path, not to define the final width of the surface.

## Primary Decision

The primary domain language comes from the content-surface/Dhall side.

The fighter MCP branch contributes useful seam ideas:

- stored character -> projected sheet -> battle host
- action-token MCP flow
- thin adapter, core-owned semantics

But it does **not** define the domain vocabulary for this work unless one of its names is clearly better. For this slice, the content-surface vocabulary is better and should remain primary.

That means the main terms stay:

- `mechanics family`
- `surface atom`
- `activation`
- `ongoing_effect`
- `triggered_reaction`
- `phase`
- `operation`
- `attachment`
- `provenance`

The fighter branch should be treated as proof of routing seams, not as the source of language.

## Non-Goals

This doc does not propose:

- a full generic runtime for every current content family
- direct runtime interpretation of Dhall
- an MCP-owned semantic model
- a spell-specific interpreter
- full lifecycle modeling for every persistent mechanic
- a big-bang qualifier refactor across the surface

## The Three Design Ideas And Their Place

### 1. Projection Layer

This is required now.

For this tracer bullet, the repo needs an explicit intermediate layer between authored content and runtime execution. Without it, we either:

- interpret authoring records directly in battle code, or
- keep hardcoded feature logic forever.

For this slice, the projection layer should split into two projections:

- **persistent projection**
  - derives durable runtime-facing facts from authored passive or ongoing mechanics
  - examples: AC shaping, senses, granted access, lifecycle hooks
- **executable projection**
  - derives legal actions and their closed resolution structures from authored activations and reactions
  - examples: `acid_splash`, `second_wind`, `action_surge`, attack actions, reaction spells

This doc is primarily about the executable side.

### 2. Lifecycle Ownership

This matters now, but only in a minimal form.

For the first tracer bullet, lifecycle ownership only needs to cover cases that the chosen slice actually pressures:

- turn start / turn end boundaries
- duration end
- early end

Concrete first-slice pressure:

- `mage_armor` ends early if the target dons armor in [mage_armor.json](/workspace/typescript/dnd-design-domain-model/packages/surface/content/mage_armor.json)
- reaction and action windows close at specific battle boundaries

The cleanup-first framing is still correct:

> when this mechanic ends, what runtime consequence must be torn down because it owned it?

But the first implementation should stay small.

### 3. Embedded Qualifier Vocabulary

This is real, but not the bottleneck for this tracer bullet.

The current surface already has repeated narrowing pressure, but the first battle slice does not require a dedicated qualifier refactor to succeed. The right move is to keep this as a later improvement when a family under active widening genuinely needs it.

So the ordering is:

1. projection layer now
2. minimal lifecycle ownership now
3. qualifier vocabulary later by pressure

## Quint-First Architecture

The tracer bullet starts from Quint, not from MCP and not from Dhall.

The stack should be:

1. **Quint executable subset**
2. **TypeScript executable subset matching Quint**
3. **compiler from authored content records into projected executable or persistent records**
4. **MCP adapter using stored character / battle seams already present**

That preserves the repo rule that Quint remains the semantic owner.

## The Core Architectural Split

There should not be a spell interpreter.

There should be a closed **projected mechanic interpreter** for executable mechanics.

That interpreter consumes projected executable records across multiple unit kinds, including:

- spell activations
- class-feature activations
- triggered reactions

So `Acid Splash`, `Second Wind`, and `Action Surge` belong to the same executable world even though they have different provenance and authored unit kinds.

The durable split is:

- **authored surface**
  - Dhall / generated JSON
- **projected records**
  - closed executable and persistent subsets
- **runtime interpretation**
  - consumes projected records plus battle state plus explicit runtime facts
- **battle reducer / machine**
  - applies resulting events into authoritative state

## Static vs Dynamic Work

Use the simplest path: compile in memory from generated JSON.

Do not interpret Dhall at runtime.

The first implementation can treat the existing generated JSON under `packages/surface/content/` as the input artifact and compile from there into projected records in memory. If later the repo wants checked-in generated projected fixtures, that can come after the first landing.

So:

- Dhall is authoring input
- generated JSON is the stable authored artifact consumed by the compiler
- projected records are compiled in memory at runtime or host setup time

## Domain Language To Keep

These terms are worth keeping from the earlier design interview because they are still correct and useful:

- **Surface Atom**
  - a closed, domain-named mechanics variant in the authored vocabulary
- **Mechanics Family**
  - a bounded authored shape such as `activation`, `ongoing_effect`, `triggered_reaction`
- **Lifecycle Ownership**
  - a cross-cutting authored concept for expiry and cleanup obligations
- **Cleanup Responsibility**
  - the anchor question for lifecycle
- **Projection Layer**
  - the explicit intermediate layer between authored mechanics and runtime state
- **Source-Preserving Projection**
  - projected records retain source identity without carrying the whole authored record

The older sketch terms that should be kept only as guidance, not forced into v1 implementation:

- embedded qualifier vocabulary
- cleanup relation kinds

## First Tracer-Bullet Scenario

The first end-to-end scenario is:

1. create and finalize a mage with access to `acid_splash`
2. create and finalize a Fighter 2 with `Second Wind` and `Action Surge`
3. start a battle against a goblin and a bugbear
4. run normal turn flow through MCP
5. execute:
   - ordinary attack flow
   - `Second Wind`
   - `Action Surge`
   - `Acid Splash`
   - turn end boundaries
6. include `Mage Armor` as the first persistent spell shaping AC and early-end lifecycle

This is enough to prove:

- character creation to battle projection
- PC and monster participation in the same executable layer
- spell and class feature activations sharing one projected executable model
- MCP action routing without fabricated semantics

## First Projected Subsets

### A. Projected Executable Subset

This is the key first landing.

It should cover only the executable mechanics needed for the tracer bullet:

- `attack_roll`
- `save_gate`
- `direct`
- `damage`
- `heal_hp`
- `grant_extra_action`
- resource gates
- turn-bound usage limits
- reaction-free battle action execution for normal turns

It should support closed executable structure for authored activations.

For the first safe SRD slice:

- `Acid Splash` pressures `save_gate` + area execution + cantrip scaling
- ordinary attack flow pressures `attack_roll`
- `Second Wind` pressures `direct` + `heal_hp`
- `Action Surge` pressures `grant_extra_action`

This first slice does **not** require graph-shaped spell execution, but the projected executable model should stay ready for it. A later graph-shaped pressure case should widen the model, not replace it.

### B. Projected Persistent Subset

This can stay smaller in the first landing.

It only needs to support what the chosen units actually require:

- `modify_ac_set_base` for `Mage Armor`
- minimal lifecycle hooks for duration and early end

## Width-Growth Strategy

This design assumes the surface will grow in width over time from this tracer bullet.

The intended progression is:

1. land the smallest executable and persistent subsets needed for the first MCP battle
2. add more authored units that fit those subsets without changing the interpreter shape
3. widen the projected subsets only when multiple authored units create the same repeated pressure
4. widen mechanics families only when a new repeated pattern cannot honestly fit the current closed subsets

So this tracer bullet is not a one-off vertical hack. It is the first intentionally narrow landing of a broader surface-growth strategy.

What should grow first by width:

- more spell activations that reuse `attack_roll`, `save_gate`, and graph-shaped execution
- more class-feature activations that reuse `direct`, `resourceGate`, and action-economy mutation
- more persistent spell or feature records that reuse small lifecycle ownership hooks

What should not grow yet:

- a generic DSL
- a full generic lifecycle calculus
- speculative families added without concrete authored pressure

## Candidate Projected Shapes

These are design shapes, not fixed type names.

### Source Identity

```ts
type ProjectedSource = {
  readonly unitId: string;
  readonly unitKind:
    | "spell"
    | "class_feature"
    | "monster_ability"
    | "feat"
    | "species_trait";
  readonly mechanicFamily:
    | "activation"
    | "ongoing_effect"
    | "triggered_reaction";
};
```

This keeps projection source-preserving without mirroring the full authored unit.

### Projected Executable Action

```ts
type ProjectedExecutableAction = {
  readonly source: ProjectedSource;
  readonly actionId: string;
  readonly actionKind: "spell_cast" | "feature_use" | "attack";
  readonly activationCost: "action" | "bonus_action" | "reaction" | "free";
  readonly resourceGate?: ProjectedResourceGate;
  readonly graph: ProjectedResolutionGraph;
};
```

### Projected Resolution Graph

```ts
type ProjectedResolutionGraph = {
  readonly roots: ReadonlyArray<ProjectedResolutionNodeId>;
  readonly nodes: ReadonlyArray<ProjectedResolutionNode>;
};
```

```ts
type ProjectedResolutionNode =
  | {
      readonly id: ProjectedResolutionNodeId;
      readonly kind: "attack_roll";
      readonly target: "primary_target" | "secondary_target";
      readonly attackKind:
        | "weapon_attack"
        | "ranged_spell_attack"
        | "melee_spell_attack";
      readonly onHit: ReadonlyArray<ProjectedResolutionNodeId>;
      readonly onMiss: ReadonlyArray<ProjectedResolutionNodeId>;
    }
  | {
      readonly id: ProjectedResolutionNodeId;
      readonly kind: "save_gate";
      readonly targets: ProjectedTargetSelector;
      readonly ability: Ability;
      readonly dc: "caster_spell_save_dc" | "fixed_dc" | "weapon_attack_dc";
      readonly onFail: ReadonlyArray<ProjectedResolutionNodeId>;
      readonly onSuccess: ReadonlyArray<ProjectedResolutionNodeId>;
    }
  | {
      readonly id: ProjectedResolutionNodeId;
      readonly kind: "damage";
      readonly targets: ProjectedTargetSelector;
      readonly damageType: DamageType;
      readonly amount: ProjectedAmount;
    }
  | {
      readonly id: ProjectedResolutionNodeId;
      readonly kind: "heal_hp";
      readonly targets: ProjectedTargetSelector;
      readonly amount: ProjectedAmount;
    }
  | {
      readonly id: ProjectedResolutionNodeId;
      readonly kind: "grant_extra_action";
      readonly targets: "self";
      readonly restriction: "exclude_magic" | "none";
    };
```

### Projected Persistent Record

```ts
type ProjectedPersistentRecord = {
  readonly source: ProjectedSource;
  readonly kind: "set_base_ac";
  readonly target: "self" | "chosen_target";
  readonly base: number;
  readonly abilityMod: "dex";
  readonly lifecycle?: ProjectedLifecycle;
};
```

### Minimal Projected Lifecycle

```ts
type ProjectedLifecycle = {
  readonly duration?: "instantaneous" | "timed";
  readonly endsEarly?: ReadonlyArray<"target_dons_armor">;
};
```

This is intentionally tiny for v1.

## Unit-Specific Tracer Bullets

### 1. Acid Splash

Use the existing authored unit in [acid_splash.json](/workspace/typescript/dnd/packages/surface/content/acid_splash.json).

This is the safe SRD spell-side executable pressure case:

- action cantrip
- area save gate
- character-level cantrip scaling
- battle-targeted area execution

Important consequence:

- `Acid Splash` proves the executable projection must support projected spell activation without requiring a bespoke spell handler
- the first safe SRD slice does **not** require graph-shaped spell execution
- the design should still remain graph-ready for a later pressure case

### 2. Fighter Second Wind

Use the existing authored unit in [fighter_second_wind.json](/workspace/typescript/dnd-design-domain-model/packages/surface/content/fighter_second_wind.json).

It projects to one executable action:

- bonus action
- self target
- `heal_hp`
- class-level-scaled amount
- resource cap and reset cadence

This is the canonical example that proves the interpreter is not spell-specific.

### 3. Fighter Action Surge

Use the existing authored unit in [fighter_action_surge_l2.json](/workspace/typescript/dnd-design-domain-model/packages/surface/content/fighter_action_surge_l2.json).

It projects to one executable action:

- free activation
- self target
- `grant_extra_action`
- restriction: exclude Magic
- resource cap
- once-per-turn usage limit

This proves the projected executable layer must express action-economy mutation, not only HP or damage.

### 4. Mage Armor

Use the existing authored unit in [mage_armor.json](/workspace/typescript/dnd-design-domain-model/packages/surface/content/mage_armor.json).

This belongs to the persistent projection side:

- set base AC to `13 + Dex`
- timed duration
- early end if target dons armor

It is the first persistent spell worth including because it exercises both:

- persistent projection
- minimal lifecycle ownership

### 5. Goblin And Bugbear

Use the existing monster/stat-block ownership path rather than inventing a second monster surface just for this tracer bullet.

For this slice, goblin and bugbear only need to prove:

- they can be authored and projected into the same battle host
- they can be targeted by attack and save actions
- they can take turns and end turns
- they can attack back through existing battle action flow

The battle tracer bullet does not require full monster-mechanics promotion.

## Minimum Surface And Facility Prep

Before implementation, prepare this exact list:

1. **Confirm the existing `acid_splash` unit as the spell-side executable pressure case**
   - verify the authored unit remains the canonical in-scope spell activation for the first safe SRD slice

2. **Freeze the first projected executable subset**
   - one doc or module that names the exact executable node kinds and resource gates allowed in v1

3. **Freeze the first projected persistent subset**
   - enough for `Mage Armor`
   - do not widen it prematurely

4. **Confirm character-sheet-to-battle projection seam**
   - reuse the stored character sheet path and `start_battle` seam already established in MCP

5. **Confirm monster authored path for goblin and bugbear**
   - use existing monster ownership direction
   - do not add a tracer-bullet-only monster format

6. **Prepare one end-to-end scenario fixture**
   - mage
   - fighter 2
   - goblin
   - bugbear
   - deterministic enough to replay through MCP tests

7. **Prepare one boundary list for runtime-provided facts**
   - attack-roll outcome inputs when explicit runtime facts are required
   - save outcomes when explicit runtime facts are required
   - target choice fields
   - area-target resolution when not derivable directly from battle state

## Implementation Order

Implementation should proceed in this order:

1. define the Quint executable subset
2. define the matching TS projected executable and persistent subsets
3. compile the chosen authored units into projected records in memory from generated JSON
4. connect projected executable actions to battle availability and execution
5. connect projected persistent records to character or battle projection
6. wire MCP only through already-owned character and battle seams
7. add the first end-to-end MCP tracer-bullet tests

This keeps the semantic frontier in Quint and avoids adapter-first drift.

## MCP Fit

MCP should remain thin.

It should:

- create and finalize characters through the canonical stored-character seam
- project them into battle through the existing `start_battle` style host promotion
- expose only legal projected actions via `get_available_actions`
- execute only narrow resolved actions via `execute_action`

MCP should not:

- invent executable semantics
- infer hidden runtime facts
- mirror the authored surface

## Open Questions

These do not block the design doc, but should be resolved during implementation:

1. whether the first persistent projection for `Mage Armor` should live at character projection time, battle host setup time, or both through one shared query
2. whether projected records remain purely in memory in v1 or later gain checked-in fixtures for auditability
3. which later SRD-safe pressure case should be used to widen the executable model to explicit graph-shaped spell resolution

## Recommended File Ownership

This doc should replace the earlier intermediate design-interview files.

It is intended to be the single implementation-facing reference for this tracer bullet.
