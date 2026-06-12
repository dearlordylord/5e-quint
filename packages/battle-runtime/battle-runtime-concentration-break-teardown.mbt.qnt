// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
//
// RAW trace:
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: a Concentration
//   effect ends when its creator loses Concentration; the creator can end
//   Concentration at any time; another Concentration effect breaks the prior
//   one; damage requires a Constitution Saving Throw with DC 10 or half damage
//   taken, whichever is higher, up to 30.
// - UBIQUITOUS_LANGUAGE.md: Concentration, Spell Effect, Saving Throw.
//
// Boundary: this bounded protocol witness covers damage-save failure,
// voluntary end, and replacement by a second Concentration spell. Incapacitated
// and death-triggered Concentration breaks are intentionally outside this slice;
// PPW-T14 owns the death path.
module battleRuntimeConcentrationBreakTeardownMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | ConcentrationSavingThrow | ConcentrationBreakTeardown

  type ConcentrationBreakTeardownScenario =
    | Init
    | ConcentrationSpellCast
    | DamageSaveNeeded
    | DamageFailedTeardownBeforeNextCommand
    | VoluntaryEndTeardown
    | ReplacementTeardownBeforeNewEffect

  type WitnessState = {
    qScenario: ConcentrationBreakTeardownScenario,
    qDamageTaken: int,
    qSaveDc: int,
    qSaveRollTotal: int,
    qConcentrationSaveOffered: bool,
    qCasterConcentrating: bool,
    qBlurredEffectCount: int,
    qSpellSlotExpended: int,
    qTeardownBeforeNextCommand: bool,
    qReplacementStartedAfterTeardown: bool,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qScenario: ConcentrationBreakTeardownScenario = qState.qScenario
  pure def qDamageTaken: int = qState.qDamageTaken
  pure def qSaveDc: int = qState.qSaveDc
  pure def qSaveRollTotal: int = qState.qSaveRollTotal
  pure def qConcentrationSaveOffered: bool = qState.qConcentrationSaveOffered
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qBlurredEffectCount: int = qState.qBlurredEffectCount
  pure def qSpellSlotExpended: int = qState.qSpellSlotExpended
  pure def qTeardownBeforeNextCommand: bool = qState.qTeardownBeforeNextCommand
  pure def qReplacementStartedAfterTeardown: bool = qState.qReplacementStartedAfterTeardown

  pure def scimitarDamage(diePip: int): int = diePip + 2

  pure def concentrationSaveDcForDamage(damageTaken: int): int =
    if (damageTaken / 2 > 10)
      if (damageTaken / 2 > 30) 30 else damageTaken / 2
    else
      10

  action recordProjection(
    scenario: ConcentrationBreakTeardownScenario,
    damageTaken: int,
    saveDc: int,
    saveRollTotal: int,
    concentrationSaveOffered: bool,
    casterConcentrating: bool,
    blurredEffectCount: int,
    spellSlotExpended: int,
    teardownBeforeNextCommand: bool,
    replacementStartedAfterTeardown: bool,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qDamageTaken: damageTaken,
      qSaveDc: saveDc,
      qSaveRollTotal: saveRollTotal,
      qConcentrationSaveOffered: concentrationSaveOffered,
      qCasterConcentrating: casterConcentrating,
      qBlurredEffectCount: blurredEffectCount,
      qSpellSlotExpended: spellSlotExpended,
      qTeardownBeforeNextCommand: teardownBeforeNextCommand,
      qReplacementStartedAfterTeardown: replacementStartedAfterTeardown,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    Init,
    0,
    0,
    0,
    false,
    false,
    0,
    0,
    false,
    false,
    witnessInit(ConcentrationBreakTeardown),
  )

  action doCastConcentrationSpell = all {
    qScenario == Init,
    recordProjection(
      ConcentrationSpellCast,
      0,
      0,
      0,
      false,
      true,
      1,
      1,
      false,
      false,
      witnessResolved(ConcentrationBreakTeardown),
    ),
  }

  action doDamageRequestsConcentrationSave = {
    nondet damageDiePip = Set(1, 4).oneOf()
    val damageTaken = scimitarDamage(damageDiePip)
    all {
      qScenario == ConcentrationSpellCast,
      recordProjection(
        DamageSaveNeeded,
        damageTaken,
        concentrationSaveDcForDamage(damageTaken),
        0,
        true,
        true,
        1,
        1,
        false,
        false,
        witnessNeedsHoles(Set(ConcentrationSavingThrow)),
      ),
    }
  }

  action doFailConcentrationSave = {
    nondet saveRollTotal = Set(1, 9).oneOf()
    all {
      qScenario == DamageSaveNeeded,
      saveRollTotal < qSaveDc,
      recordProjection(
        DamageFailedTeardownBeforeNextCommand,
        qDamageTaken,
        qSaveDc,
        saveRollTotal,
        false,
        false,
        0,
        1,
        true,
        false,
        witnessResolved(ConcentrationBreakTeardown),
      ),
    }
  }

  action doVoluntaryEndConcentration = all {
    qScenario == Init,
    recordProjection(
      VoluntaryEndTeardown,
      0,
      0,
      0,
      false,
      false,
      0,
      1,
      true,
      false,
      witnessResolved(ConcentrationBreakTeardown),
    ),
  }

  action doCastReplacementConcentrationSpell = all {
    qScenario == Init,
    recordProjection(
      ReplacementTeardownBeforeNewEffect,
      0,
      0,
      0,
      false,
      true,
      1,
      1,
      false,
      true,
      witnessResolved(ConcentrationBreakTeardown),
    ),
  }

  action step = any {
    doCastConcentrationSpell,
    doDamageRequestsConcentrationSave,
    doFailConcentrationSave,
    doVoluntaryEndConcentration,
    doCastReplacementConcentrationSpell,
  }
}
