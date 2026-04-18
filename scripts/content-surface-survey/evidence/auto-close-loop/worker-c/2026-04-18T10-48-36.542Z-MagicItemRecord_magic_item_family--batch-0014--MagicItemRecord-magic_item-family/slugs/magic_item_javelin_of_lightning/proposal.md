## Javelin of Lightning

Outcome: `atom_widening`

The current surface can encode the once-per-dawn Lightning Bolt replacement as a `magic_item` `activation` using `replace_attack`, a fixed-DC `save_gate`, and a self-origin `line` area. Two item mechanics remain outside the current effect vocabulary.

### Missing atom: outgoing damage-type replacement on weapon hit

The passive rider is not a numeric modifier. It changes the damage type of the weapon hit itself, optionally, and only for this specific weapon.

- Proposed widening: `new_atom`
- Name: `replace_damage_type`
- Justification: the rule swaps an already-existing damage instance from one type to another without changing amount, attack bonus, or target set.
- Evidence: "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

### Missing atom: item-return rider after replacement attack resolves

The activation transforms the thrown weapon into a line effect and then deterministically restores the item to the wielder's hand. That is neither damage, teleportation, nor a companion/object lifecycle currently represented on the surface.

- Proposed widening: `new_atom`
- Name: `return_item_to_hand`
- Justification: the rule moves the item back to the wielder as part of the item's own resolution, after the save-gated damage resolves.
- Evidence: "Immediately after dealing this damage, the weapon reappears in your hand."

### Authored subset

The authored Dhall/JSON encodes only the Lightning Bolt activation:

- `replace_attack` activation cost
- 1 use, refresh at dawn
- 120-foot by 5-foot self-origin line
- DC 13 Dexterity save
- 4d6 Lightning damage, half on success

This yields a useful trace without pretending the passive damage-type swap or return rider already fit the current atom surface.
