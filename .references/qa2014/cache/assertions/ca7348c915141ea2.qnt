// Source: https://rpg.stackexchange.com/q/88334
module _qa_ca7348c915141ea2 {
  import dnd.* from "./dnd"

  // What are the Physical Stat enhancing versions of 'Tomes'?
  // Manuals of Gainful Exercise (Str), Bodily Health (Con), Quickness of Action (Dex) use identical pApplyASI mechanics as mental Tomes
  run qa_manuals_increase_physical_stats_like_tomes = {
    val baseScores = Map(Str -> 16, Dex -> 14, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    // Each Manual grants +2 to its physical stat, same delta as each Tome to its mental stat
    val afterManualStr = pApplyASI(baseScores, Str, 2)
    val afterManualCon = pApplyASI(baseScores, Con, 2)
    val afterManualDex = pApplyASI(baseScores, Dex, 2)
    val afterTomeInt   = pApplyASI(baseScores, Int_, 2)
    val afterTomeWis   = pApplyASI(baseScores, Wis, 2)
    val afterTomeCha   = pApplyASI(baseScores, Cha, 2)
    assert(
      // Physical manual deltas equal mental tome deltas — same mechanic
      afterManualStr.get(Str) - baseScores.get(Str) == afterTomeInt.get(Int_) - baseScores.get(Int_) and
      afterManualCon.get(Con) - baseScores.get(Con) == afterTomeWis.get(Wis)  - baseScores.get(Wis)  and
      afterManualDex.get(Dex) - baseScores.get(Dex) == afterTomeCha.get(Cha)  - baseScores.get(Cha)  and
      // Concrete +2 outcomes for each physical manual
      afterManualStr.get(Str) == 18 and
      afterManualCon.get(Con) == 16 and
      afterManualDex.get(Dex) == 16 and
      // Cap at 20 applies equally to physical and mental scores
      pApplyASI(Map(Str -> 19, Dex -> 14, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8), Str,  2).get(Str)  == 20 and
      pApplyASI(Map(Str -> 14, Dex -> 14, Con -> 14, Int_ -> 19, Wis -> 13, Cha -> 8), Int_, 2).get(Int_) == 20
    )
  }
}
