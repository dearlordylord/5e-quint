// Source: https://rpg.stackexchange.com/q/174121
module _qa_edae158bd0fd2002 {
  import dnd.* from "./dnd"

  // Reincarnation effects on feats and ability scores: racial bonus cannot push score above 20
  run qa_reincarnation_ability_score_cap_at_20 = {
    // A character with Str 18 gains a +2 racial bonus after reincarnation; result is 20, not 22
    val scores = Map(Str -> 18, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    val result = pApplyASI(scores, Str, 2)
    assert(result.get(Str) == 20)
  }
  
  // Reincarnation effects on feats and ability scores: large racial bonus still hard-capped at 20
  run qa_reincarnation_large_racial_bonus_still_capped = {
    // Score at 19 + racial +4 would naively be 23; pApplyASI enforces the cap
    val scores = Map(Str -> 19, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 8)
    val result = pApplyASI(scores, Str, 4)
    assert(result.get(Str) == 20)
  }
  
  // Reincarnation effects on feats and ability scores: racial bonus from new race still respects cap on Cha
  run qa_reincarnation_cha_racial_bonus_capped = {
    // Original Cha 18, new race grants +2 Cha — final score is 20, not 20+
    val scores = Map(Str -> 10, Dex -> 10, Con -> 10, Int_ -> 10, Wis -> 10, Cha -> 18)
    val result = pApplyASI(scores, Cha, 2)
    assert(result.get(Cha) == 20)
  }
  
  // SKIP: Racial feat prerequisite loss (feat disabled until prerequisite regained) cannot be encoded —
  // the spec's Feature type only models FExtraAttack variants, not racial feats or their prerequisites.
}
