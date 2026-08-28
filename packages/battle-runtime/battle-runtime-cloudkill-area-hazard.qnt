// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// Focused semantic owner for Cloudkill. Spatial membership and the direction
// away from the caster are table facts. This model owns the resulting runtime
// protocol: the persistent Sphere, its shared once-per-turn save ledger,
// source-start movement distance, ordered movement targets, save/damage
// continuation, and spell cleanup.
//
// RAW anchors:
// - Spells/Descriptions-A-D.md#Cloudkill: Action; Concentration up to 10
//   minutes; 20-foot-radius Sphere; Heavily Obscured; Constitution save for
//   5d8 Poison damage or half; appears/moves/enters/end-turn triggers sharing
//   one save per creature per turn; 10-foot source-start movement; +1d8 per
//   slot level above 5; strong-wind dispersal.
// - Rules-Glossary.md#Concentration, #Area-of-Effect,
//   #Sphere-Area-of-Effect, #Heavily-Obscured, and #Simultaneous-Effects.
// - Playing-the-Game.md#Saving-Throws-and-Damage and #Reactions.
// - Gameplay-Toolbox.md#Strong-Wind.
// - UBIQUITOUS_LANGUAGE.md: Turn, Reaction, Concentration, Area of Effect,
//   Obscurement, Saving Throw, and Damage Type.
module battleRuntimeCloudkillAreaHazard {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"

  type CloudkillTarget = PrimaryCloudkillTarget | SecondaryCloudkillTarget

  type CloudkillTrigger =
    | CloudkillAppearsInArea
    | CloudkillMovesIntoSpace
    | CloudkillCreatureEntersArea
    | CloudkillCreatureEndsTurnInArea

  type CloudkillTurnRole = CloudkillCasterTurn | CloudkillTargetTurn

  type CloudkillDamageType = | CloudkillPoisonDamage

  type CloudkillStartTurnOrder =
    | CloudkillMovementBeforeOtherOccurrence
    | CloudkillOtherOccurrenceBeforeMovement

  type CloudkillEndReason =
    | CloudkillConcentrationEnded
    | CloudkillReactionEndedConcentration
    | CloudkillDispersedByStrongWind
    | CloudkillDurationExpired

  type CloudkillLifecycle =
    | CloudkillAbsent
    | CloudkillActive({
        slotLevel: int,
        damageDice: int,
        damageType: CloudkillDamageType,
        durationTicks: int,
        radiusFeet: int,
        centerDistanceFromSourceFeet: int,
        heavilyObscured: bool,
        savedThisTurn: Set[CloudkillTarget],
      })
    | CloudkillEnded({ reason: CloudkillEndReason })

  type CloudkillPendingResolution =
    | NoCloudkillPendingResolution
    | CloudkillOtherStartTurnOccurrencePending({
        movementTargets: List[CloudkillTarget],
      })
    | CloudkillSavingThrowPending({
        trigger: CloudkillTrigger,
        target: CloudkillTarget,
        remainingTargets: List[CloudkillTarget],
      })
    | CloudkillFailedSaveReactionPending({
        trigger: CloudkillTrigger,
        target: CloudkillTarget,
        remainingTargets: List[CloudkillTarget],
      })
    | CloudkillDamagePending({
        trigger: CloudkillTrigger,
        target: CloudkillTarget,
        remainingTargets: List[CloudkillTarget],
        savingThrowSucceeded: bool,
      })

  type CloudkillSemanticState = {
    actionAvailable: bool,
    slotAvailable: bool,
    casterConcentrating: bool,
    turnRole: CloudkillTurnRole,
    lifecycle: CloudkillLifecycle,
    pending: CloudkillPendingResolution,
    primaryTargetHitPoints: int,
    secondaryTargetHitPoints: int,
    lastStartTurnOrder: CloudkillStartTurnOrder,
    otherStartTurnOccurrenceResolved: bool,
  }

  pure val cloudkillMinimumSlotLevel: int = 5
  pure val cloudkillBaseDamageDice: int = 5
  pure val cloudkillDurationTicks: int = 100
  pure val cloudkillRadiusFeet: int = 20
  pure val cloudkillMovementFeet: int = 10

  pure val initialCloudkillSemanticState: CloudkillSemanticState = {
    actionAvailable: true,
    slotAvailable: true,
    casterConcentrating: false,
    turnRole: CloudkillCasterTurn,
    lifecycle: CloudkillAbsent,
    pending: NoCloudkillPendingResolution,
    primaryTargetHitPoints: 40,
    secondaryTargetHitPoints: 40,
    lastStartTurnOrder: CloudkillMovementBeforeOtherOccurrence,
    otherStartTurnOccurrenceResolved: false,
  }

  pure def cloudkillDamageDice(slotLevel: int): int =
    cloudkillBaseDamageDice + (slotLevel - cloudkillMinimumSlotLevel)

  pure def cloudkillTriggerTiming(trigger: CloudkillTrigger): AreaEffectTriggerTiming =
    match trigger {
      | CloudkillAppearsInArea => AreaAppearsInSpace
      | CloudkillMovesIntoSpace => AreaMovesIntoSpace
      | CloudkillCreatureEntersArea => CreatureEntersArea
      | CloudkillCreatureEndsTurnInArea => CreatureEndsTurnInArea
    }

  pure def cloudkillIsActive(state: CloudkillSemanticState): bool =
    match state.lifecycle {
      | CloudkillActive(_) => true
      | _ => false
    }

  pure def cloudkillTargetSavedThisTurn(
    state: CloudkillSemanticState,
    target: CloudkillTarget,
  ): bool =
    match state.lifecycle {
      | CloudkillActive(cloud) => cloud.savedThisTurn.contains(target)
      | _ => false
    }

  pure def cloudkillTriggerCanResolve(
    state: CloudkillSemanticState,
    target: CloudkillTarget,
    trigger: CloudkillTrigger,
    tableMembershipWitnessPresent: bool,
  ): bool =
    areaEffectTriggerCanResolve(
      cloudkillIsActive(state),
      tableMembershipWitnessPresent,
      onceAcrossQualifiedAreaTriggersProfile(cloudkillTargetSavedThisTurn(state, target)),
      cloudkillTriggerTiming(trigger),
    )

  pure def resolveCloudkillCast(
    state: CloudkillSemanticState,
    slotLevel: int,
  ): CloudkillSemanticState =
    if (
      state.turnRole != CloudkillCasterTurn or
      not(state.actionAvailable) or
      not(state.slotAvailable) or
      slotLevel < cloudkillMinimumSlotLevel or
      state.pending != NoCloudkillPendingResolution
    )
      state
    else
      {
        ...state,
        actionAvailable: false,
        slotAvailable: false,
        casterConcentrating: true,
        lifecycle: CloudkillActive({
          slotLevel: slotLevel,
          damageDice: cloudkillDamageDice(slotLevel),
          damageType: CloudkillPoisonDamage,
          durationTicks: cloudkillDurationTicks,
          radiusFeet: cloudkillRadiusFeet,
          centerDistanceFromSourceFeet: 0,
          heavilyObscured: true,
          savedThisTurn: Set(),
        }),
      }

  pure def cloudkillWithPendingTargets(
    state: CloudkillSemanticState,
    trigger: CloudkillTrigger,
    targets: List[CloudkillTarget],
  ): CloudkillSemanticState =
    if (targets.length() == 0)
      state
    else {
      val target = targets.head()
      val remainingTargets = targets.tail()
      if (cloudkillTriggerCanResolve(state, target, trigger, true))
        {
          ...state,
          pending: CloudkillSavingThrowPending({
            trigger: trigger,
            target: target,
            remainingTargets: remainingTargets,
          }),
        }
      else
        state
    }

  pure def discoverCloudkillAreaTrigger(
    state: CloudkillSemanticState,
    target: CloudkillTarget,
    trigger: CloudkillTrigger,
    tableMembershipWitnessPresent: bool,
  ): CloudkillSemanticState =
    if (
      state.pending != NoCloudkillPendingResolution or
      not(cloudkillTriggerCanResolve(state, target, trigger, tableMembershipWitnessPresent))
    )
      state
    else
      cloudkillWithPendingTargets(state, trigger, List(target))

  pure def resetCloudkillSavedThisTurn(state: CloudkillSemanticState): CloudkillSemanticState =
    match state.lifecycle {
      | CloudkillActive(cloud) => {
          ...state,
          lifecycle: CloudkillActive({ ...cloud, savedThisTurn: Set() }),
        }
      | _ => state
    }

  pure def endCloudkillCasterTurn(state: CloudkillSemanticState): CloudkillSemanticState =
    if (
      state.turnRole != CloudkillCasterTurn or
      state.pending != NoCloudkillPendingResolution
    )
      state
    else
      {
        ...resetCloudkillSavedThisTurn(state),
        actionAvailable: true,
        turnRole: CloudkillTargetTurn,
        otherStartTurnOccurrenceResolved: false,
      }

  pure def moveCloudkillSphereAtSourceTurnStart(
    state: CloudkillSemanticState,
  ): CloudkillSemanticState =
    match state.lifecycle {
      | CloudkillActive(cloud) => {
          ...state,
          lifecycle: CloudkillActive({
            ...cloud,
            centerDistanceFromSourceFeet:
              cloud.centerDistanceFromSourceFeet + cloudkillMovementFeet,
          }),
        }
      | _ => state
    }

  pure def beginCloudkillSourceTurn(
    state: CloudkillSemanticState,
    order: CloudkillStartTurnOrder,
    orderedMovementTargets: List[CloudkillTarget],
  ): CloudkillSemanticState =
    if (
      state.turnRole != CloudkillTargetTurn or
      state.pending != NoCloudkillPendingResolution or
      not(cloudkillIsActive(state))
    )
      state
    else {
      val reset = resetCloudkillSavedThisTurn(state)
      val sourceTurn = {
        ...reset,
        actionAvailable: true,
        turnRole: CloudkillCasterTurn,
        lastStartTurnOrder: order,
        otherStartTurnOccurrenceResolved: false,
      }
      match order {
        | CloudkillMovementBeforeOtherOccurrence =>
            cloudkillWithPendingTargets(
              moveCloudkillSphereAtSourceTurnStart(sourceTurn),
              CloudkillMovesIntoSpace,
              orderedMovementTargets,
            )
        | CloudkillOtherOccurrenceBeforeMovement => {
            ...sourceTurn,
            pending: CloudkillOtherStartTurnOccurrencePending({
              movementTargets: orderedMovementTargets,
            }),
          }
      }
    }

  pure def resolveCloudkillOtherStartTurnOccurrence(
    state: CloudkillSemanticState,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillOtherStartTurnOccurrencePending(data) =>
          cloudkillWithPendingTargets(
            moveCloudkillSphereAtSourceTurnStart({
              ...state,
              pending: NoCloudkillPendingResolution,
              otherStartTurnOccurrenceResolved: true,
            }),
            CloudkillMovesIntoSpace,
            data.movementTargets,
          )
      | _ => state
    }

  pure def resolveCloudkillSavingThrow(
    state: CloudkillSemanticState,
    savingThrowSucceeded: bool,
    failedSaveReactionAvailable: bool,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillSavingThrowPending(data) =>
          if (not(savingThrowSucceeded) and failedSaveReactionAvailable)
            {
              ...state,
              pending: CloudkillFailedSaveReactionPending(data),
            }
          else
            {
              ...state,
              pending: CloudkillDamagePending({
                trigger: data.trigger,
                target: data.target,
                remainingTargets: data.remainingTargets,
                savingThrowSucceeded: savingThrowSucceeded,
              }),
            }
      | _ => state
    }

  pure def declineCloudkillFailedSaveReaction(
    state: CloudkillSemanticState,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillFailedSaveReactionPending(data) => {
          ...state,
          pending: CloudkillDamagePending({
            trigger: data.trigger,
            target: data.target,
            remainingTargets: data.remainingTargets,
            savingThrowSucceeded: false,
          }),
        }
      | _ => state
    }

  pure def cloudkillDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded) rolledDamage / 2 else rolledDamage

  pure def cloudkillTargetWithDamage(
    state: CloudkillSemanticState,
    target: CloudkillTarget,
    damage: int,
  ): CloudkillSemanticState =
    match target {
      | PrimaryCloudkillTarget => {
          ...state,
          primaryTargetHitPoints:
            if (state.primaryTargetHitPoints - damage > 0)
              state.primaryTargetHitPoints - damage
            else
              0,
        }
      | SecondaryCloudkillTarget => {
          ...state,
          secondaryTargetHitPoints:
            if (state.secondaryTargetHitPoints - damage > 0)
              state.secondaryTargetHitPoints - damage
            else
              0,
        }
    }

  pure def markCloudkillTargetSavedThisTurn(
    state: CloudkillSemanticState,
    target: CloudkillTarget,
  ): CloudkillSemanticState =
    match state.lifecycle {
      | CloudkillActive(cloud) => {
          ...state,
          lifecycle: CloudkillActive({
            ...cloud,
            savedThisTurn: cloud.savedThisTurn.union(Set(target)),
          }),
        }
      | _ => state
    }

  pure def resolveCloudkillDamage(
    state: CloudkillSemanticState,
    rolledDamage: int,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillDamagePending(data) => {
          val damaged = cloudkillTargetWithDamage(
            state,
            data.target,
            cloudkillDamageAfterSave(rolledDamage, data.savingThrowSucceeded),
          )
          val marked = markCloudkillTargetSavedThisTurn(
            { ...damaged, pending: NoCloudkillPendingResolution },
            data.target,
          )
          cloudkillWithPendingTargets(marked, data.trigger, data.remainingTargets)
        }
      | _ => state
    }

  pure def endCloudkill(
    state: CloudkillSemanticState,
    reason: CloudkillEndReason,
  ): CloudkillSemanticState =
    if (not(cloudkillIsActive(state)))
      state
    else
      {
        ...state,
        casterConcentrating: false,
        lifecycle: CloudkillEnded({ reason: reason }),
        pending: NoCloudkillPendingResolution,
      }

  pure def acceptReactionEndingCloudkillConcentration(
    state: CloudkillSemanticState,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillFailedSaveReactionPending(_) =>
          endCloudkill(state, CloudkillReactionEndedConcentration)
      | _ => state
    }

  pure def endCloudkillConcentration(state: CloudkillSemanticState): CloudkillSemanticState =
    endCloudkill(state, CloudkillConcentrationEnded)

  pure def disperseCloudkill(
    state: CloudkillSemanticState,
    tableWitnessesStrongWind: bool,
  ): CloudkillSemanticState =
    if (tableWitnessesStrongWind)
      endCloudkill(state, CloudkillDispersedByStrongWind)
    else
      state

  pure def tickCloudkillDuration(state: CloudkillSemanticState): CloudkillSemanticState =
    match state.lifecycle {
      | CloudkillActive(cloud) =>
          if (cloud.durationTicks <= 1)
            endCloudkill(state, CloudkillDurationExpired)
          else
            {
              ...state,
              lifecycle: CloudkillActive({
                ...cloud,
                durationTicks: cloud.durationTicks - 1,
              }),
            }
      | _ => state
    }
}
