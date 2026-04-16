# Proposal: Tireless (Ranger L10) — Widening Requirements

**Outcome:** `structural_widening`

Tireless is a compound feature with two mechanically independent sub-benefits. Neither sub-benefit can be encoded honestly in the current surface. Below is a gap-by-gap breakdown.

---

## Sub-feature 1: Temporary Hit Points

> *"As a Magic action, you can give yourself a number of Temporary Hit Points equal to 1d8 plus your Wisdom modifier (minimum of 1). You can use this action a number of times equal to your Wisdom modifier (minimum of once), and you regain all expended uses when you finish a Long Rest."*

### Gap 1 — Activation cost: `action` variant missing

`ClassFeatureActivationCost` only allows `{ kind: "free" }` and `{ kind: "bonus_action" }`. The Magic action costs a standard **Action**, which is missing.

**Proposed widening** (`surface_widening`):
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "action" };  // NEW
```

### Gap 2 — Effect: `grant_temp_hp` atom missing from surface and v4 taxonomy

The effect grants **Temporary Hit Points**, which are mechanically distinct from regular HP healing:
- Temp HP form a separate buffer that absorbs damage first
- They don't stack with existing temp HP (you keep the higher)
- They are not subject to the same healing restrictions or bonuses

`ClassFeatureEffect` only allows `GrantExtraActionEffect | HealHpEffect`. Using `HealHpEffect` would be a deliberate misrepresentation. The v4 taxonomy's effect atoms list does not include `grant_temp_hp`.

**Proposed widening** (`atom_widening`):
- Add `grant_temp_hp` to the v4 taxonomy effect atoms
- Add a new surface type `GrantTempHpEffect` to `ClassFeatureEffect`:

```typescript
export type GrantTempHpEffect = {
  readonly kind: "grant_temp_hp";
  readonly amount: DiceAmount;
  readonly target: "self" | "target_creature";
};

export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | GrantTempHpEffect;
```

### Gap 3 — Use count: ability-score-derived cap missing

The use count is **Wisdom modifier (minimum 1)**. `UseCountCap` only supports:
- `{ kind: "fixed"; uses: number }` — a hardcoded integer
- `ThresholdTiers<number>` — a level-threshold schedule

Neither represents a runtime-variable count tied to an ability score. This is a common pattern across multiple class features (e.g., Aura of Protection, Wildshape, Lay On Hands).

**Proposed widening** (`surface_widening`):
```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | ThresholdTiers<number>
  | {                                        // NEW
      readonly kind: "ability_modifier";
      readonly ability: Ability;
      readonly minimum: number;
    };
```

### Gap 4 — DiceExpr flat addend: ability modifier reference missing

The amount is `1d8 + Wis modifier`. `DiceExpr.flat` is `number | undefined` — a static value. The Wisdom modifier is a runtime-derived value, not a constant.

**Proposed widening** (`surface_widening`):
```typescript
export type AbilityModifierRef = {
  readonly kind: "ability_modifier";
  readonly ability: Ability;
  readonly minimum?: number;  // e.g., "minimum of 1" applied after modifier
};

export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number | AbilityModifierRef;  // widened
};
```

---

## Sub-feature 2: Decrease Exhaustion

> *"Whenever you finish a Short Rest, your Exhaustion level, if any, decreases by 1."*

### Gap 5 — Missing class feature family: passive rest trigger

This sub-feature has:
- No activation cost
- No use count / quota consumed
- No reset cadence
- No per-turn or choice-driven window

It fires **automatically** when a Short Rest completes. The current `ClassFeatureMechanics` only has the `activation` family, which models explicitly-triggered class features with activation costs and use counts. There is no `passive_trigger` or `rest_trigger` family.

This is the primary `structural_widening`. A new family is needed:

**Proposed widening** (`structural_widening`):
```typescript
export type ClassFeaturePassiveRestTriggerMechanics = {
  readonly family: "passive_rest_trigger";
  readonly on: RestKind;       // "short" | "long"
  readonly effect: ClassFeaturePassiveTriggerEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveRestTriggerMechanics;  // NEW
```

### Gap 6 — Exhaustion level decrement: missing effect shape

"Decreases Exhaustion level by 1" is a graded reduction, not the same as `remove_condition` (which clears it entirely). Exhaustion is also not in the current `Condition` type (`"prone"` only).

**Proposed widening** (`atom_widening` or `surface_widening` depending on how v4 is extended):
```typescript
export type ReduceExhaustionEffect = {
  readonly kind: "reduce_exhaustion";
  readonly levels: number;   // typically 1
};
```

The v4 taxonomy's `remove_condition` atom would need either a typed extension with a `levels` parameter, or a new `reduce_exhaustion` atom. Given that exhaustion is a graded condition (SRD levels 1–6), a separate atom better reflects the semantic.

---

## Summary Table

| Gap | Classification | Location |
|-----|---------------|---------|
| Missing `action` activation cost variant | `surface_widening` | `ClassFeatureActivationCost` |
| Missing `grant_temp_hp` effect + v4 atom | `atom_widening` | `ClassFeatureEffect`, v4 taxonomy |
| Missing ability-modifier use count cap | `surface_widening` | `UseCountCap` |
| Missing ability-modifier flat addend in DiceExpr | `surface_widening` | `DiceExpr` |
| Missing `passive_rest_trigger` family | **`structural_widening`** | `ClassFeatureMechanics` |
| Missing exhaustion level decrement effect | `atom_widening` | v4 taxonomy, new effect type |

The overall outcome is `structural_widening` because Decrease Exhaustion has no fitting mechanics family. Even if that part were deferred, the Temporary HP part would still require `atom_widening` for `grant_temp_hp`.
