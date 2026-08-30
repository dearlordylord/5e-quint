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
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"

  type CloudkillTarget =
    | CloudkillCaster
    | PrimaryCloudkillTarget
    | SecondaryCloudkillTarget

  type CloudkillD8Pip =
    | CloudkillD8One
    | CloudkillD8Two
    | CloudkillD8Three
    | CloudkillD8Four
    | CloudkillD8Five
    | CloudkillD8Six
    | CloudkillD8Seven
    | CloudkillD8Eight

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
    | CloudkillSourceDamageEndedConcentration
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

  type CloudkillStagedResolution = {
    remainingTargets: List[CloudkillTarget],
    casterDamage: int,
    primaryTargetDamage: int,
    secondaryTargetDamage: int,
    savedTargets: Set[CloudkillTarget],
  }

  type CloudkillResolutionTransaction =
    | CloudkillIndependentTransaction(CloudkillStagedResolution)
    | CloudkillMovementTransaction(CloudkillStagedResolution)

  type CloudkillPendingResolution =
    | NoCloudkillPendingResolution
    | CloudkillOtherStartTurnOccurrencePending({
        movementTargets: List[CloudkillTarget],
      })
    | CloudkillSavingThrowPending({
        trigger: CloudkillTrigger,
        target: CloudkillTarget,
        transaction: CloudkillResolutionTransaction,
      })
    | CloudkillDamagePending({
        trigger: CloudkillTrigger,
        target: CloudkillTarget,
        transaction: CloudkillResolutionTransaction,
        savingThrowSucceeded: bool,
      })
    | CloudkillConcentrationSavingThrowPending({
        trigger: CloudkillTrigger,
        transaction: CloudkillResolutionTransaction,
      })

  type CloudkillSemanticState = {
    actionAvailable: bool,
    slotAvailable: bool,
    casterConcentrating: bool,
    turnRole: CloudkillTurnRole,
    lifecycle: CloudkillLifecycle,
    pending: CloudkillPendingResolution,
    casterHitPoints: int,
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
  pure val cloudkillLifecycle: PersistentAreaLifecycle =
    SourceTurnTranslationPersistentArea({
      distanceFeet: cloudkillMovementFeet,
      direction: PersistentAreaAwayFromSource,
    })

  pure val initialCloudkillSemanticState: CloudkillSemanticState = {
    actionAvailable: true,
    slotAvailable: true,
    casterConcentrating: false,
    turnRole: CloudkillCasterTurn,
    lifecycle: CloudkillAbsent,
    pending: NoCloudkillPendingResolution,
    casterHitPoints: 40,
    primaryTargetHitPoints: 40,
    secondaryTargetHitPoints: 40,
    lastStartTurnOrder: CloudkillMovementBeforeOtherOccurrence,
    otherStartTurnOccurrenceResolved: false,
  }

  pure def cloudkillDamageDice(slotLevel: int): int =
    persistentAreaScaledDamageDice(
      slotLevel,
      cloudkillMinimumSlotLevel,
      cloudkillBaseDamageDice,
    )

  pure def cloudkillD8PipValue(pip: CloudkillD8Pip): int =
    match pip {
      | CloudkillD8One => 1
      | CloudkillD8Two => 2
      | CloudkillD8Three => 3
      | CloudkillD8Four => 4
      | CloudkillD8Five => 5
      | CloudkillD8Six => 6
      | CloudkillD8Seven => 7
      | CloudkillD8Eight => 8
    }

  pure def cloudkillRolledDamage(dice: List[CloudkillD8Pip]): int =
    dice.foldl(0, (total, pip) => total + cloudkillD8PipValue(pip))

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
      onceAcrossQualifiedAreaTriggersProfile(
        Set(
          AreaAppearsInSpace,
          AreaMovesIntoSpace,
          CreatureEntersArea,
          CreatureEndsTurnInArea,
        ),
        cloudkillTargetSavedThisTurn(state, target),
      ),
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

  pure def initialCloudkillStagedResolution(
    targets: List[CloudkillTarget],
  ): CloudkillStagedResolution = {
    remainingTargets: targets,
    casterDamage: 0,
    primaryTargetDamage: 0,
    secondaryTargetDamage: 0,
    savedTargets: Set(),
  }

  pure def cloudkillTransactionResolution(
    transaction: CloudkillResolutionTransaction,
  ): CloudkillStagedResolution =
    match transaction {
      | CloudkillIndependentTransaction(resolution) => resolution
      | CloudkillMovementTransaction(resolution) => resolution
    }

  pure def cloudkillTransactionWithResolution(
    transaction: CloudkillResolutionTransaction,
    resolution: CloudkillStagedResolution,
  ): CloudkillResolutionTransaction =
    match transaction {
      | CloudkillIndependentTransaction(_) => CloudkillIndependentTransaction(resolution)
      | CloudkillMovementTransaction(_) => CloudkillMovementTransaction(resolution)
    }

  pure def cloudkillTransactionStagesMovement(
    transaction: CloudkillResolutionTransaction,
  ): bool =
    match transaction {
      | CloudkillMovementTransaction(_) => true
      | CloudkillIndependentTransaction(_) => false
    }

  pure def cloudkillTransactionWithPendingTargets(
    state: CloudkillSemanticState,
    trigger: CloudkillTrigger,
    transaction: CloudkillResolutionTransaction,
  ): CloudkillSemanticState = {
    val resolution = cloudkillTransactionResolution(transaction)
    val eligibleTargets = resolution.remainingTargets.foldl(
      List(),
      (eligible, target) =>
        if (
          not(resolution.savedTargets.contains(target)) and
          cloudkillTriggerCanResolve(state, target, trigger, true)
        )
          eligible.append(target)
        else
          eligible
    )
    if (eligibleTargets.length() == 0)
      completeCloudkillResolutionTransaction(state, transaction)
    else {
      val target = eligibleTargets.head()
      val remainingTransaction = cloudkillTransactionWithResolution(
        transaction,
        {
          ...resolution,
          remainingTargets: eligibleTargets.tail(),
        },
      )
      {
        ...state,
        pending: CloudkillSavingThrowPending({
          trigger: trigger,
          target: target,
          transaction: remainingTransaction,
        }),
      }
    }
  }

  pure def beginCloudkillIndependentResolution(
    state: CloudkillSemanticState,
    trigger: CloudkillTrigger,
    targets: List[CloudkillTarget],
  ): CloudkillSemanticState =
    cloudkillTransactionWithPendingTargets(
      state,
      trigger,
      CloudkillIndependentTransaction(initialCloudkillStagedResolution(targets)),
    )

  pure def beginCloudkillMovementResolution(
    state: CloudkillSemanticState,
    targets: List[CloudkillTarget],
  ): CloudkillSemanticState =
    cloudkillTransactionWithPendingTargets(
      moveCloudkillSphereAtSourceTurnStart(state),
      CloudkillMovesIntoSpace,
      CloudkillMovementTransaction(initialCloudkillStagedResolution(targets)),
    )

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
      beginCloudkillIndependentResolution(state, trigger, List(target))

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
            beginCloudkillMovementResolution(sourceTurn, orderedMovementTargets)
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
          beginCloudkillMovementResolution(
            {
              ...state,
              pending: NoCloudkillPendingResolution,
              otherStartTurnOccurrenceResolved: true,
            },
            data.movementTargets,
          )
      | _ => state
    }

  pure def resolveCloudkillSavingThrow(
    state: CloudkillSemanticState,
    savingThrowSucceeded: bool,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillSavingThrowPending(data) =>
          {
            ...state,
            pending: CloudkillDamagePending({
              trigger: data.trigger,
              target: data.target,
              transaction: data.transaction,
              savingThrowSucceeded: savingThrowSucceeded,
            }),
          }
      | _ => state
    }

  pure def cloudkillDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    persistentAreaDamageAfterSave(rolledDamage, savingThrowSucceeded)

  pure def cloudkillTargetWithDamage(
    state: CloudkillSemanticState,
    target: CloudkillTarget,
    damage: int,
  ): CloudkillSemanticState =
    match target {
      | CloudkillCaster => {
          ...state,
          casterHitPoints:
            if (state.casterHitPoints - damage > 0)
              state.casterHitPoints - damage
            else
              0,
        }
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

  pure def cloudkillTransactionWithTargetDamage(
    transaction: CloudkillResolutionTransaction,
    target: CloudkillTarget,
    damage: int,
  ): CloudkillResolutionTransaction = {
    val resolution = cloudkillTransactionResolution(transaction)
    val damaged = match target {
      | CloudkillCaster => { ...resolution, casterDamage: resolution.casterDamage + damage }
      | PrimaryCloudkillTarget => { ...resolution, primaryTargetDamage: resolution.primaryTargetDamage + damage }
      | SecondaryCloudkillTarget => { ...resolution, secondaryTargetDamage: resolution.secondaryTargetDamage + damage }
    }
    cloudkillTransactionWithResolution(
      transaction,
      {
        ...damaged,
        savedTargets: damaged.savedTargets.union(Set(target)),
      },
    )
  }

  pure def commitCloudkillStagedResolution(
    state: CloudkillSemanticState,
    resolution: CloudkillStagedResolution,
  ): CloudkillSemanticState = {
    val casterDamaged = cloudkillTargetWithDamage(
      state,
      CloudkillCaster,
      resolution.casterDamage,
    )
    val primaryDamaged = cloudkillTargetWithDamage(
      casterDamaged,
      PrimaryCloudkillTarget,
      resolution.primaryTargetDamage,
    )
    val allDamaged = cloudkillTargetWithDamage(
      primaryDamaged,
      SecondaryCloudkillTarget,
      resolution.secondaryTargetDamage,
    )
    match allDamaged.lifecycle {
      | CloudkillActive(cloud) => {
          ...allDamaged,
          pending: NoCloudkillPendingResolution,
          lifecycle: CloudkillActive({
            ...cloud,
            savedThisTurn: cloud.savedThisTurn.union(resolution.savedTargets),
          }),
        }
      | _ => { ...allDamaged, pending: NoCloudkillPendingResolution }
    }
  }

  pure def completeCloudkillResolutionTransaction(
    state: CloudkillSemanticState,
    transaction: CloudkillResolutionTransaction,
  ): CloudkillSemanticState = {
    val committed = commitCloudkillStagedResolution(
      state,
      cloudkillTransactionResolution(transaction),
    )
    if (not(cloudkillTransactionStagesMovement(transaction)))
      committed
    else
      match committed.lifecycle {
        | CloudkillActive(cloud) =>
            if (cloud.durationTicks <= 1)
              endCloudkill(committed, CloudkillDurationExpired)
            else
              {
                ...committed,
                lifecycle: CloudkillActive({
                  ...cloud,
                  durationTicks: cloud.durationTicks - 1,
                }),
              }
        | _ => committed
      }
  }

  pure def resolveCloudkillDamage(
    state: CloudkillSemanticState,
    rolledDice: List[CloudkillD8Pip],
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillDamagePending(data) =>
          match state.lifecycle {
            | CloudkillActive(cloud) =>
                if (rolledDice.length() != cloud.damageDice)
                  state
                else {
                  val transaction = cloudkillTransactionWithTargetDamage(
                    data.transaction,
                    data.target,
                    cloudkillDamageAfterSave(
                      cloudkillRolledDamage(rolledDice),
                      data.savingThrowSucceeded,
                    ),
                  )
                  if (data.target == CloudkillCaster and state.casterConcentrating)
                    {
                      ...state,
                      pending: CloudkillConcentrationSavingThrowPending({
                        trigger: data.trigger,
                        transaction: transaction,
                      }),
                    }
                  else
                    cloudkillTransactionWithPendingTargets(
                      { ...state, pending: NoCloudkillPendingResolution },
                      data.trigger,
                      transaction,
                    )
                }
            | _ => state
          }
      | _ => state
    }

  pure def resolveCloudkillSourceConcentrationSavingThrow(
    state: CloudkillSemanticState,
    succeeded: bool,
  ): CloudkillSemanticState =
    match state.pending {
      | CloudkillConcentrationSavingThrowPending(data) =>
          if (succeeded)
            cloudkillTransactionWithPendingTargets(
              { ...state, pending: NoCloudkillPendingResolution },
              data.trigger,
              data.transaction,
            )
          else {
            val committed = commitCloudkillStagedResolution(
              state,
              cloudkillTransactionResolution(data.transaction),
            )
            endCloudkill(committed, CloudkillSourceDamageEndedConcentration)
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

}
