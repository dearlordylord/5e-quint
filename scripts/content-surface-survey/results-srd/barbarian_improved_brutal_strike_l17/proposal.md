# Proposal: Improved Brutal Strike (Barbarian L17)

**Outcome:** `atom_widening`

## Feature text

> The extra damage of your Brutal Strike increases to 2d10. In addition, you can use two different Brutal Strike effects whenever you use your Brutal Strike feature.

## Why this does not fit the current surface

The feature consists of two distinct clauses, both of which are **cross-feature upgrades** that modify the mechanics of the sibling Brutal Strike (L9) unit rather than granting standalone effects.

### Clause 1 — Damage upgrade ("increases to 2d10")

The extra damage of Brutal Strike is being **replaced** (set to 2d10), not supplemented additively.

The closest existing atom is `modify_damage_numeric`:

```typescript
| {
    readonly kind: "modify_damage_numeric";
    readonly delta: DiceDelta;
    readonly weaponFilter?: WeaponFilter;
  }
```

This atom is **additive**: it adds a fixed delta on top of existing damage rolls. It cannot express "replace the dice in the extra-damage component of a named feature." Using it would encode "+2d10 on all weapon damage rolls" — both semantically wrong (general instead of Brutal Strike-scoped) and numerically wrong (stacks on top rather than replacing the prior value).

No atom in the surface expresses "set the extra damage of feature X to Y dice." A new atom concept is needed.

### Clause 2 — Two effects ("use two different Brutal Strike effects")

The Brutal Strike feature permits the barbarian to select one on-hit rider effect per use. The L17 improvement increases that count to two.

No atom in the surface models **a count modifier on the rider-selection choices of a named sibling feature**. The candidate atoms all fail:

| Atom | Why it fails |
|---|---|
| `grant_extra_action` | Grants an additional action in the action-economy sense; Brutal Strike effects are on-hit riders, not actions |
| `scale_attack_count` | Increases weapon attacks per Attack action; not related |
| `modify_roll_numeric` | Additive bonus to d20 rolls; not related |
| Any `EffectAtom` | None expresses "when you use feature X, you may select N options instead of 1" |

This is a meta-count upgrade to another feature's activation options — a concept not present anywhere in the v4 atom vocabulary or the current TS surface types.

## Proposed widenings

### 1. `upgrade_feature_damage` (new atom or new variant)

A mechanism to express that a named feature's extra-damage dice are replaced by a specific die expression for the owning creature. This is distinct from general additive damage bonuses.

Possible shape sketch (for discussion; not a final proposal):

```typescript
| {
    readonly kind: "upgrade_feature_damage";
    readonly featureId: string;        // e.g. "barbarian_brutal_strike"
    readonly newAmount: DiceAmount;    // e.g. fixed 2d10
  }
```

**Evidence:** "The extra damage of your Brutal Strike increases to 2d10."

### 2. `extend_feature_rider_count` (new atom)

A mechanism to increase the number of on-hit rider options a creature may select from a named feature in a single use.

Possible shape sketch (for discussion; not a final proposal):

```typescript
| {
    readonly kind: "extend_feature_rider_count";
    readonly featureId: string;    // e.g. "barbarian_brutal_strike"
    readonly additionalCount: number;  // 1 → allows 2 total
  }
```

**Evidence:** "you can use two different Brutal Strike effects whenever you use your Brutal Strike feature."

## Surface family fit

The `passive` family is syntactically available for a barbarian class feature. The problem is not the family — it's that no honest `EffectAtom` can carry either clause. A `passive` unit with the above atoms would be clean once those atoms are widened into the surface.

## No authored content

No `barbarian_improved_brutal_strike_l17.dhall` or corresponding `.json` is produced. Forcing either clause into an existing atom would yield a dishonest trace.
