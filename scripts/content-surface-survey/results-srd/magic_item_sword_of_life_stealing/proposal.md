## Sword of Life Stealing

Outcome: `structural_widening`

This item does not fit the current authored surface honestly.

The top-level `magic_item` kind exists, but neither supported `MagicItemMechanics` family works:

- `passive` only grants always-on effects with no trigger grammar.
- `activation` models player-initiated uses with resource/reset cadence, which is false for this item.

The core mechanic is a weapon-hit rider that fires only on a natural 20 with the item:

> "When you attack a creature with this magic weapon and roll a 20 on the d20 for the attack roll, that target takes an extra 15 Necrotic damage ..."

That is not an always-on passive bonus, and it is not an activated ability. The closest existing family is `on_hit_trigger`, but it is currently only available for `MasteryRecord`, and its trigger vocabulary only distinguishes `weapon_hit` / `weapon_hit_melee_only`, not `natural_20_with_this_weapon`.

Secondary pressure remains even if the family is widened:

- The damage rider is gated by target creature type:
  > "... if it isn't a Construct or an Undead ..."
- The temporary hit points are linked to the amount of Necrotic damage actually taken:
  > "... and you gain Temporary Hit Points equal to the amount of Necrotic damage taken."

The linked-amount half is already supported (`grant_temp_hp` can use linked damage), but the trigger/family and target-type gating are not available on magic items.

## Proposed widenings

1. `new_subgraph`: shared non-spell `on_hit_trigger` / reactive-hit family for magic items
   - Justification: this item is an always-present weapon rider that resolves from an attack event, not from activation or passive static grants.
   - Evidence: "When you attack a creature with this magic weapon ..."

2. `new_variant`: crit-specific hit trigger
   - Justification: existing trigger grammar can express a weapon hit, but not "roll a 20 on the d20 for the attack roll".
   - Evidence: "... and roll a 20 on the d20 for the attack roll ..."

3. `new_variant`: target creature-type exclusion on the rider
   - Justification: the extra damage and THP rider are suppressed against Constructs and Undead.
   - Evidence: "... if it isn't a Construct or an Undead ..."
