// -*- mode: Bluespec; -*-

module battleRuntimeFindFamiliarSelectedIdentityMbt {
  var qFamiliarStatus: str
  var qFormId: str
  var qFamiliarCombatantPresent: bool
  var qReplacementCombatantPresent: bool
  var qFamiliarReactionAvailable: bool
  var qOwnerActionAvailable: bool
  var qOwnerSpellSlotCommitted: bool
  var qTargetHp: int
  var qLastResult: str

  action recordFindFamiliarState(
    familiarStatus: str,
    formId: str,
    familiarCombatantPresent: bool,
    replacementCombatantPresent: bool,
    familiarReactionAvailable: bool,
    ownerActionAvailable: bool,
    ownerSpellSlotCommitted: bool,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qFamiliarStatus' = familiarStatus,
    qFormId' = formId,
    qFamiliarCombatantPresent' = familiarCombatantPresent,
    qReplacementCombatantPresent' = replacementCombatantPresent,
    qFamiliarReactionAvailable' = familiarReactionAvailable,
    qOwnerActionAvailable' = ownerActionAvailable,
    qOwnerSpellSlotCommitted' = ownerSpellSlotCommitted,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordFindFamiliarState(
    "none",
    "none",
    false,
    false,
    false,
    true,
    false,
    1,
    "init",
  )

  action doCastFindFamiliar = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      true,
      true,
      false,
      1,
      "cast",
    ),
  }

  action doRecastFindFamiliarReplacement = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "rat",
      true,
      false,
      true,
      true,
      false,
      1,
      "recast",
    ),
  }

  action doDismissAndReappearFindFamiliar = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      true,
      false,
      false,
      1,
      "dismissedAndReappeared",
    ),
  }

  action doDeliverTouchSpellThroughFindFamiliar = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      false,
      false,
      true,
      12,
      "touchDelivered",
    ),
  }

  action step = any {
    doCastFindFamiliar,
    doRecastFindFamiliarReplacement,
    doDismissAndReappearFindFamiliar,
    doDeliverTouchSpellThroughFindFamiliar,
  }
}
