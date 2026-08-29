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

  type SlowActivePenaltiesScenarioOutcome = | Init | FailedSave | TargetTurn | NeedsSave | Saved | FailedAgain | SpentAction | AttackedOnce | NeedsSomaticFailure | SomaticSpellFailed | SelfFailedSave | MultiattackFailedSave | MultiattackTargetTurn | MultiattackedOnce

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
    scenarioOutcome: SlowActivePenaltiesScenarioOutcome,
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
    scenarioOutcome: SlowActivePenaltiesScenarioOutcome,
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
      scenarioOutcome: scenarioOutcome,
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
    Init,
    witnessInit(NoHole))

  action doCastSlowFailedSave = all {
    qState.scenarioOutcome == Init,
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
      FailedSave,
      witnessResolved(NoHole)),
  }

  action doEndCasterTurn = all {
    qState.scenarioOutcome == FailedSave,
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
      TargetTurn,
      witnessResolved(NoHole)),
  }

  action doRequestEndTurnSave = all {
    qState.scenarioOutcome == TargetTurn,
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
      NeedsSave,
      witnessNeedsHoles(Set(EndTurnSave))),
  }

  action doFillEndTurnSaveSuccess = all {
    qState.scenarioOutcome == NeedsSave,
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
      Saved,
      witnessResolved(NoHole)),
  }

  action doFillEndTurnSaveFailure = all {
    qState.scenarioOutcome == NeedsSave,
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
      FailedAgain,
      witnessResolved(NoHole)),
  }

  action doSpendTargetAction = all {
    qState.scenarioOutcome == TargetTurn,
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
      SpentAction,
      witnessResolved(NoHole)),
  }

  action doMakeTargetAttack = all {
    qState.scenarioOutcome == TargetTurn,
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
      AttackedOnce,
      witnessResolved(NoHole)),
  }

  action doRequestSomaticFailure = all {
    qState.scenarioOutcome == TargetTurn,
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
      NeedsSomaticFailure,
      witnessNeedsHoles(Set(SomaticFailure))),
  }

  action doFillSomaticSpellFailure = all {
    qState.scenarioOutcome == NeedsSomaticFailure,
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
      SomaticSpellFailed,
      witnessResolved(NoHole)),
  }

  action doCastSlowSelfFailedSave = all {
    qState.scenarioOutcome == Init,
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
      SelfFailedSave,
      witnessResolved(NoHole)),
  }

  action doCastSlowMultiattackFailedSave = all {
    qState.scenarioOutcome == Init,
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
      MultiattackFailedSave,
      witnessResolved(NoHole)),
  }

  action doEndCasterTurnForMultiattackTarget = all {
    qState.scenarioOutcome == MultiattackFailedSave,
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
      MultiattackTargetTurn,
      witnessResolved(NoHole)),
  }

  action doMakeSlowedStatBlockMultiattack = all {
    qState.scenarioOutcome == MultiattackTargetTurn,
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
      MultiattackedOnce,
      witnessResolved(NoHole)),
  }

  action doStutter = all {
    qState.scenarioOutcome.in(Set(
      Saved,
      FailedAgain,
      SpentAction,
      AttackedOnce,
      SomaticSpellFailed,
      SelfFailedSave,
      MultiattackedOnce,
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
      qState.scenarioOutcome,
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
