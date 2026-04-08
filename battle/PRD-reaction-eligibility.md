# PRD: Reaction Eligibility Redesign

## Status

Draft proposal for design review.

This document is intentionally separate from the batch handoff in `.references/inspirations/PLAN.md`. It proposes an architectural change to the battle reaction facilities rather than the next small regression batch.

## Problem

The current battle reaction model is too generic to remain faithful to RAW for named flow features.

Today the battle machine mostly models reaction windows as:

- a trigger type,
- a set of eligible creature ids,
- a union of possible reaction decisions.

That is enough to model sequencing, but it is not enough to model legality.

Concrete example:

- `Uncanny Dodge` is a named SRD reaction with specific legality:
  - trigger: an attacker that you can see hits you with an attack roll
  - effect: halve the attack's damage
- the current `PIAttackDamage` context does not preserve the visibility fact needed by RAW
- the current damage-reaction facility does not encode which reactions the target is actually allowed to use

The result is that the current model can sequence damage reactions, but it cannot fully distinguish:

- legal damage reactions,
- impossible damage reactions,
- reactions that belong to different features but currently share a generic branch.

This is an architecture problem, not just a missing test.

## Why This Matters

This repo's architecture explicitly treats these as Quint-owned flow features.

Relevant architecture constraints:

- `battle.qnt` is the authoritative combat model
- flow features belong in Quint when they affect battle state-machine correctness
- named reactions like `Uncanny Dodge`, `Deflect Attacks`, `Shield`, and `Counterspell` should be modeled as specific legal flows, not just ad hoc runtime decisions

If the current generic reaction facility is too weak for RAW, the correct move is to break it and replace it with a stricter model.

## Downstream Dependency

This redesign is also the missing prerequisite for honest reaction actions in the supported action-query surface.

Relevant downstream document:

- [plans/available-actions.md](../plans/available-actions.md)

That plan already records that Phase 2 reaction coverage is blocked by missing owned trigger state. This PRD is the architecture work that resolves that blocker.

Concrete downstream consumers called out there:

- `USE_UNCANNY_DODGE`
- `USE_CUTTING_WORDS`

Why they are blocked today:

- the current machine/query surface can tell that a creature has a reaction resource
- it cannot honestly tell that the exact trigger window exists right now and that the named reaction is legal in that window

So this PRD is not only about battle-model correctness. It is also the enabling work for exposing semantic reaction actions through:

- `packages/core/src/available-actions.ts`
- `packages/mcp/src/server.ts`

Without this redesign, exposing reaction-cost semantic actions there would over-suggest illegal actions.

## Goals

- Make battle reaction legality explicit in the authoritative model
- Preserve parity between `battle.qnt` and `battle-machine.ts`
- Represent named flow reactions in domain language rather than generic placeholders
- Ensure reaction windows carry the facts needed to validate RAW legality
- Make it impossible for tests or callers to drive impossible reactions through the battle engine
- Unblock honest semantic reaction actions in the available-actions / MCP surface

## Non-Goals

- Do not model spatial facts beyond the repo's existing boundary
- Do not add UI-oriented helper state
- Do not add duplicate state if the same fact already exists in the attack context at interrupt creation time
- Do not solve every reaction in one step if the facility can be migrated incrementally

## Current State

### Current Facilities

- `PIAttackHit`
  - used by `Shield`, `Parry`, `Cutting Words`
- `PIAttackDamage`
  - used by `Uncanny Dodge`, generic `RDamageReduction`
- `PISpellCast`
  - used by `Counterspell`
- `PISaveFailed`
  - used by `Legendary Resistance`
- `PIAfterDamage`
  - used by after-damage responses

### Current Weakness

The current facilities model:

- who may respond
- when the pause happens
- what raw decision variant was sent

They do not model:

- which named reactions are legal for that responder in that exact window
- all trigger facts needed to validate RAW legality later in resolution

### Damage-Reaction Gap

Current `AttackDamageCtx` preserves:

- attacker
- target
- damage
- damage type
- critical flag
- return target
- knock-out flag

It does not preserve:

- whether the defender could see the attacker
- whether this was a weapon attack
- whether the damage type qualifies for `Deflect Attacks`
- which specific damage reactions are legal for the target

## Proposed Direction

Redesign reaction windows so they carry both:

1. eligible responders
2. legal reactions for each responder in that exact interrupt

This should be done in both Quint and TS, with Quint leading.

## Core Proposal

### 1. Make reaction legality explicit

Replace the current "generic window + free-form decision" pattern with:

- interrupt context that preserves the facts needed for legality
- legal reaction options derived at interrupt creation time

In other words:

- current model: "creature C may react here"
- proposed model: "creature C may react here, and its legal options are X/Y/Z"

### 2. Name reactions by feature, not by generic effect

Rename generic variants where they hide feature identity.

Most important immediate rename:

- `RDamageReduction` -> `RDeflectAttacks`

Reason:

- the current branch is not truly generic
- it is semantically standing in for Monk `Deflect Attacks`
- its legality depends on named SRD feature rules

This keeps battle semantics in domain language and avoids "generic" branches that actually encode feature-specific behavior.

### 3. Preserve legality facts at interrupt creation time

The battle engine should compute legality once, at the moment the interrupt point is reached, and persist it in the interrupt/window state.

This is better than recomputing later because:

- the decisive trigger facts are freshest at creation time
- some trigger facts are lost by later phases unless explicitly preserved
- it keeps Quint and TS aligned around the same legal state transition

## Proposed Model Shape

There are two viable ways to represent legal reactions.

### Option A: Per-window allowed-reaction map

Example shape:

```ts
type HitReactionKind = "Shield" | "Parry" | "CuttingWords"
type DamageReactionKind = "UncannyDodge" | "DeflectAttacks"

interface ReactionWindow<K extends string> {
  eligible: ReadonlySet<CreatureId>
  offered: ReadonlySet<CreatureId>
  legalByCreature: ReadonlyMap<CreatureId, ReadonlySet<K>>
}
```

Pros:

- cleanly separates responder identity from legal options
- scales well when multiple creatures can respond with different options
- maps naturally to reaction-window language

Cons:

- heavier structure in Quint and TS
- more MBT bridge surface area

### Option B: Boolean capabilities embedded in interrupt context

Example shape:

```ts
interface AttackDamageCtx {
  attacker: CreatureId
  target: CreatureId
  damage: number
  damageType: DamageType
  isCritical: boolean
  atkReturnTo: AfterDamageReturn
  knockOut: boolean
  targetCanSeeAttackerAtHit: boolean
  isWeaponAttack: boolean
  canUncannyDodge: boolean
  canDeflectAttacks: boolean
}
```

Pros:

- smaller change set for the first redesign
- easy to validate in both Quint and TS
- fits the fact that `PIAttackDamage` is target-only today

Cons:

- less general once multi-responder windows need different legal options
- can become cluttered if many reactions share the same window

## Recommendation

Use a hybrid staged approach:

- short-term implementation for damage windows: Option B
- longer-term facility direction for hit and damage windows: Option A pattern

Why:

- `PIAttackDamage` currently has only one meaningful responder: the target
- that makes capability booleans a low-risk first correction
- once the model is proven, hit windows can adopt the more general `legalByCreature` shape

This avoids doing a giant all-window refactor blindly, but still moves the architecture in the correct direction.

(NOTE FROM REVIEWER: that separation must be explicitly called out in the .qnt code comments AT THE LEAST.)

## Specific Proposed Changes

### Phase 1: Fix damage reactions correctly

#### TS and Quint type changes

Extend attack damage interrupt context with:

- `targetCanSeeAttackerAtHit: boolean`
- `isWeaponAttack: boolean`
- `canUncannyDodge: boolean`
- `canDeflectAttacks: boolean`

Potentially also:

- `isMelee: boolean`

Only if needed by current or upcoming damage reactions.

#### Reaction decision changes

Rename:

- `RDamageReduction` -> `RDeflectAttacks`

Keep:

- `RUncannyDodge`
- `RPass`

#### Legality computation

When entering `PIAttackDamage`, compute:

- `canUncannyDodge`
  - target has reaction available
  - target is Rogue 5+
  - target can see attacker
- `canDeflectAttacks`
  - target has reaction available
  - target is Monk 3+
  - trigger satisfies `Deflect Attacks` requirements
  - include `Deflect Energy` expansion if modeled at battle level

If neither is legal:

- skip the damage reaction window entirely

#### Resolution validation

In `BATTLE_RESOLVE_DMG_REACTION`:

- reject `RUncannyDodge` if `canUncannyDodge` is false
- reject `RDeflectAttacks` if `canDeflectAttacks` is false
- only spend the reaction when a legal effectful decision is taken

### Phase 2: Apply the same pattern to hit reactions

Current hit reactions have the same architecture smell:

- generic responder eligibility
- feature legality left implicit

Likely named hit reactions:

- `Shield`
- `Parry`
- `Cutting Words`

Proposed future direction:

- represent legal hit reactions explicitly per responder
- move toward a `legalByCreature` reaction window shape

### Phase 3: Normalize reaction-window architecture

Once damage and hit windows both carry legality, unify the facility shape across:

- `PIAttackHit`
- `PIAttackDamage`
- possibly `PISpellCast` and `PISaveFailed` where useful

End state:

- reaction windows are battle-domain objects
- legality is an explicit part of the state
- decision unions are named by feature or rules concept

## Why Not Keep the Generic Model?

Because it creates the exact kind of semantic leak this architecture says not to tolerate.

A generic model would force one of these bad outcomes:

- tests send impossible decisions and the engine accepts them
- legality is patched ad hoc in TS but not modeled in Quint
- legality is recomputed later from incomplete context
- parallel "helper registries" emerge outside the authoritative battle state

All of those are worse than changing the battle model.

## Why Not Patch Only Uncanny Dodge?

Because the problem is facility-level, not feature-level.

If we patch only `Uncanny Dodge`:

- `Deflect Attacks` remains hidden behind a generic reaction
- hit windows remain generic and under-specified
- the model still does not express the architectural distinction between:
  - "this creature can respond"
  - "this creature can respond with these specific reactions"

That would fix a symptom, not the architecture.

## Expected Breakage

This redesign is allowed to break:

- current battle reaction tests that assume generic availability
- MBT bridge mapping for reaction decisions
- Quint type shapes for pending interrupts and reaction decisions
- any runtime path that still treats reaction legality as caller-driven rather than battle-state-driven

That breakage is acceptable because the current model is too weak for the stated correctness target.

## Implementation Order

1. Update `battle.qnt` first
   - redesign damage reaction interrupt context
   - rename reaction decision variants
   - compute legality at interrupt creation
2. Update battle TS types
   - mirror the new interrupt and decision shapes
3. Update battle runtime
   - open damage window only when legal reactions exist
   - reject illegal decisions
4. Update deterministic scenario tests
   - positive and negative `Uncanny Dodge`
   - positive and negative `Deflect Attacks`
5. Update MBT bridge
   - new ITF mapping for renamed decisions and richer interrupt state
6. Run Tier 1 battle MBT

## Open Decisions

### 1. How broad should Phase 1 be?

Choice A:

- damage windows only

Choice B:

- damage + hit windows together

Recommendation:

- start with damage windows only
- but design the types so hit windows can follow the same pattern without rework

### 2. Should legal reactions be booleans or sets?

Choice A:

- booleans in the interrupt context

Choice B:

- a per-creature legal reaction set

Recommendation:

- booleans for damage windows now
- general reaction-set mapping when hit windows are redesigned

### 3. Should `Deflect Attacks` stay inside the same facility?

Recommendation:

- yes
- the facility is still correct
- the problem is not shared flow; it is missing legality

## Verification Plan

Deterministic checks:

- scenario tests for legal and illegal damage reactions
- typecheck

Parity checks:

- compile Quint battle spec
- Tier 1 `battle-projection.mbt.test.ts`
- Tier 1 `battle-machine.mbt.test.ts`

RAW trace checks:

- Rogue `Uncanny Dodge`
- Monk `Deflect Attacks` / `Deflect Energy`
- battle reaction timing requirements in `battle/REQUIREMENTS.md`

## Summary

The correct fix is to redesign reaction windows so legality is part of authoritative battle state.

Short version:

- break the current generic damage-reaction facility
- rename generic feature-hiding decisions
- compute legal reactions at interrupt creation time
- update Quint and TS together
- then use that pattern to tighten the rest of the reaction architecture
- and only after that expose semantic reaction actions like `USE_UNCANNY_DODGE` honestly in the action-query surface
