## Staff of Power

Outcome: `surface_widening`

The current `magic_item` + `composite` surface can encode the staff's held bonuses, spell grants, attunement restriction, charge pool, and dawn recharge honestly. Two rule clusters do not fit the existing surface:

1. Last-charge resolution is richer than `ItemDestructionPolicy`.
The surface only supports `none`, `last_charge_roll` (destroy on threshold), and `permanent_on_empty`.
Staff of Power instead has a last-charge roll with two non-destruction outcomes:
- on `1`, the staff keeps only its quarterstaff attack/damage bonus and loses all other properties;
- on `20`, it regains `1d8 + 2` charges.

2. Retributive Strike needs damage linked to current remaining charges.
The blast damage is not fixed dice and not "charges spent from this activation" in the current sense. It reads the staff's current remaining charge pool:
- self damage: `16 times the number of charges in the staff`
- area damage: `4 times the number of charges in the staff`

3. Retributive Strike targets `each other creature in the area`.
The current area attachment shapes do not have an honest way to encode "everyone in the emanation except the wielder", while still handling the wielder separately with the 50% plane-travel avoidance branch.

## Suggested widenings

- `new_variant`: richer `ItemDestructionPolicy` outcome table for last-charge rolls.
- `new_variant`: `DiceAmount` / activation-resource linkage to current remaining pool (`resource_remaining`-style amount).
- `new_variant`: area attachment exclusion for self (`excludeSelf` or equivalent "other creatures in area" selector).

## Authored subset

The authored Dhall/JSON includes only the supported subset:
- magic quarterstaff `+2` attack and damage with this item
- while holding: `+2` AC, saving throws, and spell attack rolls
- charge-cast spell access
- `2d8 + 4` charges regained daily at dawn

The special last-charge roll and Retributive Strike are omitted intentionally rather than approximated.
