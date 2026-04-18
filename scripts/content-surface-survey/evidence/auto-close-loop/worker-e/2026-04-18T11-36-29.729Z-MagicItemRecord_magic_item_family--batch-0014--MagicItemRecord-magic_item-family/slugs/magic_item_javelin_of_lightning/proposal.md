`Javelin of Lightning` does not fit the current authored surface cleanly, even though its overall top-level shape does.

What fits already:

- `magic_item` is the correct `UnitRecord` kind.
- `MagicItemMechanics.family = "composite"` is the right family shape for this item's split payload:
  - passive weapon rider
  - activated once-per-dawn throw rider
- The `Lightning Bolt` property mostly fits existing surface pieces:
  - `activationCost = { kind = "replace_attack" }`
  - `resource = use_count 1`
  - `resetCadence = dawn`
  - `save_gate` with fixed `DC 13`
  - `area` line damage with `half_damage` on success

Why it is still a widening:

1. Missing atom for weapon damage-type substitution

RAW evidence:

> "Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage."

The current surface can:

- add numeric bonuses to attack rolls or damage rolls
- add separate damage instances
- filter by specific weapon item

But it cannot express "the weapon's normal damage becomes a different damage type for this hit" without lying. Modeling this as extra lightning damage would be false, because RAW replaces Piercing with Lightning rather than adding damage.

Forced widening:

- new atom, tentatively `replace_weapon_damage_type`
- shape should support:
  - source scoped to a specific weapon item
  - replacement of an existing weapon damage type with another
  - optional/choice usage per qualifying hit

2. Missing authored support for item return / item motion

RAW evidence:

> "Immediately after dealing this damage, the weapon reappears in your hand."

The activated line-save effect resolves cleanly, but the surface has no honest atom for deterministic item relocation back to the wielder's hand after the throw resolves. This is the same general gap already noted elsewhere as thrown-item return / item-motion support.

Forced widening:

- new atom, tentatively `return_item_to_hand`
- or a broader item-motion atom that can encode deterministic relocation of the activated item

Classification

- `atom_widening`

Rationale:

- no new top-level unit kind or mechanics family is needed
- existing family composition is sufficient
- the blockers are missing effect atoms, not missing record structure
