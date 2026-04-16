# Proposal: Surface Widenings for Dark One's Own Luck (warlock L6)

**Outcome:** `surface_widening`  
**Unit slug:** `warlock_dark_ones_own_luck_l6`

## Source Text

> When you make an ability check or a saving throw, you can use this feature to add 1d10 to your roll. You can do so after seeing the roll but before any of the roll's effects occur.
>
> You can use this feature a number of times equal to your Charisma modifier (minimum of once), but you can use it no more than once per roll. You regain all expended uses when you finish a Long Rest.

## Why It Doesn't Fit

The unit is structurally a `class_feature` with `family: "activation"` — that part fits. The resource/reset shape (`use_count` + `long_rest`) also fits. Four variants of existing surface types are missing.

---

## Proposed Widenings

### 1. `RollKind: "ability_check"` (new variant)

**Current:** `RollKind = "attack_roll" | "saving_throw"`

**Gap:** The feature applies to ability checks in addition to saving throws. Without `"ability_check"` in `RollKind`, a `modify_roll_numeric` effect cannot correctly express the scope of this feature.

**Proposed addition:**
```typescript
export type RollKind = "attack_roll" | "saving_throw" | "ability_check";
```

**Evidence:** "When you make an **ability check** or a saving throw..."

---

### 2. `ClassFeatureEffect: modify_roll_numeric` (new variant)

**Current:** `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`

**Gap:** Adding a fixed die amount to a roll is a `modify_roll_numeric` effect. This concept exists in spell surface (`RollModifierOperation` inside `OngoingOperation`) but is not available to class features. The shapes are compatible — the spell version uses `DiceDelta` (sign + dice + dieSize); the class feature version would need a `DiceAmount` (fixed 1d10 here).

**Proposed addition:**
```typescript
export type ModifyRollEffect = {
  readonly kind: "modify_roll_numeric";
  readonly on: ReadonlyArray<RollKind>;
  readonly amount: DiceAmount;
};

export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | ModifyRollEffect;
```

**Evidence:** "you can use this feature to add 1d10 to your roll"

**Note:** The v4 atom `modify_roll_numeric` already exists; the gap is purely in the surface type, not the atom vocabulary.

---

### 3. `UseCountCap: ability_modifier_derived` (new variant)

**Current:** `UseCountCap = { kind: "fixed"; uses: number } | ThresholdTiers<number>`

**Gap:** The use count equals the character's Charisma modifier (with a floor of 1). This is an ability-score-derived value that fluctuates as the stat changes — it is not a compile-time constant (`fixed`) and not a class-level tier table (`ThresholdTiers`). Several class features across SRD 5.2.1 use this pattern (e.g., Bardic Inspiration uses similar Charisma-mod scaling for Font of Inspiration).

**Proposed addition:**
```typescript
export type AbilityModifierDerivedCap = {
  readonly kind: "ability_modifier_derived";
  readonly ability: Ability;
  readonly minimum: number;
};

export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | AbilityModifierDerivedCap;
```

**Evidence:** "You can use this feature a number of times equal to your **Charisma modifier** (minimum of once)"

---

### 4. `ClassFeatureActivationCost: triggered_on_roll` (new variant)

**Current:** `ClassFeatureActivationCost = { kind: "free" } | { kind: "bonus_action" }`

**Gap:** This feature's activation is reactive and time-constrained — it fires after a specific roll event (ability check or saving throw is made), fires *after* the roll result is known, and must resolve before the roll's effects. This is not a "free action on the character's turn" (`free`) and consumes no action economy resource, but it also has specific trigger-timing constraints that `free` cannot express.

The closest analogue in the existing surface is `CastingTime = { kind: "reaction"; trigger: ReactionTrigger }` for spells. A parallel construct is needed for class features, probably a trigger variant on `ClassFeatureActivationCost` or a new optional `trigger` field on `ClassFeatureActivationMechanics`.

**Proposed addition (variant A — new cost kind):**
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | {
      readonly kind: "triggered";
      readonly on: ReadonlyArray<RollKind>;
      readonly timing: "after_roll_before_effects";
    };
```

**Evidence:** "When you make an ability check or a saving throw, you can use this feature to add 1d10 to your roll. You can do so **after seeing the roll but before any of the roll's effects occur**."

---

## Minor Gap: Once-Per-Roll Usage Limit

The feature also has a "no more than once per roll" constraint:
> "you can use it no more than once per roll"

This is analogous to `MasteryUsageLimit = { kind: "once_per_turn" }` but at roll granularity rather than turn granularity. A new variant `{ kind: "once_per_roll" }` would cover this. This is a secondary surface widening that would accompany the main feature encoding once the above gaps are filled.

---

## Tracer Atom Projection (if encoded)

If the surface is widened and this unit is encoded, the expected tracer atoms would be:

| Atom | Category |
|---|---|
| `class_feature_root` | source |
| `activate` | procedure |
| `use_count` | resource |
| `modify_roll_numeric` | effect |
| `rest_window` | window |

Expected relations: `roots`, `consumes`, `grants`, `persists_until`

No new v4 atoms are required — all five atoms above already exist in the taxonomy. The gaps are exclusively in the authored surface types.
