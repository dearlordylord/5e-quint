// -*- mode: Bluespec; -*-

module characterSheetArcaneRecoverySelectedIdentityMbt {
  type CharacterSheetArcaneRecoverySelectedIdentityOutcome =
    | CharacterSheetArcaneRecoverySelectedIdentityInit
    | CharacterSheetArcaneRecoverySelectedIdentityShortRestRecovered
    | CharacterSheetArcaneRecoverySelectedIdentityLongRestReset
    | CharacterSheetArcaneRecoverySelectedIdentityPactSlotRejected

  type CharacterSheetArcaneRecoverySelectedIdentityState = {
    featureUnitId: str,
    firstLevelSpellSlotsExpended: int,
    secondLevelSpellSlotsExpended: int,
    pactSlotsExpended: int,
    arcaneRecoveryUsedSinceLongRest: bool,
    accepted: bool,
    message: str,
    recoveredCombinedSlotLevels: int,
    outcome: CharacterSheetArcaneRecoverySelectedIdentityOutcome,
  }

  var qState: CharacterSheetArcaneRecoverySelectedIdentityState

  action recordProjection(
    featureUnitId: str,
    firstLevelSpellSlotsExpended: int,
    secondLevelSpellSlotsExpended: int,
    pactSlotsExpended: int,
    arcaneRecoveryUsedSinceLongRest: bool,
    accepted: bool,
    message: str,
    recoveredCombinedSlotLevels: int,
    outcome: CharacterSheetArcaneRecoverySelectedIdentityOutcome,
  ): bool = all {
    qState' = {
      featureUnitId: featureUnitId,
      firstLevelSpellSlotsExpended: firstLevelSpellSlotsExpended,
      secondLevelSpellSlotsExpended: secondLevelSpellSlotsExpended,
      pactSlotsExpended: pactSlotsExpended,
      arcaneRecoveryUsedSinceLongRest: arcaneRecoveryUsedSinceLongRest,
      accepted: accepted,
      message: message,
      recoveredCombinedSlotLevels: recoveredCombinedSlotLevels,
      outcome: outcome,
    },
  }

  action init =
    recordProjection(
      "none",
      0,
      0,
      0,
      false,
      false,
      "none",
      0,
      CharacterSheetArcaneRecoverySelectedIdentityInit,
    )

  action doRecoverSecondLevelSpellSlot = all {
    qState.outcome == CharacterSheetArcaneRecoverySelectedIdentityInit,
    recordProjection(
      "wizard_arcane_recovery",
      2,
      0,
      0,
      true,
      true,
      "none",
      2,
      CharacterSheetArcaneRecoverySelectedIdentityShortRestRecovered,
    ),
  }

  action doResetArcaneRecoveryOnLongRest = all {
    qState.outcome == CharacterSheetArcaneRecoverySelectedIdentityInit,
    recordProjection(
      "wizard_arcane_recovery",
      0,
      0,
      0,
      false,
      true,
      "none",
      0,
      CharacterSheetArcaneRecoverySelectedIdentityLongRestReset,
    ),
  }

  action doRejectPactSlotArcaneRecovery = all {
    qState.outcome == CharacterSheetArcaneRecoverySelectedIdentityInit,
    recordProjection(
      "wizard_arcane_recovery",
      0,
      0,
      1,
      false,
      false,
      "Arcane Recovery cannot refund more Spell Slots than are expended.",
      0,
      CharacterSheetArcaneRecoverySelectedIdentityPactSlotRejected,
    ),
  }

  action step = any {
    doRecoverSecondLevelSpellSlot,
    doResetArcaneRecoveryOnLongRest,
    doRejectPactSlotArcaneRecovery,
  }
}
