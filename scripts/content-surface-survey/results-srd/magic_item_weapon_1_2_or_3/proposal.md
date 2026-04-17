## Proposal: scope passive magic-weapon bonuses to the enchanted weapon

`Weapon, +1, +2, or +3` fits the existing `magic_item` + `passive` family in broad shape, and the surface already has the needed bonus payloads:

- `modify_roll_numeric` for attack-roll bonuses
- `modify_damage_numeric` for damage-roll bonuses
- `DiceDelta.kind = "magic_item_rarity_bonus"` for the rarity-tiered `+1/+2/+3`

The blocker is scoping. The item says:

> "You have a bonus to attack rolls and damage rolls made with this magic weapon. The bonus is determined by the weapon's rarity."

Current surface options cannot express "with this specific weapon":

- omitting filters would incorrectly grant the bonus to all attack rolls and damage rolls;
- `weaponFilter` only narrows by coarse category (`melee` / `ranged`), not by item identity;
- `PassiveMechanics.condition.wielding_weapon` is also coarse and would still overgrant to other wielded weapons of the same kind.

## Recommended widening

### `surface_widening`

Add a way for passive item grants to bind to the enchanted weapon itself rather than to all weapons in a category.

Candidate narrow fix:

- add a `WeaponFilter` variant such as `{"kind":"this_weapon"}` for item-authored attack/damage modifiers.

Why this is sufficient:

- the top-level family already exists (`magic_item` + `passive`);
- the effect shapes already exist (`modify_roll_numeric`, `modify_damage_numeric`);
- the rarity-scaled delta already exists (`magic_item_rarity_bonus`);
- only the target/scope of the modifier is missing from the authored surface.
