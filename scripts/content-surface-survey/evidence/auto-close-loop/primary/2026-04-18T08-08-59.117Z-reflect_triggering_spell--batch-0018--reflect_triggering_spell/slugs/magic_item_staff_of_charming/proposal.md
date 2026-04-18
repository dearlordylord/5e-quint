## Staff of Charming

Outcome: `structural_widening`

The item partly fits the existing `magic_item` surface:

- `Cast Spell` fits an `activation` magic-item component with a `charge_pool`.
- `Reflect Enchantment` fits a `triggered_reaction` magic-item component in principle, because `reflect_triggering_spell` already exists.
- `Regaining Charges` and last-charge destruction both fit the current charge / dawn / destruction surface.

The blocker is `Resist Enchantment`. Its mechanic is a triggered save-outcome override that does **not** spend a Reaction and does **not** fit any existing magic-item component family honestly.

### Why this is structural

Current magic-item components are limited to:

- `passive`
- `activation`
- `triggered_reaction`

`Resist Enchantment` is none of those:

- not `passive`, because it fires only after a specific failed save;
- not `activation`, because it is not taken freely on your turn and is not an ordinary action/bonus/reaction activation;
- not `triggered_reaction`, because the text does not spend a Reaction.

Evidence:

> "If you fail a saving throw against an Enchantment spell that targets only you, you can turn your failed save into a successful one. You can't use this property of the staff again until the next dawn."

That forces a new triggered non-reaction mechanics family, or a widening of the existing triggered family so a trigger-bound item ability can resolve without consuming `reaction_quota`.

### Secondary surface gaps

Even after that family exists, two additional surface variants are still needed for an honest encoding:

1. Save-outcome trigger for spell-qualified self-targeted saves

Current `ReactionTrigger` can describe:

- `hit_by_attack_roll`
- `targeted_by_named_spell`
- `creature_casts_spell`
- `any_of`

It cannot describe:

- succeeding on a saving throw against a spell
- failing a saving throw against a spell
- filtering that spell by school (`Enchantment`)
- requiring that the spell target only you

Evidence:

> "If you succeed on a saving throw against an Enchantment spell that targets only you..."

> "If you fail a saving throw against an Enchantment spell that targets only you..."

2. Save-result substitution effect

The current `EffectAtom` set can grant advantage, numeric modifiers, negate or reflect a triggering spell, but it cannot say "change this failed save into a successful one."

Evidence:

> "you can turn your failed save into a successful one"

This is not just `modify_roll_advantage` or `modify_roll_numeric`; it changes the resolved outcome after the roll is known.

### Honest fit after widening

After widening, the item would fit as one `MagicItemRecord` with:

- `attunementRestriction = { kind = "class_list", classes = [...] }`
- `mechanics.family = "composite"`
- part 1: `activation` for the charge-cast spell list
- part 2: `triggered_reaction` for `Reflect Enchantment`
- part 3: new triggered non-reaction component for `Resist Enchantment`

### Notes

No `content/magic_item_staff_of_charming.dhall` was authored. Producing one today would require either omitting `Resist Enchantment` or lying about its timing/economy.
