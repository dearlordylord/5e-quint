# Proposal: Weapon Mastery (fighter L1) — structural_widening

## Unit

- **Slug**: `fighter_weapon_mastery_l1`
- **Kind**: `class_feature`
- **Source**: SRD 5.2.1 — Classes/Fighter#Level 1: Weapon Mastery

## Why it doesn't fit

The only existing `ClassFeatureMechanics` family is `activation`, whose header mandates:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;   // MANDATORY — no use count exists here
  readonly resetCadence: RestResetCadence; // MANDATORY — no resource to reset
};
```

Weapon Mastery is **always-on**: there is no activation moment, no charges, and nothing to reset. Encoding it as `activation` with a fabricated `use_count` would produce a false trace — the atom graph would show a quota/resource lifecycle that has no SRD basis.

Additionally, `ClassFeatureEffect` offers only `GrantExtraActionEffect | HealHpEffect`. The actual effect — "can use mastery properties of N chosen weapon types" — is absent. The v4 atom `grant_proficiency` is the closest taxonomy entry, but it is not in the `ClassFeatureEffect` union and lacks the parameters to carry weapon-category filtering or a scalable weapon-type count.

## Required widenings

### 1. New `ClassFeatureMechanics` family: `passive_grant`

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family has no header (no activationCost, no resource, no resetCadence). It models features that are continuously active from the moment they are acquired.

### 2. New `ClassFeatureEffect` variant: `GrantMasteryAccessEffect`

```typescript
export type GrantMasteryAccessEffect = {
  readonly kind: "grant_mastery_access";
  readonly weaponCategory: "simple_or_martial" | "simple" | "martial";
  readonly count: ThresholdTiers<number>;  // L1: 3, higher levels: more
  readonly reconfiguration?: LongRestReconfiguration;
};
```

The `count` field uses the existing `ThresholdTiers<number>` with `axis: "class"`, which already exists in the surface type. Only the wrapper and kind are new.

This maps to the v4 atom `grant_proficiency` with mastery-access parameterization.

### 3. New surface shape: `LongRestReconfiguration`

```typescript
export type LongRestReconfiguration = {
  readonly kind: "long_rest_swap_one";
};
```

The fighter may swap one weapon-type selection after each Long Rest. This is a periodic reconfiguration of a selection set — not a resource refill. No existing `RestResetCadence` variant captures it.

## v4 atom mapping

| Surface concept | v4 atom |
|---|---|
| Mastery access grant | `grant_proficiency` (closest; or a new `grant_mastery_access` atom if mastery-specific semantics are needed) |
| Level-scaled count | `scale_numeric_bonus` (axis=class, threshold_tiers) |
| Long-rest swap | `rest_window` (short label only; full reconfiguration semantics are out of v4 scope) |

## Scope note

The `ThresholdTiers<number>` machinery for the count scaling already exists in the surface type. Only the family wrapper, the effect variant, and the reconfiguration shape are missing. The widening is contained to `ClassFeatureMechanics` and `ClassFeatureEffect` — no new top-level `UnitRecord` kind is needed.
