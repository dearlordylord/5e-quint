// Source: https://rpg.stackexchange.com/q/57678
module _qa_15126900f5a9ff19 {
  import dnd.* from "./dnd"

  // Do D&D 5E characters get the characteristics of both Classes AND Backgrounds?
  run qa_class_and_background_proficiencies_stack = {
      val pb = proficiencyBonus(1)     // level 1 -> +2
      val wisMod = abilityModifier(14) // -> +2
      val intMod = abilityModifier(10) // -> +0
      // Acolyte background grants Religion; Cleric class grants Medicine
      // Both proficiencies are active simultaneously — pb added to each check
      val religionCheck = checkSucceeds(8, intMod, Proficient, pb, 0, 10)  // 8+0+2=10 >= DC 10
      val medicineCheck = checkSucceeds(6, wisMod, Proficient, pb, 0, 10)  // 6+2+2=10 >= DC 10
      // Same rolls without any proficiency fail, confirming pb matters
      val religionNoProf = not(checkSucceeds(7, intMod, NoneProf, pb, 0, 10)) // 7+0+0=7 < DC 10
      assert(religionCheck and medicineCheck and religionNoProf)
  }
  
  // Do D&D 5E characters get the characteristics of both Classes AND Backgrounds?
  run qa_background_expertise_passive_check = {
      // Answerer cites Rogue with passive Wis 21+ via background-granted Perception + expertise
      val pb      = proficiencyBonus(5)       // level 5 -> +3
      val wisMod  = abilityModifier(16)       // 16 Wis -> +3
      // Expertise (background-sourced proficiency doubled): 10 + 3 + 6 = 19
      val passivePerc = passiveCheck(wisMod, Expertise, pb, false, false)
      assert(passivePerc == 19)
  }
}
