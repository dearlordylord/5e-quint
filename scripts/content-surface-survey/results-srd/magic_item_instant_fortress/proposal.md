# Proposal: Instant Fortress — surface widening

**Classification:** `surface_widening`

The core mechanics of Instant Fortress fit the existing surface: `magic_item` record kind, `activation` family, Magic action cost, `create_object` effect atom with `CreatedObjectDurability`. The tracer runs cleanly on the partial encoding.

Seven gaps in the surface prevent a complete honest encoding. All are variants or fields of existing types — no fundamentally new v4 taxonomy atom is required except for door control (#7).

---

## Gap 1 — `CreatedObjectDurability.damageResistances` (new field)

**RAW:** "Resistance to all other damage."

The `CreatedObjectDurability` type has `damageImmunities` and `damageVulnerabilities` but no `damageResistances`. The tower's broad resistance profile (all damage types not immunized) is entirely omitted from the encoding.

**Proposed widening:**
```typescript
export type CreatedObjectDurability = {
  readonly acValue: number;
  readonly hpPerSection: number;
  readonly damageImmunities?: ReadonlyNonEmptyArray<DamageType>;
  readonly damageResistances?: ReadonlyNonEmptyArray<DamageType>;   // NEW
  readonly damageVulnerabilities?: ReadonlyNonEmptyArray<DamageType>;
};
```

Since the tower resists "all other" damage types (11 types: acid, cold, fire, force, lightning, necrotic, poison, psychic, radiant, thunder, plus potentially others), the dhall would list them explicitly. An "all_other" sentinel is not needed for this unit but could be considered.

---

## Gap 2 — Conditional immunity exception (siege equipment)

**RAW:** "Immunity to Bludgeoning, Piercing, and Slashing damage except that which is dealt by siege equipment."

The current `damageImmunities` field is a flat `ReadonlyNonEmptyArray<DamageType>` with no way to attach a source exception. The encoding records unconditional B/P/S immunity.

**Proposed widening:** Widen `damageImmunities` on `CreatedObjectDurability` to support optional exceptions:
```typescript
export type DamageImmunityEntry =
  | DamageType
  | { readonly damageType: DamageType; readonly exceptFrom?: DamageSourceException };

export type DamageSourceException =
  | { readonly kind: "siege_equipment" };
```

Alternatively, add a parallel `conditionalImmunities` field. Either approach is additive and backward-compatible with existing content that uses plain `DamageType` entries.

---

## Gap 3 — Rectangular prism shape

**RAW:** "The tower is 20 feet on a side and 30 feet high."

`AreaShapeSpec` has no variant for a rectangular prism (different width and height). The encoding uses `cube { sideFeet: 20 }` to capture the base footprint but loses the 30 ft height dimension. Downstream consumers that need the full 3D volume (line-of-sight, ranged attack adjudication, teleportation checks) would receive incorrect data.

**Proposed widening:**
```typescript
| {
    readonly kind: "rectangular_prism";
    readonly widthFeet: number;
    readonly depthFeet: number;
    readonly heightFeet: number;
  }
```

The tower is `{ kind: "rectangular_prism", widthFeet: 20, depthFeet: 20, heightFeet: 30 }`.

---

## Gap 4 — Reset cadence: refills on revert

**RAW:** "Repeating the command word causes the tower to revert to statuette form."

The item can be redeployed freely after reverting — there is no stated use limit, rest requirement, or daily cap. The existing `ResetCadence` vocabulary (rest-triggered, dawn, elapsed time, never) has no variant for "refills when the created object is manually dismissed." The encoding uses `{ kind: "never" }` as a placeholder, which incorrectly models the item as permanently exhausted after a single deployment.

**Proposed widening:**
```typescript
// TimeResetCadence addition:
| { readonly kind: "on_created_object_reverted" }
```

This cadence fires when the owner issues the revert command (see Gap 5), restoring the use count to full. The refill is instantaneous (the item is back in statuette form and immediately usable again).

---

## Gap 5 — Duration end trigger: owner issues revert command

**RAW:** "Repeating the command word causes the tower to revert to statuette form, which works only if the tower is empty."

The `permanent` duration's `endsOn` field accepts only `"dispel" | "damage"`. Manual-command revert — a voluntary action by the attuned owner, conditioned on the tower being empty — is not representable.

**Proposed widening to `DurationEndTrigger`:**
```typescript
| { readonly kind: "source_issues_revert_command"; readonly condition?: "if_empty" }
```

The `if_empty` condition enforces the "works only if the tower is empty" constraint. This is the same condition that gates the Folding Boat's collapse (anticipated widening).

---

## Gap 6 — Force-push to nearest unoccupied space outside area

**RAW:** "Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower."

The `force_move` atom takes a fixed `distanceFeet` value. "Pushed to the nearest unoccupied space outside but next to" is a spatial resolution algorithm — the actual displacement distance varies per creature (up to 20 ft for a creature at the center of the footprint, 0–5 ft for one at the edge). A fixed-distance `force_move` would be wrong for most targets. Omitted from encoding.

**Proposed widening** (new variant of `force_move`):
```typescript
| {
    readonly kind: "force_move";
    readonly direction: "push" | "pull" | "slide";
    readonly destination: "nearest_unoccupied_outside_area";  // alternative to distanceFeet
  }
```

This variant resolves the destination relative to the triggering area rather than a fixed distance. The same pattern also surfaces for ice/stone wall spells that shunt creatures to the wall's edge.

---

## Gap 7 — Door control (Bonus Action command, immune to Knock)

**RAW:** "The door opens only at your command, which you can issue as a Bonus Action. It is immune to the Knock spell and similar magic."

Two sub-mechanics here:

**7a. Door operation:** The attunee can open or close the tower door as a Bonus Action. There is no v4 atom or surface mechanism for commanding a feature (door, gate, hatch) of a previously-created object. This is a new atom-level gap.

**7b. Door immunity:** The `negate_named_effect` atom exists but applies to a creature or ongoing spell effect — not to a structural property of a created object. There is no way to attach `negate_named_effect { spellId: "knock" }` to the door specifically.

**Proposed additions:**
- A `command_object_feature` atom (or `ActivatedAbilityMechanics` sub-phase) that lets the attunee issue commands to parts of a created object at a given action cost.
- A `negate_named_effect` attachment point on `CreatedObjectDurability` or a new `objectImmunities` field that can list specific spell IDs.

These are higher-complexity widenings and may warrant deferral until multiple units pressure the same shape.

---

## Omitted DM-owned mechanics (no widening needed)

- **"Magic prevents the tower from being tipped over"** — structural guarantee enforced by the DM at the table; no runtime atom. Legitimately DM-owned.
- **"Only a Wish spell can repair the tower"** — narrative repair constraint. The Wish spell's own encoding would carry the "can repair this specific structure" semantics; no atom needed on the fortress side.
