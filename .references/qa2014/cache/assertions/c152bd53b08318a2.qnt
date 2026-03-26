// Source: https://rpg.stackexchange.com/q/215478
module _qa_c152bd53b08318a2 {
  import dnd.* from "./dnd"

  // Beast Master companion: unrestricted actions contrast with controlled mount (Dash/Disengage/Dodge only)
  run qa_beast_companion_unrestricted_actions = {
    val companion = freshCreature(20)
    // Controlled mount is restricted to exactly Dash, Disengage, Dodge (PHB mounted combat rules)
    val mountCanDash      = pIsValidControlledMountAction(ADash)
    val mountCanDisengage = pIsValidControlledMountAction(ADisengage)
    val mountCanDodge     = pIsValidControlledMountAction(ADodge)
    val mountCannotHelp   = not(pIsValidControlledMountAction(AHelp))
    val mountCannotSearch = not(pIsValidControlledMountAction(ASearch))
    val mountCannotHide   = not(pIsValidControlledMountAction(AHide))
    // Beast companion has no equivalent restriction: Help, Search, Hide all consume the action normally
    val afterHelp   = pUseAction(FRESH_TURN, companion, AHelp)
    val afterSearch = pUseAction(FRESH_TURN, companion, ASearch)
    val afterHide   = pUseAction(FRESH_TURN, companion, AHide)
    assert(and {
      mountCanDash, mountCanDisengage, mountCanDodge,
      mountCannotHelp, mountCannotSearch, mountCannotHide,
      afterHelp.actionsRemaining == 0,
      afterSearch.actionsRemaining == 0,
      afterHide.actionsRemaining == 0,
    })
  }
}
