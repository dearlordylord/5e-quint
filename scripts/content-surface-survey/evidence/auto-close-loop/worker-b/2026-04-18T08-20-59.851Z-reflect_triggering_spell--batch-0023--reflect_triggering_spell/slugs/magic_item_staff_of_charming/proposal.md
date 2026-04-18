## Staff of Charming

Outcome: `surface_widening`

I did not author `content/magic_item_staff_of_charming.dhall` because the item does not fit the current surface honestly as a whole.

What fits today:

- `Cast Spell` fits the existing magic-item `activation` shape with a `charge_pool`, `grant_spell_access`, `holding_item` condition, `dawn` recharge, and `last_charge_roll` destruction.
- `Reflect Enchantment` fits the existing magic-item `triggered_reaction` shape:
  - trigger: `spell_save_outcome` with `outcome = "success"`, `spellSchool = "enchantment"`, `spellTargetsOnlySelf = true`
  - cost: Reaction + 1 charge
  - effect: `reflect_triggering_spell`

What does not fit honestly:

- `Resist Enchantment` says: "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn."

This forces two surface widenings:

1. Triggered non-reaction item property

- Current `TriggeredReactionAbilityMechanics` requires `activationCost.kind = "reaction"`.
- `Resist Enchantment` is trigger-bound, but the text does not spend a Reaction.
- The surface needs a triggered ability variant that can open on a trigger without consuming `reaction_quota`.

2. Trigger-save outcome override

- Current `EffectAtom` supports `negate_triggering_spell` and `reflect_triggering_spell`, but not "change the triggering failed saving throw into a success."
- This looks like missing surface support for an existing v4-style roll substitution / outcome override concept, not a new top-level family.

Evidence:

> "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one."

> "You can't use this property of the staff again until the next dawn."

Why this is not `structural_widening`:

- The unit still fits the existing `magic_item` top-level kind.
- The item is still naturally a `composite` magic item.
- The gap is in specific mechanics variants within that existing structure, not in needing a new top-level family.
