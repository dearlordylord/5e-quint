## Robe of the Archmagi

Verdict: `atom_widening`

The unit fits the existing top-level shape as a `magic_item` with `PassiveMechanics`, but it does not fit the current surface honestly. I did not author `content/magic_item_robe_of_the_archmagi.dhall` because doing so would require lying about multiple rules.

### Why it does not fit cleanly

1. The robe raises spell save DC by 2.
   Evidence: "Your spell save DC and spell attack bonus each increase by 2."

   The current surface has:
   - `modify_roll_numeric` for rolls;
   - `modify_ac` for Armor Class;
   - no atom for modifying save DCs.

   This is not a new variant of an existing authored shape. It is a missing mechanics concept, so this forces a new atom such as `modify_save_dc` or a more general `modify_dc`.

2. The robe sets a passive base AC formula while unarmored.
   Evidence: "If you aren't wearing armor, your base Armor Class is 15 plus your Dexterity modifier."

   The surface can represent this formula only as ongoing-spell-specific `OngoingEffect.modify_ac_set_base`, not as a passive effect atom. `PassiveMechanics.grants` accepts `EffectAtom[]`, and `EffectAtom` does not include an AC-base replacement variant.

   This is a surface gap, not a new v4 atom: the taxonomy already has `modify_ac`. The authored surface needs a passive-capable `modify_ac` variant for base-setting semantics.

3. The robe's AC benefit is gated by "not wearing armor".
   Evidence: "If you aren't wearing armor..."

   `EquipmentPredicate` currently supports:
   - `always`
   - `wearing_armor`
   - `wielding_weapon`

   It cannot express the inverse unarmored predicate needed here. This is a surface widening.

4. Magic Resistance needs a magical-source filter on saving throws.
   Evidence: "You have Advantage on saving throws against spells and other magical effects."

   `modify_roll_advantage` can filter by:
   - roll kind;
   - attacker creature type;
   - save ability;
   - skill.

   It cannot narrow the bonus to saving throws caused by spells or other magical effects. This is a surface widening on an existing atom.

5. The spell attack bonus rider needs a spell-attack-only roll filter.
   Evidence: "Your spell save DC and spell attack bonus each increase by 2."

   `modify_roll_numeric` can target `attack_roll`, but it cannot distinguish spell attacks from weapon attacks. The surface needs a roll filter or attack filter variant that can say "spell attacks only". This is a surface widening on an existing atom.

6. The attunement restriction is more specific than the current record shape.
   Evidence: "Requires Attunement by a Sorcerer, Warlock, or Wizard"

   `MagicItemRecord` only has `requiresAttunement: boolean`; it cannot record class-restricted attunement eligibility. This is a secondary surface widening.

### Honest outcome

Because at least one required rule forces a genuinely new atom (`spell save DC +2`), the narrowest honest classification is `atom_widening`.

