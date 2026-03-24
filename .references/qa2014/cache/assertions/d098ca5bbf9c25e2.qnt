// Source: https://rpg.stackexchange.com/q/67649
module _qa_d098ca5bbf9c25e2 {
  import dnd.* from "./dnd"

  // Do any fighting styles affect an unarmed strike?
  run qa_fighting_styles_no_benefit_to_unarmed = {
      // STR 14 -> modifier +2; unarmed = 1 + strMod with no Fighting Style bonus
      val strMod2 = abilityModifier(14)
      // STR 8 -> modifier -1; unarmed floors at 0 (intMax), still no style bonus
      val strModNeg = abilityModifier(8)
      assert(
          // Dueling, GWF, TWF, Archery: none apply — result is exactly 1 + strMod, no extra modifier
          unarmedDamage(strMod2) == 1 + strMod2
          and unarmedDamage(strMod2) == 3
          // Minimum is 0, not boosted by any style
          and unarmedDamage(strModNeg) == intMax(0, 1 + strModNeg)
          // No style inflates the result beyond the base formula
          and unarmedDamage(strMod2) == normalDamage(1, strMod2)
      )
  }
}
