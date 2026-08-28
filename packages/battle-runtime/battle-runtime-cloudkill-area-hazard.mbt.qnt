// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// Focused runtime projection witness. The production reducer remains the
// implementation under test; this driver records only observable Cloudkill
// lifecycle facts and table-supplied choices.
module battleRuntimeCloudkillAreaHazardMbt {
  type CloudkillMbtTarget =
    | NoCloudkillMbtTarget
    | SourceCloudkillMbtTarget
    | PrimaryCloudkillMbtTarget
    | SecondaryCloudkillMbtTarget

  type CloudkillMbtPending =
    | CloudkillMbtNoPending
    | CloudkillMbtSavingThrowPending
    | CloudkillMbtDamagePending
    | CloudkillMbtConcentrationSavingThrowPending

  type CloudkillMbtOutcome =
    | CloudkillMbtInit
    | CloudkillMbtCast
    | CloudkillMbtAppearanceSave
    | CloudkillMbtAppearanceDamage
    | CloudkillMbtAppearanceResolved
    | CloudkillMbtTargetTurn
    | CloudkillMbtMovementSave
    | CloudkillMbtMovementDamage
    | CloudkillMbtSourceConcentrationSave
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
    qSourceSavedThisTurn: bool,
    qPrimarySavedThisTurn: bool,
    qSecondarySavedThisTurn: bool,
    qCasterHitPoints: int,
    qPrimaryHitPoints: int,
    qSecondaryHitPoints: int,
    qSourceStagedDamage: int,
    qPrimaryStagedDamage: int,
    qSecondaryStagedDamage: int,
    qSourceStagedSaved: bool,
    qPrimaryStagedSaved: bool,
    qSecondaryStagedSaved: bool,
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
        qSourceSavedThisTurn: false,
        qPrimarySavedThisTurn: false,
        qSecondarySavedThisTurn: false,
        qCasterHitPoints: 100,
        qPrimaryHitPoints: 40,
        qSecondaryHitPoints: 40,
        qSourceStagedDamage: 0,
        qPrimaryStagedDamage: 0,
        qSecondaryStagedDamage: 0,
        qSourceStagedSaved: false,
        qPrimaryStagedSaved: false,
        qSecondaryStagedSaved: false,
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
    nondet damageDiePip = 1.to(8).oneOf()
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
      qSourceSavedThisTurn: false,
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
        qSourceSavedThisTurn: false,
        qPrimarySavedThisTurn: false,
        qSecondarySavedThisTurn: false,
        qSourceStagedDamage: 0,
        qPrimaryStagedDamage: 0,
        qSecondaryStagedDamage: 0,
        qSourceStagedSaved: false,
        qPrimaryStagedSaved: false,
        qSecondaryStagedSaved: false,
        qDurationTicks:
          if (firstTarget == NoCloudkillMbtTarget)
            qState.qDurationTicks - 1
          else
            qState.qDurationTicks,
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

  action doBeginSourceTurnMovementThroughSource = all {
    not(qState.qCasterTurn),
    qState.qHazardActive,
    qState.qPending == CloudkillMbtNoPending,
    qState' = {
      ...qState,
      qCasterTurn: true,
      qActionAvailable: true,
      qSourceSavedThisTurn: false,
      qPrimarySavedThisTurn: false,
      qSecondarySavedThisTurn: false,
      qSourceStagedDamage: 0,
      qPrimaryStagedDamage: 0,
      qSecondaryStagedDamage: 0,
      qSourceStagedSaved: false,
      qPrimaryStagedSaved: false,
      qSecondaryStagedSaved: false,
      qLastMovementDistanceFeet: 10,
      qPending: CloudkillMbtSavingThrowPending,
      qPendingTarget: SourceCloudkillMbtTarget,
      qRemainingTarget: SecondaryCloudkillMbtTarget,
      qOutcome: CloudkillMbtMovementSave,
    },
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
    nondet damageDiePip = 1.to(8).oneOf()
    val rolledDamage = qState.qDamageDice * damageDiePip
    val damage = cloudkillMbtDamage(rolledDamage, qState.qSavingThrowSucceeded)
    val nextSourceStagedDamage =
      if (qState.qPendingTarget == SourceCloudkillMbtTarget)
        qState.qSourceStagedDamage + damage
      else
        qState.qSourceStagedDamage
    val nextPrimaryStagedDamage =
      if (qState.qPendingTarget == PrimaryCloudkillMbtTarget)
        qState.qPrimaryStagedDamage + damage
      else
        qState.qPrimaryStagedDamage
    val nextSecondaryStagedDamage =
      if (qState.qPendingTarget == SecondaryCloudkillMbtTarget)
        qState.qSecondaryStagedDamage + damage
      else
        qState.qSecondaryStagedDamage
    val nextPrimaryStagedSaved =
      qState.qPrimaryStagedSaved or
      qState.qPendingTarget == PrimaryCloudkillMbtTarget
    val nextSecondaryStagedSaved =
      qState.qSecondaryStagedSaved or
      qState.qPendingTarget == SecondaryCloudkillMbtTarget
    val nextSourceStagedSaved =
      qState.qSourceStagedSaved or
      qState.qPendingTarget == SourceCloudkillMbtTarget
    val hasRemainingTarget = qState.qRemainingTarget != NoCloudkillMbtTarget
    val sourceConcentrationSaveRequired =
      qState.qPendingTarget == SourceCloudkillMbtTarget
    all {
      qState.qOutcome == CloudkillMbtMovementDamage,
      qState.qPending == CloudkillMbtDamagePending,
      qState' = {
        ...qState,
        qSourceSavedThisTurn:
          if (sourceConcentrationSaveRequired or hasRemainingTarget)
            qState.qSourceSavedThisTurn
          else
            qState.qSourceSavedThisTurn or nextSourceStagedSaved,
        qPrimarySavedThisTurn:
          if (hasRemainingTarget)
            qState.qPrimarySavedThisTurn
          else
            qState.qPrimarySavedThisTurn or nextPrimaryStagedSaved,
        qSecondarySavedThisTurn:
          if (hasRemainingTarget)
            qState.qSecondarySavedThisTurn
          else
            qState.qSecondarySavedThisTurn or nextSecondaryStagedSaved,
        qCasterHitPoints:
          if (sourceConcentrationSaveRequired or hasRemainingTarget)
            qState.qCasterHitPoints
          else
            cloudkillMbtHitPointsAfterDamage(
              qState.qCasterHitPoints,
              nextSourceStagedDamage,
            ),
        qPrimaryHitPoints:
          if (hasRemainingTarget)
            qState.qPrimaryHitPoints
          else
            cloudkillMbtHitPointsAfterDamage(
              qState.qPrimaryHitPoints,
              nextPrimaryStagedDamage,
            ),
        qSecondaryHitPoints:
          if (hasRemainingTarget)
            qState.qSecondaryHitPoints
          else
            cloudkillMbtHitPointsAfterDamage(
              qState.qSecondaryHitPoints,
              nextSecondaryStagedDamage,
            ),
        qSourceStagedDamage:
          if (sourceConcentrationSaveRequired or hasRemainingTarget)
            nextSourceStagedDamage
          else
            0,
        qPrimaryStagedDamage:
          if (hasRemainingTarget) nextPrimaryStagedDamage else 0,
        qSecondaryStagedDamage:
          if (hasRemainingTarget) nextSecondaryStagedDamage else 0,
        qPrimaryStagedSaved:
          if (hasRemainingTarget) nextPrimaryStagedSaved else false,
        qSecondaryStagedSaved:
          if (hasRemainingTarget) nextSecondaryStagedSaved else false,
        qSourceStagedSaved:
          if (sourceConcentrationSaveRequired or hasRemainingTarget)
            nextSourceStagedSaved
          else
            false,
        qDurationTicks:
          if (hasRemainingTarget)
            qState.qDurationTicks
          else
            qState.qDurationTicks - 1,
        qPending:
          if (sourceConcentrationSaveRequired)
            CloudkillMbtConcentrationSavingThrowPending
          else if (hasRemainingTarget)
            CloudkillMbtSavingThrowPending
          else
            CloudkillMbtNoPending,
        qPendingTarget:
          if (sourceConcentrationSaveRequired)
            SourceCloudkillMbtTarget
          else
            qState.qRemainingTarget,
        qRemainingTarget:
          if (sourceConcentrationSaveRequired)
            qState.qRemainingTarget
          else
            NoCloudkillMbtTarget,
        qSavingThrowSucceeded: false,
        qOutcome:
          if (sourceConcentrationSaveRequired)
            CloudkillMbtSourceConcentrationSave
          else if (hasRemainingTarget)
            CloudkillMbtMovementSave
          else
            CloudkillMbtMovementResolved,
      },
    }
  }

  action doResolveSourceConcentrationSave = {
    nondet succeeded = Set(true, false).oneOf()
    all {
      qState.qOutcome == CloudkillMbtSourceConcentrationSave,
      qState.qPending == CloudkillMbtConcentrationSavingThrowPending,
      qState' =
        if (succeeded)
          {
            ...qState,
            qPending: CloudkillMbtSavingThrowPending,
            qPendingTarget: qState.qRemainingTarget,
            qRemainingTarget: NoCloudkillMbtTarget,
            qOutcome: CloudkillMbtMovementSave,
          }
        else
          {
            ...qState,
            qHazardActive: false,
            qCasterConcentrating: false,
            qDamageDice: 0,
            qDurationTicks: 0,
            qRadiusFeet: 0,
            qHeavilyObscured: false,
            qSourceSavedThisTurn: false,
            qPrimarySavedThisTurn: false,
            qSecondarySavedThisTurn: false,
            qCasterHitPoints: cloudkillMbtHitPointsAfterDamage(
              qState.qCasterHitPoints,
              qState.qSourceStagedDamage,
            ),
            qSourceStagedDamage: 0,
            qPrimaryStagedDamage: 0,
            qSecondaryStagedDamage: 0,
            qSourceStagedSaved: false,
            qPrimaryStagedSaved: false,
            qSecondaryStagedSaved: false,
            qPending: CloudkillMbtNoPending,
            qPendingTarget: NoCloudkillMbtTarget,
            qRemainingTarget: NoCloudkillMbtTarget,
            qSavingThrowSucceeded: false,
            qOutcome: CloudkillMbtConcentrationEnded,
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
      qSourceSavedThisTurn: false,
      qPrimarySavedThisTurn: false,
      qSecondarySavedThisTurn: false,
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
      qSourceSavedThisTurn: false,
      qPrimarySavedThisTurn: false,
      qSecondarySavedThisTurn: false,
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
    doBeginSourceTurnMovementThroughSource,
    doResolveMovementSave,
    doResolveMovementDamage,
    doResolveSourceConcentrationSave,
    doEndConcentration,
    doDisperseWithStrongWind,
  }
}
