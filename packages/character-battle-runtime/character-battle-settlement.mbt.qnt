// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS

module characterBattleSettlementMbt {
  type CharacterBattleSettlementOutcome =
    | CharacterBattleSettlementInit
    | CharacterBattleSettlementSettleHitPointsConditionsSlotsAndPreservedSheetState
    | CharacterBattleSettlementSettlePurePactMagicSlotExpenditure
    | CharacterBattleSettlementMixedSpellAndPactSlotSettlementRejected
    | CharacterBattleSettlementSettleFeatureResourceExpenditure
    | CharacterBattleSettlementAmbiguousCreatedSpellSlotSourceRejected
    | CharacterBattleSettlementMismatchedCharacterIdentityRejected
    | CharacterBattleSettlementMaximumHpDriftRejected
    | CharacterBattleSettlementActiveWildShapeHandoffRejected
    | CharacterBattleSettlementActiveBattleStateHandoffRejected
    | CharacterBattleSettlementStableRecoveryProgressRejected
    | CharacterBattleSettlementSettleZeroHpStableLifecycle

  type CharacterBattleSettlementState = {
    outcome: CharacterBattleSettlementOutcome,
    accepted: bool,
    message: str,
    facts: BattleSettlementFacts,
    replayIndex: int,
  }

  var qState: CharacterBattleSettlementState

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
    outcome: CharacterBattleSettlementOutcome,
    accepted: bool,
    message: str,
    facts: BattleSettlementFacts,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      accepted: accepted,
      message: message,
      facts: facts,
      replayIndex: replayIndex,
    },
  }

  action init =
    recordProjection(
      CharacterBattleSettlementInit,
      false,
      "none",
      emptySettlementFacts,
      0,
    )

  action doSettleHitPointsConditionsSlotsAndPreservedSheetState = all {
    qState.replayIndex == 0,
    recordProjection(
      CharacterBattleSettlementSettleHitPointsConditionsSlotsAndPreservedSheetState,
      true,
      "none",
      emptySettlementFacts
        .with("currentHp", 6)
        .with("temporaryHitPoints", 3)
        .with("poisoned", true)
        .with("prone", true)
        .with("spellLevel1Expended", 2)
        .with("spentHitDice", 1)
        .with("restFeatureUsed", true),
      1,
    ),
  }

  action doSettlePurePactMagicSlotExpenditure = all {
    qState.replayIndex == 1,
    recordProjection(
      CharacterBattleSettlementSettlePurePactMagicSlotExpenditure,
      true,
      "none",
      emptySettlementFacts
        .with("currentHp", 8)
        .with("pactSlotsExpended", 1),
      2,
    ),
  }

  action doRejectMixedSpellAndPactSlotSettlement = all {
    qState.replayIndex == 2,
    recordProjection(
      CharacterBattleSettlementMixedSpellAndPactSlotSettlementRejected,
      false,
      "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.",
      emptySettlementFacts,
      3,
    ),
  }

  action doSettleFeatureResourceExpenditure = all {
    qState.replayIndex == 3,
    recordProjection(
      CharacterBattleSettlementSettleFeatureResourceExpenditure,
      true,
      "none",
      emptySettlementFacts
        .with("currentHp", 24)
        .with("featureResourceExpended", 3),
      4,
    ),
  }

  action doRejectAmbiguousCreatedSpellSlotSource = all {
    qState.replayIndex == 4,
    recordProjection(
      CharacterBattleSettlementAmbiguousCreatedSpellSlotSourceRejected,
      false,
      "Battle handoff Spell Slot expenditure is source-ambiguous for level 3.",
      emptySettlementFacts
        .with("createdLevel3Capacity", 1)
        .with("createdLevel3Expended", 0),
      5,
    ),
  }

  action doRejectMismatchedCharacterIdentity = all {
    qState.replayIndex == 5,
    recordProjection(
      CharacterBattleSettlementMismatchedCharacterIdentityRejected,
      false,
      "Battle handoff character identity does not match Character Sheet.",
      emptySettlementFacts,
      6,
    ),
  }

  action doRejectMaximumHpDrift = all {
    qState.replayIndex == 6,
    recordProjection(
      CharacterBattleSettlementMaximumHpDriftRejected,
      false,
      "Battle handoff maximum HP does not match Character Sheet.",
      emptySettlementFacts,
      7,
    ),
  }

  action doRejectActiveWildShapeHandoff = all {
    qState.replayIndex == 7,
    recordProjection(
      CharacterBattleSettlementActiveWildShapeHandoffRejected,
      false,
      "Battle handoff while Wild Shape is active is blocked; dismiss or resolve reversion before Character Sheet handoff.",
      emptySettlementFacts,
      8,
    ),
  }

  action doRejectStableRecoveryProgressHandoff = all {
    qState.replayIndex == 9,
    recordProjection(
      CharacterBattleSettlementStableRecoveryProgressRejected,
      false,
      "Battle handoff cannot preserve in-progress Stable recovery timers.",
      emptySettlementFacts
        .with("zeroHpState", "stable")
        .with("stableRecoveryElapsed", 1),
      10,
    ),
  }

  action doRejectActiveBattleStateHandoff = all {
    qState.replayIndex == 8,
    recordProjection(
      CharacterBattleSettlementActiveBattleStateHandoffRejected,
      false,
      "Battle handoff while active battle effects or Concentration are present is blocked; end or resolve battle-local effects before Character Sheet handoff.",
      emptySettlementFacts,
      9,
    ),
  }

  action doSettleZeroHpStableLifecycle = all {
    qState.replayIndex == 10,
    recordProjection(
      CharacterBattleSettlementSettleZeroHpStableLifecycle,
      true,
      "none",
      emptySettlementFacts
        .with("zeroHpState", "stable")
        .with("stableRecoveryElapsed", 0),
      11,
    ),
  }

  action step = any {
    doSettleHitPointsConditionsSlotsAndPreservedSheetState,
    doSettlePurePactMagicSlotExpenditure,
    doRejectMixedSpellAndPactSlotSettlement,
    doSettleFeatureResourceExpenditure,
    doRejectAmbiguousCreatedSpellSlotSource,
    doRejectMismatchedCharacterIdentity,
    doRejectMaximumHpDrift,
    doRejectActiveWildShapeHandoff,
    doRejectActiveBattleStateHandoff,
    doRejectStableRecoveryProgressHandoff,
    doSettleZeroHpStableLifecycle,
  }
}
