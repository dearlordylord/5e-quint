`Holy Avenger` does not fit the current magic-item surface honestly.

Primary blocker: `structural_widening`

- The item combines three distinct mechanics:
  - passive weapon bonuses: `+3` to attack rolls and damage rolls made with the weapon;
  - an on-hit rider: extra `2d10 Radiant` damage when the hit target is a `Fiend` or `Undead`;
  - a held-weapon aura: a friendly-creature emanation that grants Advantage on saving throws against spells and other magical effects, with a larger radius for Paladins of level 17+.
- Current `MagicItemMechanics` can compose `passive`, `activation`, `triggered_reaction`, and `spawned_creature`, but it cannot include a mastery-style `on_hit_trigger` component. The extra-damage rider is not an activation, not a triggered reaction, and not expressible as a passive always-on modifier without lying about when it applies.

Secondary surface gaps

- The aura clause needs a save filter for `saving throws against spells and other magical effects`.
  - Existing `modify_roll_advantage` can target `saving_throw` broadly or narrow by save ability / attacker creature type, but it cannot narrow by save cause or magicality.
- The aura radius scales by Paladin class level (`10-foot` normally, `30-foot` at Paladin level `17+`).
  - Existing `Attachment.area.shape` supports fixed geometry only; it has no class-level threshold scaling for area size.

Why I did not author a subset

- Authoring only the `+3` weapon bonus would produce a misleadingly partial trace and hide the real fit problem.
- The on-hit radiant rider is a core combat mechanic of the item, not a minor rider.

Proposed widenings

1. `new_subgraph`: `magic_item_on_hit_trigger`
   - Justification: magic items need the same reusable on-hit window/mastery-style rider composition already modeled for `MasteryMechanics`, or `MagicItemComponentMechanics` needs to admit `on_hit_trigger` directly.
   - Evidence: "When you hit a Fiend or an Undead with it, that creature takes an extra 2d10 Radiant damage."

2. `new_variant`: target/type predicate for non-mastery on-hit riders
   - Justification: the rider only applies when the hit creature is one of a closed set of creature types (`Fiend` or `Undead`).
   - Evidence: "When you hit a Fiend or an Undead with it..."

3. `new_variant`: save-cause filter on `modify_roll_advantage`
   - Justification: the aura grants Advantage only on saving throws caused by spells and other magical effects, not on all saving throws.
   - Evidence: "have Advantage on saving throws against spells and other magical effects."

4. `new_variant`: class-level-threshold area scaling
   - Justification: the emanation radius changes from `10 feet` to `30 feet` at Paladin level `17+`.
   - Evidence: "If you have 17 or more levels in the Paladin class, the size of the Emanation increases to 30 feet."
