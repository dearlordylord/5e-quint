# Proposal: species_orc_adrenaline_rush

**Outcome:** `structural_widening`

## Unit text

> ***Adrenaline Rush.*** You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus.
>
> You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.

---

## Gap 1 — Missing `species_trait` kind (structural)

`UnitRecord` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The v4 taxonomy defines `species_trait_root` as a source atom, but the content surface has no record shape to carry it.

Forcing this into `ClassFeatureRecord` is dishonest: that type requires `className: ClassName` (one of 12 class names) and `acquiredAtLevel: number`, neither of which applies to species traits — they are innate and not class-scoped.

**Proposed addition:**

```typescript
export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};
```

A `species_trait` family (e.g., `activation`) would need a new `SpeciesTraitMechanics` union parallel to `ClassFeatureMechanics`. The activation family shape is mostly identical to `ClassFeatureActivationMechanics` — the difference is no `className`/`acquiredAtLevel` on the record, and potentially different effect atoms.

---

## Gap 2 — Missing `grant_temporary_hp` effect atom

The feature grants **Temporary Hit Points** (not real HP) equal to Proficiency Bonus. The v4 taxonomy's `heal` atom and the surface's `HealHpEffect` restore actual HP — they do not model the temporary HP buffer mechanic:

- Temporary HP does not stack with itself
- Temporary HP is lost first before real HP
- Temporary HP does not count as healing

`HealHpEffect` would produce a misleading trace. A new effect variant is required:

```typescript
export type GrantTemporaryHpEffect = {
  readonly kind: "grant_temporary_hp";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};
```

v4 taxonomy needs `grant_temporary_hp` added to the effect atom inventory (currently absent — the closest is `heal`, which is semantically distinct).

---

## Gap 3 — PB-scaled use count

The use count cap is **"equal to your Proficiency Bonus"** — this is a character-level function that hits values 2/3/4/5/6 at specific level breakpoints.

Current `UseCountCap`:

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>;
```

`ThresholdTiers<number>` with `axis: "proficiency_bonus"` could encode this via explicit tiers:

```typescript
{
  kind: "threshold_tiers",
  axis: "proficiency_bonus",
  base: 2,
  tiers: [
    { atLevel: 2, value: 3 },
    { atLevel: 3, value: 4 },
    { atLevel: 4, value: 5 },
    { atLevel: 5, value: 6 }
  ]
}
```

This technically typechecks (LevelAxis includes `"proficiency_bonus"`), but it is awkward — `atLevel` semantics on a proficiency_bonus axis are ambiguous (PB value vs character level that yields that PB). A cleaner option is a dedicated variant:

```typescript
| { readonly kind: "proficiency_bonus" }
```

This is a `surface_widening` (variant of existing surface type) rather than a structural issue, and resolves cleanly once Gap 1 is addressed.

---

## What already fits

Once the structural `species_trait` kind is added, these mechanics encode cleanly with existing surface types:

| Mechanic | Existing shape |
|---|---|
| Bonus Action activation cost | `ClassFeatureActivationCost { kind: "bonus_action" }` |
| Short or Long Rest reset | `RestResetCadence { kind: "short_or_long_rest" }` |
| Dash-as-Bonus-Action | Could approximate as `grant_extra_action` restricted to `["dash"]`, though semantically this is "use a standard action via Bonus Action" not "get an extra action" — may need a surface note |

The Dash-as-Bonus-Action mechanic is the borderline case. `GrantExtraActionEffect` grants an additional action; this feature instead re-routes the Dash standard action through the bonus action slot. This is close enough for taxonomy purposes (the player effectively gets Dash without consuming their action), but a note in `ASSUMPTIONS.md` may be warranted.

---

## Summary of required widenings

| Priority | Kind | Name | Classification |
|---|---|---|---|
| 1 | `new_subgraph` | `SpeciesTraitRecord` + `species_trait` family | `structural_widening` |
| 2 | `new_atom` + `new_variant` | `grant_temporary_hp` | `atom_widening` |
| 3 | `new_variant` | `UseCountCap { kind: "proficiency_bonus" }` | `surface_widening` |
