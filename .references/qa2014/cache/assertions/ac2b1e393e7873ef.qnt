// Source: https://rpg.stackexchange.com/q/142771
module _qa_ac2b1e393e7873ef {
  import dnd.* from "./dnd"

  // Can you train your ranger to master different fighting styles?
  run qa_extra_attack_at_level5_before_multiclass_dip = {
    // Accepted answer: wait until level 5 (Extra Attack) before dipping Fighter
    val config = TEST_CONFIG.with("features", Set(FExtraAttack))
    val creature = freshCreature(30)
    val t = pStartTurn(config, creature, Unarmored, false, 0, false, false)
    assert(t.extraAttacksRemaining == 1)
  }
  
  // Can you train your ranger to master different fighting styles?
  run qa_no_extra_attack_without_feature = {
    // Without FExtraAttack (pre-level-5 ranger), no extra attacks
    val config = TEST_CONFIG.with("features", Set())
    val creature = freshCreature(30)
    val t = pStartTurn(config, creature, Unarmored, false, 0, false, false)
    assert(t.extraAttacksRemaining == 0)
  }
  
  // Can you train your ranger to master different fighting styles?
  run qa_fighter_multiclass_prereq_str_or_dex_13 = {
    // Fighter multiclass requires STR 13 or DEX 13; both paths valid
    val scoresViaDex = Map(Str -> 10, Dex -> 13, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10)
    val scoresViaStr = Map(Str -> 13, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10)
    val scoresFail   = Map(Str -> 12, Dex -> 12, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 10)
    assert(
      pMeetsMulticlassPrereq(scoresViaStr, Fighter) and
      pMeetsMulticlassPrereq(scoresViaDex, Fighter) and
      not(pMeetsMulticlassPrereq(scoresFail, Fighter))
    )
  }
  
  // Can you train your ranger to master different fighting styles?
  run qa_twf_offhand_no_positive_ability_mod = {
    // TWF off-hand attack: positive STR/DEX mod NOT added (PHB two-weapon fighting rule)
    val dmg = pTWFOffHandDamage(6, 3)
    assert(dmg == 6)
  }
  
  // Can you train your ranger to master different fighting styles?
  run qa_twf_offhand_negative_mod_applied = {
    // TWF off-hand attack: negative ability mod IS subtracted
    val dmg = pTWFOffHandDamage(4, -2)
    assert(dmg == 2)
  }
}
