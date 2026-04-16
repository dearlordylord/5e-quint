# Proposal: Widenings for Superior Inspiration (Bard L18)

**Unit slug:** `bard_superior_inspiration_l18`
**Outcome:** `structural_widening`

## Unit Text

> When you roll Initiative, you regain expended uses of Bardic Inspiration until you have two if you have fewer than that.

## Why It Does Not Fit

### Gap 1 — No passive/auto-triggered class feature family

`ClassFeatureMechanics` in `types.ts` has exactly one family: `"activation"`. The `activation` family models player-initiated use: the player pays an `activationCost` (free | bonus_action), the feature consumes its own `use_count` resource, and an effect fires.

Superior Inspiration does not work this way. It fires **automatically** when the bard rolls Initiative — the bard makes no decision and pays no action cost. The game event (rolling initiative) is the trigger, not the player. This shape does not exist in the current surface.

Needed: a new `ClassFeatureMechanics` family, e.g.:

```typescript
export type ClassFeaturePassiveTriggerMechanics = {
  readonly family: "passive_trigger";
  readonly trigger: ClassFeatureTrigger;   // new type — see below
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureTrigger =
  | { readonly kind: "on_initiative_roll" };
  // widen as more passive-trigger features land
```

The tracer would map `on_initiative_roll` → `initiative_window` (already in v4 window atoms), connecting the root via `opens_window` rather than `consumes`.

### Gap 2 — No "refill resource to floor N" effect

The effect is not `grant_extra_action` or `heal_hp`. It conditionally tops up the bard's Bardic Inspiration use count to a minimum of 2. This is:

- **Conditional**: only fires if current uses < 2
- **Targeting a named external resource**: Bardic Inspiration's `use_count`, not the feature's own pool
- **Floor-valued**: "until you have two" — a minimum guarantee, not a fixed add

No existing `ClassFeatureEffect` variant covers this. Needed:

```typescript
export type RefillResourceToFloorEffect = {
  readonly kind: "refill_resource_to_floor";
  readonly resourceId: string;   // e.g. "bardic_inspiration_uses"
  readonly floor: number;        // 2
};
```

The v4 atom inventory does not have a named atom for this. The closest existing atoms are `use_count` (resource) and `rest_window` (reset cadence), but neither models a conditional in-combat floor guarantee. This would require either:
- A new `refill_resource_to_floor` effect atom, or
- Extending `use_count` with a `minimumFloor` field gated on a window event

## Graph Shape (If Widening Were Applied)

```
class_feature_root (Superior Inspiration, bard L18)
  └─roots─> passive_trigger
              └─opens_window─> initiative_window
                                └─grants─> refill_resource_to_floor
                                            (bardic_inspiration_uses, floor=2)
```

## v4 Atoms Touched

- `initiative_window` — already in v4 §4 (window atoms); no change needed
- `use_count` — already in v4 §7; no change needed
- `refill_resource_to_floor` — **new effect atom** required (not in v4 §9)

## Classification

`structural_widening`: the root cause is a missing mechanics family (`passive_trigger`) for class features that auto-fire on game events rather than on player activation. The missing effect atom is a secondary gap that falls out of the missing family.
