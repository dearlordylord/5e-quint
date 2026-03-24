// Source: https://rpg.stackexchange.com/q/171218
module _qa_8703ad7affaa6ee5 {
  import dnd.* from "./dnd"

  // Preventing Counterspell: paralyzed creature cannot speak, blocking verbal component
  run qa_paralyzed_blocks_verbal_for_counterspell = {
    val creature = pApplyCondition(freshCreature(20), CParalyzed)
    // Counterspell has V,S components; paralyzed → pCanSpeak = false → verbal fails
    assert(not(pCanProvideComponents(creature, true, false, true)))
  }
  
  // Preventing Counterspell: petrified creature cannot speak, blocking verbal component
  run qa_petrified_blocks_verbal_for_counterspell = {
    val creature = pApplyCondition(freshCreature(20), CPetrified)
    assert(not(pCanProvideComponents(creature, true, false, true)))
  }
  
  // Preventing Counterspell: unconscious creature cannot speak, blocking verbal component
  run qa_unconscious_blocks_verbal_for_counterspell = {
    val creature = pApplyCondition(freshCreature(20), CUnconscious)
    assert(not(pCanProvideComponents(creature, true, false, true)))
  }
  
  // Preventing Counterspell: both hands occupied removes free hand, blocking somatic component
  run qa_no_free_hand_blocks_somatic_for_counterspell = {
    val creature = freshCreature(20)
    // hasFreeHand = false → somatic cannot be provided
    assert(not(pCanProvideComponents(creature, false, true, false)))
  }
  
  // Preventing Counterspell: surprised creature begins round with no reaction available
  run qa_surprised_no_reaction_for_counterspell = {
    val t = pStartTurn(TEST_CONFIG, freshCreature(20), Unarmored, true, 0, false, false)
    assert(not(t.reactionAvailable))
  }
  
  // Preventing Counterspell: reaction already expended (e.g. OA, readied action) blocks it
  run qa_expended_reaction_blocks_counterspell = {
    val t1 = pUseReaction(FRESH_TURN)
    // reaction is gone; second attempt is a no-op
    assert(not(t1.reactionAvailable) and pUseReaction(t1) == t1)
  }
  
  // Preventing Counterspell: darkness with no darkvision creates heavy obscurement, blinding counterspeller
  run qa_darkness_heavy_obscurement_blinds_counterspeller = {
    val obs = pEffectiveObscurement(Dark, false)
    assert(pBlindedByObscurement(obs))
  }
  
  // Preventing Counterspell: darkvision in darkness yields only lightly obscured, not blinding
  run qa_darkvision_in_dark_not_blinded = {
    val obs = pEffectiveObscurement(Dark, true)
    assert(not(pBlindedByObscurement(obs)))
  }
}
