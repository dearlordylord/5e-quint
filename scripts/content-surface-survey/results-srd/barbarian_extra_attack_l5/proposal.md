# Proposal: Surface widening for Extra Attack (barbarian L5)

## Outcome

`structural_widening` — no honest payload family exists for this unit.

## Unit

- **Slug:** `barbarian_extra_attack_l5`
- **Kind:** `class_feature` / `barbarian` / acquired at level 5
- **Source text:** "You can attack twice instead of once whenever you take the Attack action on your turn."

## Why it does not fit

### 1. No passive family for ClassFeatureMechanics

The surface defines only one class-feature mechanics family:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};

type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
```

Extra Attack is a **permanent, always-on rule change**:
- It has no activation cost — it fires automatically on every Attack action.
- It has no use count — it does not deplete or track charges.
- It has no reset cadence — it never needs to refresh because it never expires.

There is no honest way to fill `resource` and `resetCadence`. Inventing values (e.g., `use_count` with `cap: { kind: "fixed", uses: 999 }`) would produce a false trace implying a consumable pool that does not exist.

### 2. `grant_extra_action` is the wrong effect

The existing `ClassFeatureEffect` union offers `grant_extra_action` and `heal_hp`. Neither fits:

- **`grant_extra_action`** (used by Action Surge): grants an additional **Action** in the action-economy sense — the creature gets to take a second Action on its turn. Extra Attack does **not** do this. The creature still takes one Attack action; within that action it makes two attacks.
- The difference is mechanical, not cosmetic: Action Surge and Extra Attack stack (a fighter 5 using Action Surge makes 2+2=4 attacks), proving they modify different things.

The v4 taxonomy names this distinction explicitly:

> `scale_attack_count` — **new**. The number of attacks per Attack action grows with level. Example: Extra Attack (2→4), Fighter's Two Extra Attacks / Three Extra Attacks.

### 3. `scale_attack_count` has no surface representation for class features

`scale_attack_count` exists in the v4 atom inventory but has no corresponding variant in `ClassFeatureEffect`. Even if the passive family were added, there is currently nowhere in the effect union to place this atom.

## Proposed widenings

### Widening A — New family: `passive_modifier`

Add a second `ClassFeatureMechanics` family for always-on rule changes that carry no resource or reset:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive_modifier";
  readonly effect: ClassFeaturePassiveEffect;
};
```

This family would cover Extra Attack, Unarmored Defense (barbarian, monk), and other features that are simply "always true" rules about the creature's capabilities.

### Widening B — New ClassFeatureEffect variant: `scale_attack_count`

Add a surface effect type that maps to the v4 `scale_attack_count` atom:

```typescript
export type ScaleAttackCountEffect = {
  readonly kind: "scale_attack_count";
  readonly attacksPerAttackAction: number;  // 2 at barbarian L5
};
```

The `attacksPerAttackAction` field carries the static count at this level. Future widening for tiered scaling (fighter 11: 3 attacks, fighter 20: 4 attacks) would extend this to a `DiceAmount`-style union with `threshold_tiers`.

## Affected units

This widening is shared by every class that grants Extra Attack at level 5:
- `barbarian_extra_attack_l5`
- `fighter_extra_attack_l5`
- `paladin_extra_attack_l5`
- `ranger_extra_attack_l5`
- `monk_extra_attack_l5`

And by the fighter's higher-tier upgrades:
- `fighter_two_extra_attacks_l11` (3 attacks)
- `fighter_three_extra_attacks_l20` (4 attacks)

A single widening resolves the entire Extra Attack family.

## Classification

- **Structural widening** (dominant): no honest `ClassFeatureMechanics` family exists for passive always-on modifiers.
- **Surface widening** (co-required): `scale_attack_count` needs a `ClassFeatureEffect` variant even once the passive family is added.

Both are required; neither substitutes for the other.
