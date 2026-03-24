// Source: https://rpg.stackexchange.com/q/102066
module _qa_224cd857867a96cb {
  import dnd.* from "./dnd"

  // Can an Unseen Servant do things that require ability checks?
  // Rule: simple tasks require no ability check; tasks needing checks (lock pick, pickpocket) exceed Unseen Servant's scope.
  run qa_unseen_servant_no_ability_checks = {
    // Simple task (fetching, folding, serving): no check required — modeled as DC 0, any roll succeeds
    val simpleTaskNeedsNoCheck = checkSucceeds(1, 0, NoneProf, 0, 0, 0)
  
    // Lock picking is a Dex (Thieves' Tools) check, DC 15 — this IS an ability check.
    // Unseen Servant has no stats; even a median roll (9) with no modifier or proficiency fails.
    // Spell grants no explicit check permission (contrast: Mage Hand Legerdemain does).
    val lockPickingFailsWithoutCheckGrant = not(checkSucceeds(9, 0, NoneProf, 0, 0, 15))
  
    assert(simpleTaskNeedsNoCheck and lockPickingFailsWithoutCheckGrant)
  }
}
