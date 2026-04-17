## Talisman of Pure Good

Outcome: `structural_widening`

The current `MagicItemRecord` surface cannot encode this item honestly.

Primary blocker:

- `MagicItemMechanics` is a disjoint union of `PassiveMechanics | ActivatedAbilityMechanics`, but this item has both:
  - passive always-on rider: `+2` to spell attack rolls while worn or held;
  - passive hostile trigger: a Fiend or Undead that touches the talisman takes `8d6` Radiant damage, and takes it again each time it ends its turn holding or carrying the talisman;
  - activated charge ability: `Pure Rebuke`.

That forces a composite magic-item mechanics shape, not a single existing family.

Secondary gaps, even after composite mechanics:

- The passive bonus is specifically to `spell attack rolls`. `modify_roll_numeric` can target `attack_roll`, but the current surface has no spell-vs-weapon attack filter.
- The touch/holding punishment is an item-scoped triggered hazard. Current triggered grammars live under spell `ongoing_effect` operations only; passive magic items cannot express `on_touch` / `on_holder_turn_end` style triggers.
- `Pure Rebuke` gives Fiends and Undead disadvantage on the save while still targeting any creature. Current `save_gate` has no built-in conditional disadvantage rider keyed by target creature type.
- On a failed save, the target "falls into the fissure and is destroyed, leaving no remains." No current effect atom models deterministic creature destruction / removal from play.
- The attunement restriction "by a Cleric or Paladin" is narrower than the current boolean `requiresAttunement`.

Suggested widenings:

1. `MagicItemMechanics` composite/multi-mode variant
   - Needed so a single item can carry passive grants plus an activated charge ability.

2. Spell-attack roll filter on roll modifiers
   - Needed for "You gain a +2 bonus to spell attack rolls while you wear or hold it."

3. Item-scoped triggered passive operation grammar
   - Needed for "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."

4. Conditional save modifier by target creature type
   - Needed for "If the target is a Fiend or an Undead, it has Disadvantage on the save."

5. Deterministic destroy/remove-creature effect
   - Needed for "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."
