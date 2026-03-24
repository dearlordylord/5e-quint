// Source: https://rpg.stackexchange.com/q/120041
module _qa_1f9f88b2a43a2dbd {
  import dnd.* from "./dnd"

  // Robe of Eyes forces gaze saves: failing first CON save (DC 12) causes Restrained
  run qa_robe_of_eyes_first_gaze_save_failure_restrained = {
    val conMod = 2
    val dc = 12
    val roll = 5 // 5 + 2 = 7 < 12, fails
    val creature = freshCreature(20)
    val saveFailed = not(saveSucceeds(roll, conMod, false, 0, 0, dc))
    val afterSave = if (saveFailed) pApplyCondition(creature, CRestrained) else creature
    assert(saveFailed and afterSave.restrained)
  }
  
  // Already Restrained by basilisk gaze must repeat CON save next turn; failure → Petrified
  run qa_robe_of_eyes_second_gaze_save_failure_petrified = {
    val conMod = 1
    val dc = 12
    val roll = 6 // 6 + 1 = 7 < 12, fails
    val creature = pApplyCondition(freshCreature(20), CRestrained)
    val saveFailed = not(saveSucceeds(roll, conMod, false, 0, 0, dc))
    val afterSave = if (saveFailed) pApplyCondition(creature, CPetrified) else creature
    assert(saveFailed and afterSave.petrified and afterSave.restrained
      and afterSave.incapacitatedSources.contains(ISPetrified))
  }
  
  // Full progression: fail first save → Restrained, fail second save → Petrified
  // (second save triggers regardless of eye aversion per accepted answer)
  run qa_robe_of_eyes_full_progression_to_petrified = {
    val conMod = 0
    val dc = 12
    val creature = freshCreature(20)
    val s1 = if (not(saveSucceeds(5, conMod, false, 0, 0, dc)))
      pApplyCondition(creature, CRestrained) else creature
    val s2 = if (not(saveSucceeds(4, conMod, false, 0, 0, dc)))
      pApplyCondition(s1, CPetrified) else s1
    assert(s1.restrained and s2.petrified)
  }
  
  // Restrained by gaze imposes no disadvantage on CON saves (only DEX saves are penalised)
  run qa_robe_of_eyes_restrained_no_con_save_penalty = {
    val creature = pApplyCondition(freshCreature(20), CRestrained)
    val mods = pSaveModifiers(creature, Con)
    assert(not(mods.hasDisadvantage) and not(mods.autoFail))
  }
}
