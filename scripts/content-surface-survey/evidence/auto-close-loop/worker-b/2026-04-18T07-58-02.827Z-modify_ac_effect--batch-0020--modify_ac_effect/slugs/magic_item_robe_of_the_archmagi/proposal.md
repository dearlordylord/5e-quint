## Robe of the Archmagi

Verdict: `surface_widening`

The unit fits the existing top-level shape as a `magic_item` with `PassiveMechanics`, but it still does not fit the current surface honestly. I did not author `content/magic_item_robe_of_the_archmagi.dhall` because one of its core passive benefits cannot be represented in `PassiveMechanics.grants`, and another needs a narrower filter than the current roll-advantage shape provides.

### Remaining gaps

1. Passive base-AC formula replacement

   Evidence: "If you aren't wearing armor, your base Armor Class is 15 plus your Dexterity modifier."

   The current surface can express this only as ongoing-spell-specific `modify_ac_set_base` inside `OngoingEffect`, as used by Mage Armor. `PassiveMechanics.grants` accepts only `EffectAtom[]`, and `EffectAtom` still has no variant for "set base AC to N + ability mod".

   This is a surface widening, not a new atom-family problem: the item is still a passive magic item, but passive items need access to the same base-AC replacement semantics that spells already have.

2. Source filter for saving-throw advantage vs magical effects

   Evidence: "You have Advantage on saving throws against spells and other magical effects."

   `modify_roll_advantage` can currently narrow by roll kind, attacker creature type, skill, and save ability, but not by the source of the save. Encoding this as blanket advantage on all saving throws would be false.

   This is a surface widening on an existing atom: `modify_roll_advantage` needs a source filter such as "against spells" / "against magical effects".

### What already fits

- Restricted attunement by class already fits via `attunementRestriction = { kind = "class_list", ... }`.
- The spell-save-DC bonus already fits via `modify_save_dc`.
- The spell-attack bonus already fits via `modify_roll_numeric` on `spell_attack_roll`.
- The unarmored equipment gate already fits via `EquipmentPredicate.unarmored`.

### Honest outcome

Because the unit's passive AC formula still cannot be expressed at all in the passive-grant surface, the honest outcome is `surface_widening`, and no content file was authored.
