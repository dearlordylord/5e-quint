// Source: https://rpg.stackexchange.com/q/198686
module _qa_5c42050c10cf1ed6 {
  import dnd.* from "./dnd"

  // Is Resilient Sphere opaque and soundproof? — sphere grants total cover, blocking targeting
  run qa_resilient_sphere_total_cover_blocks_targeting = {
      assert(canBeTargeted(TotalCover) == false)
  }
  
  // Is Resilient Sphere opaque and soundproof? — total cover gives 0 AC bonus (targeting blocked, not AC gated)
  run qa_resilient_sphere_total_cover_zero_ac_bonus = {
      assert(coverBonus(TotalCover) == 0)
  }
  
  // Is Resilient Sphere opaque and soundproof? — sphere is transparent: bright light outside = unobscured inside, creature not blinded
  run qa_resilient_sphere_transparent_not_blinded = {
      val obs = pEffectiveObscurement(Bright, false)
      assert(obs == Unobscured and pBlindedByObscurement(obs) == false)
  }
  
  // Is Resilient Sphere opaque and soundproof? — if sphere WERE opaque (dark inside), creature would be blinded by heavy obscurement
  run qa_resilient_sphere_opaque_counterfactual_blinds = {
      val obs = pEffectiveObscurement(Dark, false)
      assert(obs == HeavilyObscured and pBlindedByObscurement(obs) == true)
  }
}
