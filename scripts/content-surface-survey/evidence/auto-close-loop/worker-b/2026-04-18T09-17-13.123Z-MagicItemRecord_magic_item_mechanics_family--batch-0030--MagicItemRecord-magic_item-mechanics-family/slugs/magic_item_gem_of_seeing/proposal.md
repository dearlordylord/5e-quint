## Gem of Seeing

`Gem of Seeing` mostly matches the existing `magic_item` `activation` family:

- `charge_pool` with cap 3
- `standard_action` with action `magic`
- `dawn` recharge `1d3`
- timed duration `10 minutes`
- `grant_sense` with `truesight` 120 ft

The gap is narrower than a new family, but it is still a real surface gap.

### Missing surface shape

The current `ActivatedAbilityHeader.condition` only gates whether the item can be activated. It does **not** express "the granted benefit applies only while a predicate holds during the duration."

Gem of Seeing needs a duration-scoped gate on the granted sense, such as:

- a new variant on ongoing/direct effect delivery that says the granted effect is active only while an `EquipmentPredicate` holds, or
- a duration-level/effect-level predicate that can reuse `EquipmentPredicate`

### Why the current shape is dishonest

Encoding this item with:

- `condition = { kind = "peering_through_item" }`
- timed duration
- direct `grant_sense`

would trace as "you must be peering through the gem to activate it," which is not the RAW rule. RAW says the truesight is available for 10 minutes **when you peer through the gem** during that window.

### Proposed widening

- `new_variant`: duration-scoped conditional effect gate reusing `EquipmentPredicate`

This keeps the top-level `magic_item` + `activation` family intact and only widens an existing surface shape.
