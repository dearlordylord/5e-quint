## Javelin of Lightning

Outcome: `atom_widening`

The unit fits the existing top-level `magic_item` kind, and its overall shape would be a `composite` magic item:

- a passive weapon rider
- a limited-use activation with a cooldown until the next dawn

I did not author `content/magic_item_javelin_of_lightning.dhall` because doing so honestly would require two missing pieces, and any subset would materially misrepresent the item.

### Missing atom

The passive rider:

> "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

is not expressible with the current effect vocabulary.

Existing nearby atoms do not fit:

- `modify_damage_numeric` changes amount, not damage type.
- `damage` models a concrete resolved damage instance, not an ongoing rider on weapon hits.
- `grant_resistance` / `grant_damage_immunity` are target-side defenses, not attacker-side damage conversion.

What is missing is a weapon-hit rider that replaces or converts this weapon's dealt damage type.

Suggested widening:

- kind: `new_atom`
- name: `modify_damage_type`
- sketch: an ongoing/passive effect atom scoped by `weaponFilter`, with `fromDamageType` and `toDamageType`, and optionally a mode such as `replace` versus `choose_replace`

### Missing surface shape

The activation rider:

> "When you throw this weapon at a target no farther than 120 feet from you, you can forgo making a ranged attack roll and instead turn the weapon into a bolt of lightning. This bolt forms a 5-foot-wide Line between you and the target."

does not fit the current area surface exactly.

Current `AreaShapeDescriptor.line` requires a fixed `lengthFeet`. That would force a dishonest choice:

- encode a fixed 120-foot line, which incorrectly hits creatures beyond the chosen target, or
- encode some shorter fixed line, which incorrectly misses legal farther targets.

What is missing is a line shape whose length is derived from the chosen primary target's distance, bounded by a maximum.

Suggested widening:

- kind: `new_variant`
- name: `AreaShapeDescriptor.line_to_target`
- sketch: `{ kind = "line_to_target", maxLengthFeet = 120, widthFeet = 5 }`

### Secondary omission

This text also adds a return rider:

> "Immediately after dealing this damage, the weapon reappears in your hand."

The current surface does not have an honest item-return / item-motion effect for a thrown weapon after resolution. I treat this as secondary to the two blockers above, but it would need either a new surface variant or a new atom if this unit were being modeled fully.
