# Proposal: Fast Hands (rogue L3) — surface_widening

## Unit

**Fast Hands** — Rogue subclass feature (Thief), acquired at level 3.  
Provenance: SRD 5.2.1, Classes/Rogue, "Level 3: Fast Hands"

## Summary

The `class_feature` + `activation` family is the right structural home for this unit. The Bonus Action activation cost and rogue class membership fit cleanly. Four surface gaps prevent honest encoding.

---

## Gap 1 — No unlimited `UseCountCap`

**Type:** `new_variant` on `UseCountCap`

Fast Hands has no usage limit. The feature may be used on every turn without restriction. `UseCountCap` currently requires either `{ kind: "fixed"; uses: number }` or `ThresholdTiers<number>`. Neither can honestly represent "unlimited".

**Proposed addition:**

```typescript
export type UseCountCap =
  | { readonly kind: "fixed"; readonly uses: number }
  | { readonly kind: "unlimited" }          // ← new
  | ThresholdTiers<number>;
```

When `kind === "unlimited"`, the `resource` field carries no quota semantics and the `resetCadence` field is irrelevant (could be made optional, or a `"none"` cadence added). The tracer should emit no `use_count` node for unlimited features.

**Evidence:** No usage-limit language anywhere in the feature text.

---

## Gap 2 — No choice compositor on `ClassFeatureActivationMechanics`

**Type:** `new_variant` on `ClassFeatureEffect` (or structural change to `ClassFeatureActivationMechanics`)

`ClassFeatureActivationMechanics.effect` is a single `ClassFeatureEffect`. Fast Hands offers a player-chosen menu of two sub-effects at activation time. The choice is not implicit or always-applied — the rogue picks exactly one branch per use.

**Option A — choice wrapper effect:**

```typescript
export type ChooseOneEffect = {
  readonly kind: "choose_one";
  readonly options: ReadonlyArray<ClassFeatureEffect>;
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | ChooseOneEffect   // ← new
  | AbilityCheckEffect
  | GrantStandardActionAsBonusActionEffect;
```

**Option B — pluralize the field:**

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effectChoice: "any_one" | "all";    // ← new
  readonly effects: ReadonlyArray<ClassFeatureEffect>;  // ← pluralized
};
```

Option A is narrower and composes better with the existing tracer structure. Option B is simpler but loses the semantic that exactly one branch fires per use.

**Evidence:** "you can do one of the following. **Sleight of Hand.** ... **Use an Object.** ..."

---

## Gap 3 — No `ability_check` `ClassFeatureEffect`

**Type:** `new_variant` on `ClassFeatureEffect`

The Sleight of Hand branch's core mechanic is making a Dexterity (Sleight of Hand) ability check. The v4 atom `ability_check` (resolution category) exists, but there is no `ClassFeatureEffect` variant that maps to it. The check's purpose (pick lock / disarm trap / pick pocket) is the caller-owned narrative outcome, not a core-mechanics atom, so it stays out of the effect body.

**Proposed addition:**

```typescript
export type AbilityCheckEffect = {
  readonly kind: "ability_check";
  readonly ability: Ability;                   // "dex"
  readonly skill: string;                      // "sleight_of_hand"
};
```

The tracer would emit an `ability_check` resolution node attached to `self`.

**Evidence:** "Make a Dexterity (Sleight of Hand) check to pick a lock or disarm a trap with Thieves' Tools or to pick a pocket."

---

## Gap 4 — No "grant standard action as bonus action" `ClassFeatureEffect`

**Type:** `new_variant` on `ClassFeatureEffect`

The Use an Object branch lets the rogue take the Utilize action or the Magic action (specifically to activate a magic item) using their Bonus Action. This is not `grant_extra_action` — that atom grants an additional full action on top of the normal action. Here the Bonus Action IS the cost; the effect is the ability to use a normally-full-action action kind within that bonus action.

**Proposed addition:**

```typescript
export type GrantStandardActionAsBonusActionEffect = {
  readonly kind: "grant_standard_action_as_bonus_action";
  readonly actions: ReadonlyArray<StandardActionKind>;  // ["utilize", "magic"]
  readonly constraint?: string;   // "to activate a magic item" (optional narrowing prose)
};
```

The `"magic"` action here is further constrained to magic items specifically (not all magic actions), which is a filter on the action. The `constraint` field is purely informational — the deterministic boundary is the action kind.

**Evidence:** "Take the Utilize action, or take the Magic action to use a magic item that requires that action."

---

## Proposed atom additions to tracer

No new v4 atoms are needed. All atoms (`ability_check`, `bonus_action_quota`, `activate`) already exist. The tracer needs:
- A new `traceAbilityCheckEffect` path in `traceClassFeatureEffect`
- A new `traceGrantStandardActionAsBonusAction` path in `traceClassFeatureEffect`
- Choice-compositor handling (either branch-label edges or option-list expansion)

---

## Encoding sketch (pending widening)

```typescript
// Hypothetical, pending surface changes:
{
  kind: "class_feature",
  id: "rogue_fast_hands_l3",
  className: "rogue",
  acquiredAtLevel: 3,
  mechanics: {
    family: "activation",
    activationCost: { kind: "bonus_action" },
    resource: { kind: "use_count", cap: { kind: "unlimited" } },  // Gap 1
    resetCadence: { kind: "none" },   // or omitted if resource is unlimited
    effect: {
      kind: "choose_one",   // Gap 2
      options: [
        {
          kind: "ability_check",   // Gap 3
          ability: "dex",
          skill: "sleight_of_hand"
        },
        {
          kind: "grant_standard_action_as_bonus_action",   // Gap 4
          actions: ["utilize", "magic"],
          constraint: "magic action only to use a magic item"
        }
      ]
    }
  }
}
```
