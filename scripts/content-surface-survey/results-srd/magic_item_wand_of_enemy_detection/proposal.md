## Wand of Enemy Detection

Outcome: `surface_widening`

The unit fits the existing top-level shape as a `magic_item` with `activation` mechanics:

- `requiresAttunement = true`
- `activationCost = action`
- `resource = charge_pool` with cap 7
- `resetCadence = dawn` with regain `1d6 + 1`
- `destruction = last_charge_roll`

The blocker is the activated payload. The current surface has `EffectAtom.detect`, but it is too narrow for this item.

### Required widening 1

Widen `EffectAtom.detect` so it can represent hostile-creature tracking with a nearest-direction readout.

Why:

- Current shape: `detect { property, radiusFeet }`
- Current semantics: sense the presence of a named property within a radius
- Needed semantics here: know the direction of the nearest hostile creature within a radius, while explicitly not learning distance

Evidence:

> For 1 minute, you know the direction of the nearest creature Hostile to you within 60 feet, but not its distance from you.

This is narrower than a generic presence scan and should not be flattened into plain `detect(property=...)`, because that would lose the nearest-target and direction-only semantics.

Suggested direction:

- add a `property` variant for hostility-based creature detection, and
- add a readout mode on `detect` such as `presence` vs `direction_to_nearest`

### Required widening 2

Add a duration early-end trigger for ceasing to hold the activating item.

Evidence:

> The effect ends if you stop holding the wand.

Current `DurationEndTrigger` variants cover attacks, damage, spellcasting, donning armor, and similar spell-side clauses, but not item-state termination such as releasing or no longer holding the source item.

Suggested direction:

- add a `DurationEndTrigger` variant like `target_stops_holding_item`

### Why this is not `atom_widening`

No new top-level family is required. The item is still an activated magic item with a charge pool, timed duration, dawn recharge, and last-charge destruction. The missing pieces are variants inside existing surface types, not a new atom family.
