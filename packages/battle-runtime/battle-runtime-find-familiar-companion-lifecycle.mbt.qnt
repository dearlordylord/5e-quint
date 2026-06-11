// -*- mode: Bluespec; -*-

module battleRuntimeFindFamiliarCompanionLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FindFamiliarCompanionLifecycleScenarioOutcome = | Init | CreatedCat | ReplacedRat | SharedSenses | TouchDelivered | PactAttack

  type FindFamiliarCompanionLifecycleWitnessState = {
    qFamiliarStatus: str,
    qFamiliarId: str,
    qFamiliarForm: str,
    qCreatureTypeOverride: str,
    qCompanionCount: int,
    qTelepathyAvailable: bool,
    qSharedSensesActive: bool,
    qBonusActionAvailable: bool,
    qOwnerAttackAvailable: bool,
    qFamiliarReactionAvailable: bool,
    qTouchDeliveryReactionSpent: bool,
    qPactReactionAttackResolved: bool,
    qSpellSlotCommitted: bool,
    qTargetHp: int,
    qScenarioOutcome: FindFamiliarCompanionLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: FindFamiliarCompanionLifecycleWitnessState

  pure def qFamiliarStatus: str = qState.qFamiliarStatus
  pure def qFamiliarId: str = qState.qFamiliarId
  pure def qFamiliarForm: str = qState.qFamiliarForm
  pure def qCreatureTypeOverride: str = qState.qCreatureTypeOverride
  pure def qCompanionCount: int = qState.qCompanionCount
  pure def qTelepathyAvailable: bool = qState.qTelepathyAvailable
  pure def qSharedSensesActive: bool = qState.qSharedSensesActive
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qOwnerAttackAvailable: bool = qState.qOwnerAttackAvailable
  pure def qFamiliarReactionAvailable: bool = qState.qFamiliarReactionAvailable
  pure def qTouchDeliveryReactionSpent: bool = qState.qTouchDeliveryReactionSpent
  pure def qPactReactionAttackResolved: bool = qState.qPactReactionAttackResolved
  pure def qSpellSlotCommitted: bool = qState.qSpellSlotCommitted
  pure def qTargetHp: int = qState.qTargetHp
  pure def qLastResult: FindFamiliarCompanionLifecycleScenarioOutcome = qState.qScenarioOutcome

  pure def findFamiliarCompanionLifecycleProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: FindFamiliarCompanionLifecycleScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

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
    lastResult: FindFamiliarCompanionLifecycleScenarioOutcome,
  ): bool = all {
    qState' = {
      qFamiliarStatus: familiarStatus,
      qFamiliarId: familiarId,
      qFamiliarForm: familiarForm,
      qCreatureTypeOverride: creatureTypeOverride,
      qCompanionCount: companionCount,
      qTelepathyAvailable: telepathyAvailable,
      qSharedSensesActive: sharedSensesActive,
      qBonusActionAvailable: bonusActionAvailable,
      qOwnerAttackAvailable: ownerAttackAvailable,
      qFamiliarReactionAvailable: familiarReactionAvailable,
      qTouchDeliveryReactionSpent: touchDeliveryReactionSpent,
      qPactReactionAttackResolved: pactReactionAttackResolved,
      qSpellSlotCommitted: spellSlotCommitted,
      qTargetHp: targetHp,
      qScenarioOutcome: lastResult,
      protocol: findFamiliarCompanionLifecycleProtocolForProjection(Set(), lastResult, ""),
    },
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
    Init,
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
      CreatedCat,
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
      ReplacedRat,
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
      SharedSenses,
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
      TouchDelivered,
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
      PactAttack,
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
