# Rod of Alertness

## Verdict

`surface_widening`

Do not author `content/magic_item_rod_of_alertness.dhall`.

## What fits today

The held passive half fits current `MagicItemRecord` machinery:

- `condition = { kind = "holding_item" }`
- `modify_roll_advantage` on `initiative`
- `modify_roll_advantage` on `ability_check` with `skillFilter = perception`
- `grant_spell_access` for `detect_evil_and_good`, `detect_magic`, `detect_poison_and_disease`, and `see_invisibility`

## What does not fit honestly

The activated **Protective Aura** is the blocking shape.

RAW pressure:

> "As a Magic action, you can plant the haft end of the rod in the ground..."
>
> "While in that Bright Light, you and your allies gain a +1 bonus to Armor Class and saving throws..."
>
> "The rod's head stops glowing and the effect ends after 10 minutes or when a creature takes a Magic action to pull the rod from the ground."

Current gaps:

- `ActivatedAbilityMechanics` is phase-based and does not honestly model a magic-item activation that establishes a timed ongoing aura.
- `Attachment.target` / `Attachment.area` has no ally-only or friendly-only filter, so `you and your allies` cannot be expressed without also granting enemies in the same area.
- Existing duration/activation shapes do not encode the explicit early-end condition "when a creature takes a Magic action to pull the rod from the ground."

## Narrowest honest widening

This does not force a new top-level `UnitRecord` kind. It is narrower than `structural_widening`.

The smallest plausible widening is:

1. Extend magic-item activations to support an activated ongoing aura shape.
2. Add a beneficiary filter for friendly creatures / self-and-allies within the affected area.
3. Add an early-end trigger variant for manually ending a planted item effect via a `Magic` action on the item.

## Notes

- The light emission itself was not treated as the primary blocker; prior encodings already treat many light/visibility clauses as non-core or deferred. The deterministic mechanics blocker here is the ally-scoped timed aura plus its explicit pull-to-end clause.
- The clause "can sense the location of any Invisible creature that is also in the Bright Light" is secondary pressure and may need follow-up surface work later, but the item already fails earlier on the aura delivery shape.
