# Proposal: Widening for Restoring Touch (paladin L14)

**Outcome:** `structural_widening`
**Unit:** `paladin_restoring_touch_l14` — Paladin class feature, acquired at level 14.

---

## Rule text

> When you use Lay On Hands on a creature, you can also remove one or more of the following conditions from the creature: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned. You must expend 5 Hit Points from the healing pool of Lay On Hands for each of these conditions you remove; those points don't also restore Hit Points to the creature.

---

## Why the unit does not fit

### Gap 1 — No `feature_augmentation` family (primary structural gap)

The only `ClassFeatureMechanics` family is `activation`. That family models features with their own activation moment: the paladin decides to activate Action Surge, spends a cost, consumes a use-count resource, and receives an effect.

Restoring Touch does not work that way. It has no independent activation moment. It is an optional rider that fires *within* the Lay On Hands activation. The paladin uses Lay On Hands (spending the normal LoH action/cost); *at that same moment* they may optionally invoke Restoring Touch by drawing HP from the LoH pool. The decision and the resource draw are subordinate to the parent feature's activation.

The surface needs a new family — something like `feature_augmentation` — that specifies:
- Which parent feature triggers it (`augmentsFeature: string` — e.g. `"paladin_lay_on_hands_l1"`)
- The cost structure (variable, drawn from parent's pool)
- The effect (remove conditions)

Without this family, the graph cannot honestly trace the dependency between Restoring Touch and Lay On Hands, and cannot distinguish "costs from parent pool" from "free" or "bonus action."

### Gap 2 — No `cost_from_feature_pool` activation cost variant

The activation cost is: **5 HP from the Lay On Hands healing pool per condition removed**.

This is structurally unlike all existing `ClassFeatureActivationCost` variants:
- `free` — wrong; there is a real HP cost.
- `bonus_action` — wrong; no bonus action is spent.

The cost has two unusual properties:
1. It is drawn from a *different feature's* resource pool (LoH's HP pool, not a separate use-count).
2. It is *variable*: 5 × N HP, where N is the number of conditions removed (player choice at activation time).

A new cost variant is needed, tentatively: `{ kind: "pool_draw"; sourceFeature: string; perUse: number }`.

### Gap 3 — `remove_condition` absent from `ClassFeatureEffect`

The v4 taxonomy includes `remove_condition` in its Effect Atoms inventory (section 9). However, `types.ts` defines:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

`remove_condition` is not a member of this union. A new variant is needed:

```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly conditions: ReadonlyArray<Condition>;
  readonly target: "target_creature";
};
```

### Gap 4 — `Condition` type missing six conditions

The current `Condition` type:

```typescript
export type Condition = "prone";
```

Restoring Touch requires: Blinded, Charmed, Deafened, Frightened, Paralyzed, Stunned.

These are all standard SRD 5.2.1 conditions and will be required by many future units (monk's Stunning Strike, various spells, etc.). The type should be widened now:

```typescript
export type Condition =
  | "blinded"
  | "charmed"
  | "deafened"
  | "frightened"
  | "paralyzed"
  | "prone"
  | "stunned";
```

---

## Summary of required widenings

| # | Kind | Name | Blocks encoding? |
|---|------|------|-----------------|
| 1 | `new_subgraph` | `feature_augmentation` class-feature family | Yes — primary |
| 2 | `new_variant` | `ClassFeatureActivationCost: cost_from_feature_pool` | Yes — cost is unrepresentable |
| 3 | `new_variant` | `ClassFeatureEffect: remove_condition` | Yes — effect is unrepresentable |
| 4 | `new_variant` | `Condition: blinded \| charmed \| deafened \| frightened \| paralyzed \| stunned` | Yes — effect payload unrepresentable |

All four must be resolved together before this unit can be encoded. None is independently sufficient.

---

## Related pressure

`remove_condition` as a class-feature effect is likely to recur (Monk Self-Restoration, Paladin Aura of Purity's spell equivalent, Greater Restoration-like features). The `Condition` widen will definitely recur across dozens of units. The `feature_augmentation` family pattern may recur for other "passive upgrade" features like Cleric Disciple of Life (augments any healing spell cast, not a standalone activation) and Bard Peerless Skill.
