// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS

module characterBattleInitProjectionMbt {
  type BattleInitProjectionOutcome =
    | BattleInitProjectionInit
    | BattleInitProjectionSheetHitPointsArmorClassConditionsAndProfiles
    | BattleInitProjectionSheetSpellcastingAndMetamagic
    | BattleInitProjectionPurePactMagicSlotProjection
    | BattleInitProjectionMixedSpellAndPactSlotInitRejected
    | BattleInitProjectionBuildMaximumAboveBuildMaximumRejected
    | BattleInitProjectionStableRecoveryProgressDuringInitRejected

  type BattleInitProjectionFacts = {
    characterIdentity: str,
    currentHp: int,
    maxHp: int,
    temporaryHitPoints: int,
    armorClass: int,
    poisoned: bool,
    spellLevel1Count: int,
    spellLevel1Expended: int,
    spellLevel2Count: int,
    spellLevel2Expended: int,
    spellLevel3Count: int,
    spellLevel3Expended: int,
    passiveArmorClassProfileCount: int,
    metamagicKnownOptions: int,
  }

  type BattleInitProjectionState = {
    outcome: BattleInitProjectionOutcome,
    accepted: bool,
    message: str,
    facts: BattleInitProjectionFacts,
    replayIndex: int,
  }

  var qState: BattleInitProjectionState

  pure def emptyProjectionFacts: BattleInitProjectionFacts = {
    characterIdentity: "none",
    currentHp: 0,
    maxHp: 0,
    temporaryHitPoints: 0,
    armorClass: 0,
    poisoned: false,
    spellLevel1Count: 0,
    spellLevel1Expended: 0,
    spellLevel2Count: 0,
    spellLevel2Expended: 0,
    spellLevel3Count: 0,
    spellLevel3Expended: 0,
    passiveArmorClassProfileCount: 0,
    metamagicKnownOptions: 0,
  }

  action recordProjection(
    outcome: BattleInitProjectionOutcome,
    accepted: bool,
    message: str,
    facts: BattleInitProjectionFacts,
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
      BattleInitProjectionInit,
      false,
      "none",
      emptyProjectionFacts,
      0,
    )

  action doProjectSheetHitPointsArmorClassConditionsAndProfiles = all {
    qState.replayIndex == 0,
    recordProjection(
      BattleInitProjectionSheetHitPointsArmorClassConditionsAndProfiles,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-fighter")
        .with("currentHp", 6)
        .with("maxHp", 9)
        .with("temporaryHitPoints", 4)
        .with("armorClass", 17)
        .with("poisoned", true)
        .with("passiveArmorClassProfileCount", 1),
      1,
    ),
  }

  action doProjectSheetSpellcastingAndMetamagic = all {
    qState.replayIndex == 1,
    recordProjection(
      BattleInitProjectionSheetSpellcastingAndMetamagic,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-sorcerer")
        .with("currentHp", 24)
        .with("maxHp", 27)
        .with("armorClass", 12)
        .with("spellLevel1Count", 4)
        .with("spellLevel1Expended", 1)
        .with("spellLevel2Count", 3)
        .with("spellLevel3Count", 3)
        .with("metamagicKnownOptions", 2),
      2,
    ),
  }

  action doRejectBuildMaximumAboveBuildMaximum = all {
    qState.replayIndex == 4,
    recordProjection(
      BattleInitProjectionBuildMaximumAboveBuildMaximumRejected,
      false,
      "Character battle initialization max HP exceeds build-derived max HP.",
      emptyProjectionFacts,
      5,
    ),
  }

  action doProjectPurePactMagicSlot = all {
    qState.replayIndex == 2,
    recordProjection(
      BattleInitProjectionPurePactMagicSlotProjection,
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-warlock")
        .with("currentHp", 8)
        .with("maxHp", 9)
        .with("armorClass", 12)
        .with("spellLevel1Count", 1),
      3,
    ),
  }

  action doRejectMixedSpellAndPactSlotInit = all {
    qState.replayIndex == 3,
    recordProjection(
      BattleInitProjectionMixedSpellAndPactSlotInitRejected,
      false,
      "Battle handoff cannot project mixed Spell Slot and Pact Slot state without source-distinct battle slots.",
      emptyProjectionFacts,
      4,
    ),
  }

  action doRejectStableRecoveryProgressDuringInit = all {
    qState.replayIndex == 5,
    recordProjection(
      BattleInitProjectionStableRecoveryProgressDuringInitRejected,
      false,
      "Battle handoff cannot preserve in-progress Stable recovery timers.",
      emptyProjectionFacts,
      6,
    ),
  }

  action step = any {
    doProjectSheetHitPointsArmorClassConditionsAndProfiles,
    doProjectSheetSpellcastingAndMetamagic,
    doProjectPurePactMagicSlot,
    doRejectMixedSpellAndPactSlotInit,
    doRejectBuildMaximumAboveBuildMaximum,
    doRejectStableRecoveryProgressDuringInit,
  }
}
