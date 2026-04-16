# Cutting Words (bard L3) — Widening Proposal

**Outcome:** `structural_widening`

## Unit

> When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll, reducing the damage or potentially turning the success into a failure.

## Why it does not fit

### 1. No `triggered_reaction` family for `ClassFeatureMechanics` (primary blocker)

`ClassFeatureMechanics` has exactly one family: `activation`. The `activation` family models a feature the player proactively uses on their turn. Cutting Words is fundamentally different: it waits passively and fires reactively when an external event occurs (a creature within range making a specific roll type).

The spell surface has `TriggeredReactionMechanics` for exactly this pattern (Shield, Counterspell, Silvery Barbs). No equivalent family exists for class features. The Prepare/Prompt/Commit subgraph (Subgraph A from the taxonomy) is the right shape, but it is only reachable through spell mechanics today.

A new `ClassFeatureMechanics` family — tentatively `triggered_reaction` — is required.

### 2. Missing `reaction` in `ClassFeatureActivationCost`

`ClassFeatureActivationCost` is `{ kind: "free" } | { kind: "bonus_action" }`. Cutting Words costs the character's Reaction. A `{ kind: "reaction" }` variant is needed.

### 3. Missing `modify_roll_numeric` in `ClassFeatureEffect`

The effect is: roll the Bardic Inspiration die and subtract that value from the triggering creature's roll. This maps to the v4 atom `modify_roll_numeric`, but `ClassFeatureEffect` only covers `grant_extra_action` and `heal_hp`.

The negative-delta / enemy-target application is also new: existing `modify_roll_numeric` uses (Bless) add to allied rolls. Here the sign is negative and the target is the enemy.

### 4. Missing `damage_roll` and `ability_check` in `RollKind`

`RollKind = "attack_roll" | "saving_throw"`. The trigger for Cutting Words can fire on:

- damage rolls (not in `RollKind`)
- ability checks (not in `RollKind`)
- attack rolls (present)

Both `"damage_roll"` and `"ability_check"` need to be added to `RollKind` to express the trigger grammar.

### 5. Cross-feature resource consumption

Cutting Words does not have its own use pool. It consumes one use of Bardic Inspiration — a resource owned by a sibling feature (`bard_bardic_inspiration_l1`). The current class feature model assigns each feature an independent `use_count` with its own cap and reset cadence. There is no way to express "consume from feature X's pool."

This requires a new concept: a cross-feature resource reference, allowing one feature to declare that it draws from a named sibling's `use_count`.

## What would fit once the widening lands

If a `triggered_reaction` family for `ClassFeatureMechanics` is added, the encoding shape would be:

```
triggered_reaction:
  trigger:
    rollKinds: [damage_roll, attack_roll, ability_check]
    targetConstraint: visible_within_60ft
  activationCost: reaction
  resource:
    kind: cross_feature_ref
    featureId: bard_bardic_inspiration_l1
    uses: 1
  effect:
    kind: modify_roll_numeric
    delta:
      kind: threshold_tiers    # d6→d8→d10→d12 by bard level
      axis: class
      base: { dice: 1, dieSize: 6 }
      tiers: [
        { atLevel: 5, override: { dieSize: 8 } },
        { atLevel: 10, override: { dieSize: 10 } },
        { atLevel: 15, override: { dieSize: 12 } }
      ]
    sign: "-"
    on: [damage_roll, attack_roll, ability_check]
    target: triggering_creature
```

The Bardic Inspiration die scaling uses the existing v4 `scale_die_size` atom. All other atoms (`reaction_window`, `modify_roll_numeric`, `use_count`) already exist in v4.

## Summary of required widenings

| Kind | Name | Layer |
|------|------|-------|
| `new_subgraph` | `triggered_reaction` family for `ClassFeatureMechanics` | structural |
| `new_variant` | `reaction` in `ClassFeatureActivationCost` | surface |
| `new_variant` | `modify_roll_numeric` in `ClassFeatureEffect` | surface |
| `new_variant` | `damage_roll`, `ability_check` in `RollKind` | surface |
| `new_concept` | Cross-feature resource reference | structural |
