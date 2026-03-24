// Source: https://rpg.stackexchange.com/q/153054
module _qa_8b6d724826311673 {
  import dnd.* from "./dnd"

  // Sunbeam: failed save deals full radiant damage and applies Blinded condition
  run qa_sunbeam_failed_save_blinds = {
    val creature = freshCreature(50)
    // Con save DC 12; target Con mod +2; d20=5 → total 7, fails
    val saveFailed = not(saveSucceeds(5, 2, false, 0, 0, 12))
    val s1 = pTakeDamage(creature, 30, Radiant, Set(), Set(), Set(), false)
    val s2 = pApplyCondition(s1, CBlinded)
    assert(saveFailed and s2.blinded and s2.hp == 20)
  }
  
  // Sunbeam: successful save deals half radiant damage and does NOT blind
  run qa_sunbeam_passed_save_no_blind = {
    val creature = freshCreature(50)
    // Con save DC 12; target Con mod +2; d20=15 → total 17, succeeds
    val saveSucceeded = saveSucceeds(15, 2, false, 0, 0, 12)
    val s1 = pTakeDamage(creature, 15, Radiant, Set(), Set(), Set(), false)
    // On a successful save creature is NOT blinded — CBlinded not applied
    assert(saveSucceeded and not(s1.blinded) and s1.hp == 35)
  }
  
  // Sunbeam: passing a prior save grants no ongoing protection — a later beam can still blind
  run qa_sunbeam_previous_pass_no_protection = {
    // Turn 1: creature passes save → takes half damage (15), not blinded
    val creature = freshCreature(50)
    val s1 = pTakeDamage(creature, 15, Radiant, Set(), Set(), Set(), false)
    // s1: hp=35, blinded=false (CBlinded not applied on successful save)
    // Turn 2: creature fails save against a new beam → full damage (30) + blinded
    val saveFailedAgain = not(saveSucceeds(4, 2, false, 0, 0, 12))
    val s2 = pTakeDamage(s1, 30, Radiant, Set(), Set(), Set(), false)
    val s3 = pApplyCondition(s2, CBlinded)
    assert(saveFailedAgain and not(s1.blinded) and s3.blinded and s3.hp == 5)
  }
}
