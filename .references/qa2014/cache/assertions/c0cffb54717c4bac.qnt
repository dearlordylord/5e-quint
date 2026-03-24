// Source: https://rpg.stackexchange.com/q/115896
module _qa_c0cffb54717c4bac {
  import dnd.* from "./dnd"

  // Can you multiclass out of your starting class if you don't have the required stats for it?
  run qa_multiclass_blocked_when_current_class_prereq_unmet = {
    // Wizard with INT 12 (below 13 threshold) cannot multiclass to Fighter
    // even though STR 14 satisfies Fighter's prereq — both sides required (PHB p.163)
    val scores = Map(Str -> 14, Dex -> 10, Con -> 10, Int_ -> 12, Wis -> 10, Cha -> 10)
    assert(not(pCanMulticlass(scores, Wizard, Fighter)))
  }
  
  // Can you multiclass out of your starting class if you don't have the required stats for it?
  run qa_multiclass_allowed_when_both_prereqs_met = {
    // Wizard with INT 13 and STR 13: both Wizard and Fighter prereqs met → multiclass allowed
    val scores = Map(Str -> 13, Dex -> 10, Con -> 10, Int_ -> 13, Wis -> 10, Cha -> 10)
    assert(pCanMulticlass(scores, Wizard, Fighter))
  }
  
  // Can you multiclass out of your starting class if you don't have the required stats for it?
  run qa_multiclass_blocked_when_new_class_prereq_unmet = {
    // Fighter with STR 13 trying to multiclass into Monk: Monk requires DEX 13 AND WIS 13,
    // DEX 12 fails — new class prereq alone also blocks (same symmetrical rule)
    val scores = Map(Str -> 13, Dex -> 12, Con -> 10, Int_ -> 10, Wis -> 12, Cha -> 10)
    assert(not(pCanMulticlass(scores, Fighter, Monk)))
  }
}
