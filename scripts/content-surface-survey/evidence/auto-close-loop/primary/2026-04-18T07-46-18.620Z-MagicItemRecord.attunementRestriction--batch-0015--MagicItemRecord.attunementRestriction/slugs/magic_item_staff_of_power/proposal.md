# Staff of Power

Verdict: `surface_widening`

`Staff of Power` fits the existing `magic_item` kind and `composite` mechanics family in broad shape:

- passive held-item bonuses on the quarterstaff and on the wielder;
- charge-pool spellcasting with dawn recharge;
- an activated destructive ability (`Retributive Strike`).

I did **not** author `content/magic_item_staff_of_power.dhall` because the current surface cannot encode the full unit honestly without inventing behavior.

## Blocking gaps

1. `Retributive Strike` damage is keyed to **remaining charges in the staff**, not to charges spent by the activation.

Current `DiceAmount` can express:

- fixed dice / flat values;
- level scaling;
- `resource_spent`;
- linked damage.

It cannot express "damage equals N times current charges remaining in this item's charge pool".

RAW pressure:

> "you take Force damage equal to 16 times the number of charges in the staff"

> "On a failed save, a creature takes Force damage equal to 4 times the number of charges in the staff"

Needed widening: a new `DiceAmount` (or adjacent amount-source) variant that reads the current remaining value of the enclosing magic item's `charge_pool`, optionally multiplied by a constant.

2. The last-charge failure produces a **degraded item state**, not destruction and not a fully nonmagical item.

Current `ItemDestructionPolicy` supports:

- `none`
- `last_charge_roll`
- `permanent_on_empty`

None can express: retain the staff's +2 quarterstaff attack/damage bonus, but lose the held AC / saves / spell-attack bonuses, spellcasting, recharge, and retributive strike.

RAW pressure:

> "On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties."

Needed widening: a lifecycle / degradation variant for partial property loss on a last-charge roll, likely by naming which mechanics parts remain active versus which are suppressed.

## Non-blocking observations

- The attunement restriction (`Sorcerer, Warlock, or Wizard`) already fits `MagicItemAttunementRestriction.class_list`.
- The held passive bonuses fit existing atoms:
- `modify_roll_numeric` for attack rolls, saving throws, and spell attack rolls;
- `modify_damage_numeric` for damage rolls made with the staff;
- `modify_ac` for AC.
- The spell table fits existing `grant_spell_access.mode = charge_cast`.
- The 50% avoidance branch in `Retributive Strike` can be modeled in principle with the existing `random_table` phase plus `transport_exile` to `different_plane`.
- The area save for other creatures fits `save_gate` with a fixed DC 17 and `half_damage` on success.

The only reason to stop authoring is that the current surface cannot represent the item's full deterministic mechanics without lying about either the retributive damage amount or the post-depletion degraded state.
