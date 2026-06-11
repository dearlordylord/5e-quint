// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.spell-slot-healing-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.spell-slot-healing-modifier

module battleRuntimeDiscipleOfLifeMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DiscipleOfLife

  type WitnessState = {
    qTargetHp: int,
    qSecondTargetHp: int,
    qSpellSlotsRemaining: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qSpellSlotsRemaining: int = qState.qSpellSlotsRemaining
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    spellSlotsRemaining: int,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qSpellSlotsRemaining: spellSlotsRemaining,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(1, 1, 1, "init",
    witnessInit(DiscipleOfLife),
  )

  action doSlotHealingModifier = all {
    qScenarioResult == "init",
    recordProjection(9, 1, 0, "slotHealingModifier",
    witnessResolved(DiscipleOfLife),
  ),
  }

  action doNonModifierSlotHealing = all {
    qScenarioResult == "init",
    recordProjection(6, 1, 0, "nonModifierSlotHealing",
    witnessResolved(DiscipleOfLife),
  ),
  }

  action doNonSlotHealingExcluded = all {
    qScenarioResult == "init",
    recordProjection(1, 1, 1, "nonSlotHealingExcluded",
    witnessResolved(DiscipleOfLife),
  ),
  }

  action doEachCreatureHealed = all {
    qScenarioResult == "init",
    recordProjection(11, 11, 0, "eachCreatureHealed",
    witnessResolved(DiscipleOfLife),
  ),
  }

  action step = any {
    doSlotHealingModifier,
    doNonModifierSlotHealing,
    doNonSlotHealingExcluded,
    doEachCreatureHealed,
  }
}
