// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS

module characterBattleSettlementMbt {
  var qLastResult: str
  var qAccepted: bool
  var qMessage: str
  var qCurrentHp: int
  var qTemporaryHitPoints: int
  var qPoisoned: bool
  var qProne: bool
  var qSpellLevel1Expended: int
  var qCreatedLevel3Capacity: int
  var qCreatedLevel3Expended: int
  var qPactSlotsExpended: int
  var qFeatureResourceExpended: int
  var qSpentHitDice: int
  var qRestFeatureUsed: bool
  var qBuildUnchanged: bool
  var qZeroHpState: str
  var qZeroHpSuccesses: int
  var qZeroHpFailures: int
  var qStableRecoveryElapsed: int
  var qReplayIndex: int

  type BattleSettlementFacts = {
    currentHp: int,
    temporaryHitPoints: int,
    poisoned: bool,
    prone: bool,
    spellLevel1Expended: int,
    createdLevel3Capacity: int,
    createdLevel3Expended: int,
    pactSlotsExpended: int,
    featureResourceExpended: int,
    spentHitDice: int,
    restFeatureUsed: bool,
    buildUnchanged: bool,
    zeroHpState: str,
    zeroHpSuccesses: int,
    zeroHpFailures: int,
    stableRecoveryElapsed: int,
  }

  pure def emptySettlementFacts: BattleSettlementFacts = {
    currentHp: 0,
    temporaryHitPoints: 0,
    poisoned: false,
    prone: false,
    spellLevel1Expended: 0,
    createdLevel3Capacity: 0,
    createdLevel3Expended: 0,
    pactSlotsExpended: 0,
    featureResourceExpended: 0,
    spentHitDice: 0,
    restFeatureUsed: false,
    buildUnchanged: true,
    zeroHpState: "none",
    zeroHpSuccesses: 0,
    zeroHpFailures: 0,
    stableRecoveryElapsed: 0,
  }

  action recordProjection(
    lastResult: str,
    accepted: bool,
    message: str,
    facts: BattleSettlementFacts,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qAccepted' = accepted,
    qMessage' = message,
    qCurrentHp' = facts.currentHp,
    qTemporaryHitPoints' = facts.temporaryHitPoints,
    qPoisoned' = facts.poisoned,
    qProne' = facts.prone,
    qSpellLevel1Expended' = facts.spellLevel1Expended,
    qCreatedLevel3Capacity' = facts.createdLevel3Capacity,
    qCreatedLevel3Expended' = facts.createdLevel3Expended,
    qPactSlotsExpended' = facts.pactSlotsExpended,
    qFeatureResourceExpended' = facts.featureResourceExpended,
    qSpentHitDice' = facts.spentHitDice,
    qRestFeatureUsed' = facts.restFeatureUsed,
    qBuildUnchanged' = facts.buildUnchanged,
    qZeroHpState' = facts.zeroHpState,
    qZeroHpSuccesses' = facts.zeroHpSuccesses,
    qZeroHpFailures' = facts.zeroHpFailures,
    qStableRecoveryElapsed' = facts.stableRecoveryElapsed,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", false, "none", emptySettlementFacts, 0)

  action doSettleHitPointsConditionsSlotsAndPreservedSheetState = all {
    qReplayIndex == 0,
    recordProjection(
      "settle-hit-points-conditions-slots-and-preserved-sheet-state",
      true,
      "none",
      emptySettlementFacts
        .with("currentHp", 6)
        .with("temporaryHitPoints", 3)
        .with("poisoned", true)
        .with("prone", true)
        .with("spellLevel1Expended", 2)
        .with("pactSlotsExpended", 1)
        .with("spentHitDice", 1)
        .with("restFeatureUsed", true),
      1,
    ),
  }

  action doSettleFeatureResourceExpenditure = all {
    qReplayIndex == 1,
    recordProjection(
      "settle-feature-resource-expenditure",
      true,
      "none",
      emptySettlementFacts
        .with("currentHp", 24)
        .with("featureResourceExpended", 3),
      2,
    ),
  }

  action doRejectAmbiguousCreatedSpellSlotSource = all {
    qReplayIndex == 2,
    recordProjection(
      "ambiguous-created-spell-slot-source-rejected",
      false,
      "Battle handoff Spell Slot expenditure is source-ambiguous for level 3.",
      emptySettlementFacts
        .with("createdLevel3Capacity", 1)
        .with("createdLevel3Expended", 0),
      3,
    ),
  }

  action doRejectMismatchedCharacterIdentity = all {
    qReplayIndex == 3,
    recordProjection(
      "mismatched-character-identity-rejected",
      false,
      "Battle handoff character identity does not match Character Sheet.",
      emptySettlementFacts,
      4,
    ),
  }

  action doRejectMaximumHpDrift = all {
    qReplayIndex == 4,
    recordProjection(
      "maximum-hp-drift-rejected",
      false,
      "Battle handoff maximum HP does not match Character Sheet.",
      emptySettlementFacts,
      5,
    ),
  }

  action doRejectActiveWildShapeHandoff = all {
    qReplayIndex == 5,
    recordProjection(
      "active-wild-shape-handoff-rejected",
      false,
      "Battle handoff while Wild Shape is active is blocked; dismiss or resolve reversion before Character Sheet handoff.",
      emptySettlementFacts,
      6,
    ),
  }

  action doRejectStableRecoveryProgressHandoff = all {
    qReplayIndex == 6,
    recordProjection(
      "stable-recovery-progress-rejected",
      false,
      "Battle handoff cannot preserve in-progress Stable recovery timers.",
      emptySettlementFacts
        .with("zeroHpState", "stable")
        .with("stableRecoveryElapsed", 1),
      7,
    ),
  }

  action doSettleZeroHpStableLifecycle = all {
    qReplayIndex == 7,
    recordProjection(
      "settle-zero-hp-stable-lifecycle",
      true,
      "none",
      emptySettlementFacts
        .with("zeroHpState", "stable")
        .with("stableRecoveryElapsed", 0),
      8,
    ),
  }

  action step = any {
    doSettleHitPointsConditionsSlotsAndPreservedSheetState,
    doSettleFeatureResourceExpenditure,
    doRejectAmbiguousCreatedSpellSlotSource,
    doRejectMismatchedCharacterIdentity,
    doRejectMaximumHpDrift,
    doRejectActiveWildShapeHandoff,
    doRejectStableRecoveryProgressHandoff,
    doSettleZeroHpStableLifecycle,
  }
}
