// Source: https://rpg.stackexchange.com/q/141620
module _qa_aea1334a990e4659 {
  import dnd.* from "./dnd"

  // If a half-feat's +1 targets an ability already at 20, the increase is wasted and cannot be redirected
  run qa_feat_asi_cannot_redirect_when_at_cap = {
    val scores = Map(Str -> 14, Dex -> 12, Con -> 14, Int_ -> 20, Wis -> 13, Cha -> 8)
    // Keen Mind-style feat specifies Int_ +1, but Int_ is already at 20
    val afterFeatAsi = pApplyASI(scores, Int_, 1)
    assert(
      // Int_ stays capped at 20 — the +1 is absorbed but cannot exceed the cap
      afterFeatAsi.get(Int_) == 20
      // No other ability score changes — the surplus cannot be redirected
      and afterFeatAsi.get(Str) == scores.get(Str)
      and afterFeatAsi.get(Dex) == scores.get(Dex)
      and afterFeatAsi.get(Con) == scores.get(Con)
      and afterFeatAsi.get(Wis) == scores.get(Wis)
      and afterFeatAsi.get(Cha) == scores.get(Cha)
    )
  }
}
