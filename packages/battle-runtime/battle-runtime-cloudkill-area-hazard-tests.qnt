// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
module battleRuntimeCloudkillAreaHazardTests {
  import battleRuntimeCloudkillAreaHazard.* from "./battle-runtime-cloudkill-area-hazard"

  pure def castCloudkillAt(slotLevel: int): CloudkillSemanticState =
    resolveCloudkillCast(initialCloudkillSemanticState, slotLevel)

  pure val cloudkillFiveFives: List[CloudkillD8Pip] =
    List(CloudkillD8Five, CloudkillD8Five, CloudkillD8Five, CloudkillD8Five, CloudkillD8Five)

  pure val cloudkillFiveTwos: List[CloudkillD8Pip] =
    List(CloudkillD8Two, CloudkillD8Two, CloudkillD8Two, CloudkillD8Two, CloudkillD8Two)

  pure val cloudkillFiveDiceTotalingEight: List[CloudkillD8Pip] =
    List(CloudkillD8Four, CloudkillD8One, CloudkillD8One, CloudkillD8One, CloudkillD8One)

  run test_cloudkill_cast_owns_raw_area_damage_duration_and_slot_scaling = {
    val fifthLevel = castCloudkillAt(5)
    val sixthLevel = castCloudkillAt(6)
    all {
      assert(match fifthLevel.lifecycle {
        | CloudkillActive(cloud) => and {
            cloud.slotLevel == 5,
            cloud.damageDice == 5,
            cloud.damageType == CloudkillPoisonDamage,
            cloud.durationTicks == 100,
            cloud.radiusFeet == 20,
            cloud.centerDistanceFromSourceFeet == 0,
            cloud.heavilyObscured,
          }
        | _ => false
      }),
      assert(match sixthLevel.lifecycle {
        | CloudkillActive(cloud) => cloud.damageDice == 6
        | _ => false
      }),
      assert(fifthLevel.casterConcentrating),
      assert(not(fifthLevel.actionAvailable)),
      assert(not(fifthLevel.slotAvailable)),
      assert(castCloudkillAt(4) == initialCloudkillSemanticState),
    }
  }

  run test_cloudkill_full_and_half_poison_damage_mark_only_after_damage_resolution = {
    val cast = castCloudkillAt(5)
    val failedSave = resolveCloudkillSavingThrow(
      discoverCloudkillAreaTrigger(
        cast,
        PrimaryCloudkillTarget,
        CloudkillAppearsInArea,
        true,
      ),
      false,
    )
    val rejectedWrongDiceCount = resolveCloudkillDamage(
      failedSave,
      List(CloudkillD8Five, CloudkillD8Five, CloudkillD8Five, CloudkillD8Five),
    )
    val failedDamage = resolveCloudkillDamage(failedSave, cloudkillFiveFives)
    val fresh = resetCloudkillSavedThisTurn(failedDamage)
    val successfulSave = resolveCloudkillSavingThrow(
      discoverCloudkillAreaTrigger(
        fresh,
        PrimaryCloudkillTarget,
        CloudkillCreatureEndsTurnInArea,
        true,
      ),
      true,
    )
    val successfulDamage = resolveCloudkillDamage(successfulSave, cloudkillFiveFives)
    all {
      assert(rejectedWrongDiceCount == failedSave),
      assert(not(cloudkillTargetSavedThisTurn(failedSave, PrimaryCloudkillTarget))),
      assert(failedDamage.primaryTargetHitPoints == 15),
      assert(cloudkillTargetSavedThisTurn(failedDamage, PrimaryCloudkillTarget)),
      assert(successfulDamage.primaryTargetHitPoints == 3),
      assert(cloudkillTargetSavedThisTurn(successfulDamage, PrimaryCloudkillTarget)),
    }
  }

  run test_cloudkill_qualified_triggers_share_one_per_turn_ledger = {
    val cast = castCloudkillAt(5)
    val appeared = resolveCloudkillDamage(
      resolveCloudkillSavingThrow(
        discoverCloudkillAreaTrigger(
          cast,
          PrimaryCloudkillTarget,
          CloudkillAppearsInArea,
          true,
        ),
        true,
      ),
      cloudkillFiveDiceTotalingEight,
    )
    val duplicateEntry = discoverCloudkillAreaTrigger(
      appeared,
      PrimaryCloudkillTarget,
      CloudkillCreatureEntersArea,
      true,
    )
    val laterTurn = resetCloudkillSavedThisTurn(appeared)
    val laterEndTurn = discoverCloudkillAreaTrigger(
      laterTurn,
      PrimaryCloudkillTarget,
      CloudkillCreatureEndsTurnInArea,
      true,
    )
    all {
      assert(duplicateEntry == appeared),
      assert(match laterEndTurn.pending {
        | CloudkillSavingThrowPending(data) =>
            data.target == PrimaryCloudkillTarget and
            data.trigger == CloudkillCreatureEndsTurnInArea
        | _ => false
      }),
      assert(discoverCloudkillAreaTrigger(
        laterTurn,
        PrimaryCloudkillTarget,
        CloudkillCreatureEndsTurnInArea,
        false,
      ) == laterTurn),
    }
  }

  run test_cloudkill_moves_exactly_ten_feet_only_at_source_turn_start = {
    val cast = castCloudkillAt(5)
    val targetTurn = endCloudkillCasterTurn(cast)
    val moved = beginCloudkillSourceTurn(
      targetTurn,
      CloudkillMovementBeforeOtherOccurrence,
      List(),
    )
    val wrongBoundary = beginCloudkillSourceTurn(
      cast,
      CloudkillMovementBeforeOtherOccurrence,
      List(),
    )
    all {
      assert(match moved.lifecycle {
        | CloudkillActive(cloud) => cloud.centerDistanceFromSourceFeet == 10
        | _ => false
      }),
      assert(moved.turnRole == CloudkillCasterTurn),
      assert(wrongBoundary == cast),
    }
  }

  run test_cloudkill_preserves_table_target_order_through_save_damage_continuations = {
    val targetTurn = endCloudkillCasterTurn(castCloudkillAt(5))
    val firstSave = beginCloudkillSourceTurn(
      targetTurn,
      CloudkillMovementBeforeOtherOccurrence,
      List(SecondaryCloudkillTarget, PrimaryCloudkillTarget),
    )
    val firstDamage = resolveCloudkillSavingThrow(firstSave, false)
    val secondSave = resolveCloudkillDamage(firstDamage, cloudkillFiveDiceTotalingEight)
    val secondDamage = resolveCloudkillSavingThrow(secondSave, true)
    val resolved = resolveCloudkillDamage(secondDamage, cloudkillFiveDiceTotalingEight)
    all {
      assert(match firstSave.pending {
        | CloudkillSavingThrowPending(data) =>
            data.target == SecondaryCloudkillTarget and
            data.remainingTargets == List(PrimaryCloudkillTarget)
        | _ => false
      }),
      assert(match secondSave.pending {
        | CloudkillSavingThrowPending(data) =>
            data.target == PrimaryCloudkillTarget and
            data.remainingTargets == List()
        | _ => false
      }),
      assert(resolved.secondaryTargetHitPoints == 32),
      assert(resolved.primaryTargetHitPoints == 36),
      assert(resolved.pending == NoCloudkillPendingResolution),
    }
  }

  run test_cloudkill_turn_owner_order_can_resolve_other_occurrence_before_movement = {
    val targetTurn = endCloudkillCasterTurn(castCloudkillAt(5))
    val deferredMovement = beginCloudkillSourceTurn(
      targetTurn,
      CloudkillOtherOccurrenceBeforeMovement,
      List(PrimaryCloudkillTarget),
    )
    val movementSave = resolveCloudkillOtherStartTurnOccurrence(deferredMovement)
    all {
      assert(match deferredMovement.pending {
        | CloudkillOtherStartTurnOccurrencePending(data) =>
            data.movementTargets == List(PrimaryCloudkillTarget)
        | _ => false
      }),
      assert(not(deferredMovement.otherStartTurnOccurrenceResolved)),
      assert(match deferredMovement.lifecycle {
        | CloudkillActive(cloud) => cloud.centerDistanceFromSourceFeet == 0
        | _ => false
      }),
      assert(movementSave.otherStartTurnOccurrenceResolved),
      assert(match movementSave.lifecycle {
        | CloudkillActive(cloud) => cloud.centerDistanceFromSourceFeet == 10
        | _ => false
      }),
      assert(match movementSave.pending {
        | CloudkillSavingThrowPending(data) =>
            data.target == PrimaryCloudkillTarget and
            data.trigger == CloudkillMovesIntoSpace
        | _ => false
      }),
    }
  }

  run test_cloudkill_source_damage_concentration_failure_cancels_remaining_movement_targets = {
    val targetTurn = endCloudkillCasterTurn(castCloudkillAt(5))
    val sourceSave = beginCloudkillSourceTurn(
      targetTurn,
      CloudkillMovementBeforeOtherOccurrence,
      List(CloudkillCaster, SecondaryCloudkillTarget),
    )
    val sourceDamage = resolveCloudkillSavingThrow(sourceSave, true)
    val concentrationSave = resolveCloudkillDamage(sourceDamage, cloudkillFiveTwos)
    val canceled = resolveCloudkillSourceConcentrationSavingThrow(
      concentrationSave,
      false,
    )
    all {
      assert(match concentrationSave.pending {
        | CloudkillConcentrationSavingThrowPending(data) =>
            data.remainingTargets == List(SecondaryCloudkillTarget)
        | _ => false
      }),
      assert(not(canceled.casterConcentrating)),
      assert(not(cloudkillIsActive(canceled))),
      assert(canceled.pending == NoCloudkillPendingResolution),
      assert(canceled.casterHitPoints == 35),
      assert(canceled.secondaryTargetHitPoints == 40),
      assert(match canceled.lifecycle {
        | CloudkillEnded(data) =>
            data.reason == CloudkillSourceDamageEndedConcentration
        | _ => false
      }),
    }
  }

  run test_cloudkill_concentration_wind_and_duration_cleanup_remove_obscurement = {
    val cast = castCloudkillAt(5)
    val concentrationEnded = endCloudkillConcentration(cast)
    val notStrong = disperseCloudkill(cast, false)
    val strong = disperseCloudkill(cast, true)
    val expiring = match cast.lifecycle {
      | CloudkillActive(cloud) => {
          ...cast,
          lifecycle: CloudkillActive({ ...cloud, durationTicks: 1 }),
        }
      | _ => cast
    }
    val expired = tickCloudkillDuration(expiring)
    all {
      assert(not(cloudkillIsActive(concentrationEnded))),
      assert(notStrong == cast),
      assert(not(cloudkillIsActive(strong))),
      assert(not(cloudkillIsActive(expired))),
      assert(match strong.lifecycle {
        | CloudkillEnded(data) => data.reason == CloudkillDispersedByStrongWind
        | _ => false
      }),
      assert(match expired.lifecycle {
        | CloudkillEnded(data) => data.reason == CloudkillDurationExpired
        | _ => false
      }),
    }
  }
}
