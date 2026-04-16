# Proposal: Widenings required for Conjure Minor Elementals

## Outcome: `atom_widening`

Three gaps prevent honest encoding. Two are surface widenings of existing types; one names a concept not present in the v4 atom taxonomy.

---

## Gap 1 — `AreaOrigin` missing an `on_self` (Emanation) variant

**Classification:** `surface_widening`

**Rule text:**
> "You conjure spirits from the Elemental Planes that flit around you in a **15-foot Emanation** for the duration."

**Problem:**

An Emanation in SRD 5.2.1 is defined as a sphere of effect centred on a creature that moves with that creature. The existing `AreaOrigin` union covers:

- `point_within_range` — a fixed point in space chosen at cast time
- `on_primary_target` — centred on a targeted creature (e.g. Spirit Guardians-style)

Neither is correct for Conjure Minor Elementals. The Emanation is anchored on **the caster** and tracks their position every moment the spell persists — it is not chosen at cast time, and it is not on a separate targeted creature.

**Proposed widening:**

Add a new variant to `AreaOrigin`:

```typescript
| { readonly kind: "on_self" }
```

This cleanly distinguishes self-centered moving areas (Emanations) from both fixed point areas and target-anchored areas. Multiple spells use Emanations (Spirit Guardians, Aura of Protection, etc.), so this variant will see broad reuse.

---

## Gap 2 — `DamageOnHitOperation.damageType` cannot express per-attack caster choice

**Classification:** `surface_widening`

**Rule text:**
> "This damage is Acid, Cold, Fire, or Lightning **(your choice when you make the attack)**."

**Problem:**

`DamageOnHitOperation.damageType` is typed as a single fixed `DamageType`. The field is resolved at authoring time (or at cast time at the latest), but Conjure Minor Elementals requires the damage type to be selected by the caster at each individual attack resolution, from a closed set of four options.

This is mechanically distinct from:
- A fixed damage type (Fire Bolt: always fire)
- A damage type chosen at cast time (Dragon's Breath: chosen when cast, fixed for the duration)

The choice here is **per-attack**, deferred to the moment of attack roll resolution.

**Proposed widening:**

Replace or extend `DamageOnHitOperation.damageType` to allow a choice variant:

```typescript
export type OnHitDamageType =
  | DamageType  // existing: fixed at author time
  | {
      readonly kind: "caster_choice_per_attack";
      readonly options: ReadonlyArray<DamageType>;
    };
```

The `options` array is closed at authoring time; the caster's runtime selection is a valid input from that set at attack resolution. This is a narrow, well-defined shape — the caster has full information and makes a deterministic pick.

---

## Gap 3 — No `apply_difficult_terrain` atom in v4

**Classification:** `atom_widening`

**Rule text:**
> "In addition, the ground in the **Emanation** is **Difficult Terrain** for your enemies."

**Problem:**

Difficult Terrain is a spatial game-state property: it doubles the movement cost to enter an affected square/hex. The v4 atom inventory has no atom for this. The closest candidates are all wrong:

| Candidate atom | Why it's wrong |
|---|---|
| `block_travel` | Prevents entry entirely — semantically different from halving movement allowance |
| `modify_speed` | Modifies a creature's speed stat permanently/temporarily — DT is a per-square terrain property, not a creature property |
| `apply_condition` | Applies a condition to a creature (Prone, Stunned, etc.) — Difficult Terrain is not a creature condition |
| `create_object` | Physical objects/constructs — a terrain state change isn't an object |

Difficult Terrain is a **deterministic, spatially-scoped, game-engine-tracked state** applied to a region for the duration of an effect. It affects enemy movement calculations on every movement attempt through the zone. This is a distinct mechanics primitive that will recur across many spells (Entangle, Spike Growth, Sleet Storm, Web, etc.).

**Proposed widening:**

Add a new effect atom to v4:

```
apply_difficult_terrain
```

Category: `effect`

The atom represents the ground state change within the attachment's area. It requires a scope (which creatures are affected — "enemies" is a runtime concept; the atom should model "applies to specified creature filter at runtime") and persists for the enclosing duration.

Minimal surface type:

```typescript
export type ApplyDifficultTerrainEffect = {
  readonly kind: "apply_difficult_terrain";
  readonly affects: "enemies" | "all";
};
```

---

## What would be clean without these gaps

The remainder of the spell maps cleanly to existing vocabulary:

| Mechanic | Existing shape |
|---|---|
| Casting time: Action | `CastingTime { kind: "action" }` |
| Concentration, up to 10 minutes | `Duration { kind: "concentration", upTo: { unit: "minute", amount: 10 } }` |
| Spell slot 4 | `SpellLevel 4` |
| Conjuration school | `SpellSchool "conjuration"` |
| V, S components (no material) | `Components { v: true, s: true, m: false }` |
| Range: Self | `Range { kind: "self" }` |
| Family: ongoing_effect | `OngoingEffectMechanics` |
| +2d8 damage on hit | `DamageOnHitOperation` with `DiceAmount { kind: "fixed", expr: { dice: 2, dieSize: 8 } }` |
| Slot scaling +1d8/level above 4 | `DiceAmount { kind: "linear_per_level", axis: "slot", base: { dice: 2, dieSize: 8 }, perLevel: { dice: 1 }, startingAtLevel: 4 }` |
