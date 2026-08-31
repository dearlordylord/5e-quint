// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// Focused literal projection witnesses. The identity-free semantic owners and
// SRD-named BattleState proof witness separately establish transaction
// behavior; these states connect deterministic RAW outcomes to production
// without copying the reducer into the MBT driver.
module battleRuntimeCloudkillAreaHazardMbt {
  type CloudkillMbtTarget =
    | NoCloudkillMbtTarget
    | SourceCloudkillMbtTarget
    | PrimaryCloudkillMbtTarget
    | SecondaryCloudkillMbtTarget

  type CloudkillMbtPending =
    | CloudkillMbtNoPending
    | CloudkillMbtSavingThrowPending
    | CloudkillMbtConcentrationSavingThrowPending

  type CloudkillMbtOutcome =
    | CloudkillMbtInit
    | CloudkillMbtCast
    | CloudkillMbtAppearanceResolved
    | CloudkillMbtMovementSave
    | CloudkillMbtMovementResolved
    | CloudkillMbtSourceConcentrationSave
    | CloudkillMbtConcentrationEnded
    | CloudkillMbtStrongWindEnded

  // This state-carried selector is the MBT replay protocol. Quint records the
  // outer `step` action in ITF metadata, so the selected literal action must be
  // carried explicitly for the TypeScript driver to replay the same witness.
  type CloudkillMbtReplayAction =
    | CloudkillMbtInitAction
    | CloudkillMbtSixthLevelCastAction
    | CloudkillMbtAppearanceHalfDamageAction
    | CloudkillMbtAppearanceFailedSaveD8OneAction
    | CloudkillMbtAppearanceFailedSaveD8TwoAction
    | CloudkillMbtAppearanceFailedSaveD8ThreeAction
    | CloudkillMbtAppearanceFailedSaveD8FourAction
    | CloudkillMbtAppearanceFailedSaveD8FiveAction
    | CloudkillMbtAppearanceFailedSaveD8SixAction
    | CloudkillMbtAppearanceFailedSaveD8SevenAction
    | CloudkillMbtAppearanceFailedSaveD8EightAction
    | CloudkillMbtMovementNextTargetSaveCheckpointAction
    | CloudkillMbtOrderedMovementClosureAction
    | CloudkillMbtSourceConcentrationCheckpointAction
    | CloudkillMbtSourceConcentrationCancellationAction
    | CloudkillMbtStrongWindCleanupAction

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
    qLastMovementDistanceFeet: int,
    qPending: CloudkillMbtPending,
    qPendingTarget: CloudkillMbtTarget,
    qRemainingTarget: CloudkillMbtTarget,
    qSavingThrowSucceeded: bool,
    qOutcome: CloudkillMbtOutcome,
  }

  var qState: CloudkillMbtState
  var qReplayAction: CloudkillMbtReplayAction

  pure val initialProjection: CloudkillMbtState = {
    qCasterTurn: true,
    qActionAvailable: true,
    qSpellAvailable: true,
    qHazardActive: false,
    qCasterConcentrating: false,
    qSlotLevel: 5,
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
    qLastMovementDistanceFeet: 0,
    qPending: CloudkillMbtNoPending,
    qPendingTarget: NoCloudkillMbtTarget,
    qRemainingTarget: NoCloudkillMbtTarget,
    qSavingThrowSucceeded: false,
    qOutcome: CloudkillMbtInit,
  }

  action init = all {
    qState' = initialProjection,
    qReplayAction' = CloudkillMbtInitAction,
  }

  action doWitnessSixthLevelCast = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtSixthLevelCastAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: false,
      qSpellAvailable: false,
      qHazardActive: true,
      qCasterConcentrating: true,
      qSlotLevel: 6,
      qDamageDice: 6,
      qDurationTicks: 100,
      qRadiusFeet: 20,
      qHeavilyObscured: true,
      qOutcome: CloudkillMbtCast,
    },
  }

  action doWitnessAppearanceHalfDamage = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceHalfDamageAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: false,
      qSpellAvailable: false,
      qHazardActive: true,
      qCasterConcentrating: true,
      qDamageDice: 5,
      qDurationTicks: 100,
      qRadiusFeet: 20,
      qHeavilyObscured: true,
      qPrimarySavedThisTurn: true,
      qPrimaryHitPoints: 35,
      qOutcome: CloudkillMbtAppearanceResolved,
    },
  }

  pure def appearanceFailedSaveProjection(
    remainingHitPoints: int,
  ): CloudkillMbtState = {
    ...initialProjection,
    qActionAvailable: false,
    qSpellAvailable: false,
    qHazardActive: true,
    qCasterConcentrating: true,
    qDamageDice: 5,
    qDurationTicks: 100,
    qRadiusFeet: 20,
    qHeavilyObscured: true,
    qPrimarySavedThisTurn: true,
    qPrimaryHitPoints: remainingHitPoints,
    qOutcome: CloudkillMbtAppearanceResolved,
  }

  action doWitnessAppearanceFailedSaveD8One = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8OneAction,
    qState' = appearanceFailedSaveProjection(35),
  }

  action doWitnessAppearanceFailedSaveD8Two = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8TwoAction,
    qState' = appearanceFailedSaveProjection(30),
  }

  action doWitnessAppearanceFailedSaveD8Three = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8ThreeAction,
    qState' = appearanceFailedSaveProjection(25),
  }

  action doWitnessAppearanceFailedSaveD8Four = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8FourAction,
    qState' = appearanceFailedSaveProjection(20),
  }

  action doWitnessAppearanceFailedSaveD8Five = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8FiveAction,
    qState' = appearanceFailedSaveProjection(15),
  }

  action doWitnessAppearanceFailedSaveD8Six = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8SixAction,
    qState' = appearanceFailedSaveProjection(10),
  }

  action doWitnessAppearanceFailedSaveD8Seven = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8SevenAction,
    qState' = appearanceFailedSaveProjection(5),
  }

  action doWitnessAppearanceFailedSaveD8Eight = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtAppearanceFailedSaveD8EightAction,
    qState' = appearanceFailedSaveProjection(0),
  }

  // Secondary has resolved inside the still-open movement transaction. Primary
  // is the next save frontier, while Secondary's damage and ledger entry remain
  // staged and therefore absent from the public projection until closure.
  action doWitnessMovementNextTargetSaveCheckpoint = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtMovementNextTargetSaveCheckpointAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: true,
      qSpellAvailable: false,
      qHazardActive: true,
      qCasterConcentrating: true,
      qDamageDice: 5,
      qDurationTicks: 100,
      qRadiusFeet: 20,
      qHeavilyObscured: true,
      qLastMovementDistanceFeet: 10,
      qPending: CloudkillMbtSavingThrowPending,
      qPendingTarget: PrimaryCloudkillMbtTarget,
      qRemainingTarget: NoCloudkillMbtTarget,
      qOutcome: CloudkillMbtMovementSave,
    },
  }

  action doWitnessOrderedMovementClosure = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtOrderedMovementClosureAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: true,
      qSpellAvailable: false,
      qHazardActive: true,
      qCasterConcentrating: true,
      qDamageDice: 5,
      qDurationTicks: 99,
      qRadiusFeet: 20,
      qHeavilyObscured: true,
      qPrimarySavedThisTurn: true,
      qSecondarySavedThisTurn: true,
      qPrimaryHitPoints: 35,
      qSecondaryHitPoints: 30,
      qLastMovementDistanceFeet: 10,
      qOutcome: CloudkillMbtMovementResolved,
    },
  }

  action doWitnessSourceConcentrationCheckpoint = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtSourceConcentrationCheckpointAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: true,
      qSpellAvailable: false,
      qHazardActive: true,
      qCasterConcentrating: true,
      qDamageDice: 5,
      qDurationTicks: 100,
      qRadiusFeet: 20,
      qHeavilyObscured: true,
      qLastMovementDistanceFeet: 10,
      qPending: CloudkillMbtConcentrationSavingThrowPending,
      qPendingTarget: SourceCloudkillMbtTarget,
      qRemainingTarget: SecondaryCloudkillMbtTarget,
      qOutcome: CloudkillMbtSourceConcentrationSave,
    },
  }

  action doWitnessSourceConcentrationCancellation = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtSourceConcentrationCancellationAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: true,
      qSpellAvailable: false,
      qCasterHitPoints: 95,
      qLastMovementDistanceFeet: 10,
      qOutcome: CloudkillMbtConcentrationEnded,
    },
  }

  action doWitnessStrongWindCleanup = all {
    qState.qOutcome == CloudkillMbtInit,
    qReplayAction' = CloudkillMbtStrongWindCleanupAction,
    qState' = {
      ...initialProjection,
      qActionAvailable: false,
      qSpellAvailable: false,
      qOutcome: CloudkillMbtStrongWindEnded,
    },
  }

  action step = any {
    doWitnessSixthLevelCast,
    doWitnessAppearanceHalfDamage,
    doWitnessAppearanceFailedSaveD8One,
    doWitnessAppearanceFailedSaveD8Two,
    doWitnessAppearanceFailedSaveD8Three,
    doWitnessAppearanceFailedSaveD8Four,
    doWitnessAppearanceFailedSaveD8Five,
    doWitnessAppearanceFailedSaveD8Six,
    doWitnessAppearanceFailedSaveD8Seven,
    doWitnessAppearanceFailedSaveD8Eight,
    doWitnessMovementNextTargetSaveCheckpoint,
    doWitnessOrderedMovementClosure,
    doWitnessSourceConcentrationCheckpoint,
    doWitnessSourceConcentrationCancellation,
    doWitnessStrongWindCleanup,
  }
}
