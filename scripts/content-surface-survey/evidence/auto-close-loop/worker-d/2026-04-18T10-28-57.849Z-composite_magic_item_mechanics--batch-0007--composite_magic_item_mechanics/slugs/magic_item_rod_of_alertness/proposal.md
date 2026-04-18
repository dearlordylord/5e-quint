# Rod of Alertness

## Verdict

`atom_widening`

I did not author `content/magic_item_rod_of_alertness.dhall` because a clean composite record would still have to lie about the item's third property, `Protective Aura`.

## What Fits Today

Two parts fit the current surface honestly:

- `Alertness` fits as a passive magic-item part with `condition = holding_item` and two `modify_roll_advantage` grants:
  - Advantage on `initiative`
  - Advantage on `ability_check` with `skillFilter = perception`
- `Spells` fits as a passive magic-item part with `condition = holding_item` and four `grant_spell_access` grants:
  - `detect_evil_and_good`
  - `detect_magic`
  - `detect_poison_and_disease`
  - `see_invisibility`

If the item only had those two properties, it would be an honest `magic_item` `composite`.

## Blocking Gaps

### 1. Light emission is missing from the atom vocabulary

The aura is defined by the rod shedding bright and dim light:

> "the rod's head sheds Bright Light in a 60-foot radius and Dim Light for an additional 60 feet"

The current surface has no atom for creating or sustaining a light field. Using a plain `area` attachment without a corresponding light effect would lose the rule that the aura is specifically the bright-light zone created by the rod.

Proposed widening:

- `new_atom`: `emit_light`

### 2. The aura is anchored to a planted item and ends when that item is removed

The current magic-item `activation` family can model:

- activation cost
- resource / dawn reset
- duration

But it cannot honestly model this shape:

> "you can plant the haft end of the rod in the ground"
>
> "the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground"

This is not a caster-centered aura and not a generic timed buff. It is an ongoing anchored field at the rod's location with an item-removal early-end trigger.

Proposed widening:

- `new_variant`: `anchored_item_aura_with_removal_end`

That could land either as:

- a new activation/attachment variant for "anchored to planted item location", or
- a reusable early-end trigger variant for "ends when anchored item is removed with a Magic action".

### 3. The invisible-creature rider is narrower than existing senses

The aura grants:

> "you and your allies ... can sense the location of any Invisible creature that is also in the Bright Light"

Existing `grant_sense` is too broad for this:

- `truesight` overstates the rule
- `blindsight` overstates the rule
- plain `see_invisibility` is still too broad, because the item only works for invisible creatures in the bright-light zone

So this needs a narrower sense / locator variant tied to an area condition.

Proposed widening:

- `new_variant`: `grant_sense_locator_for_invisible_creatures_in_area`

## Why I Stopped

I could have authored a misleading partial record that captured only:

- the held passive advantage rider
- the at-will spell grants
- maybe the `+1 AC` / `+1 saving throws` portion of the aura

But that would still omit core mechanics of `Protective Aura`:

- the light field itself
- the planted anchored location
- the pull-to-end interaction
- the invisible-creature locator rider

That would produce a trace that looks cleaner than the rule actually is, which is worse than stopping with a widening report.
