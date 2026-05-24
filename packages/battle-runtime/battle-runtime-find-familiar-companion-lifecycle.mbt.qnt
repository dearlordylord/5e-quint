// -*- mode: Bluespec; -*-

module battleRuntimeFindFamiliarCompanionLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Familiar:
  //   chosen familiar form, Celestial/Fey/Fiend type override, telepathic
  //   connection within 100 feet, Bonus Action shared senses, Touch spell
  //   delivery using the familiar's Reaction, combatant Initiative, and one
  //   familiar only with recast form replacement.
  // - .references/srd-5.2.1/Classes/Warlock.md#Pact of the Chain:
  //   Pact of the Chain learns Find Familiar, widens eligible forms, and lets
  //   the owner forgo one Attack-action attack so the familiar attacks with its
  //   Reaction.
  // - UBIQUITOUS_LANGUAGE.md: Companion, Magic Action, Bonus Action, Reaction,
  //   Spell Invocation, Spell Effect, Attack Roll, and Hit Points.
  var qFamiliarStatus: str
  var qFamiliarId: str
  var qFamiliarForm: str
  var qCreatureTypeOverride: str
  var qCompanionCount: int
  var qTelepathyAvailable: bool
  var qSharedSensesActive: bool
  var qBonusActionAvailable: bool
  var qOwnerAttackAvailable: bool
  var qFamiliarReactionAvailable: bool
  var qTouchDeliveryReactionSpent: bool
  var qPactReactionAttackResolved: bool
  var qSpellSlotCommitted: bool
  var qTargetHp: int
  var qLastResult: str

  pure val noFamiliarStatus: str = "none"
  pure val presentFamiliarStatus: str = "present"
  pure val noFamiliarFact: str = "none"
  pure val primaryFamiliarFact: str = "primary"
  pure val catFormFact: str = "cat"
  pure val ratFormFact: str = "rat"
  pure val feyCreatureTypeFact: str = "fey"
  pure val initialTargetHp: int = 12
  pure val pactScratchDamage: int = 1

  action recordFindFamiliarState(
    familiarStatus: str,
    familiarId: str,
    familiarForm: str,
    creatureTypeOverride: str,
    companionCount: int,
    telepathyAvailable: bool,
    sharedSensesActive: bool,
    bonusActionAvailable: bool,
    ownerAttackAvailable: bool,
    familiarReactionAvailable: bool,
    touchDeliveryReactionSpent: bool,
    pactReactionAttackResolved: bool,
    spellSlotCommitted: bool,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qFamiliarStatus' = familiarStatus,
    qFamiliarId' = familiarId,
    qFamiliarForm' = familiarForm,
    qCreatureTypeOverride' = creatureTypeOverride,
    qCompanionCount' = companionCount,
    qTelepathyAvailable' = telepathyAvailable,
    qSharedSensesActive' = sharedSensesActive,
    qBonusActionAvailable' = bonusActionAvailable,
    qOwnerAttackAvailable' = ownerAttackAvailable,
    qFamiliarReactionAvailable' = familiarReactionAvailable,
    qTouchDeliveryReactionSpent' = touchDeliveryReactionSpent,
    qPactReactionAttackResolved' = pactReactionAttackResolved,
    qSpellSlotCommitted' = spellSlotCommitted,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordFindFamiliarState(
    noFamiliarStatus,
    noFamiliarFact,
    noFamiliarFact,
    noFamiliarFact,
    0,
    false,
    false,
    true,
    true,
    false,
    false,
    false,
    false,
    initialTargetHp,
    "init",
  )

  action doCreateCatFamiliar = all {
    qFamiliarStatus == noFamiliarStatus,
    recordFindFamiliarState(
      presentFamiliarStatus,
      primaryFamiliarFact,
      catFormFact,
      feyCreatureTypeFact,
      1,
      true,
      false,
      qBonusActionAvailable,
      qOwnerAttackAvailable,
      true,
      false,
      qPactReactionAttackResolved,
      qSpellSlotCommitted,
      qTargetHp,
      "createdCat",
    ),
  }

  action doReplaceWithRatFamiliar = all {
    qFamiliarStatus == presentFamiliarStatus,
    qFamiliarId == primaryFamiliarFact,
    qFamiliarForm == catFormFact,
    recordFindFamiliarState(
      presentFamiliarStatus,
      primaryFamiliarFact,
      ratFormFact,
      qCreatureTypeOverride,
      1,
      true,
      qSharedSensesActive,
      qBonusActionAvailable,
      qOwnerAttackAvailable,
      true,
      false,
      qPactReactionAttackResolved,
      qSpellSlotCommitted,
      qTargetHp,
      "replacedRat",
    ),
  }

  action doShareSenses = all {
    qFamiliarStatus == presentFamiliarStatus,
    qTelepathyAvailable,
    qBonusActionAvailable,
    recordFindFamiliarState(
      qFamiliarStatus,
      qFamiliarId,
      qFamiliarForm,
      qCreatureTypeOverride,
      qCompanionCount,
      qTelepathyAvailable,
      true,
      false,
      qOwnerAttackAvailable,
      qFamiliarReactionAvailable,
      qTouchDeliveryReactionSpent,
      qPactReactionAttackResolved,
      qSpellSlotCommitted,
      qTargetHp,
      "sharedSenses",
    ),
  }

  action doDeliverTouchSpell = all {
    qFamiliarStatus == presentFamiliarStatus,
    qTelepathyAvailable,
    qOwnerAttackAvailable,
    qFamiliarReactionAvailable,
    not(qSpellSlotCommitted),
    recordFindFamiliarState(
      qFamiliarStatus,
      qFamiliarId,
      qFamiliarForm,
      qCreatureTypeOverride,
      qCompanionCount,
      qTelepathyAvailable,
      qSharedSensesActive,
      qBonusActionAvailable,
      false,
      false,
      true,
      false,
      true,
      qTargetHp,
      "touchDelivered",
    ),
  }

  action doPactFamiliarAttack = all {
    qFamiliarStatus == presentFamiliarStatus,
    qFamiliarForm == catFormFact,
    qOwnerAttackAvailable,
    qFamiliarReactionAvailable,
    recordFindFamiliarState(
      qFamiliarStatus,
      qFamiliarId,
      qFamiliarForm,
      qCreatureTypeOverride,
      qCompanionCount,
      qTelepathyAvailable,
      qSharedSensesActive,
      qBonusActionAvailable,
      false,
      false,
      false,
      true,
      qSpellSlotCommitted,
      qTargetHp - pactScratchDamage,
      "pactAttack",
    ),
  }

  action step = any {
    doCreateCatFamiliar,
    doReplaceWithRatFamiliar,
    doShareSenses,
    doDeliverTouchSpell,
    doPactFamiliarAttack,
  }
}
