# Proposal: Widenings for `species_dwarf_dwarven_resilience`

## Unit

**Name:** Dwarven Resilience (Dwarf)  
**Kind:** `species_trait`  
**Source text:**
> You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.

## Outcome: `structural_widening`

No `.dhall`, `.json`, or `.trace.md` produced. The unit cannot be encoded without the widenings below.

---

## Widening 1 — `SpeciesTraitRecord` (new kind in `UnitRecord`)

**Kind:** `new_variant`

`UnitRecord` is currently:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The tracer's top-level switch `switch (unit.kind)` covers `"spell"`, `"class_feature"`, and `"mastery"` — `"species_trait"` would throw `unhandled unit kind`.

**Minimum required addition:**

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

---

## Widening 2 — `passive_trait` mechanics family

**Kind:** `new_subgraph`

Species traits are innate and always-on. They have no activation cost, no use-count resource, and no rest reset cadence. Forcing them into `ClassFeatureActivationMechanics` would require fabricating an activation that doesn't exist in the SRD text.

A new family is needed — something like:

```typescript
export type PassiveTraitMechanics = {
  readonly family: "passive_trait";
  readonly effects: ReadonlyArray<PassiveTraitEffect>;
};
```

Where `PassiveTraitEffect` covers resistance grants, sense grants, advantage grants, and HP modifications.

---

## Widening 3 — `grant_resistance` in passive species effect surface

**Kind:** `new_variant`

`grant_resistance` exists as a v4 atom but has no corresponding surface type in `ClassFeatureEffect` or any reachable position for a non-mastery, non-spell unit. A passive species mechanics family needs:

```typescript
export type GrantResistanceEffect = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType;
};
```

**Evidence:** "You have Resistance to Poison damage."

---

## Widening 4 — permanent condition-scoped `modify_roll_advantage`

**Kind:** `new_variant`

The current `ModifyRollAdvantageRider` is designed for expiring mastery on-hit riders:

```typescript
export type ModifyRollAdvantageRider = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly count: number;        // expiring
  readonly expiresOn: RiderExpiry; // expiring
};
```

Dwarven Resilience's advantage is:
- **Permanent** (no expiry)
- **Condition-scoped** (only on saves to avoid or end the Poisoned condition — not all saving throws)

Neither the lack of expiry nor the condition filter is expressible. A new variant or a new effect type is needed:

```typescript
export type GrantConditionSaveAdvantageEffect = {
  readonly kind: "grant_condition_save_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly condition: Condition;  // "poisoned" | ...
  // no expiresOn — this is permanent
};
```

**Evidence:** "You also have Advantage on saving throws you make to avoid or end the Poisoned condition."

The `Condition` type currently only contains `"prone"` (from mastery). `"poisoned"` would also need to be added.

---

## Summary of gaps

| Gap | Classification | v4 atom exists? |
|---|---|---|
| `SpeciesTraitRecord` kind in `UnitRecord` | structural | N/A (record wrapper) |
| `passive_trait` mechanics family | structural | N/A (family shape) |
| `grant_resistance` in passive effect surface | surface_widening | Yes (`grant_resistance`) |
| Permanent condition-scoped advantage on saves | surface_widening | Yes (`modify_roll_advantage`), but wrong shape |
| `"poisoned"` in `Condition` type | surface_widening | N/A (narrowing of existing type) |

The v4 taxonomy is sufficient — `grant_resistance` and `modify_roll_advantage` both exist. What is missing is the surface-level type plumbing to express them in an always-on, no-activation, no-resource species trait context.
