// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-slow-active-penalties

module battleRuntimeSlowActivePenaltiesMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Slow:
  //   failed Wisdom Saving Throws halve Speed, apply -2 AC and -2 Dexterity
  //   Saving Throw penalties, prevent Reactions, restrict the affected target's
  //   turns to either an Action or Bonus Action, cap the Attack action at one
  //   attack, impose a 25 percent Somatic spell failure chance, and allow an
  //   end-of-target-turn repeat save ending the spell on that target on success.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Saving
  //   Throw, Speed, Armor Class, Reaction, Area of Effect/Cube, and Spell Effect.
  type Hole =
    | NoHole
    | EndTurnSave
    | SomaticFailure

  type SlowActivePenaltiesWitnessState = {
    currentTurnRole: str,
    turnActionOrBonusChoice: str,
    targetTurnCanSpendAction: bool,
    targetTurnCanSpendBonusAction: bool,
    extraAttackResourceCount: int,
    casterTurnCanSpendBonusAction: bool,
    statBlockMultiattackResourceCount: int,
    targetSlowed: bool,
    targetSpeedFeet: int,
    targetArmorClass: int,
    dexteritySavingThrowDelta: int,
    targetCanReact: bool,
    casterConcentrating: bool,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SlowActivePenaltiesWitnessState

  action recordSlowState(
    currentTurnRole: str,
    turnActionOrBonusChoice: str,
    targetTurnCanSpendAction: bool,
    targetTurnCanSpendBonusAction: bool,
    extraAttackResourceCount: int,
    casterTurnCanSpendBonusAction: bool,
    statBlockMultiattackResourceCount: int,
    targetSlowed: bool,
    targetSpeedFeet: int,
    targetArmorClass: int,
    dexteritySavingThrowDelta: int,
    targetCanReact: bool,
    casterConcentrating: bool,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      currentTurnRole: currentTurnRole,
      turnActionOrBonusChoice: turnActionOrBonusChoice,
      targetTurnCanSpendAction: targetTurnCanSpendAction,
      targetTurnCanSpendBonusAction: targetTurnCanSpendBonusAction,
      extraAttackResourceCount: extraAttackResourceCount,
      casterTurnCanSpendBonusAction: casterTurnCanSpendBonusAction,
      statBlockMultiattackResourceCount: statBlockMultiattackResourceCount,
      targetSlowed: targetSlowed,
      targetSpeedFeet: targetSpeedFeet,
      targetArmorClass: targetArmorClass,
      dexteritySavingThrowDelta: dexteritySavingThrowDelta,
      targetCanReact: targetCanReact,
      casterConcentrating: casterConcentrating,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordSlowState(
    "caster",
    "notRestricted",
    false,
    false,
    0,
    true,
    0,
    false,
    30,
    10,
    0,
    true,
    false,
    "init",
    witnessInit(NoHole),
  )

  action doCastSlowFailedSave = all {
    qState.scenarioResult == "init",
    recordSlowState(
      "caster",
      "notRestricted",
      false,
      false,
      0,
      true,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "failedSave",
      witnessResolved(NoHole),
    ),
  }

  action doEndCasterTurn = all {
    qState.scenarioResult == "failedSave",
    recordSlowState(
      "target",
      "notChosen",
      true,
      true,
      0,
      false,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "targetTurn",
      witnessResolved(NoHole),
    ),
  }

  action doRequestEndTurnSave = all {
    qState.scenarioResult == "targetTurn",
    recordSlowState(
      "target",
      "notChosen",
      true,
      true,
      0,
      false,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "needsSave",
      witnessNeedsHoles(Set(EndTurnSave)),
    ),
  }

  action doFillEndTurnSaveSuccess = all {
    qState.scenarioResult == "needsSave",
    qState.protocol.holes == Set(EndTurnSave),
    recordSlowState(
      "caster",
      "notRestricted",
      false,
      false,
      0,
      true,
      0,
      false,
      30,
      10,
      0,
      true,
      false,
      "saved",
      witnessResolved(NoHole),
    ),
  }

  action doFillEndTurnSaveFailure = all {
    qState.scenarioResult == "needsSave",
    qState.protocol.holes == Set(EndTurnSave),
    recordSlowState(
      "caster",
      "notRestricted",
      false,
      false,
      0,
      true,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "failedAgain",
      witnessResolved(NoHole),
    ),
  }

  action doSpendTargetAction = all {
    qState.scenarioResult == "targetTurn",
    recordSlowState(
      "target",
      "action",
      false,
      false,
      0,
      false,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "spentAction",
      witnessResolved(NoHole),
    ),
  }

  action doMakeTargetAttack = all {
    qState.scenarioResult == "targetTurn",
    recordSlowState(
      "target",
      "action",
      false,
      false,
      0,
      false,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "attackedOnce",
      witnessResolved(NoHole),
    ),
  }

  action doRequestSomaticFailure = all {
    qState.scenarioResult == "targetTurn",
    recordSlowState(
      "target",
      "notChosen",
      true,
      true,
      0,
      false,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "needsSomaticFailure",
      witnessNeedsHoles(Set(SomaticFailure)),
    ),
  }

  action doFillSomaticSpellFailure = all {
    qState.scenarioResult == "needsSomaticFailure",
    qState.protocol.holes == Set(SomaticFailure),
    recordSlowState(
      "target",
      "bonusAction",
      false,
      false,
      0,
      false,
      0,
      true,
      15,
      8,
      -2,
      false,
      true,
      "somaticSpellFailed",
      witnessResolved(NoHole),
    ),
  }

  action doCastSlowSelfFailedSave = all {
    qState.scenarioResult == "init",
    recordSlowState(
      "caster",
      "action",
      false,
      false,
      0,
      false,
      0,
      false,
      30,
      10,
      0,
      true,
      true,
      "selfFailedSave",
      witnessResolved(NoHole),
    ),
  }

  action doCastSlowMultiattackFailedSave = all {
    qState.scenarioResult == "init",
    recordSlowState(
      "caster",
      "notRestricted",
      false,
      false,
      0,
      true,
      0,
      false,
      30,
      10,
      0,
      true,
      true,
      "multiattackFailedSave",
      witnessResolved(NoHole),
    ),
  }

  action doEndCasterTurnForMultiattackTarget = all {
    qState.scenarioResult == "multiattackFailedSave",
    recordSlowState(
      "multiattackTarget",
      "notChosen",
      true,
      true,
      0,
      false,
      0,
      false,
      30,
      10,
      0,
      true,
      true,
      "multiattackTargetTurn",
      witnessResolved(NoHole),
    ),
  }

  action doMakeSlowedStatBlockMultiattack = all {
    qState.scenarioResult == "multiattackTargetTurn",
    recordSlowState(
      "multiattackTarget",
      "action",
      false,
      false,
      0,
      false,
      0,
      false,
      30,
      10,
      0,
      true,
      true,
      "multiattackedOnce",
      witnessResolved(NoHole),
    ),
  }

  action doStutter = all {
    qState.scenarioResult.in(Set(
      "saved",
      "failedAgain",
      "spentAction",
      "attackedOnce",
      "somaticSpellFailed",
      "selfFailedSave",
      "multiattackedOnce",
    )),
    recordSlowState(
      qState.currentTurnRole,
      qState.turnActionOrBonusChoice,
      qState.targetTurnCanSpendAction,
      qState.targetTurnCanSpendBonusAction,
      qState.extraAttackResourceCount,
      qState.casterTurnCanSpendBonusAction,
      qState.statBlockMultiattackResourceCount,
      qState.targetSlowed,
      qState.targetSpeedFeet,
      qState.targetArmorClass,
      qState.dexteritySavingThrowDelta,
      qState.targetCanReact,
      qState.casterConcentrating,
      qState.scenarioResult,
      qState.protocol,
    ),
  }

  action step = any {
    doCastSlowFailedSave,
    doEndCasterTurn,
    doRequestEndTurnSave,
    doFillEndTurnSaveSuccess,
    doFillEndTurnSaveFailure,
    doSpendTargetAction,
    doMakeTargetAttack,
    doRequestSomaticFailure,
    doFillSomaticSpellFailure,
    doCastSlowSelfFailedSave,
    doCastSlowMultiattackFailedSave,
    doEndCasterTurnForMultiattackTarget,
    doMakeSlowedStatBlockMultiattack,
    doStutter,
  }
}
