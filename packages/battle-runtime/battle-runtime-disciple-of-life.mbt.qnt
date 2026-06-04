// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.spell-slot-healing-modifier
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.spell-slot-healing-modifier

module battleRuntimeDiscipleOfLifeMbt {
  var qTargetHp: int
  var qSecondTargetHp: int
  var qSpellSlotsRemaining: int
  var qLastResult: str

  action recordProjection(
    targetHp: int,
    secondTargetHp: int,
    spellSlotsRemaining: int,
    lastResult: str,
  ): bool = all {
    qTargetHp' = targetHp,
    qSecondTargetHp' = secondTargetHp,
    qSpellSlotsRemaining' = spellSlotsRemaining,
    qLastResult' = lastResult,
  }

  action init = recordProjection(1, 1, 1, "init")

  action doSlotHealingModifier = all {
    qLastResult == "init",
    recordProjection(9, 1, 0, "slotHealingModifier"),
  }

  action doNonModifierSlotHealing = all {
    qLastResult == "init",
    recordProjection(6, 1, 0, "nonModifierSlotHealing"),
  }

  action doNonSlotHealingExcluded = all {
    qLastResult == "init",
    recordProjection(1, 1, 1, "nonSlotHealingExcluded"),
  }

  action doEachCreatureHealed = all {
    qLastResult == "init",
    recordProjection(11, 11, 0, "eachCreatureHealed"),
  }

  action step = any {
    doSlotHealingModifier,
    doNonModifierSlotHealing,
    doNonSlotHealingExcluded,
    doEachCreatureHealed,
  }
}
