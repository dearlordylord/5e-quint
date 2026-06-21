// -*- mode: Bluespec; -*-

module battleRuntimeSpellCreatedHeldObjectLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Flame Blade:
  //   the spell evokes a fiery blade in a free hand; it lasts for the
  //   Concentration duration, disappears if let go, can be evoked again as a
  //   Bonus Action, sheds Bright Light and Dim Light, and enables a Magic
  //   Action melee spell attack for Fire damage.
  // - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
  //   if the effect creator loses Concentration, the effect ends.
  // - .references/srd-5.2.1/Playing-the-Game.md#Light:
  //   Bright Light is normal illumination and Dim Light creates a Lightly
  //   Obscured area.
  // - UBIQUITOUS_LANGUAGE.md: Holding / Wielding, Free Hand, Magic Action,
  //   Bonus Action, Spell Attack, Concentration, Illumination, and Spell Slot.
  type Hole = | NoHole

  type SpellCreatedHeldObjectLifecycleScenarioOutcome = | Init | CastHeldObject | AttackedHeldObject | ReleasedHeldObject | NextCasterTurn | ReEvokedHeldObject | ConcentrationCleaned | DurationCleaned

  type SpellCreatedHeldObjectWitnessState = {
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    initialCastAvailable: bool,
    heldObjectEffectActive: bool,
    heldObjectHeld: bool,
    freeHandAvailable: bool,
    casterConcentrating: bool,
    lightProjected: bool,
    spellSlotExpended: int,
    spellSlotCommittedThisTurn: bool,
    attackAvailable: bool,
    reEvokeAvailable: bool,
    targetHp: int,
    scenarioOutcome: SpellCreatedHeldObjectLifecycleScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SpellCreatedHeldObjectWitnessState

  pure val initialTargetHp: int = 20
  pure val hitTargetHp: int = 8

  action recordSpellCreatedHeldObjectState(
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    initialCastAvailable: bool,
    heldObjectEffectActive: bool,
    heldObjectHeld: bool,
    freeHandAvailable: bool,
    casterConcentrating: bool,
    lightProjected: bool,
    spellSlotExpended: int,
    spellSlotCommittedThisTurn: bool,
    attackAvailable: bool,
    reEvokeAvailable: bool,
    targetHp: int,
    scenarioOutcome: SpellCreatedHeldObjectLifecycleScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      magicActionAvailable: magicActionAvailable,
      bonusActionAvailable: bonusActionAvailable,
      initialCastAvailable: initialCastAvailable,
      heldObjectEffectActive: heldObjectEffectActive,
      heldObjectHeld: heldObjectHeld,
      freeHandAvailable: freeHandAvailable,
      casterConcentrating: casterConcentrating,
      lightProjected: lightProjected,
      spellSlotExpended: spellSlotExpended,
      spellSlotCommittedThisTurn: spellSlotCommittedThisTurn,
      attackAvailable: attackAvailable,
      reEvokeAvailable: reEvokeAvailable,
      targetHp: targetHp,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordSpellCreatedHeldObjectState(
    true,
    true,
    true,
    false,
    false,
    true,
    false,
    false,
    0,
    false,
    false,
    false,
    initialTargetHp,
    Init,
    witnessInit(NoHole))

  action doCastHeldObject = all {
    qState.initialCastAvailable,
    qState.bonusActionAvailable,
    qState.freeHandAvailable,
    qState.spellSlotExpended == 0,
    recordSpellCreatedHeldObjectState(
      true,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      1,
      true,
      true,
      false,
      initialTargetHp,
      CastHeldObject,
      witnessResolved(NoHole)),
  }

  action doAttackHeldObject = all {
    qState.heldObjectEffectActive,
    qState.heldObjectHeld,
    qState.magicActionAvailable,
    qState.targetHp == initialTargetHp,
    recordSpellCreatedHeldObjectState(
      false,
      qState.bonusActionAvailable,
      false,
      true,
      true,
      false,
      true,
      true,
      qState.spellSlotExpended,
      qState.spellSlotCommittedThisTurn,
      false,
      false,
      hitTargetHp,
      AttackedHeldObject,
      witnessResolved(NoHole)),
  }

  action doReleaseHeldObject = all {
    qState.heldObjectEffectActive,
    qState.heldObjectHeld,
    recordSpellCreatedHeldObjectState(
      qState.magicActionAvailable,
      qState.bonusActionAvailable,
      false,
      true,
      false,
      true,
      true,
      false,
      qState.spellSlotExpended,
      qState.spellSlotCommittedThisTurn,
      false,
      qState.bonusActionAvailable,
      qState.targetHp,
      ReleasedHeldObject,
      witnessResolved(NoHole)),
  }

  action doAdvanceToCasterTurn = all {
    qState.heldObjectEffectActive,
    qState.casterConcentrating,
    recordSpellCreatedHeldObjectState(
      true,
      true,
      false,
      true,
      qState.heldObjectHeld,
      not(qState.heldObjectHeld),
      true,
      qState.heldObjectHeld,
      qState.spellSlotExpended,
      false,
      qState.heldObjectHeld,
      not(qState.heldObjectHeld),
      qState.targetHp,
      NextCasterTurn,
      witnessResolved(NoHole)),
  }

  action doReEvokeHeldObject = all {
    qState.heldObjectEffectActive,
    not(qState.heldObjectHeld),
    qState.reEvokeAvailable,
    qState.bonusActionAvailable,
    qState.freeHandAvailable,
    recordSpellCreatedHeldObjectState(
      qState.magicActionAvailable,
      false,
      false,
      true,
      true,
      false,
      true,
      true,
      qState.spellSlotExpended,
      false,
      qState.magicActionAvailable,
      false,
      qState.targetHp,
      ReEvokedHeldObject,
      witnessResolved(NoHole)),
  }

  action doBreakConcentration = all {
    qState.heldObjectEffectActive,
    qState.casterConcentrating,
    recordSpellCreatedHeldObjectState(
      qState.magicActionAvailable,
      qState.bonusActionAvailable,
      false,
      false,
      false,
      true,
      false,
      false,
      qState.spellSlotExpended,
      qState.spellSlotCommittedThisTurn,
      false,
      false,
      qState.targetHp,
      ConcentrationCleaned,
      witnessResolved(NoHole)),
  }

  action doExpireDuration = all {
    qState.heldObjectEffectActive,
    qState.casterConcentrating,
    recordSpellCreatedHeldObjectState(
      true,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      qState.spellSlotExpended,
      false,
      false,
      false,
      qState.targetHp,
      DurationCleaned,
      witnessResolved(NoHole)),
  }

  action doStutter = recordSpellCreatedHeldObjectState(
    qState.magicActionAvailable,
    qState.bonusActionAvailable,
    qState.initialCastAvailable,
    qState.heldObjectEffectActive,
    qState.heldObjectHeld,
    qState.freeHandAvailable,
    qState.casterConcentrating,
    qState.lightProjected,
    qState.spellSlotExpended,
    qState.spellSlotCommittedThisTurn,
    qState.attackAvailable,
    qState.reEvokeAvailable,
    qState.targetHp,
    qState.scenarioOutcome,
    qState.protocol,
  )

  action step = any {
    doCastHeldObject,
    doAttackHeldObject,
    doReleaseHeldObject,
    doAdvanceToCasterTurn,
    doReEvokeHeldObject,
    doBreakConcentration,
    doExpireDuration,
    doStutter,
  }
}
