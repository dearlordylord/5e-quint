## Javelin of Lightning

Outcome: `atom_widening`

The existing `magic_item` surface can represent the unit's overall shape as a composite item:

- a passive weapon-scoped rider
- an activated once-per-dawn throw mode

The blocker is the passive rider. The current surface has:

- `weaponFilter.specific_item` to scope an effect to this weapon
- `modify_damage_numeric` to change damage amount

It does not have an atom that changes the damage type of a weapon hit from one type to another. Encoding this as numeric damage, spell access, or a direct activation would be false.

### Missing atom

- `modify_damage_type`
  - Intended shape: a passive effect atom that can scope to a specific weapon and substitute one damage type for another on qualifying hits.
  - Pressure from unit text: "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

### Why this is atom pressure, not structural pressure

The top-level family already exists:

- `MagicItemRecord`
- `CompositeMagicItemMechanics`
- passive part for the hit rider
- activation part for `Lightning Bolt`

The missing concept is the effect itself, not the item's outer structure.

### Secondary note

The `Lightning Bolt` activation is close to encodable with current surface pieces:

- activation cost: `replace_attack`
- resource: fixed `use_count` 1
- reset cadence: `dawn`
- phase: `save_gate`
- DC source: fixed 13
- attachment: line area from self to chosen target
- effect: `damage` Lightning `4d6`, half on success

There is also a small follow-on lifecycle detail:

- "Immediately after dealing this damage, the weapon reappears in your hand."

That return behavior is real mechanics, but it is secondary here; the primary blocker is still the missing damage-type-substitution atom.
