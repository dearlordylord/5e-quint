## Gloves of Missile Snaring

Outcome: `atom_widening`

This unit fits the existing top-level shape as a `magic_item` with `activation` mechanics and a `reaction` activation cost. I did not author `content/magic_item_gloves_of_missile_snaring.dhall` because the current surface cannot represent the item's primary effect honestly.

### Blocking gaps

1. `reduce_damage_taken` new atom

The item's main rule is not a bonus to AC, not resistance, and not a reroll. It reduces incoming damage after a hit by a rolled amount plus an ability modifier:

> "you can take a Reaction to reduce the damage by 1d10 plus your Dexterity modifier"

That needs a dedicated effect atom for post-hit damage reduction. Encoding this as `grant_resistance`, `modify_ac`, or any existing roll modifier would be false.

2. `weapon_filter.thrown` new surface variant

The reaction trigger can currently narrow `hit_by_attack_roll` with `WeaponFilter`, but `WeaponFilter` only supports:

- `weapon_category: "melee" | "ranged"`
- `specific_item`

This item needs the union "Ranged or Thrown weapon". Thrown melee weapons are not equivalent to `weapon_category = "ranged"`, so the current trigger surface cannot say this precisely.

3. `activation_requirement.free_hand` new surface variant

The reaction is gated by wearer state:

> "if you have a free hand"

Existing activated-ability mechanics have activation cost, resource, reset cadence, and phases, but no requirement/predicate field for a hand-availability precondition.

### Secondary omitted rider

If the damage is reduced to 0, the wearer may catch the ammunition or weapon:

> "If you reduce the damage to 0, you can catch the ammunition or weapon if it is small enough for you to hold in that hand."

I did not classify on this rider because the unit is already blocked by the missing primary damage-reduction atom. If the surface later gains `reduce_damage_taken`, this follow-up may need either:

- an object/weapon catch effect, or
- an explicit decision that ammo/weapon custody is caller-owned rather than core.

### Honest classification

This is not `structural_widening`: the existing `magic_item` + `activation` + `reaction` family is the right family.

This is not `clean` or `surface_widening` only: even with a better trigger filter and a free-hand predicate, the core reaction still lacks an effect atom.
