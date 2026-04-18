# Large Form (Goliath) widening notes

## Verdict

`Large Form (Goliath)` does not fit the current authored surface honestly enough to produce a `content/species_goliath_large_form.dhall` file.

The top-level shape is already present:

- `kind: "species_trait"`
- mechanics family: `activation`

The blocking gaps are lower-level payload gaps, not a missing family.

## Why it stops

The trait's core mechanic is a temporary size change:

> "you can change your size to Large as a Bonus Action"

There is no current effect atom for "change the creature's size category to Large for a duration."

Existing nearby atoms do not fit:

- `transform_target` is for replacing the target with a new form/stat block.
- `set_ability_score`, `modify_speed`, and `modify_roll_advantage` only cover secondary riders.
- No passive or activation atom currently changes only size while preserving the rest of the creature.

The second gap is the advantage rider:

> "For that duration, you have Advantage on Strength checks"

`modify_roll_advantage` can currently narrow:

- by roll kind
- by skill (`skillFilter`)
- by condition (`conditionFilter`)
- by saving throw ability (`saveAbilityFilter`)
- by save source (`saveSourceFilter`)

It cannot narrow an `ability_check` rider to all checks tied to one base ability like Strength. A skill filter is not honest here because Strength checks are not equivalent to a closed skill list.

## Narrowest honest widenings

### 1. New atom: `modify_size`

Suggested shape direction:

```ts
{
  readonly kind: "modify_size";
  readonly size: "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";
}
```

Why this is an atom widening:

- v4 has no existing effect atom for temporary size-category changes.
- This is the primary mechanic of the trait, not a secondary annotation.

### 2. New variant: `modify_roll_advantage.abilityFilter`

Suggested shape direction:

```ts
readonly abilityFilter?: ReadonlyNonEmptyArray<Ability>;
```

Why this is only a surface widening:

- The underlying atom is still `modify_roll_advantage`.
- The missing piece is a new narrowing axis for `ability_check`, parallel to the existing `skillFilter` and `saveAbilityFilter`.

## What would fit once widened

After those widenings, the rest of the trait fits existing shapes cleanly:

- activation cost: `bonus_action`
- resource: `use_count` fixed 1
- reset: `long_rest`
- duration: timed 10 minutes
- attachment: `self`
- speed rider: `modify_speed` `+10 feet`

## Classification

- Outcome: `atom_widening`

Reason:

- one required widening is a genuinely new atom (`modify_size`)
- the trait should not be authored partially because that would omit the named effect the trait is built around
