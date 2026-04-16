# Proposal: Surface Widening for Lay On Hands (paladin L1)

## Unit

- Slug: `paladin_lay_on_hands_l1`
- Kind: `class_feature` / family: `activation`
- Provenance: `srd-5.2.1`, section `Classes/Paladin#Level 1: Lay On Hands`

## Why encoding was blocked

The `activation` family is the correct family for this feature. The blocking gaps are all within existing surface types — no new v4 atom or new family is required.

---

## Gap 1: Resource type cannot represent a numeric HP pool

**Current shape:**
```typescript
export type UseCountResource = {
  readonly kind: "use_count";
  readonly cap: UseCountCap;  // fixed uses | tiered uses
};
```

**What Lay On Hands needs:**  
A numeric pool with a level-scaled integer capacity, spent in variable amounts (not discrete uses). Each activation draws an arbitrary player-chosen number of HP, bounded by remaining pool.

```
pool = 5 × paladin level    (scales linearly with class level)
reset: long_rest
spend: player-chosen integer ∈ [1, remaining]
```

**Proposed new variant:**
```typescript
export type HpPoolResource = {
  readonly kind: "hp_pool";
  readonly cap: LinearPerLevel<number>;  // 5 × class level = LinearPerLevel { axis: "class", base: 5, perLevel: 5, startingAtLevel: 1 }
};
```

Or more generally, a `numeric_pool` resource that accepts any `DiceAmount`-like integer quantity as cap.

**SRD evidence:**  
> "you can restore a total number of Hit Points equal to five times your Paladin level"

---

## Gap 2: HealHpEffect amount cannot express "variable up to pool remainder"

**Current shape:**
```typescript
export type HealHpEffect = {
  readonly kind: "heal_hp";
  readonly amount: DiceAmount;  // fixed | threshold_tiers | linear_per_level — all dice-based
  readonly target: "self" | "target_creature";
};
```

`DiceAmount` exclusively models dice roll expressions (`NdM + flat`). The Lay On Hands heal is a direct integer HP transfer in a player-chosen amount, not a dice roll. No existing `DiceAmount` variant can represent "any amount up to N remaining."

**Proposed new `DiceAmount` variant (or separate `HealAmount` type):**
```typescript
| { readonly kind: "pool_bounded"; readonly poolResource: string }
// or more generally:
| { readonly kind: "variable"; readonly max: "pool_remainder" }
```

**SRD evidence:**  
> "restore a number of Hit Points to that creature, up to the maximum amount remaining in the pool"

---

## Gap 3: remove_condition not in ClassFeatureEffect

**Current union:**
```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

`remove_condition` is a v4 atom (TAXONOMY §9 Effect Atoms) but is not exposed as a `ClassFeatureEffect` variant.

Lay On Hands uses it: expend 5 HP from the pool to remove the Poisoned condition (no HP restored).

**Proposed addition:**
```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly condition: Condition;  // "poisoned" — Condition type needs "poisoned" added
};

export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | RemoveConditionEffect;
```

Note: `Condition` currently only has `"prone"` (for Topple mastery). It needs `"poisoned"` added.

**SRD evidence:**  
> "expend 5 Hit Points from the pool of healing power to remove the Poisoned condition from the creature"

---

## Gap 4: Single `effect` field cannot express two divergent activation paths

**Current shape:**
```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // single effect only
};
```

Lay On Hands has two distinct activation modes from the same resource:
- **Mode A**: Spend N HP → heal N HP to target
- **Mode B**: Spend 5 HP → remove Poisoned (no HP restored)

These are not alternatives to the same effect — they are structurally distinct effects with different pool costs.

**Proposed approach (minimal):** Allow the surface to express a second optional use via a discriminated structure, e.g.:

```typescript
export type ClassFeatureActivationMode = {
  readonly cost: { readonly kind: "hp_pool_points"; readonly amount: number } | { readonly kind: "pool_remainder" };
  readonly effect: ClassFeatureEffect;
};

export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly modes: ReadonlyArray<ClassFeatureActivationMode>;
};
```

Or more conservatively, keep the primary `effect` and add `additionalUses` for secondary modes.

---

## Minimum viable widening order

1. **Add `hp_pool` resource variant** (or rename `UseCountResource` to `FeatureResource` and add the new kind) — this is the deepest blocker.
2. **Add pool-bounded amount variant to `DiceAmount`** (or introduce a separate `HealAmount` type).
3. **Add `remove_condition` to `ClassFeatureEffect`** and `"poisoned"` to `Condition`.
4. **Support multiple activation modes** on `ClassFeatureActivationMechanics`.

Steps 1–2 are tightly coupled (the resource and amount types must agree on what "pool" means at the surface level).

---

## Impact on existing encodings

- `UseCountResource` shape is used by Action Surge, Second Wind, etc. Their `{ kind: "use_count" }` is unaffected if a new kind is added.
- `Condition` gains `"poisoned"` — no existing mastery or feature uses it currently (Topple uses `"prone"`), so no breakage.
- `ClassFeatureEffect` union addition is additive — existing encodings unaffected.
