// Source: https://rpg.stackexchange.com/q/209282
module _qa_ff28370bed19eca6 {
  import dnd.* from "./dnd"

  // Ring of Revivification: casting Revivify expends the caster's own 3rd-level spell slot
  run qa_revivify_ring_expends_3rd_level_slot = {
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(3, 2))
      .with("slotsCurrent", EMPTY_SLOTS.set(3, 1))
    val ss1 = pExpendSlot(ss, 3)
    assert(ss1.slotsCurrent.get(3) == 0)
  }
  
  // Ring of Revivification: no 3rd-level slot means the ring cannot be used
  run qa_revivify_ring_blocked_when_no_3rd_slot = {
    assert(not(pCanCastAtLevel(FRESH_SPELL_SLOTS, 3, 3)))
  }
  
  // Ring of Revivification: a slot higher than 3rd still satisfies the requirement
  run qa_revivify_ring_higher_slot_qualifies = {
    val ss = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(4, 2))
      .with("slotsCurrent", EMPTY_SLOTS.set(4, 1))
    assert(pCanCastAtLevel(ss, 3, 4))
  }
  
  // Ring of Revivification: warlock pact slot of 3rd level qualifies (any spellcasting class)
  run qa_revivify_ring_warlock_pact_slot_eligible = {
    val ss = FRESH_SPELL_SLOTS
      .with("pactSlotsMax", 1)
      .with("pactSlotsCurrent", 1)
      .with("pactSlotLevel", 3)
    assert(pCanCastWithPactSlot(ss, 3))
  }
  
  // Ring of Revivification: it is Cast a Spell (not Use Magic Item), so a prior bonus-action spell blocks it
  run qa_revivify_ring_bonus_action_spell_blocks_cast = {
    val t = FRESH_TURN.with("bonusActionSpellCast", true)
    assert(not(canCastNonCantripAction(t)))
  }
  
  // Ring of Revivification: casting Revivify as an action marks it as a non-cantrip cast
  run qa_revivify_ring_action_marks_non_cantrip_spell = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, ACastSpell)
    val t2 = pMarkNonCantripActionSpell(t1)
    assert(t2.actionUsed and t2.nonCantripActionSpellCast)
  }
  
  // Ring of Revivification: spellcasting bonus uses the caster's own spellcasting ability
  run qa_revivify_ring_uses_own_spellcasting_ability = {
    // TEST_CONFIG: spellcastingAbility=Wis, Wis=13 -> mod=+1, level=5 -> profBonus=3 -> total=4
    val expected = abilityModifier(TEST_CONFIG.abilityScores.get(TEST_CONFIG.spellcastingAbility))
                   + proficiencyBonus(TEST_CONFIG.level)
    assert(spellcastingBonus(TEST_CONFIG) == expected)
  }
}
