// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// Focused runtime projection witness. The production reducer remains the
// implementation under test; this driver records only observable Cloudkill
// lifecycle facts and table-supplied choices.
module battleRuntimeCloudkillAreaHazardMbt {
  type CloudkillMbtTarget =
    | NoCloudkillMbtTarget
    | PrimaryCloudkillMbtTarget
    | SecondaryCloudkillMbtTarget

  type CloudkillMbtPending =
    | CloudkillMbtNoPending
    | CloudkillMbtSavingThrowPending
    | CloudkillMbtDamagePending

  type CloudkillMbtOutcome =
    | CloudkillMbtInit
    | CloudkillMbtCast
    | CloudkillMbtAppearanceSave
    | CloudkillMbtAppearanceDamage
    | CloudkillMbtAppearanceResolved
    | CloudkillMbtTargetTurn
    | CloudkillMbtMovementSave
    | CloudkillMbtMovementDamage
    | CloudkillMbtMovementResolved
    | CloudkillMbtConcentrationEnded
    | CloudkillMbtStrongWindEnded

  type CloudkillMbtState = {
    qCasterTurn: bool,
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qHazardActive: bool,
    qCasterConcentrating: bool,
    qSlotLevel: int,
    qDamageDice: int,
    qDurationTicks: int,
    qRadiusFeet: int,
    qHeavilyObscured: bool,
    qPrimarySavedThisTurn: bool,
    qSecondarySavedThisTurn: bool,
    qPrimaryHitPoints: int,
    qSecondaryHitPoints: int,
    qLastMovementDistanceFeet: int,
    qPending: CloudkillMbtPending,
    qPendingTarget: CloudkillMbtTarget,
    qRemainingTarget: CloudkillMbtTarget,
    qSavingThrowSucceeded: bool,
    qOutcome: CloudkillMbtOutcome,
  }

  var qState: CloudkillMbtState

  pure def cloudkillMbtDamageDice(slotLevel: int): int = 5 + (slotLevel - 5)

  pure def cloudkillMbtDamage(rolledDamage: int, succeeded: bool): int =
    if (succeeded) rolledDamage / 2 else rolledDamage

  pure def cloudkillMbtHitPointsAfterDamage(hitPoints: int, damage: int): int =
    if (hitPoints - damage > 0) hitPoints - damage else 0

  action init = {
    nondet slotLevel = 5.to(6).oneOf()
    all {
      qState' = {
        qCasterTurn: true,
        qActionAvailable: true,
        qSpellAvailable: true,
        qHazardActive: false,
        qCasterConcentrating: false,
        qSlotLevel: slotLevel,
        qDamageDice: 0,
        qDurationTicks: 0,
        qRadiusFeet: 0,
        qHeavilyObscured: false,
        qPrimarySavedThisTurn: false,
        qSecondarySavedThisTurn: false,
        qPrimaryHitPoints: 40,
        qSecondaryHitPoints: 40,
        qLastMovementDistanceFeet: 0,
        qPending: CloudkillMbtNoPending,
        qPendingTarget: NoCloudkillMbtTarget,
        qRemainingTarget: NoCloudkillMbtTarget,
        qSavingThrowSucceeded: false,
        qOutcome: CloudkillMbtInit,
      },
    }
  }

  action doCastCloudkill = all {
    qState.qCasterTurn,
    qState.qActionAvailable,
    qState.qSpellAvailable,
    not(qState.qHazardActive),
    qState.qPending == CloudkillMbtNoPending,
    qState' = {
      ...qState,
      qActionAvailable: false,
      qSpellAvailable: false,
      qHazardActive: true,
      qCasterConcentrating: true,
      qDamageDice: cloudkillMbtDamageDice(qState.qSlotLevel),
      qDurationTicks: 100,
      qRadiusFeet: 20,
      qHeavilyObscured: true,
      qOutcome: CloudkillMbtCast,
    },
  }

  action doDiscoverAppearanceSave = all {
    qState.qOutcome == CloudkillMbtCast,
    qState.qHazardActive,
    qState.qPending == CloudkillMbtNoPending,
    not(qState.qPrimarySavedThisTurn),
    qState' = {
      ...qState,
      qPending: CloudkillMbtSavingThrowPending,
      qPendingTarget: PrimaryCloudkillMbtTarget,
      qRemainingTarget: NoCloudkillMbtTarget,
      qOutcome: CloudkillMbtAppearanceSave,
    },
  }

  action doResolveAppearanceSave = {
    nondet succeeded = Set(true, false).oneOf()
    all {
      qState.qOutcome == CloudkillMbtAppearanceSave,
      qState.qPending == CloudkillMbtSavingThrowPending,
      qState' = {
        ...qState,
        qPending: CloudkillMbtDamagePending,
        qSavingThrowSucceeded: succeeded,
        qOutcome: CloudkillMbtAppearanceDamage,
      },
    }
  }

  action doResolveAppearanceDamage = {
    nondet damageDiePip = 1.to(4).oneOf()
    val rolledDamage = qState.qDamageDice * damageDiePip
    val damage = cloudkillMbtDamage(rolledDamage, qState.qSavingThrowSucceeded)
    all {
      qState.qOutcome == CloudkillMbtAppearanceDamage,
      qState.qPending == CloudkillMbtDamagePending,
      qState.qPendingTarget == PrimaryCloudkillMbtTarget,
      qState' = {
        ...qState,
        qPrimarySavedThisTurn: true,
        qPrimaryHitPoints: cloudkillMbtHitPointsAfterDamage(qState.qPrimaryHitPoints, damage),
        qPending: CloudkillMbtNoPending,
        qPendingTarget: NoCloudkillMbtTarget,
        qSavingThrowSucceeded: false,
        qOutcome: CloudkillMbtAppearanceResolved,
      },
    }
  }

  action doEndCasterTurn = all {
    qState.qCasterTurn,
    qState.qHazardActive,
    qState.qPending == CloudkillMbtNoPending,
    qState' = {
      ...qState,
      qCasterTurn: false,
      qActionAvailable: true,
      qPrimarySavedThisTurn: false,
      qSecondarySavedThisTurn: false,
      qOutcome: CloudkillMbtTargetTurn,
    },
  }

  action doBeginSourceTurnMovement = {
    nondet primaryAffected = Set(true, false).oneOf()
    nondet secondaryAffected = Set(true, false).oneOf()
    nondet secondaryFirst = Set(true, false).oneOf()
    val firstTarget =
      if (secondaryAffected and (secondaryFirst or not(primaryAffected)))
        SecondaryCloudkillMbtTarget
      else if (primaryAffected)
        PrimaryCloudkillMbtTarget
      else
        NoCloudkillMbtTarget
    val remainingTarget =
      if (primaryAffected and secondaryAffected)
        if (firstTarget == PrimaryCloudkillMbtTarget)
          SecondaryCloudkillMbtTarget
        else
          PrimaryCloudkillMbtTarget
      else
        NoCloudkillMbtTarget
    all {
      not(qState.qCasterTurn),
      qState.qHazardActive,
      qState.qPending == CloudkillMbtNoPending,
      qState' = {
        ...qState,
        qCasterTurn: true,
        qActionAvailable: true,
        qPrimarySavedThisTurn: false,
        qSecondarySavedThisTurn: false,
        qLastMovementDistanceFeet: 10,
        qPending:
          if (firstTarget == NoCloudkillMbtTarget)
            CloudkillMbtNoPending
          else
            CloudkillMbtSavingThrowPending,
        qPendingTarget: firstTarget,
        qRemainingTarget: remainingTarget,
        qOutcome:
          if (firstTarget == NoCloudkillMbtTarget)
            CloudkillMbtMovementResolved
          else
            CloudkillMbtMovementSave,
      },
    }
  }

  action doResolveMovementSave = {
    nondet succeeded = Set(true, false).oneOf()
    all {
      qState.qOutcome == CloudkillMbtMovementSave,
      qState.qPending == CloudkillMbtSavingThrowPending,
      qState' = {
        ...qState,
        qPending: CloudkillMbtDamagePending,
        qSavingThrowSucceeded: succeeded,
        qOutcome: CloudkillMbtMovementDamage,
      },
    }
  }

  action doResolveMovementDamage = {
    nondet damageDiePip = 1.to(4).oneOf()
    val rolledDamage = qState.qDamageDice * damageDiePip
    val damage = cloudkillMbtDamage(rolledDamage, qState.qSavingThrowSucceeded)
    val nextPrimaryHitPoints =
      if (qState.qPendingTarget == PrimaryCloudkillMbtTarget)
        cloudkillMbtHitPointsAfterDamage(qState.qPrimaryHitPoints, damage)
      else
        qState.qPrimaryHitPoints
    val nextSecondaryHitPoints =
      if (qState.qPendingTarget == SecondaryCloudkillMbtTarget)
        cloudkillMbtHitPointsAfterDamage(qState.qSecondaryHitPoints, damage)
      else
        qState.qSecondaryHitPoints
    val hasRemainingTarget = qState.qRemainingTarget != NoCloudkillMbtTarget
    all {
      qState.qOutcome == CloudkillMbtMovementDamage,
      qState.qPending == CloudkillMbtDamagePending,
      qState' = {
        ...qState,
        qPrimarySavedThisTurn:
          qState.qPrimarySavedThisTurn or
          qState.qPendingTarget == PrimaryCloudkillMbtTarget,
        qSecondarySavedThisTurn:
          qState.qSecondarySavedThisTurn or
          qState.qPendingTarget == SecondaryCloudkillMbtTarget,
        qPrimaryHitPoints: nextPrimaryHitPoints,
        qSecondaryHitPoints: nextSecondaryHitPoints,
        qPending:
          if (hasRemainingTarget)
            CloudkillMbtSavingThrowPending
          else
            CloudkillMbtNoPending,
        qPendingTarget: qState.qRemainingTarget,
        qRemainingTarget: NoCloudkillMbtTarget,
        qSavingThrowSucceeded: false,
        qOutcome:
          if (hasRemainingTarget)
            CloudkillMbtMovementSave
          else
            CloudkillMbtMovementResolved,
      },
    }
  }

  action doEndConcentration = all {
    qState.qHazardActive,
    qState.qPending == CloudkillMbtNoPending,
    qState' = {
      ...qState,
      qHazardActive: false,
      qCasterConcentrating: false,
      qDamageDice: 0,
      qDurationTicks: 0,
      qRadiusFeet: 0,
      qHeavilyObscured: false,
      qOutcome: CloudkillMbtConcentrationEnded,
    },
  }

  action doDisperseWithStrongWind = all {
    qState.qHazardActive,
    qState.qPending == CloudkillMbtNoPending,
    qState' = {
      ...qState,
      qHazardActive: false,
      qCasterConcentrating: false,
      qDamageDice: 0,
      qDurationTicks: 0,
      qRadiusFeet: 0,
      qHeavilyObscured: false,
      qOutcome: CloudkillMbtStrongWindEnded,
    },
  }

  action step = any {
    doCastCloudkill,
    doDiscoverAppearanceSave,
    doResolveAppearanceSave,
    doResolveAppearanceDamage,
    doEndCasterTurn,
    doBeginSourceTurnMovement,
    doResolveMovementSave,
    doResolveMovementDamage,
    doEndConcentration,
    doDisperseWithStrongWind,
  }
}
