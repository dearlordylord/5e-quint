# Proposal: Survivor (fighter L18) — Widenings Required

## Outcome: `structural_widening`

Survivor cannot be honestly encoded in any existing `ClassFeatureMechanics` family. No `.dhall` or `.json` was authored.

---

## Unit Summary

**Defy Death** — Always-on passive:
- Advantage on Death Saving Throws.
- Rolls of 18–20 on a Death Saving Throw are treated as a 20.

**Heroic Rally** — Automatic turn-start trigger:
- At the start of each of the fighter's turns, if they are Bloodied (≤ half max HP) and have at least 1 HP, they regain HP = 5 + CON modifier.

---

## Why the Unit Does Not Fit

### 1. Structural: No passive/automatic class feature family

`ClassFeatureMechanics` has exactly one family: `activation`. Its required header is:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost; // "free" | "bonus_action"
  readonly resource: UseCountResource;                 // requires a use count
  readonly resetCadence: RestResetCadence;
};
```

Neither Defy Death nor Heroic Rally has an activation cost, a use count, or a rest reset:

- **Defy Death** is always-on — it requires no action and has no limit.
- **Heroic Rally** fires automatically at the start of each turn (a `turn_start_window` event), conditioned on HP state. It consumes no resource.

Encoding either as `activation { activationCost: free, resource: { cap: { kind: "fixed", uses: ∞ } } }` would be actively false — those fields don't correspond to any rule text.

**Proposed fix:** Add a `passive` (or `turn_start_trigger`) family to `ClassFeatureMechanics`:

```typescript
// Sketch only — surface team to finalize shape
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effects: ReadonlyArray<PassiveEffect>;
};

export type ClassFeatureTurnStartMechanics = {
  readonly family: "turn_start_trigger";
  readonly condition?: TriggerCondition;   // e.g., Bloodied + HP > 0
  readonly effect: ClassFeatureEffect;
};
```

---

### 2. Surface: `DiceAmount` cannot express `5 + ability modifier`

Heroic Rally heals "5 plus your Constitution modifier." `DiceAmount` only carries:
- `{kind: "fixed", expr: DiceExpr}` — static dice + flat integer
- `{kind: "threshold_tiers", ...}` — tiered static values
- `{kind: "linear_per_level", ...}` — linear per-level scaling of static values

None can hold a dynamic ability modifier term. This is a second independent source of ability-modifier-as-addend pressure (Second Wind already has a flat + class-level scaling but still uses `DiceExpr` with a static flat; Heroic Rally's CON modifier is per-character-runtime, not per-level-lookup).

**Proposed variant:**
```typescript
export type DiceAmount =
  | ...existing variants...
  | {
      readonly kind: "flat_plus_ability_mod";
      readonly flat: number;
      readonly ability: Ability;
    };
```

---

### 3. Surface: `RollKind` needs `"death_saving_throw"`

Defy Death grants Advantage on **Death Saving Throws** specifically. Current `RollKind`:
```typescript
export type RollKind = "attack_roll" | "saving_throw";
```

Death saving throws are mechanically distinct from ordinary saving throws:
- No ability modifier added.
- Automatic failure on a 1 (counts as two failures).
- Automatic stabilization on a 20.
- Three successes = stabilized; three failures = dead.
- The 18–20 threshold extension only makes sense in this specific context.

Conflating death saves with ordinary saves (`"saving_throw"`) would lose the specificity.

**Proposed addition:** `"death_saving_throw"` to `RollKind`.

---

### 4. Surface: Conditional trigger predicate (Bloodied + HP > 0)

Heroic Rally fires only "if you are Bloodied and have at least 1 Hit Point." No current surface type expresses a conditional predicate gating an automatic effect. The Bloodied condition (HP ≤ half max HP) is a specific runtime HP state — it is not a standard `Condition` in the existing closed enum.

**Proposed addition:** A `TriggerCondition` type (or inline predicate grammar) for gating automatic effects:
```typescript
// Sketch only
export type TriggerCondition =
  | { readonly kind: "is_bloodied" }
  | { readonly kind: "hp_at_least"; readonly amount: number }
  | { readonly kind: "all_of"; readonly conditions: ReadonlyArray<TriggerCondition> };
```

---

### 5. Atom: `modify_roll_threshold` (18–20 → 20 on death saves)

"When you roll 18–20 on a Death Saving Throw, you gain the benefit of rolling a 20 on it."

This widens the automatic-success threshold from {20} to {18, 19, 20}. v4 has no atom for this. The closest candidates:

- `modify_roll_advantage` — changes the roll process (roll twice), not the success threshold.
- `modify_roll_reroll` — changes what happens to individual die values, not what constitutes success.
- `crit_window` — mentioned in v4 §12 as deferred single-feat pressure; distinct from death-save threshold.

This is a distinct mechanic: the engine must treat rolls ≥ N (for some configured N < 20) as the maximum-success outcome for a specific roll type.

**Proposed atom:** `modify_roll_threshold` (or `expand_success_range`), parameterized by roll kind and the lower bound of the extended range.

---

## Pressure Summary

| Gap | Classification | Severity |
|---|---|---|
| No passive/auto class feature family | `structural_widening` | Blocks encoding entirely |
| `DiceAmount` lacks ability-mod variant | `surface_widening` | Blocks Heroic Rally amount |
| `RollKind` lacks `death_saving_throw` | `surface_widening` | Blocks Defy Death specificity |
| No conditional trigger predicate | `surface_widening` | Blocks Heroic Rally condition |
| No threshold-extension atom | `atom_widening` | Blocks Defy Death 18–20 clause |

All five gaps must be resolved before Survivor can be honestly encoded.
