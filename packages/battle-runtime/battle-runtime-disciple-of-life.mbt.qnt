// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.spell-slot-healing-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.spell-slot-healing-modifier

module battleRuntimeDiscipleOfLifeMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DiscipleOfLife

  type DiscipleOfLifeScenarioOutcome = | Init | SlotHealingModifier | NonModifierSlotHealing | NonSlotHealingExcluded | EachCreatureHealed


  type WitnessState = {
    qTargetHp: int,
    qSecondTargetHp: int,
    qSpellSlotsRemaining: int,
    qScenarioOutcome: DiscipleOfLifeScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qTargetHp: int = qState.qTargetHp
  pure def qSecondTargetHp: int = qState.qSecondTargetHp
  pure def qSpellSlotsRemaining: int = qState.qSpellSlotsRemaining
  pure def qScenarioOutcome: DiscipleOfLifeScenarioOutcome = qState.qScenarioOutcome


  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    spellSlotsRemaining: int,
    scenarioOutcome: DiscipleOfLifeScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qTargetHp: targetHp,
      qSecondTargetHp: secondTargetHp,
      qSpellSlotsRemaining: spellSlotsRemaining,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(1, 1, 1, Init,
    witnessInit(DiscipleOfLife),
  )

  action doSlotHealingModifier = all {
    qScenarioOutcome == Init,
    recordProjection(9, 1, 0, SlotHealingModifier,
    witnessResolved(DiscipleOfLife),
  ),
  }

  action doNonModifierSlotHealing = all {
    qScenarioOutcome == Init,
    recordProjection(6, 1, 0, NonModifierSlotHealing,
    witnessResolved(DiscipleOfLife),
  ),
  }

  action doNonSlotHealingExcluded = all {
    qScenarioOutcome == Init,
    recordProjection(1, 1, 1, NonSlotHealingExcluded,
    witnessResolved(DiscipleOfLife),
  ),
  }

  action doEachCreatureHealed = all {
    qScenarioOutcome == Init,
    recordProjection(11, 11, 0, EachCreatureHealed,
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
