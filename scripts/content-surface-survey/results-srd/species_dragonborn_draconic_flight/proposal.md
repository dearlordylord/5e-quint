# Proposal: Widenings Required for Draconic Flight (Dragonborn)

**Unit:** `species_dragonborn_draconic_flight`
**Outcome:** `structural_widening`

## Why This Unit Cannot Be Encoded Today

### 1. Missing `SpeciesTraitRecord` (structural)

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

There is no `SpeciesTraitRecord`. The v4 taxonomy defines `species_trait_root` as a valid source atom, but the surface type system has no record kind to hold a species trait unit. Any encoding using `ClassFeatureRecord` would require setting `className` to a class name — there is no class association here. This is a lie, not a reasonable approximation.

**Required widening:** A `SpeciesTraitRecord` type (parallel to `ClassFeatureRecord`) and a corresponding `SpeciesTraitMechanics` family. The activation family would be structurally close to `ClassFeatureActivationMechanics` — bonus action cost, use-count resource, rest reset cadence, timed duration — but the effect type must differ (see gap #2).

---

### 2. Missing `modify_speed` / `grant_fly_speed` effect (surface)

The core effect of Draconic Flight is granting a Fly Speed equal to the character's walking Speed for the duration. The v4 taxonomy lists `modify_speed` as an effect atom, but `ClassFeatureEffect` only contains:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

`modify_speed` is not present in any effect union in `types.ts`. A new effect variant is needed to express:

- Movement type: `fly`
- Speed value: derived from (equal to) walking speed — or encoded as a `"match_walk_speed"` constant
- Duration-scoped: the speed exists only while wings are out (lifecycle-attached, not permanent)

This is a `surface_widening` (the atom exists in v4 but no surface type variant uses it).

---

### 3. Missing condition-triggered expiry (surface/atom)

The duration of Draconic Flight has three termination conditions:

1. **10-minute timer** — maps cleanly to `Duration { kind: "timed", value: { unit: "minute", amount: 10 } }` + `persist` → `expire` lifecycle chain.
2. **Voluntary retraction (no action required)** — maps to `dismiss` lifecycle atom (already in v4 taxonomy).
3. **Incapacitated condition forces end** — no existing surface shape. The `Duration` union has no `condition_break` variant, and the `expire` lifecycle atom is time-gated only.

The Incapacitated termination is mechanically significant (it matters in battle whether flight drops on incapacitation). A new `Duration` variant or lifecycle termination shape is needed:

```typescript
// Proposed addition to Duration
| {
    readonly kind: "timed_or_condition";
    readonly value: DurationValue;
    readonly endsOnCondition: Condition;  // "incapacitated"
  }
```

This requires adding `"incapacitated"` to the `Condition` type (currently only `"prone"`) and a new `Duration` variant — making it a `surface_widening` against the existing `Duration` union.

---

## What Already Fits (No Widening Needed)

The following mechanics of Draconic Flight map cleanly to existing surface types:

| Mechanic | Existing type |
|---|---|
| Bonus Action activation | `ClassFeatureActivationCost { kind: "bonus_action" }` |
| 1 use per Long Rest | `UseCountResource { cap: { kind: "fixed", uses: 1 } }` + `RestResetCadence { kind: "long_rest" }` |
| 10-minute timed duration | `Duration { kind: "timed", value: { unit: "minute", amount: 10 } }` |
| Level 5 availability | `acquiredAtLevel: 5` (on a future `SpeciesTraitRecord`) |

---

## Summary of Required Widenings

| # | Kind | Name | Blocking? |
|---|---|---|---|
| 1 | `new_subgraph` | `SpeciesTraitRecord` + `SpeciesTraitMechanics` family | Yes — primary blocker |
| 2 | `new_variant` | `modify_speed` / `grant_fly_speed` in effect union | Yes — no honest effect atom |
| 3 | `new_variant` | condition-triggered expiry in `Duration` | Yes — Incapacitated termination has no representation |
