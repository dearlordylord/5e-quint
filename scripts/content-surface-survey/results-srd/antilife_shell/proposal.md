# Proposal: surface_widening for Antilife Shell

## Unit

- **Name:** Antilife Shell
- **Kind:** spell / `ongoing_effect`
- **Level:** 5 (Abjuration, Concentration up to 1 hour)

## Why it doesn't encode

The spell fits the `ongoing_effect` family cleanly in structure (concentration, self-centered persistent aura), but `OngoingOperation` has only two variants: `roll_modifier` and `damage_on_hit`. The spell's entire mechanical payload is a **movement barrier** — it has no roll modifier and deals no damage. The v4 atom `block_travel` exists, but there is no `OngoingOperation` variant that emits it.

Three additional surface gaps compound the primary one.

## Proposed widenings (all `surface_widening`)

### 1. `OngoingOperation` — new `block_travel` variant

```typescript
export type BlockTravelOperation = {
  readonly kind: "block_travel";
  readonly exemptCreatureTypes?: ReadonlyArray<CreatureType>;
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | BlockTravelOperation;   // NEW
```

**Evidence:** *"The aura prevents creatures other than Constructs and Undead from passing or reaching through it."*

`block_travel` is already a v4 Effect atom; this widens the surface to expose it through `ongoing_effect`. The `exemptCreatureTypes` field is required for the Constructs/Undead exemption (see §3 below).

### 2. `AreaOrigin` — new `self_centered` variant

```typescript
export type AreaOrigin =
  | { readonly kind: "point_within_range" }
  | { readonly kind: "on_primary_target" }
  | { readonly kind: "self_centered" };   // NEW — SRD "Emanation" area type
```

**Evidence:** *"An aura extends from you in a 10-foot Emanation for the duration."*

An Emanation in SRD 5.2.1 is an area that moves with the caster. It cannot be expressed as `point_within_range` (static origin) or `on_primary_target` (origin on a creature). The `self_centered` origin pairs with `attachment: { kind: "area", shape: { kind: "sphere", radiusFeet: 10 }, origin: { kind: "self_centered" } }`.

### 3. `CreatureType` predicate for filter

The `exemptCreatureTypes` field on `BlockTravelOperation` requires a `CreatureType` enum. This enum does not currently exist in `types.ts` (the surface has `ClassName` and `Condition` but not creature types). A minimal closed set is needed:

```typescript
export type CreatureType =
  | "aberration" | "beast" | "celestial" | "construct"
  | "dragon" | "elemental" | "fey" | "fiend" | "giant"
  | "humanoid" | "monstrosity" | "ooze" | "plant" | "undead";
```

**Evidence:** *"creatures other than Constructs and Undead"*

This is narrow pressure but the enum is cheap and will recur (Spirit Guardians, Magic Circle, Protection from Evil and Good all filter by creature type).

### 4. `Duration` — self-break condition on caster movement

The spell carries an unusual termination rule:

> *"If you move so that an affected creature is forced to pass through the barrier, the spell ends."*

This is not covered by the existing `Duration` variants (`concentration.upTo`, `timed.value`, `instantaneous`). The v4 lifecycle atom `self_break` exists, but the surface has no way to attach a trigger condition to it. One approach:

```typescript
export type ConcentrationDuration = {
  readonly kind: "concentration";
  readonly upTo: DurationValue;
  readonly selfBreakOn?: SelfBreakCondition;  // NEW optional field
};

export type SelfBreakCondition =
  | { readonly kind: "caster_moves_into_affected_creature" };
```

Alternatively, a broader `SelfBreakTrigger` type can be introduced once more pressure cases land (e.g., Blink's random-at-turn-end, Banishment's concentration-break-returns).

## What does encode cleanly

- Casting time: `{ kind: "action" }` ✓
- Level 5 concentration ✓
- Range Self, components V S ✓
- Attachment shape (area sphere 10 ft) — **structurally present** once `self_centered` origin is added
- `block_travel` atom — **present in v4**, just not surfaced

## Classification

`surface_widening` — all four gaps are missing variants of types that already exist in `types.ts`. No new v4 atoms are required. No new payload family is required.
