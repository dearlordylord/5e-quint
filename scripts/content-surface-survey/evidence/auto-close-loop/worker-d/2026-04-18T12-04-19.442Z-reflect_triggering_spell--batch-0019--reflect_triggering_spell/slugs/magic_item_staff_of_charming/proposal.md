`Staff of Charming` does not fit the current surface honestly, so no authored `content/magic_item_staff_of_charming.dhall` was produced.

What fits already:

- `magic_item` with `composite` mechanics.
- Class-list attunement restriction for Bard, Cleric, Druid, Sorcerer, Warlock, Wizard.
- A held-item `activation` part with a `charge_pool`, `dawn` recharge, and `grant_spell_access` for `charm_person`, `command`, and `comprehend_languages`.
- A held-item `triggered_reaction` part for **Reflect Enchantment** using:
  - trigger `spell_save_outcome` with `outcome = "success"`,
  - `spellSchool = "enchantment"`,
  - `spellTargetsOnlySelf = true`,
  - charge-pool consumption,
  - `reflect_triggering_spell`.
- Last-charge destruction via `ItemDestructionPolicy.last_charge_roll`.

Why it still fails:

- **Resist Enchantment** says: "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn."
- The existing trigger-bound non-spell family is `TriggeredReactionAbilityMechanics`, and it hard-requires `activationCost.kind = "reaction"`. `Resist Enchantment` is not a Reaction in the source text.
- The existing effect vocabulary also has no honest way to say "replace the triggering failed save with a success". `interrupt_resolution` alone is not enough, and `reflect_triggering_spell` is the wrong mechanic.

Required widenings:

1. Surface widening: allow a trigger-bound non-spell item ability that does not consume a reaction.
   - Candidate shape: widen `TriggeredReactionAbilityMechanics` into a more general triggered-interrupt family, or widen `ClassFeatureActivationCost` with a non-reaction triggered/no-action variant.
2. Atom widening: add an effect/subgraph for replacing the triggering saving-throw outcome.
   - Candidate name: `replace_triggering_save_outcome` or `turn_failed_save_to_success`.

Evidence:

> "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one."

This is not DM-agenda; it is deterministic core mechanics. The current gap is representational.
