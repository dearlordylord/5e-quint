// Source: https://rpg.stackexchange.com/q/138896
module _qa_e8238fa30c6cad7a {
  import dnd.* from "./dnd"

  // How do multiple ghast stench fields work? — each requires a separate save; poisoned doesn't stack
  run qa_ghast_stench_separate_saves_each_fails = {
    // Two ghasts in range: fail both CON saves (DC 10) — creature ends up just poisoned
    val conMod = 0
    val profBonus = 2
    val dc = 10
    val save1 = saveSucceeds(4, conMod, false, profBonus, 0, dc)  // 4 < 10, fails
    val save2 = saveSucceeds(6, conMod, false, profBonus, 0, dc)  // 6 < 10, fails
    val s0 = freshCreature(20)
    val s1 = if (not(save1)) pApplyCondition(s0, CPoisoned) else s0
    val s2 = if (not(save2)) pApplyCondition(s1, CPoisoned) else s1
    // Despite failing two stench saves, creature is just poisoned — condition does not stack
    assert(s2.poisoned and s2 == pApplyCondition(s0, CPoisoned))
  }
  
  // How do multiple ghast stench fields work? — poisoned condition is idempotent regardless of source count
  run qa_ghast_stench_poisoned_idempotent = {
    // Applying CPoisoned N times is identical to applying it once
    val s0 = freshCreature(20)
    val s1 = pApplyCondition(s0, CPoisoned)
    val s2 = pApplyCondition(s1, CPoisoned)
    val s3 = pApplyCondition(s2, CPoisoned)
    assert(s1 == s2 and s2 == s3)
  }
  
  // How do multiple ghast stench fields work? — pass one save, fail another: still poisoned from the failed one
  run qa_ghast_stench_fail_one_of_two_still_poisoned = {
    // Save vs ghast A succeeds, save vs ghast B fails — result is still poisoned
    val conMod = 1
    val profBonus = 2
    val dc = 10
    val saveGhastA = saveSucceeds(15, conMod, false, profBonus, 0, dc)  // 15+1=16 >= 10, passes
    val saveGhastB = saveSucceeds(5,  conMod, false, profBonus, 0, dc)  // 5+1=6  < 10, fails
    val s0 = freshCreature(20)
    val s1 = if (not(saveGhastA)) pApplyCondition(s0, CPoisoned) else s0
    val s2 = if (not(saveGhastB)) pApplyCondition(s1, CPoisoned) else s1
    // Immunity from passing ghast A's save does not protect from ghast B's stench
    assert(saveGhastA and not(saveGhastB) and s2.poisoned)
  }
}
