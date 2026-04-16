# Proposal: warlock_fiendish_resilience_l10

## Outcome: `structural_widening`

Fiendish Resilience cannot be encoded honestly with the current surface.

---

## Unit

> **Level 10: Fiendish Resilience**
>
> Choose one damage type, other than Force, whenever you finish a Short or Long Rest.
> You have Resistance to that damage type until you choose a different one with this feature.

---

## Gap 1 — Structural: no family for rest-configured passives

### What the unit is

Fiendish Resilience is a **persistent passive** with a **rest-time reconfiguration**:

- No activation cost during play (no action, no bonus action, no reaction).
- No limited uses; the resistance is always in effect (once acquired at character level 10).
- The only "action" is a choice made at the end of each Short or Long Rest — which damage type to protect against.
- The resistance persists until the next rest-time choice replaces it.

### What the surface offers

`ClassFeatureMechanics` is a single-member union:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` mandates:

| Field | Required shape | Fiendish Resilience |
|---|---|---|
| `activationCost` | `free` \| `bonus_action` | Neither — not a turn-action |
| `resource` | `UseCountResource` (use_count + cap) | No uses consumed |
| `resetCadence` | rest-based | N/A — not a use-count pool |
| `effect` | `GrantExtraActionEffect` \| `HealHpEffect` | Neither |

None of the four required fields map honestly.

### Proposed widening

A new `ClassFeatureMechanics` family is needed. Suggested shape (not prescriptive):

```typescript
export type ClassFeatureRestConfiguredPassiveMechanics = {
  readonly family: "rest_configured_passive";
  // Which rest events allow reconfiguration.
  readonly configuredOn: RestKind[];   // ["short", "long"] here
  // The effect that is persistently active using the chosen parameter.
  readonly effect: PersistentPassiveEffect;
};
```

Where `PersistentPassiveEffect` would include at minimum a `grant_resistance` variant with a `damageType` field that can be "chosen at rest time" (a `rest_choice` marker rather than a fixed value).

This family also covers analogous features in other classes (e.g. Elemental Affinity elemental damage type selection), so the pressure is not unique to this unit.

---

## Gap 2 — Surface: `ClassFeatureEffect` missing `grant_resistance`

Even if a `rest_configured_passive` family were added, the current `ClassFeatureEffect` union has no entry for granting resistance:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

The v4 atom `grant_resistance` exists in the taxonomy but has no corresponding authored-surface representation for class features. A new variant is required:

```typescript
export type GrantResistanceEffect = {
  readonly kind: "grant_resistance";
  readonly damageType: DamageType | { readonly kind: "chosen_at_rest"; readonly exclude?: DamageType[] };
};
```

The `exclude` field captures the SRD constraint "other than Force" at authoring time.

---

## Summary

| Gap | Classification | Blocker |
|---|---|---|
| No rest-configured-passive family | `structural_widening` | Primary |
| No `grant_resistance` in `ClassFeatureEffect` | `surface_widening` | Secondary |

Both gaps must be resolved together. The structural gap is the primary blocker — adding only `grant_resistance` to `ClassFeatureEffect` would still leave no valid family to house the feature.
