# Javelin of Lightning

## Verdict

`atom_widening`

The item's overall shape fits the existing `magic_item` kind and could plausibly be modeled as a composite of:

- a passive weapon rider; and
- a once-per-dawn activated ability.

I did not author `content/magic_item_javelin_of_lightning.dhall` because the passive half cannot be expressed honestly with the current effect vocabulary.

## Blocking gap

### New atom: `replace_weapon_damage_type`

The passive rider does not add extra damage and does not create a new damage instance. It rewrites the damage type of the weapon's normal hit, scoped to this item.

Evidence:

> Each time you make an attack roll with this magic weapon and hit, you can have it deal Lightning damage instead of Piercing damage.

Why existing atoms are insufficient:

- `damage` would create a separate damage packet, which is false.
- `modify_damage_numeric` changes amount, not type.
- `grant_resistance` / `grant_damage_immunity` target defenses, not outgoing weapon damage typing.
- `grant_spell_access` is unrelated; this is not spellcasting.

## Secondary gaps if the passive atom existed

### New variant: `area_exclusion.exclude_self`

The activated `Lightning Bolt` property is otherwise close to an item `activation`:

- `activationCost = replace_attack`
- `resource = use_count 1`
- `resetCadence = dawn`
- one `save_gate` phase
- fixed `DC 13`
- `line` area, `120 ft`, `5 ft` wide
- `damage` on fail, `half_damage` on success

But the line explicitly excludes the wielder, and the current area/attachment grammar has no exclusion flag.

Evidence:

> The target and each other creature in the Line (excluding you) makes a DC 13 Dexterity saving throw

### New subgraph: `return_thrown_item_to_hand`

The property also returns the same weapon to the wielder's hand immediately after the line damage resolves.

Evidence:

> Immediately after dealing this damage, the weapon reappears in your hand.

That is neither caller-owned flavor nor ordinary dismissal. It is deterministic item-state movement, but the current authored surface has no item-return effect/lifecycle to represent it.

## Why this is not `structural_widening`

No new top-level unit kind or mechanics family seems forced here. The family fit is still:

- `magic_item`
- `mechanics.family = "composite"`

The blocker is narrower: a missing effect atom for weapon-hit damage-type replacement, plus smaller follow-on gaps for the activated rider.
