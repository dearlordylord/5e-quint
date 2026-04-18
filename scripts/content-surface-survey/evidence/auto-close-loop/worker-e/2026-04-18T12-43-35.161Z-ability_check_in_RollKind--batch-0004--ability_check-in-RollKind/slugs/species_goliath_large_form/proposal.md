# Proposal: Large Form (Goliath)

## Verdict

`Large Form (Goliath)` does not fit the current surface honestly enough to author a `content/species_goliath_large_form.dhall` file.

The top-level kind and family do exist:

- `kind = "species_trait"`
- `mechanics.family = "activation"`

But the trait still forces widening because its primary mechanic is a temporary size change, and the current surface has no size-change atom.

## What fits today

These parts already fit existing surface shapes:

- Bonus Action activation:
  `activationCost = { kind = "bonus_action" }`
- Once per Long Rest:
  `resource = use_count(fixed 1)` plus `resetCadence = long_rest`
- 10-minute duration:
  `duration = { kind = "timed", value = { unit = "minute", amount = 10 } }`
- Advantage on Strength checks:
  `modify_roll_advantage` on `ability_check` with a Strength-specific narrowing if/when that narrowing exists
- Speed +10 feet:
  `modify_speed`

## What does not fit

### 1. Temporary size change to Large

RAW:

> "you can change your size to Large as a Bonus Action"

This is the core mechanic. Existing atoms can:

- modify Speed
- grant Advantage
- transform into another stat block (`transform_target`)

But none can express:

- self size becomes `Large`
- without replacing the creature's whole form/stat block
- for a bounded duration

This is `atom_widening`, not just surface reshaping, because the missing concept is a real effect atom absent from the current inventory.

### 2. Species-trait unlock at character level 5

RAW:

> "Starting at character level 5"

`SpeciesTraitRecord` has no field comparable to class features' `acquiredAtLevel`, and the mechanics surface has no eligibility gate for minimum character level.

This is a `surface_widening` alongside the atom gap.

### 3. Voluntary end with no action

RAW:

> "This transformation lasts for 10 minutes or until you end it (no action required)."

Activated abilities can carry a timed duration, but they do not currently model an explicit owner-driven early end that costs no action.

This is also `surface_widening`.

## Why I did not author a partial encoding

If I encoded only:

- `modify_speed +10`
- Advantage on Strength checks
- 10-minute timed duration

the trace would falsely imply that the unit's mechanics are fully represented while omitting the named transformation that defines the trait. That would be a misleading trace, so I stopped before authoring placeholder content.

## Suggested widening

Minimum honest additions:

1. New effect atom such as `set_size`
   - enough to encode `Large Form`
   - distinct from polymorph / full stat-block replacement

2. Level gate for `SpeciesTraitRecord` or shared non-class unit eligibility
   - enough to encode `Starting at character level 5`

3. Optional manual early-end hook on timed durations
   - enough to encode `until you end it (no action required)`

