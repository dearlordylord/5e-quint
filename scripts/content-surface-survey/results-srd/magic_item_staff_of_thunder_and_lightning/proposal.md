## Staff of Thunder and Lightning

Outcome: `structural_widening`

The item does not fit the current `MagicItemRecord` surface honestly.

### Why it does not fit

The current surface allows exactly one `MagicItemMechanics` payload:

- `passive`
- or `activation`

This staff needs all of the following at once:

- a passive weapon bonus while wielding the staff;
- two optional no-action on-hit properties (`Lightning`, `Thunder`);
- one optional Bonus Action follow-up property (`Thunder and Lightning`) that composes the first two without spending their daily uses;
- two separate Magic-action activations (`Lightning Strike`, `Thunderclap`);
- independent once-per-dawn tracking for each named property.

That is not one passive payload and not one activation payload. It is a bundle of multiple named item abilities with distinct trigger/cost/resource shapes.

### Primary widening forced

1. `new_subgraph`: `magic_item_ability_set`

Justification:
The item needs a top-level magic-item shape that can hold multiple named abilities, each with its own family, activation/trigger, and reset policy, while also carrying shared passive grants on the same item.

Evidence:
`"It also has the following additional properties. Once one of these properties is used, it can't be used again until the next dawn."`

Evidence:
`"Lightning. When you hit with a melee attack using the staff, you can cause the target to take an extra 2d6 Lightning damage (no action required)."`

Evidence:
`"Thunder and Lightning. Immediately after you hit with a melee attack using the staff, you can take a Bonus Action to use the Lightning and Thunder properties ... Doing so doesn't expend the daily use of those properties, only the use of this one."`

Evidence:
`"Lightning Strike. You can take a Magic action ..."`

### Secondary gaps exposed once the structural issue is solved

1. `new_atom`: `modify_damage_roll_numeric`

Justification:
The passive staff bonus applies to damage rolls made with this weapon. The surface has `modify_roll_numeric` for attack/save/check rolls, but no passive atom for weapon damage-roll bonuses.

Evidence:
`"This staff can be wielded as a magic Quarterstaff that grants a +2 bonus to attack rolls and damage rolls made with it."`

2. `new_variant`: `weapon_filter.specific_item_or_weapon`

Justification:
The passive +2 applies to attacks and damage made with this specific staff, not to all melee weapons. Current `WeaponFilter` only distinguishes `melee` vs `ranged`, which is too coarse.

Evidence:
`"made with it"`

### Notes

- The audible thunder clauses (`audible out to 300 feet` / `600 feet`) are secondary to the structural blocker. Depending on how strictly the surface treats notification-style outputs, they may need a later caller-owned or signal-style treatment, but they are not the main reason this unit fails today.
