## Verdict

`Indomitable Might` fits `ClassFeatureRecord` with `PassiveMechanics`, but it does not fit the current `EffectAtom` surface honestly.

## Missing surface shape

Add a new `EffectAtom` variant for roll-total substitution / floor semantics, aligned with the existing v4 taxonomy atom `modify_roll_substitute`.

Suggested shape direction:

```ts
{
  readonly kind: "modify_roll_substitute";
  readonly on: ReadonlyNonEmptyArray<"ability_check" | "saving_throw">;
  readonly abilityFilter?: ReadonlyNonEmptyArray<Ability>;
  readonly minimumTotal: {
    readonly kind: "ability_score";
    readonly ability: Ability;
  };
}
```

This is the honest mechanic:

- scope: Strength checks and Strength saving throws only
- timing: after the roll total is known
- rule: if total < Strength score, replace total with Strength score

## Why existing atoms are insufficient

- `modify_roll_numeric` is wrong because the bonus is not fixed and is not added in all cases.
- `modify_roll_advantage` is wrong because the feature does not change d20 sampling.
- `set_ability_score` is wrong because it changes the character's score, not a roll result.

## Evidence

> If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.

## Classification

`surface_widening`

Reason: the mechanic fits an existing unit kind and family, and the needed concept already exists in v4 taxonomy (`modify_roll_substitute`), but the authored surface in `types.ts` does not expose it.
