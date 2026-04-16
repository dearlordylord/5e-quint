# Proposal: Evasion (rogue L7) — structural_widening

## Unit

- **Slug:** `rogue_evasion_l7`
- **Kind:** `class_feature`
- **Source:** SRD 5.2.1, Classes/Rogue — Level 7: Evasion

## Why it does not fit

Evasion is a **passive class feature**: it fires automatically whenever the rogue is subjected to a Dexterity saving throw that would deal half damage on a success. It has no activation cost, no use count, and no reset cadence.

The current surface defines:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` structurally requires all three of:
- `activationCost` — free or bonus_action
- `resource: UseCountResource` — a use count cap
- `resetCadence: RestResetCadence`

None of these apply to Evasion. Encoding Evasion as an `activation` feature with `activationCost: free` and a fabricated use count would be a false trace — it would misrepresent a passive always-on feature as an expended activated ability.

Additionally, the effect (negate damage on save success) is not in the closed `ClassFeatureEffect` union, which only contains `grant_extra_action` and `heal_hp`.

## Gap 1 (structural): Missing `passive` family for `ClassFeatureMechanics`

Evasion is representative of an entire class of passive class features that:
- fire automatically when a trigger condition is met
- have no activation cost
- have no use count or reset cadence
- always-on unless gated by a condition (here: Incapacitated)

A new family — `passive` or `triggered_passive` — is needed:

```typescript
// Sketch:
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly trigger: ClassFeaturePassiveTrigger;
  readonly conditionBlock?: ReadonlyArray<Condition>;  // optional gate
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

The trigger grammar would need at minimum one variant:

```typescript
export type ClassFeaturePassiveTrigger = {
  readonly kind: "on_dex_save_half_damage";
  // ... other triggers as pressure cases land
};
```

## Gap 2 (atom): Missing `reduce_damage_taken` in v4 atom inventory

Evasion's core effect on save success is: take **no damage** instead of half. This is mechanically distinct from `grant_resistance` (which halves damage). The effect is specifically:

- On save **success**: take 0× damage (instead of ½×)
- On save **failure**: take ½× damage (unchanged from default)

The v4 taxonomy §12 already records this gap:

> `reduce_damage_taken` distinct from `grant_resistance` — single-group pressure from class-feature reactions

Evasion is exactly that pressure case — specifically the "negate damage on successful DEX save" shape. The proposed atom:

```typescript
export type ReduceDamageTakenEffect = {
  readonly kind: "reduce_damage_taken";
  readonly trigger: "dex_save_success" | ...;
  readonly reduction: "full" | "half";
};
```

Where `full` means take 0× (Evasion) and `half` means the normal resistance result.

## Gap 3 (surface variant, secondary): Condition use-block

The feature text includes: "You can't use this feature if you have the Incapacitated condition."

This is a condition-gating guard on the passive trigger — if the rogue is Incapacitated, Evasion doesn't fire. The current `ClassFeatureActivationMechanics` and any proposed passive family have no field for this. A `conditionBlock` array on the feature or trigger would be needed.

This is a secondary gap — the first two gaps must be resolved before this can be expressed.

## Recommended path forward

1. Add a `passive` family to `ClassFeatureMechanics` with a closed trigger grammar.
2. Promote `reduce_damage_taken` from v4 residue to v4 atom (the taxonomy already anticipated this).
3. Add a `conditionBlock` field to the passive family header (or the trigger variant).

Evasion (monk L7) shares the identical text and would resolve with the same widening. Both should be encoded together once the passive family is added.
