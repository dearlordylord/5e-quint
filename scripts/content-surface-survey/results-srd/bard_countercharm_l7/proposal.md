# Proposal: Widening for Countercharm (Bard L7)

**Outcome:** `structural_widening`

## Unit summary

> If you or a creature within 30 feet of you fails a saving throw against an effect that applies the Charmed or Frightened condition, you can take a Reaction to cause the save to be rerolled, and the new roll has Advantage.

Countercharm is a **reaction-triggered class feature** that intercepts a save-failure event among nearby creatures and reruns the save with Advantage. It costs a Reaction, has no enumerated use-count, and its effect is a reroll-with-advantage on the intercepted save.

## Why the current surface cannot encode this honestly

`ClassFeatureMechanics` has a single family: `"activation"`. That family models a bard voluntarily spending a resource on their turn (like Action Surge). Countercharm is structurally different: it is triggered by an **external event** (a creature in range fails a specific save), costs a **Reaction**, carries **no use-count resource**, and produces a **reroll effect** — none of which exist in the activation family.

The spell surface has `TriggeredReactionMechanics` (family `"triggered_reaction"`) for exactly this pattern (Shield, Counterspell), but that family is spell-scoped and does not extend to class features.

## Required widenings

### 1. New family: `triggered_reaction` for class features (structural)

`ClassFeatureMechanics` needs a `triggered_reaction` family parallel to the spell surface's `TriggeredReactionMechanics`. The shape would include:

- A **trigger condition** (event that opens the reaction window)
- A **reaction cost** (consumes `reaction_quota`)
- An **effect** (what fires on commit)

Graph shape: mirrors Subgraph A (Prepare/Prompt/Commit) from the spell triggered-reaction tracer, but rooted on `class_feature_root` instead of `spell_root`, and consuming a `reaction_quota` instead of a `reaction_quota` + `spell_slot`.

### 2. New variant: `ClassFeatureActivationCost: { kind: "reaction" }`

Even under the existing `activation` family, `ClassFeatureActivationCost` lacks a `"reaction"` variant. The current union:

```typescript
type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };
```

Needs `| { readonly kind: "reaction" }`.

### 3. No-use-count resource shape

Countercharm has **no stated use limit** — it is available whenever the trigger fires. The current `ClassFeatureActivationMechanics` requires a `UseCountResource` with a `cap` and a `resetCadence`. A new resource variant is needed:

```typescript
type UnlimitedResource = { readonly kind: "unlimited" };
```

Or alternatively the `resource` field becomes optional for the triggered_reaction family, since the reaction quota itself is the limiting resource.

### 4. New variant: `ClassFeatureEffect` — reroll save with advantage

The effect of Countercharm is: cause the triggering save to be rerolled, and the new roll has Advantage. This combines two v4 atoms (`modify_roll_reroll` + `modify_roll_advantage`) applied to the in-flight saving throw. Neither atom appears in `ClassFeatureEffect`, which currently only has:

```typescript
type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

A new variant is needed:

```typescript
type RerollSaveWithAdvantageEffect = {
  readonly kind: "reroll_save_with_advantage";
};
```

Or a more general `ModifyRollEffect` that references `modify_roll_reroll` / `modify_roll_advantage` atoms.

### 5. New trigger grammar: save-failure event with condition-type filter and range

The trigger condition "fails a saving throw against an effect that applies the Charmed or Frightened condition … within 30 feet" requires:

- **Event kind:** `save_failure` (creature fails a saving throw)
- **Filter:** the effect that caused the save applies a specific condition (`charmed` or `frightened`)
- **Range:** creature is within N feet of the bard

No trigger grammar exists in the class-feature surface. The spell surface has `ReactionTrigger` for spells, but it only covers `hit_by_attack_roll`, `targeted_by_named_spell`, and `any_of`. A new event kind and filter grammar is needed for class features.

## Atom inventory check

All needed atoms exist in v4:
- `reaction_quota` (resource) — already in tracer
- `reaction_window` (window) — already in tracer
- `modify_roll_reroll` (effect) — v4 atom, not yet in `ClassFeatureEffect`
- `modify_roll_advantage` (effect) — v4 atom, not yet in `ClassFeatureEffect`

The gap is **surface representation** of these atoms in the class-feature branch, and the **missing triggered_reaction family** that would wire them together.

## Suggested schema sketch

```typescript
// New family for class features
export type ClassFeatureTriggeredReactionMechanics = {
  readonly family: "triggered_reaction";
  readonly trigger: ClassFeatureTrigger;  // new type
  readonly effects: ReadonlyArray<ClassFeatureReactionEffect>;  // new type
};

// Trigger grammar
export type ClassFeatureTrigger =
  | {
      readonly kind: "save_failure_against_condition_effect";
      readonly conditions: ReadonlyArray<Condition>;  // expand Condition beyond "prone"
      readonly rangeFeet: number;
    };

// Reaction effects
export type ClassFeatureReactionEffect =
  | { readonly kind: "reroll_save_with_advantage" };

// Updated union
export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeatureTriggeredReactionMechanics;
```

Note: `Condition` in `types.ts` is currently `"prone"` only (mastery-scoped). Encoding Countercharm also requires `"charmed"` and `"frightened"` in the `Condition` union — another surface widening.
