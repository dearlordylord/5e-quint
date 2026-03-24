// Source: https://rpg.stackexchange.com/q/165659
module _qa_b8562fdd7144247f {
  import dnd.* from "./dnd"

  // What happens when Aid ends on a target who has suffered maximum hp loss?
  run qa_aid_max_hp_reduction_independent = {
    val baseMaxHp = 20
    val aidBonus = 5
    val vampireMaxHpReduction = 5
    // Aid increases maxHp by 5: creature starts with maxHp = 25
    val afterAid = freshCreature(baseMaxHp + aidBonus)
    // Vampire bite reduces maxHp by 5 — modifier is independent of Aid's grant
    val afterBite = afterAid.with("maxHp", afterAid.maxHp - vampireMaxHpReduction)
    // Aid expires: maxHp drops by 5 again (not buffered by the prior reduction)
    val afterAidExpires = afterBite.with("maxHp", afterBite.maxHp - aidBonus)
    // Both reductions apply independently: final maxHp = base - vampire reduction = 15
    assert(afterAidExpires.maxHp == baseMaxHp - vampireMaxHpReduction)
  }
}
