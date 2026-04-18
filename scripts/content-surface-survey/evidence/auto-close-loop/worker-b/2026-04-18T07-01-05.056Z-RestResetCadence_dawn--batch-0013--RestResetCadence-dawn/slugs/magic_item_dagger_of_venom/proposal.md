## Dagger of Venom

Verdict: `surface_widening`

### What fits today

The passive line fits the current magic-item surface cleanly:

- `modify_roll_numeric` on `attack_roll` with `weaponFilter = { kind = "specific_item", itemId = "magic_item_dagger_of_venom" }`
- `modify_damage_numeric` with the same `specific_item` filter

If the unit only had:

> "You gain a +1 bonus to attack rolls and damage rolls made with this magic weapon."

it would be a straightforward passive or passive part of a composite magic item.

### What does not fit honestly

The activated poison property is not an immediate effect. It creates a temporary stored rider on one specific weapon, then waits for a later qualifying hit:

> "You can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature."

On that later hit, the struck creature, not the wielder or the weapon-holder, resolves:

> "That creature must succeed on a DC 15 Constitution saving throw or take 2d10 Poison damage and have the Poisoned condition for 1 minute."

Current `ActivatedAbilityMechanics` can do:

- immediate `phases`
- resource/reset cadence
- optional top-level `duration`

But it cannot do:

- ongoing trigger/effect operations during that duration
- binding the stored rider to a `specific_item`
- consuming the rider on the first qualifying weapon hit
- opening a later `save_gate` on the struck creature

The spell-side `ongoing_effect` family is close, but it is spell-only and still does not give non-spell activations an honest “coat weapon now, resolve on later hit” shape.

### Needed widening

Two related widenings would make this unit encodable without lying:

1. Extend non-spell `activation` mechanics with an ongoing-operation grammar.
   This would let a magic item activation create a timed rider that listens for later events.

2. Add a stored-weapon-rider subgraph.
   The rider needs to attach to a specific item, trigger on that item's next qualifying hit, resolve a `save_gate` on the hit creature, and self-consume.

Until that exists, authoring a content file would require inventing behavior the current surface does not model, so no `content/magic_item_dagger_of_venom.dhall` was written.
