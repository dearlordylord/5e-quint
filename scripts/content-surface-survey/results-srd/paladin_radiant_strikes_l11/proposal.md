# Proposal: Radiant Strikes (Paladin L11)

## Outcome: `structural_widening`

## Why the unit does not fit

Radiant Strikes is a permanent passive on-hit damage rider:

> "When you hit a target with an attack roll using a Melee weapon or an Unarmed Strike, the target takes an extra 1d8 Radiant damage."

There is **no activation**, **no resource pool**, and **no rest reset**. It fires automatically on every qualifying hit for as long as the paladin has the feature.

The current `ClassFeatureMechanics` type has exactly one family:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` inherits `ClassFeatureMechanicsHeader`, which mandates:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

None of these fields apply to Radiant Strikes. Forcing it in by setting `activationCost: { kind: "free" }` and inventing a placeholder `resource`/`resetCadence` would produce a **misleading trace** (use_count and rest_window nodes for a feature that has neither). That is explicitly ruled out by the guardrails.

Additionally, the only `ClassFeatureEffect` variants are `grant_extra_action` and `heal_hp`. Neither represents "deal extra typed damage on every weapon/unarmed hit."

## Proposed widenings

### 1. New `ClassFeatureMechanics` family: `passive_on_hit`

A new family with a minimal, activation-free header:

```typescript
export type ClassFeaturePassiveOnHitMechanics = {
  readonly family: "passive_on_hit";
  readonly trigger: PassiveOnHitTrigger;   // melee_weapon_or_unarmed, etc.
  readonly effect: ClassFeatureOnHitEffect;
};

export type PassiveOnHitTrigger =
  | { readonly kind: "melee_weapon_or_unarmed_strike" }
  | { readonly kind: "any_weapon_attack" };
```

No `activationCost`, `resource`, or `resetCadence` — the feature is permanent and unconditional.

### 2. New `ClassFeatureEffect` variant (or shared type): `damage_on_hit`

`DamageOnHitOperation` already exists in the spell surface. It should be reused or promoted into a shared type. For the class feature side:

```typescript
export type ClassFeatureOnHitEffect = {
  readonly kind: "damage_on_hit";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};
```

## Structural analogue

The mastery `on_hit_trigger` family is the closest existing model. Key differences from Radiant Strikes:

| Dimension | Mastery on_hit_trigger | Radiant Strikes |
|---|---|---|
| Scope | Weapon property | Class feature (always attached to character) |
| Usage limit | Some have `once_per_turn` | None — fires every hit |
| Wielder choice | Some are optional | Not optional — always fires |
| Trigger scope | weapon_hit or weapon_hit_melee_only | melee_weapon_or_unarmed_strike |

The proposed `passive_on_hit` family for class features parallels `on_hit_trigger` for masteries, but without usage limits or wielder optionality.

## Atom-level impact

No new v4 atoms are required. The `damage` effect atom already exists. The `on_hit_window` window atom already exists. The new subgraph would reuse both:

```
class_feature_root
  → passive_on_hit (new procedure/family)
    → on_hit_window (existing)
      → damage: 1d8 radiant (existing)
        → target (existing attachment)
```

This is purely a **surface widening** at the type level and a **subgraph addition** in the graph representation. The v4 atom inventory is sufficient.
