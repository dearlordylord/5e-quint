`Talisman of Ultimate Evil` does not fit the current `MagicItemRecord` surface honestly.

Primary classification: `structural_widening`.

Why it does not fit:

- The item has two distinct mechanics families at once:
  - a passive harmful rider: "A creature that isn't a Fiend or an Undead that touches the talisman takes 8d6 Necrotic damage and takes the damage again each time it ends its turn holding or carrying the talisman."
  - a passive bonus: "You gain a +2 bonus to spell attack rolls while you wear or hold it."
  - an activated charge-based ability: "While wearing or holding the talisman, you can take a Magic action to expend 1 charge..."
- Current `MagicItemMechanics` is `PassiveMechanics | ActivatedAbilityMechanics`. It cannot express one item that is simultaneously passive and activated.
- Even if mixed-family composition existed, the passive harmful rider is not expressible as today's `PassiveMechanics`, which only supports always-on grant lists. The talisman needs an item-owned triggered damage subgraph keyed off touch and repeated end-of-turn holding/carrying.

Secondary gaps exposed by this item:

1. `new_subgraph`: `magic_item_mixed_mechanics`
   - Justification: one magic item must carry passive grants and a separate activated ability simultaneously.
   - Evidence: "You gain a +2 bonus to spell attack rolls while you wear or hold it." and "While wearing or holding the talisman, you can take a Magic action to expend 1 charge..."

2. `new_subgraph`: `item_contact_or_possession_trigger`
   - Justification: the passive harm is not an always-on modifier; it is triggered on touch, then repeats at end of turn while the creature continues holding or carrying the item.
   - Evidence: "A creature that isn't a Fiend or an Undead that touches the talisman takes 8d6 Necrotic damage and takes the damage again each time it ends its turn holding or carrying the talisman."

3. `new_variant`: target-side save disadvantage conditioned on target creature type
   - Justification: existing `save_gate` can express the save and damage branches, but not "if the target is a Celestial, it has Disadvantage on the save."
   - Evidence: "If the target is a Celestial, it has Disadvantage on the save."

4. `new_atom`: `destroy_target`
   - Justification: the failure branch deterministically annihilates the creature, not just deals damage or applies a condition.
   - Evidence: "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."

Notes:

- `charge_pool` and `permanent_on_empty` already fit the activation half.
- "You can use the talisman as a Holy Symbol" is not the main blocker here. It looks like equipment/spellcasting-focus affordance rather than a currently modeled core combat atom.
