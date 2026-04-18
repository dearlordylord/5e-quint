# Gem of Seeing

## Verdict

`surface_widening`

## Why It Does Not Fit Cleanly

`Gem of Seeing` mostly matches the existing magic-item activation surface:

- `magic_item` top-level kind exists
- activation family exists
- `standard_action` with `action = "magic"` exists
- `charge_pool` exists
- `dawn` partial recharge exists
- `grant_sense` with `sense = "truesight"` exists
- `peering_through_item` already exists as an equipment predicate

The failure is narrower: the current surface cannot say that an activated, timed benefit only applies while a runtime predicate holds during that duration.

If authored as a normal activation with:

- `duration = 10 minutes`
- direct self-target effect
- `grant_sense truesight 120`

the record would falsely claim uninterrupted Truesight for the full 10 minutes.

That is not what the item says. The sense is conditional:

> "For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem."

## Honest Missing Shape

The surface needs a variant that can gate a duration-scoped activated benefit behind a runtime predicate, for example:

- an activation-phase effect with an attached predicate
- or a timed activated window that enables a passive grant only while `peering_through_item`

This is a surface widening, not an atom widening:

- `grant_sense` already exists
- `peering_through_item` already exists
- the missing part is how to combine them honestly for an activated timed effect

## Minimal Widening Direction

Any of these would solve the problem without inventing a new v4 atom:

- allow activated effects to carry an `EquipmentPredicate` that gates the granted effect during the duration
- allow a timed activation to host passive-style conditional grants while active
- add an activation/ongoing wrapper that means "benefit is enabled for this duration, but only while predicate P holds"

## Why I Did Not Author Dhall

Authoring a valid `content/magic_item_gem_of_seeing.dhall` under the current surface would require misrepresenting the rule as continuous Truesight for 10 minutes. That would produce a misleading trace, which the task explicitly forbids.
