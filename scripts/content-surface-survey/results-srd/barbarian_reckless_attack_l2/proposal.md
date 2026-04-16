# Widening Proposal: Reckless Attack (barbarian L2)

**Outcome:** `surface_widening`  
**Unit slug:** `barbarian_reckless_attack_l2`

---

## Unit summary

> When you make your first attack roll on your turn, you can decide to attack recklessly. Doing so gives you Advantage on attack rolls using Strength until the start of your next turn, but attack rolls against you have Advantage during that time.

Reckless Attack is a `class_feature` / `activation` family unit, but the current `ClassFeatureActivationMechanics` cannot encode it honestly. Four surface gaps block encoding.

---

## Gap 1: `ClassFeatureEffect` lacks `modify_roll_advantage` variant

**Current state:** `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect`

**What's needed:** A variant that maps to the existing v4 `modify_roll_advantage` atom — specifically to express "Advantage on your own Strength-based attack rolls."

**Proposed addition:**

```typescript
export type ModifyRollAdvantageEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage" | "disadvantage";
  readonly on: ReadonlyArray<RollKind>;
  readonly scope?: "strength_only" | "dexterity_only"; // ability restriction
};
```

The `modify_roll_advantage` atom already exists in v4 and is used in `MasteryEffect`; it just needs to be surfaced as a `ClassFeatureEffect` variant.

---

## Gap 2: No effect type for "attack rolls against self gain Advantage"

**Current state:** No effect type models the barbarian-as-defender penalty — i.e., incoming attack rolls gaining Advantage against self.

**What's needed:** A new `ClassFeatureEffect` variant (or an extension of `ModifyRollAdvantageEffect` above) that can express "attack rolls targeting the feature holder gain Advantage." This is the symmetric/detrimental side of the Reckless Attack trade-off.

**Proposed addition:**

```typescript
export type GrantAdvantageOnAttacksAgainstSelfEffect = {
  readonly kind: "grant_advantage_on_attacks_against_self";
  readonly mode: "advantage";
};
```

Alternatively, `ModifyRollAdvantageEffect` could carry a `target: "self_as_attacker" | "self_as_defender"` field to unify both directions.

---

## Gap 3: `UseCountCap` has no `unlimited` variant

**Current state:** `UseCountCap = { kind: "fixed"; uses: number } | ThresholdTiers<number>`

**What's needed:** Reckless Attack has no use count — it is available every turn with no rest-based recovery. `ClassFeatureActivationMechanics` unconditionally requires a `UseCountResource`, so there is no way to express "no limit."

**Proposed addition:**

```typescript
// Add to UseCountCap:
| { readonly kind: "unlimited" }
```

This would also require `RestResetCadence` to tolerate a `null`/`none` value when the cap is `unlimited`.

---

## Gap 4: `ClassFeatureActivationMechanics` has no duration/expiry field

**Current state:** The `activation` family for class features models one-shot instantaneous effects (Action Surge grants an extra action; Second Wind heals HP). There is no `duration` or `expiry` field.

**What's needed:** Reckless Attack's effects persist "until the start of your next turn" — a turn-scoped state. The tracer has `turn_start_window` in the v4 atom inventory; connecting it to a class feature activation as an expiry requires a new field.

**Proposed addition:**

```typescript
// Extend ClassFeatureActivationMechanics header:
readonly expiresOn?: TurnScopedExpiry;

export type TurnScopedExpiry =
  | { readonly kind: "start_of_next_turn"; readonly subject: "self" }
  | { readonly kind: "end_of_current_turn"; readonly subject: "self" };
```

This would let `traceClassFeatureActivation` emit a `turn_start_window` node with a `persists_until` edge from each granted effect node.

---

## Encoding verdict

Do not produce `.dhall` / `.json` / `.trace.md` for this unit. All four gaps must be addressed before an honest encoding is possible. The v4 atom inventory is sufficient — all needed atoms (`modify_roll_advantage`, `attack_roll`, `turn_start_window`) already exist. The widenings are entirely in the TypeScript surface types and tracer branches.
