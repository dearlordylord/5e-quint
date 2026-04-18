`Staff of Charming` does not fit the current authored surface honestly, so no `content/magic_item_staff_of_charming.dhall` was written.

Why it blocks:

- The item has one shared 10-charge pool used by two different properties:
  - `Cast Spell` spends charges to cast one of several spells.
  - `Reflect Enchantment` spends 1 charge on a save-success reaction.
- The current `composite` magic-item shape gives each `activation` or `triggered_reaction` part its own `resource` and `resetCadence`. Duplicating the same 10-charge pool across parts would create redundant state and a false trace.
- `Resist Enchantment` is a triggered save-outcome conversion with no Reaction cost:
  - "If you fail a saving throw ... you can turn your failed save into a successful one."
  - Existing `TriggeredReactionAbilityMechanics` requires `activationCost.kind = "reaction"`.
  - Existing effect atoms include `reflect_triggering_spell` for the success case, but there is no atom for converting the triggering failed save into a success.

Proposed widenings:

1. `new_subgraph`: `shared_magic_item_resource_pool`
   - Add an item-level shared resource node that composite parts can consume by reference instead of each part owning an independent `resource`.
   - Forced by: "This staff has 10 charges ... Cast Spell ... expend 1 ... Reflect Enchantment ... expend 1 charge ... Regaining Charges. The staff regains 1d8 + 2 expended charges daily at dawn."

2. `new_variant` or `new_subgraph`: triggered non-reaction item property
   - Widen the non-spell triggered family so an item property can fire off a save outcome trigger without consuming a Reaction.
   - Forced by: "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn."

3. `new_atom`: `upgrade_triggering_save_outcome`
   - Deterministically replaces the triggering failed save result with success.
   - Forced by: "you can turn your failed save into a successful one."

What already fits once those gaps exist:

- Attunement restriction by class list.
- `Reflect Enchantment` can reuse the existing `spell_save_outcome` trigger shape plus `reflect_triggering_spell`.
- Last-charge destruction already fits `last_charge_roll`.
