# Proposal: Sorcerous Restoration (Sorcerer L5)

## Outcome: `surface_widening`

The `class_feature` kind and `activation` family are directionally correct. All three gaps are missing variants of existing surface types — no new top-level family or v4 atom is required.

---

## Gap 1 (Primary Blocker): Missing `restore_class_resource` effect variant

**Rule text:** "you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down)"

`ClassFeatureEffect` currently contains:
- `GrantExtraActionEffect` — grants an extra action
- `HealHpEffect` — restores hit points

Neither can represent restoring a class-specific resource pool. Sorcery Points are not HP. Encoding this as `HealHpEffect` would produce a false trace.

**Proposed widening:**

```typescript
export type RestoreClassResourceEffect = {
  readonly kind: "restore_class_resource";
  readonly resourceId: "sorcery_points"; // extensible to other class currencies
  readonly maxAmount: ClassLevelScaledAmount; // see Gap 2
  readonly target: "self";
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | RestoreClassResourceEffect;  // NEW
```

---

## Gap 2 (Secondary): `floor(classLevel / 2)` amount not representable

**Rule text:** "no more than a number equal to half your Sorcerer level (round down)"

At sorcerer level N, the recovery cap is `⌊N/2⌋`. This grows by 1 every 2 levels:

| Level | Cap |
|-------|-----|
| 5     | 2   |
| 6     | 3   |
| 7     | 3   |
| 8     | 4   |
| ...   | ... |

`DiceAmount` is built around `NdM+flat` expressions. `linear_per_level` only supports integer per-level deltas — it cannot express a 0.5-per-level (half-level floor) progression.

**Proposed widening:**

A new amount variant for integer amounts scaled by a class-level expression:

```typescript
export type ClassLevelFloorHalfAmount = {
  readonly kind: "half_class_level_floor";
  readonly axis: "class";
};
```

Or more generally, a `scale_by_formula` kind that accepts a closed set of formulae (`half_floor`, `pb`, etc.). The narrower option is preferred per the project's no-speculative-abstraction rule.

---

## Gap 3 (Minor): Activation trigger

**Rule text:** "When you finish a Short Rest, you can regain..."

The feature fires at Short Rest completion. `ClassFeatureActivationCost` only provides `free` and `bonus_action`. Neither captures "when you finish a Short Rest."

Using `free` is the least-dishonest option (no explicit action resource spent), but it misrepresents the trigger window — activation is gated to Short Rest completion, not freely available on the player's turn.

**Proposed widening:**

```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "short_rest_trigger" };  // NEW — fires at rest completion
```

This gap is minor: the `free` cost is honest about the resource side (no action, bonus action, or reaction consumed). The `short_rest_trigger` variant improves precision but is not strictly required to avoid a false trace — the tracer does not currently emit an atom that would be wrong with `free`.

---

## Affected Types

| Type | Change |
|------|--------|
| `ClassFeatureEffect` | Add `RestoreClassResourceEffect` variant |
| `DiceAmount` (or a new sibling type) | Add `half_class_level_floor` variant |
| `ClassFeatureActivationCost` | Add `short_rest_trigger` variant (minor) |

No changes to v4 atom inventory, procedure atoms, or top-level `UnitRecord` kinds are required.
