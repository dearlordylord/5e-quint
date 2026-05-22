// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS

module characterBattleInitProjectionMbt {
  var qLastResult: str
  var qAccepted: bool
  var qMessage: str
  var qCharacterIdentity: str
  var qCurrentHp: int
  var qMaxHp: int
  var qTemporaryHitPoints: int
  var qArmorClass: int
  var qPoisoned: bool
  var qSpellLevel1Count: int
  var qSpellLevel1Expended: int
  var qSpellLevel2Count: int
  var qSpellLevel2Expended: int
  var qSpellLevel3Count: int
  var qSpellLevel3Expended: int
  var qPassiveArmorClassProfileCount: int
  var qMetamagicKnownOptions: int
  var qReplayIndex: int

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
    lastResult: str,
    accepted: bool,
    message: str,
    facts: BattleInitProjectionFacts,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qAccepted' = accepted,
    qMessage' = message,
    qCharacterIdentity' = facts.characterIdentity,
    qCurrentHp' = facts.currentHp,
    qMaxHp' = facts.maxHp,
    qTemporaryHitPoints' = facts.temporaryHitPoints,
    qArmorClass' = facts.armorClass,
    qPoisoned' = facts.poisoned,
    qSpellLevel1Count' = facts.spellLevel1Count,
    qSpellLevel1Expended' = facts.spellLevel1Expended,
    qSpellLevel2Count' = facts.spellLevel2Count,
    qSpellLevel2Expended' = facts.spellLevel2Expended,
    qSpellLevel3Count' = facts.spellLevel3Count,
    qSpellLevel3Expended' = facts.spellLevel3Expended,
    qPassiveArmorClassProfileCount' = facts.passiveArmorClassProfileCount,
    qMetamagicKnownOptions' = facts.metamagicKnownOptions,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", false, "none", emptyProjectionFacts, 0)

  action doProjectSheetHitPointsArmorClassConditionsAndProfiles = all {
    qReplayIndex == 0,
    recordProjection(
      "sheet-hit-points-armor-class-conditions-and-profiles",
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-fighter")
        .with("currentHp", 6)
        .with("maxHp", 8)
        .with("temporaryHitPoints", 4)
        .with("armorClass", 17)
        .with("poisoned", true)
        .with("passiveArmorClassProfileCount", 1),
      1,
    ),
  }

  action doProjectSheetSpellcastingAndMetamagic = all {
    qReplayIndex == 1,
    recordProjection(
      "sheet-spellcasting-and-metamagic",
      true,
      "none",
      emptyProjectionFacts
        .with("characterIdentity", "character:battle-init-sorcerer")
        .with("currentHp", 24)
        .with("maxHp", 24)
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
    qReplayIndex == 2,
    recordProjection(
      "build-maximum-above-build-maximum-rejected",
      false,
      "Character battle initialization max HP exceeds build-derived max HP.",
      emptyProjectionFacts,
      3,
    ),
  }

  action doRejectStableRecoveryProgressDuringInit = all {
    qReplayIndex == 3,
    recordProjection(
      "stable-recovery-progress-during-init-rejected",
      false,
      "Battle handoff cannot preserve in-progress Stable recovery timers.",
      emptyProjectionFacts,
      4,
    ),
  }

  action step = any {
    doProjectSheetHitPointsArmorClassConditionsAndProfiles,
    doProjectSheetSpellcastingAndMetamagic,
    doRejectBuildMaximumAboveBuildMaximum,
    doRejectStableRecoveryProgressDuringInit,
  }
}
