// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-haste-positive
//
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Haste: when the spell
//   ends, the target is Incapacitated and has Speed 0 until the end of its next
//   turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration: a Concentration
//   effect ends when its creator loses Concentration.
// - UBIQUITOUS_LANGUAGE.md: Concentration, Incapacitated, Speed, Spell Effect.
//
// Boundary: literal lifecycle projection witness. Haste positive-effect
// arithmetic is owned by BATTLE.SPELL.HASTE_POSITIVE_EFFECTS; this slice covers
// only promotion, target Concentration break from promoted Incapacitated,
// duration expiry, replacement, and target-turn cleanup of the spell-end
// lethargy rider.
module battleRuntimeHasteLethargyLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | HasteLethargyLifecycle

  type HasteLethargyLifecycleScenario =
    | Init
    | ConcentrationEnded
    | DurationExpired
    | RecastReplacement
    | TargetConcentrationBroken
    | TargetTurnCleanupPreserved

  type WitnessState = {
    qScenario: HasteLethargyLifecycleScenario,
    qCasterConcentrating: bool,
    qPositiveEffectCount: int,
    qLethargyConditionActive: bool,
    qLethargySpeedZeroActive: bool,
    qTargetIncapacitated: bool,
    qTargetWalkSpeedFeet: int,
    qTargetConcentrating: bool,
    qTargetConcentrationEffectActive: bool,
    qSpellSlotExpended: int,
    qCurrentSpellActionResourceCount: int,
    qPreexistingIncapacitatedPreserved: bool,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qScenario: HasteLethargyLifecycleScenario = qState.qScenario
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qPositiveEffectCount: int = qState.qPositiveEffectCount
  pure def qLethargyConditionActive: bool = qState.qLethargyConditionActive
  pure def qLethargySpeedZeroActive: bool = qState.qLethargySpeedZeroActive
  pure def qTargetIncapacitated: bool = qState.qTargetIncapacitated
  pure def qTargetWalkSpeedFeet: int = qState.qTargetWalkSpeedFeet
  pure def qTargetConcentrating: bool = qState.qTargetConcentrating
  pure def qTargetConcentrationEffectActive: bool = qState.qTargetConcentrationEffectActive
  pure def qSpellSlotExpended: int = qState.qSpellSlotExpended
  pure def qCurrentSpellActionResourceCount: int = qState.qCurrentSpellActionResourceCount
  pure def qPreexistingIncapacitatedPreserved: bool = qState.qPreexistingIncapacitatedPreserved

  action recordProjection(
    scenario: HasteLethargyLifecycleScenario,
    casterConcentrating: bool,
    positiveEffectCount: int,
    lethargyConditionActive: bool,
    lethargySpeedZeroActive: bool,
    targetIncapacitated: bool,
    targetWalkSpeedFeet: int,
    targetConcentrating: bool,
    targetConcentrationEffectActive: bool,
    spellSlotExpended: int,
    currentSpellActionResourceCount: int,
    preexistingIncapacitatedPreserved: bool,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qCasterConcentrating: casterConcentrating,
      qPositiveEffectCount: positiveEffectCount,
      qLethargyConditionActive: lethargyConditionActive,
      qLethargySpeedZeroActive: lethargySpeedZeroActive,
      qTargetIncapacitated: targetIncapacitated,
      qTargetWalkSpeedFeet: targetWalkSpeedFeet,
      qTargetConcentrating: targetConcentrating,
      qTargetConcentrationEffectActive: targetConcentrationEffectActive,
      qSpellSlotExpended: spellSlotExpended,
      qCurrentSpellActionResourceCount: currentSpellActionResourceCount,
      qPreexistingIncapacitatedPreserved: preexistingIncapacitatedPreserved,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    Init,
    false,
    0,
    false,
    false,
    false,
    30,
    false,
    false,
    0,
    0,
    false,
    witnessInit(HasteLethargyLifecycle),
  )

  action doBreakConcentration = all {
    qScenario == Init,
    recordProjection(
      ConcentrationEnded,
      false,
      0,
      true,
      true,
      true,
      0,
      false,
      false,
      1,
      0,
      false,
      witnessResolved(HasteLethargyLifecycle),
    ),
  }

  action doExpireDuration = all {
    qScenario == Init,
    recordProjection(
      DurationExpired,
      false,
      0,
      true,
      true,
      true,
      0,
      false,
      false,
      1,
      0,
      false,
      witnessResolved(HasteLethargyLifecycle),
    ),
  }

  action doRecastReplacement = all {
    qScenario == Init,
    recordProjection(
      RecastReplacement,
      true,
      5,
      true,
      true,
      true,
      0,
      false,
      false,
      2,
      0,
      false,
      witnessResolved(HasteLethargyLifecycle),
    ),
  }

  action doBreakTargetConcentration = all {
    qScenario == Init,
    recordProjection(
      TargetConcentrationBroken,
      false,
      0,
      true,
      true,
      true,
      0,
      false,
      false,
      1,
      0,
      false,
      witnessResolved(HasteLethargyLifecycle),
    ),
  }

  action doCleanupWithPreexistingIncapacitated = all {
    qScenario == Init,
    recordProjection(
      TargetTurnCleanupPreserved,
      false,
      0,
      false,
      false,
      true,
      30,
      false,
      false,
      1,
      0,
      true,
      witnessResolved(HasteLethargyLifecycle),
    ),
  }

  action step = any {
    doBreakConcentration,
    doExpireDuration,
    doRecastReplacement,
    doBreakTargetConcentration,
    doCleanupWithPreexistingIncapacitated,
  }
}
