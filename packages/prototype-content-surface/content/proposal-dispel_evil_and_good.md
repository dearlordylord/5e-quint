# Proposal: Dispel Evil and Good — structural_widening

## Unit

**Dispel Evil and Good** — 5th-level abjuration, concentration up to 1 minute. SRD 5.2.1.

## Why encoding was not attempted

The spell has a shape that does not fit any current payload family honestly:

1. A **passive concentration aura** that grants Disadvantage on attack rolls to specific creature types targeting the caster.
2. **Two optional sub-activations** (each costing a Magic action) that each **terminate the parent concentration spell** when used.

No existing `SpellMechanics` family — `ongoing_effect`, `activation`, `triggered_reaction`, `anchored_trigger` — can represent this composite. Forcing it into `ongoing_effect` would require (a) inventing atoms that aren't in types.ts, (b) silently omitting the two special functions, or (c) falsely representing them as something they are not.

---

## Widening 1 — New subgraph: ongoing_with_sub_activations (structural)

**Kind:** `new_subgraph`

The spell is a concentration aura that can be optionally consumed by one of two distinct Magic-action activations. This "ongoing + optional exit actions" composite is absent from all four current spell families.

A possible design: a new family `ongoing_with_exit_actions` that pairs an `OngoingEffectMechanics`-like aura with a `ReadonlyArray<ExitAction>` where each `ExitAction` has its own activation cost, target, and effect, and each one terminates the ongoing spell when resolved.

---

## Widening 2 — New OngoingOperation variant: modify_roll_advantage

**Kind:** `new_variant`  
**Evidence:** "Celestials, Elementals, Fey, Fiends, and Undead have **Disadvantage** on attack rolls against you."

`OngoingOperation` currently has:
- `roll_modifier` — numeric dice delta on rolls
- `damage_on_hit` — damage rider on hit

A new variant is needed:
```typescript
export type ModifyRollAdvantageOperation = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
};
```

This mirrors `ModifyRollAdvantageRider` (mastery) but in the `OngoingOperation` union.

---

## Widening 3 — New surface concept: creature_type_predicate filter

**Kind:** `new_variant`  
**Evidence:** The Disadvantage only applies to attackers of types Celestial, Elemental, Fey, Fiend, Undead.

No current `Attachment`, `Attachment` origin, or `OngoingOperation` carries a creature-type filter predicate. A closed enum of creature types filtered at effect application time is needed. Possible shape:

```typescript
export type CreatureTypeFilter = {
  readonly kind: "creature_type_whitelist";
  readonly types: ReadonlyArray<CreatureType>;
};
```

Where `CreatureType` is a new enum: `"celestial" | "elemental" | "fey" | "fiend" | "undead" | ...`.

This applies to the aura (only attackers of those types have disadvantage) and to both exit actions (both restrict their targets to those creature types).

---

## Widening 4 — Effect.remove_condition (and remove_possession)

**Kind:** `new_variant`  
**Evidence:** "The target is no longer possessed, Charmed, or Frightened by such creatures."

`Effect = DamageEffect | NoneEffect` — `remove_condition` exists in v4 atom taxonomy but is absent from the surface `Effect` type. Needs:

```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly conditions: ReadonlyArray<Condition>;
  readonly removePossession?: boolean;
};
```

`Condition` also needs to be widened from `"prone"` to include `"charmed" | "frightened" | ...`.

---

## Widening 5 — Effect.transport_exile

**Kind:** `new_variant`  
**Evidence:** "The target must succeed on a Charisma saving throw or be sent back to its home plane if it isn't there already."

`transport_exile` is a v4 atom but absent from `Effect`. This is the same atom needed by Banishment. Needs:

```typescript
export type TransportExileEffect = {
  readonly kind: "transport_exile";
  readonly destination: "home_plane" | { readonly namedPlane: string };
};
```

---

## Widening 6 — Sub-activation cost: magic_action

**Kind:** `new_variant`  
**Evidence:** "As a **Magic action**, you touch a creature..." / "As a **Magic action**, you target one creature..."

`ClassFeatureActivationCost = { kind: "free" } | { kind: "bonus_action" }`. Neither covers the Magic action. Even if these sub-activations were encoded as activation phases inside a new composite family, the "Magic action" cost needs representation. Needs:

```typescript
| { readonly kind: "magic_action" }
```

added to whatever cost type models sub-activation costs.

---

## Dependency order for implementation

1. Design the `ongoing_with_exit_actions` family (Widening 1) — the structural gate.
2. Add `CreatureType` enum and `creature_type_predicate` filter (Widening 3) — needed by both aura and exit actions.
3. Add `modify_roll_advantage` to `OngoingOperation` (Widening 2).
4. Widen `Condition` and add `RemoveConditionEffect` (Widening 4).
5. Add `TransportExileEffect` (Widening 5).
6. Add `magic_action` cost variant (Widening 6).
