# Proposal: `species_goliath_large_form`

Outcome: `atom_widening`

## Why I stopped

`Large Form (Goliath)` broadly matches the existing `species_trait` + `activation` family:

- activation cost: `bonus_action`
- resource: `use_count` 1
- reset cadence: `long_rest`
- duration: timed self-buff

But an honest encoding would still have to omit multiple core mechanics, so I did not author a placeholder Dhall record.

## Missing pieces

### 1. New atom: temporary size change

Large Form's primary effect is changing the creature's size category to Large for a duration.

Evidence:

> "you can change your size to Large as a Bonus Action"

Why this is `atom_widening`:

- `types.ts` has no effect atom for temporary size-category change.
- `transform_target` is too strong and dishonest here; Large Form is not a polymorph/stat-block replacement.
- `set_ability_score`, `modify_speed`, and similar atoms do not cover size.
- v4 taxonomy also does not contain a size-change atom.

Suggested addition:

- `EffectAtom { kind: "modify_size", size: "large" | ... }`
- likely with timed-duration semantics supplied by the host activation, not on the atom itself

### 2. Surface widening: ability-wide check filter

Large Form grants Advantage on **Strength checks**, not on a closed skill subset.

Evidence:

> "For that duration, you have Advantage on Strength checks"

Why current surface is insufficient:

- `modify_roll_advantage` supports `skillFilter` and `conditionFilter`
- it does **not** support an ability-check ability filter such as `str`
- narrowing to Athletics would be false, because Strength checks include more than Athletics

Suggested addition:

- widen `modify_roll_advantage` with something like
  - `abilityCheckAbilityFilter?: ReadonlyNonEmptyArray<Ability>`

### 3. Surface widening: character-level gate on a species trait

Large Form does not exist from level 1; it comes online at character level 5.

Evidence:

> "Starting at character level 5"

Why current surface is insufficient:

- `SpeciesTraitRecord` has no acquired-level or unlock gate field
- omitting the gate would misrepresent availability

Suggested addition:

- add an optional character-level gate on `SpeciesTraitRecord`, or
- add a shared acquisition/unlock gate reusable across non-class units

### 4. Surface widening: manual end with no action

The effect is timed, but the user may end it early without spending an action.

Evidence:

> "This transformation lasts for 10 minutes or until you end it (no action required)"

Why current surface is insufficient:

- `Duration.timed` supports only a closed set of early-end triggers
- those triggers are spell-target event triggers, not voluntary self-dismiss
- activated non-spell abilities have no separate dismiss lifecycle hook

Suggested addition:

- a dismiss/early-end field on timed durations, or
- a reusable manual-dismiss lifecycle node for non-spell activations

## What already fits

If the gaps above were added, the rest is straightforward:

- `kind`: `species_trait`
- `mechanics.family`: `activation`
- `activationCost`: `bonus_action`
- `resource`: `use_count` with cap `fixed: 1`
- `resetCadence`: `long_rest`
- `duration`: `timed`, 10 minutes
- `attachment`: `self`
- existing atom already usable:
  - `modify_speed` with `delta: 10`, `unit: "feet"`

## Notes

- The clause "if you're in a big enough space" is also not currently modeled as an activation precondition. I did not treat that as the primary blocker because the missing size-change atom already prevents an honest encoding.
- `Powerful Build` from the same source block is a separate trait and was not encoded here.
