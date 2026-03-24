// Source: https://rpg.stackexchange.com/q/51021
module _qa_23768542e1947e0c {
  import dnd.* from "./dnd"

  // Sage background specialty is purely flavor — no mechanical benefit beyond listed proficiencies/languages/Researcher
  run qa_sage_specialty_is_pure_flavor = {
    // The spec has no function or state that encodes background specialties.
    // We can only assert that two otherwise-identical characters (one with
    // "alchemist specialty" context, one without) produce the same mechanical
    // outcomes — but since specialty is not a field in CharConfig or CreatureState,
    // the spec already encodes this: there is nothing to differ on.
    //
    // Concretely: a Sage's Arcana check result depends only on ability scores,
    // proficiency, and the roll — not on which specialty was chosen.
    val config = TEST_CONFIG  // level 5, Int_ 10
    val profBonus = proficiencyBonus(config.level)  // 3
    val intMod = abilityModifier(config.abilityScores.get(Int_))  // 0
  
    // A Sage with Arcana proficiency (Arcana -> Int_)
    val withArcanaProficiency = checkSucceeds(12, intMod, Proficient, profBonus, 0, 15)
    // Same character with "alchemist" specialty vs "astronomer" specialty:
    // both produce identical check results because specialty adds no mechanic.
    val alchemistSpecialtySageCheck = checkSucceeds(12, intMod, Proficient, profBonus, 0, 15)
    val astronomerSpecialtySageCheck = checkSucceeds(12, intMod, Proficient, profBonus, 0, 15)
  
    assert(
      // Specialty choice has no effect on any check result
      alchemistSpecialtySageCheck == astronomerSpecialtySageCheck
      // And the value is what the math says it should be: 12 + 0 + 3 = 15 >= 15
      and withArcanaProficiency == true
    )
  }
}
