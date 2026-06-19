// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-slow-active-penalties

module battleRuntimeSlowActivePenaltiesMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Slow:
  //   failed Wisdom Saving Throws halve Speed, apply -2 AC and -2 Dexterity
  //   Saving Throw penalties, prevent Reactions, and allow an end-of-target-turn
  //   repeat save ending the spell on that target on success.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Saving
  //   Throw, Speed, Armor Class, Reaction, Area of Effect/Cube, and Spell Effect.
  type Hole =
    | NoHole
    | EndTurnSave

  type SlowActivePenaltiesWitnessState = {
    currentTurnRole: str,
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

  action doStutter = all {
    qState.scenarioResult.in(Set("saved", "failedAgain")),
    recordSlowState(
      qState.currentTurnRole,
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
    doStutter,
  }
}
