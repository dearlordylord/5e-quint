# Staff of the Woodlands

## Verdict

`surface_widening`

The existing `magic_item` + `composite` family is close:

- the quarterstaff bonus can use `modify_roll_numeric` + `modify_damage_numeric` with `weaponFilter = specific_item`;
- the held spell-attack bonus can use a passive `holding_item` gate;
- the spell table can use a held-item `activation` with `charge_pool`, `grant_spell_access.charge_cast`, `dawn` recharge, and `last_charge_roll` destruction;
- the attunement restriction already fits `class_list = ["druid"]`.

The blocker is `Tree Form`. The current surface can express `alter_item_kind`, but not the full reversible loop honestly.

## Missing surface pieces

### 1. Activation-side gate for touching a transformed item

The revert action is not available just because you own or hold the item. It is only available when:

- the staff is currently in its tree form; and
- you are touching that tree.

Current activation conditions only cover coarse equipment predicates such as `holding_item` and `wearing_item`. There is no way to say “this activation is available only while touching the transformed object created by an earlier item activation.”

Needed widening:

- `ActivatedAbilityMechanics.condition.touching_transformed_item`

Evidence:

> While touching the tree and using a Magic action, you return the staff to its normal form.

### 2. Fall-on-revert cleanup rider

When the tree returns to staff form, creatures in it fall. That is a deterministic mechanical consequence of the reversion, not DM agenda or flavor text.

`types.ts` currently has no surface expression for that cleanup rider.

Needed widening:

- `EffectAtom.fall_on_end`

Evidence:

> Any creature in the tree falls when the tree reverts to a staff.

## Why I did not author partial content

If I encoded only the passive bonuses and spellcasting, or encoded the tree transformation without the gated reversion and falling cleanup, the resulting trace would misrepresent the item's mechanics. The right classification is therefore `surface_widening`, with no authored `content/magic_item_staff_of_the_woodlands.dhall`.
