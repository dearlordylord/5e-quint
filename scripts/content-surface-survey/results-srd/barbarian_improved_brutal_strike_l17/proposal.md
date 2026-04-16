# Proposal: Improved Brutal Strike (barbarian L17)

## Outcome

**`structural_widening`** — No honest encoding is possible with the current surface.

## Unit text

> The extra damage of your Brutal Strike increases to 2d10. In addition, you can use two different Brutal Strike effects whenever you use your Brutal Strike feature.

## Why it doesn't fit

### 1. Wrong family shape — only `activation` exists

`ClassFeatureMechanics` has exactly one family: `activation`. That family mandates:
- an `activationCost` (`free` or `bonus_action`)
- a `UseCountResource` with a `UseCountCap`
- a `RestResetCadence`
- a `ClassFeatureEffect` limited to `grant_extra_action` or `heal_hp`

Improved Brutal Strike (L17) is **passive** — it applies unconditionally whenever Brutal Strike is used, costs nothing extra, consumes no separate resource, and resets on no cadence of its own. Forcing it into `activation` with `activationCost: free` and an artificial `use_count: unlimited` would produce a false trace that implies a resource-and-activation loop that doesn't exist in the rules.

### 2. Both sub-effects target another feature, not a creature or area

The two effects of this unit both operate **on parameters of `barbarian_brutal_strike_l9`**, not on a creature, area, or the activating barbarian:

- "extra damage increases to 2d10" → rewrites the `DiceAmount` on Brutal Strike's on-hit damage
- "use two effects" → increments the effect-multiplicity cap on Brutal Strike's effect-selection list

The surface has no cross-feature reference mechanism. All existing `ClassFeatureEffect` variants (`grant_extra_action`, `heal_hp`) target the activating creature or an adjacent target, not a sibling feature record.

### 3. "Two effects" has no existing atom or relation

The multi-select upgrade ("you can use two different Brutal Strike effects") cannot be expressed as any current atom. It is not:
- `grant_extra_action` (that's an additional *Action* in the Action economy sense)
- `modify_roll_advantage`, `modify_roll_numeric`, or any roll modifier
- `apply_condition`
- Any scaling atom (`scale_die_count`, `scale_die_size`, etc.)

It is a change to the **selection arity** of an effect menu on a sibling feature. No such concept exists in v4.

## Required widenings

### W1: `passive_upgrade` family for `ClassFeatureMechanics`

A new mechanics family — tentatively `passive_upgrade` — is needed for class features that are:
- always-on (no activation cost, no use-count resource, no reset cadence)
- expressed as modifications to parameters of one or more named sibling features

This family would need at minimum:
```
type ClassFeaturePassiveUpgradeMechanics = {
  readonly family: "passive_upgrade";
  readonly targetFeatureId: string;          // id of the feature being upgraded
  readonly upgrades: ReadonlyArray<FeatureUpgrade>;
};
```

### W2: Cross-feature parameter reference

A mechanism to name a target feature and identify which parameter slot is being upgraded. For damage scaling:

```
type ScaleFeatureParameter = {
  readonly kind: "scale_feature_parameter";
  readonly parameter: "extra_damage";    // named slot on the target feature
  readonly value: DiceAmount;            // the new expression (override, not delta)
};
```

### W3: `multi_effect_selection` — effect arity upgrade

A new upgrade shape for "the wielder may choose N effects from a list" where N increases from 1 to 2:

```
type UpgradeEffectArity = {
  readonly kind: "upgrade_effect_arity";
  readonly newCount: number;             // 2 at L17
};
```

This maps to an atom that could be named `expand_effect_selection` or handled as a parameter of the effect-menu subgraph on the Brutal Strike chain.

## Relation to the Brutal Strike chain

The three Brutal Strike levels form a natural **upgrade chain**:
- L9 `barbarian_brutal_strike_l9`: base feature — on-hit, forgo Reckless Attack advantage → 1d10 extra + choose 1 effect
- L13 `barbarian_improved_brutal_strike_l13`: upgrade chain entry 1 — extra damage → 1d10 (same, per SRD text review needed) or confirms 1d10, select remains 1
- L17 `barbarian_improved_brutal_strike_l17`: upgrade chain entry 2 — extra damage → 2d10, select → 2 effects

The `passive_upgrade` family would model L13 and L17 as references back to the L9 base. Without a cross-feature reference mechanism, neither L13 nor L17 can be honestly encoded.

## Confidence

**High.** The gap is not a missing atom within an existing subgraph — it is a missing family shape. The current surface can only model self-contained activated features with use-count resources. Passive, parameter-mutating upgrades to existing features require a new structural layer.
