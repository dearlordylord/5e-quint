// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

// Replay-from-root projection vocabulary for interrupt continuation witnesses.
//
// LEAF MODULE -- intentionally imports only protocol vocabularies so focused
// MBT drivers can own equivalence without pulling reducer behavior into their
// import closure.
module battleRuntimeReplayEquivalence {
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeSubjectKinds.* from "./battle-runtime-subject-kinds"

  type BattleRuntimeReplayResultKind =
    | BattleRuntimeReplayNeedsHoles
    | BattleRuntimeReplayResolved
    | BattleRuntimeReplayInvalid

  type BattleRuntimeReplayProjection = {
    recordedSubjectKind: BattleSubjectKind,
    recordedFillKinds: List[BattleFillKind],
    resultKind: BattleRuntimeReplayResultKind,
    interruptStackDepth: int,
    targetHp: int,
  }

  type BattleRuntimeReplayRoot = {
    rootSubjectKind: BattleSubjectKind,
    rootTargetHp: int,
  }

  type BattleRuntimeRecordedReplayContinuation = {
    recordedSubjectKind: BattleSubjectKind,
    recordedFillKinds: List[BattleFillKind],
  }

  pure def battleRuntimeReplayProjection(
    recordedSubjectKind: BattleSubjectKind,
    recordedFillKinds: List[BattleFillKind],
    resultKind: BattleRuntimeReplayResultKind,
    interruptStackDepth: int,
    targetHp: int,
  ): BattleRuntimeReplayProjection = {
    recordedSubjectKind: recordedSubjectKind,
    recordedFillKinds: recordedFillKinds,
    resultKind: resultKind,
    interruptStackDepth: interruptStackDepth,
    targetHp: targetHp,
  }

  pure def recordedWeaponAttackReplayFills: List[BattleFillKind] =
    List(TargetChoiceFillKind, AttackRollFillKind, RolledDiceFillKind)

  pure def recordedWeaponAttackReplaySuffixFills: List[BattleFillKind] =
    List(RolledDiceFillKind)

  pure def recordedWeaponAttackReplayRoot(targetHp: int): BattleRuntimeReplayRoot = {
    rootSubjectKind: ActionAttackSubjectKind,
    rootTargetHp: targetHp,
  }

  pure def recordedWeaponAttackReplayContinuation: BattleRuntimeRecordedReplayContinuation = {
    recordedSubjectKind: ActionAttackSubjectKind,
    recordedFillKinds: List(TargetChoiceFillKind, AttackRollFillKind),
  }

  pure def independentRecordedWeaponAttackReplayProjection(
    targetHp: int,
  ): BattleRuntimeReplayProjection =
    battleRuntimeReplayProjection(
      ActionAttackSubjectKind,
      recordedWeaponAttackReplayFills,
      BattleRuntimeReplayResolved,
      0,
      targetHp,
    )

  pure def battleRuntimeReplayFromRoot(
    root: BattleRuntimeReplayRoot,
    continuation: BattleRuntimeRecordedReplayContinuation,
    resumedFillKinds: List[BattleFillKind],
    targetHp: int,
  ): BattleRuntimeReplayProjection =
    if (root.rootSubjectKind == continuation.recordedSubjectKind)
      battleRuntimeReplayProjection(
        continuation.recordedSubjectKind,
        continuation.recordedFillKinds.concat(resumedFillKinds),
        BattleRuntimeReplayResolved,
        0,
        targetHp,
      )
    else
      battleRuntimeReplayProjection(
        continuation.recordedSubjectKind,
        continuation.recordedFillKinds.concat(resumedFillKinds),
        BattleRuntimeReplayInvalid,
        0,
        root.rootTargetHp,
      )

  pure def battleRuntimeReplayFromRootEquivalent(
    independentResolution: BattleRuntimeReplayProjection,
    root: BattleRuntimeReplayRoot,
    continuation: BattleRuntimeRecordedReplayContinuation,
    resumedFillKinds: List[BattleFillKind],
    replayTargetHp: int,
  ): bool =
    independentResolution ==
      battleRuntimeReplayFromRoot(
        root,
        continuation,
        resumedFillKinds,
        replayTargetHp,
      )
}
