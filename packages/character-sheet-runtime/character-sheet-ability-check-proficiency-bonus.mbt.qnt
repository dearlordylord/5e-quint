// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.ABILITY_CHECK.PROFICIENCY_BONUS

module characterSheetAbilityCheckProficiencyBonusMbt {
  import abilityCheckProficiencyBonus.* from "../shared-algebras/proofs/rule-core/ability-check-proficiency-bonus"

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

  pure def projectionTag(projection: AbilityCheckProficiencyBonusProjection): str =
    match projection.kind {
      | NoAbilityCheckProficiencyBonus => "none"
      | SkillProficiencyBonus => "skillProficiency"
      | ExpertiseProficiencyBonus => "expertise"
      | JackOfAllTradesProficiencyBonus => "jackOfAllTrades"
    }

  action recordAbilityCheckProjection(
    lastResult: str,
    projection: AbilityCheckProficiencyBonusProjection,
    sourceUnitId: str,
    skill: str,
    replayIndex: int,
  ): bool =
    recordProjection(
      lastResult,
      projectionTag(projection),
      sourceUnitId,
      skill,
      projection.bonus,
      replayIndex
    )

  action init =
    recordProjection("init", "none", "none", "none", 0, 0)

  action doProjectJackOfAllTradesLevelTwo = all {
    qReplayIndex == 0,
    recordAbilityCheckProjection(
      "jack-of-all-trades-level-two",
      abilityCheckProficiencyBonus(
        2,
        SkillUnproficient,
        JackOfAllTradesPresent,
        NoOtherProficiencyBonus
      ),
      "bard_jack_of_all_trades",
      "performance",
      1
    )
  }

  action doProjectJackOfAllTradesRoundedDown = all {
    qReplayIndex == 1,
    recordAbilityCheckProjection(
      "jack-of-all-trades-rounded-down",
      abilityCheckProficiencyBonus(
        3,
        SkillUnproficient,
        JackOfAllTradesPresent,
        NoOtherProficiencyBonus
      ),
      "bard_jack_of_all_trades",
      "performance",
      2
    )
  }

  action doProjectSkillProficiency = all {
    qReplayIndex == 2,
    recordAbilityCheckProjection(
      "skill-proficiency",
      abilityCheckProficiencyBonus(
        3,
        SkillProficient,
        JackOfAllTradesPresent,
        NoOtherProficiencyBonus
      ),
      "none",
      "performance",
      3
    )
  }

  action doProjectExpertise = all {
    qReplayIndex == 3,
    recordAbilityCheckProjection(
      "expertise",
      abilityCheckProficiencyBonus(
        3,
        SkillExpertise,
        JackOfAllTradesPresent,
        NoOtherProficiencyBonus
      ),
      "none",
      "performance",
      4
    )
  }

  action doRejectOtherProficiencyBonus = all {
    qReplayIndex == 4,
    recordAbilityCheckProjection(
      "other-proficiency-bonus-applies",
      abilityCheckProficiencyBonus(
        3,
        SkillUnproficient,
        JackOfAllTradesPresent,
        OtherProficiencyBonusApplies
      ),
      "none",
      "performance",
      5
    )
  }

  action doRejectMissingBardLevelTwo = all {
    qReplayIndex == 5,
    recordAbilityCheckProjection(
      "missing-bard-level-two",
      abilityCheckProficiencyBonus(
        2,
        SkillUnproficient,
        JackOfAllTradesAbsent,
        NoOtherProficiencyBonus
      ),
      "none",
      "performance",
      6
    )
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
