# Staff of Power

## Verdict

`Staff of Power` does not fit the current authored surface honestly, so no `content/magic_item_staff_of_power.dhall` was written.

Outcome: `atom_widening`

## What fits already

- `MagicItemRecord` is the correct top-level kind.
- The spell table fits the existing charge-cast activation pattern:
  - `charge_pool` with cap 20
  - `grant_spell_access` for `cone_of_cold`, `fireball` at level 5, `globe_of_invulnerability`, `hold_monster`, `levitate`, `lightning_bolt` at level 5, `magic_missile`, `ray_of_enfeeblement`, and `wall_of_force`
  - `resetCadence.dawn` with regain `2d8 + 4`

## Why it does not fit honestly

### 1. Passive combat package is underspecified by the current surface

The item grants three distinct passive bonuses:

- `+2` to attack rolls made with this staff
- `+2` to damage rolls made with this staff
- `+2` to AC, saving throws, and spell attack rolls while holding it

Current gaps:

- `WeaponFilter` cannot scope a bonus to one specific item; it only distinguishes `melee` vs `ranged`.
- `RollKind` cannot target `spell_attack_roll` separately from generic `attack_roll`.
- There is no effect atom for a passive bonus to damage rolls.

The damage-roll bonus is the blocking gap: encoding the item without it would misstate one of its headline properties.

## 2. Last-charge behavior is not a simple destruction roll

Current `ItemDestructionPolicy.last_charge_roll` only models:

- expend the last charge
- roll a die
- destroy on a threshold

`Staff of Power` instead says:

- on `1`, it is not destroyed immediately but loses all properties except the quarterstaff `+2 attack/+2 damage` bonus
- on `20`, it regains `1d8 + 2` charges

That is a richer outcome table than the current destruction policy can express.

## 3. Retributive Strike forces more shape widening

Retributive Strike adds several unsupported mechanics:

- the area originates from the item itself: "a 30-foot Emanation originating from itself"
- the self-damage and area damage are fixed multiples of the staff's current charges
- the wielder has a 50 percent chance to avoid the explosion by instantly traveling to a random plane of existence

Specific pressures:

- `AreaOrigin` needs an item-origin variant.
- `DiceAmount.resource_spent` needs a multiplied form, not just `= charges spent`.
- The random-plane travel is at least a surface gap and likely caller/runtime-adjacent even if the damage were modeled.

## Minimal widening set

1. Add a new effect atom for passive damage-roll bonuses, e.g. `modify_damage_roll`.
2. Widen weapon scoping so passive modifiers can target a specific held item / weapon identity.
3. Widen roll targeting so `spell_attack_roll` can be modified independently.
4. Widen magic-item attunement metadata to express class-restricted attunement.
5. Widen last-charge policies to support nonbinary outcome tables.
6. Widen charge-based amounts to allow multiplied charge damage.
7. Widen area origin to support emanations from the item itself.

## Evidence

> This staff has 20 charges and can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it.

> While holding it, you gain a +2 bonus to Armor Class, saving throws, and spell attack rolls.

> If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges.

> The staff is destroyed and releases its magic in an explosion that fills a 30-foot Emanation originating from itself.

> If you fail to avoid the effect, you take Force damage equal to 16 times the number of charges in the staff. Each other creature in the area makes a DC 17 Dexterity saving throw. On a failed save, a creature takes Force damage equal to 4 times the number of charges in the staff.
