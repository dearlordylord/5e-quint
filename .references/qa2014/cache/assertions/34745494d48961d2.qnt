// Source: https://rpg.stackexchange.com/q/122490
module _qa_34745494d48961d2 {
  import dnd.* from "./dnd"

  // Does changing race allow for the increase of ability scores beyond 20?
  run qa_ability_score_cap_at_20 = {
    val scores = Map(Str -> 14, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 20)
    val afterRacialAsi = pApplyASI(scores, Cha, 2)
    assert(afterRacialAsi.get(Cha) == 20)
  }
}
