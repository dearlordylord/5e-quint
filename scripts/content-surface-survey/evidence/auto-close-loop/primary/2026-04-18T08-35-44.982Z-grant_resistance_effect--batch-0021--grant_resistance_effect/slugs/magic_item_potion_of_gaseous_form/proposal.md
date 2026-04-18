# Potion of Gaseous Form

## Verdict

`atom_widening`

`Potion of Gaseous Form` fits the existing top-level shell:

- `kind = "magic_item"`
- `mechanics.family = "activation"`
- single-use consumable
- timed 1-hour self effect
- no attunement
- deterministic destruction on use

I did **not** author `content/magic_item_potion_of_gaseous_form.dhall` because the inherited `Gaseous Form` effect still cannot be represented honestly on the current surface, and the potion adds an early self-dismiss rider that is also missing.

## Blocking gaps

### 1. Missing atom: movement through tiny openings

The inherited spell grants a persistent movement capability, not a speed change:

> the target can move through a space as small as 1 inch wide without squeezing

This is not:

- `grant_speed`
- `teleport`
- `force_move`
- `block_travel`

It is a standing capability of the gaseous form itself. The current surface has no atom for it.

Suggested widening:

- `grant_movement_through_openings`

### 2. Missing standalone effect variant: `restrict_action_set`

The inherited spell also imposes an ongoing prohibition:

> The target can't attack or cast spells.

The taxonomy already has `restrict_action_set`, but `src/surface/types.ts` does not expose it as a standalone `EffectAtom`. Right now action restriction only appears nested inside `grant_extra_action.restriction`, which is the wrong shape here.

Encoding this through `grant_extra_action` would produce a false trace: Gaseous Form is not granting a constrained extra action; it is forbidding parts of the creature's action space while the effect persists.

Suggested widening:

- add `restrict_action_set` as a standalone `EffectAtom` variant

### 3. Missing duration-end trigger: voluntary Bonus Action dismissal

The potion text adds an item-specific early end:

> When you drink this potion, you gain the effect of the Gaseous Form spell for 1 hour (no Concentration required) or until you end the effect as a Bonus Action.

Current duration early-end triggers are passive events. There is no way to encode a voluntary self-dismiss that consumes action economy.

Suggested widening:

- `DurationEndTrigger.target_ends_effect_as_bonus_action`

## Secondary pressure not used as the main classification basis

These clauses from the inherited spell still look unsurfaced too:

- entering and occupying another creature's space
- treating liquids as solid surfaces
- can't talk or manipulate objects

I did not use those as the primary reason for classification because the three gaps above already block an honest encoding.

## Why no placeholder was authored

Any `.dhall` I could produce today would have to omit real inherited mechanics from `Gaseous Form`, not incidental flavor. That would create a misleading trace, so the correct outcome here is a widening report rather than a fake clean encoding.
