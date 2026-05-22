// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.ABILITY_CHECK.PROFICIENCY_BONUS

module characterSheetAbilityCheckProficiencyBonusMbt {
  var qLastResult: str
  var qProjectionTag: str
  var qSourceUnitId: str
  var qSkill: str
  var qBonus: int
  var qReplayIndex: int

  action recordProjection(
    lastResult: str,
    projectionTag: str,
    sourceUnitId: str,
    skill: str,
    bonus: int,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qProjectionTag' = projectionTag,
    qSourceUnitId' = sourceUnitId,
    qSkill' = skill,
    qBonus' = bonus,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", "none", "none", "none", 0, 0)

  action doProjectJackOfAllTradesLevelTwo = all {
    qReplayIndex == 0,
    recordProjection("jack-of-all-trades-level-two", "jackOfAllTrades", "bard_jack_of_all_trades", "performance", 1, 1),
  }

  action doProjectJackOfAllTradesRoundedDown = all {
    qReplayIndex == 1,
    recordProjection("jack-of-all-trades-rounded-down", "jackOfAllTrades", "bard_jack_of_all_trades", "performance", 1, 2),
  }

  action doProjectSkillProficiency = all {
    qReplayIndex == 2,
    recordProjection("skill-proficiency", "skillProficiency", "none", "performance", 3, 3),
  }

  action doProjectExpertise = all {
    qReplayIndex == 3,
    recordProjection("expertise", "expertise", "none", "performance", 6, 4),
  }

  action doRejectOtherProficiencyBonus = all {
    qReplayIndex == 4,
    recordProjection("other-proficiency-bonus-applies", "none", "none", "performance", 0, 5),
  }

  action doRejectMissingBardLevelTwo = all {
    qReplayIndex == 5,
    recordProjection("missing-bard-level-two", "none", "none", "performance", 0, 6),
  }

  action step = any {
    doProjectJackOfAllTradesLevelTwo,
    doProjectJackOfAllTradesRoundedDown,
    doProjectSkillProficiency,
    doProjectExpertise,
    doRejectOtherProficiencyBonus,
    doRejectMissingBardLevelTwo,
  }
}
