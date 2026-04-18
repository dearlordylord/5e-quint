`Javelin of Lightning` fits the existing `magic_item` top-level kind and would otherwise compose as a `composite` item:

- a passive weapon rider for "on hit, you can have it deal Lightning damage instead of Piercing damage"
- an activated `replace_attack` rider for the named `Lightning Bolt` throw property with a `save_gate`, fixed DC 13, line area, and dawn recharge

It still does not fit honestly today because two mechanics are missing.

## Missing mechanic 1: damage-type replacement on a weapon hit

Classification: `atom_widening`

Why:

- The first paragraph does not add damage, add a bonus, or grant a separate follow-up effect.
- It replaces the weapon attack's existing damage type for that hit.
- The current surface has `damage`, `modify_damage_numeric`, and `grant_resistance`, but nothing that can rewrite an existing damage instance from one type to another.

Evidence:

> "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

Suggested widening:

- New effect atom such as `replace_damage_type` or `convert_damage_type`
- Payload likely needs:
  - source weapon filter (`specific_item`)
  - from damage type
  - to damage type
  - trigger context of the current hit / damage instance

## Missing mechanic 2: thrown weapon returns to hand immediately after resolving

Classification: `surface_widening`

Why:

- The `Lightning Bolt` property otherwise fits an activated `magic_item` ability with `activationCost = replace_attack`, `resource.use_count`, `resetCadence.dawn`, and a line-area `save_gate`.
- The current authored surface has no way to say that the weapon leaves the wielder, resolves the effect, and then reappears in the wielder's hand immediately after damage.
- Existing survey notes already call this general space "item-motion support on the authored surface."

Evidence:

> "Immediately after dealing this damage, the weapon reappears in your hand."

Suggested widening:

- Add an activation/lifecycle/effect shape for item return, such as:
  - `return_item_to_wielder_hand`
  - or a more general item-motion / return-to-owner primitive

## Why no Dhall payload was authored

Authoring only the `Lightning Bolt` activation would silently drop the first always-on magic-weapon rider, which is a real mechanical property of the item, not flavor text. That would produce a misleading trace, so this unit is recorded as non-clean instead of partially encoded.
