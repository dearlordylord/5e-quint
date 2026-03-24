// Source: https://rpg.stackexchange.com/q/119801
module _qa_6986fb997a518c74 {
  import dnd.* from "./dnd"

  // Does innate spellcasting by creatures have verbal or somatic components?
  run qa_innate_spell_requires_verbal_and_somatic_by_default = {
      // Innate spells follow normal rules: V+S required unless trait says otherwise
      val creature = freshCreature(20)
      assert(pCanProvideComponents(creature, true, true, true))
  }
  
  // Does innate spellcasting by creatures have verbal or somatic components?
  run qa_innate_spell_verbal_blocked_when_paralyzed = {
      // Paralyzed creature cannot speak → cannot provide verbal component (V still required by innate spell)
      val creature = pApplyCondition(freshCreature(20), CParalyzed)
      assert(not(pCanProvideComponents(creature, true, true, true)))
  }
  
  // Does innate spellcasting by creatures have verbal or somatic components?
  run qa_innate_spell_somatic_blocked_without_free_hand = {
      // No free hand → somatic component fails even for an innate spell
      val creature = freshCreature(20)
      assert(not(pCanProvideComponents(creature, false, true, false)))
  }
  
  // Does innate spellcasting by creatures have verbal or somatic components?
  run qa_innate_spell_material_waived_verbal_somatic_still_needed_unconscious = {
      // "No material components" trait waives M only; V+S still required per normal rules.
      // Unconscious creature cannot speak → cannot satisfy verbal component.
      val creature = freshCreature(20)
          .with("unconscious", true)
          .with("prone", true)
          .with("incapacitatedSources", Set(ISUnconscious))
      assert(not(pCanProvideComponents(creature, true, true, true)))
  }
  
  // Does innate spellcasting by creatures have verbal or somatic components?
  run qa_innate_spell_unless_noted_waived_verbal_allows_casting = {
      // "Unless otherwise noted": if a trait explicitly waives V, a creature that cannot speak
      // can still satisfy remaining components (S=true with free hand).
      val creature = pApplyCondition(freshCreature(20), CParalyzed)
      // requiresVerbal=false (trait waived it), requiresSomatic=true, hasFreeHand=true
      assert(pCanProvideComponents(creature, false, true, true))
  }
}
