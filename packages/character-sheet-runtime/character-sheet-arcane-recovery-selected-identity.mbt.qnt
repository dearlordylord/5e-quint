// -*- mode: Bluespec; -*-

module characterSheetArcaneRecoverySelectedIdentityMbt {
  var qFeatureUnitId: str
  var qFirstLevelSpellSlotsExpended: int
  var qSecondLevelSpellSlotsExpended: int
  var qPactSlotsExpended: int
  var qArcaneRecoveryUsedSinceLongRest: bool
  var qAccepted: bool
  var qMessage: str
  var qRecoveredCombinedSlotLevels: int
  var qLastResult: str

  action recordProjection(
    featureUnitId: str,
    firstLevelSpellSlotsExpended: int,
    secondLevelSpellSlotsExpended: int,
    pactSlotsExpended: int,
    arcaneRecoveryUsedSinceLongRest: bool,
    accepted: bool,
    message: str,
    recoveredCombinedSlotLevels: int,
    lastResult: str,
  ): bool = all {
    qFeatureUnitId' = featureUnitId,
    qFirstLevelSpellSlotsExpended' = firstLevelSpellSlotsExpended,
    qSecondLevelSpellSlotsExpended' = secondLevelSpellSlotsExpended,
    qPactSlotsExpended' = pactSlotsExpended,
    qArcaneRecoveryUsedSinceLongRest' = arcaneRecoveryUsedSinceLongRest,
    qAccepted' = accepted,
    qMessage' = message,
    qRecoveredCombinedSlotLevels' = recoveredCombinedSlotLevels,
    qLastResult' = lastResult,
  }

  action init =
    recordProjection("none", 0, 0, 0, false, false, "none", 0, "init")

  action doRecoverSecondLevelSpellSlot = all {
    qLastResult == "init",
    recordProjection("wizard_arcane_recovery", 2, 0, 0, true, true, "none", 2, "short_rest_recovered"),
  }

  action doResetArcaneRecoveryOnLongRest = all {
    qLastResult == "init",
    recordProjection("wizard_arcane_recovery", 0, 0, 0, false, true, "none", 0, "long_rest_reset"),
  }

  action doRejectPactSlotArcaneRecovery = all {
    qLastResult == "init",
    recordProjection("wizard_arcane_recovery", 0, 0, 1, false, false, "Arcane Recovery cannot refund more Spell Slots than are expended.", 0, "pact_slot_rejected"),
  }

  action step = any {
    doRecoverSecondLevelSpellSlot,
    doResetArcaneRecoveryOnLongRest,
    doRejectPactSlotArcaneRecovery,
  }
}
