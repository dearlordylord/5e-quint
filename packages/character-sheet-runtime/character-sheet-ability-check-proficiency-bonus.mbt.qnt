// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.ABILITY_CHECK.PROFICIENCY_BONUS

module characterSheetAbilityCheckProficiencyBonusMbt {
  import abilityCheckProficiencyBonus.* from "../shared-algebras/proofs/rule-core/ability-check-proficiency-bonus"

  type AbilityCheckProjectionOutcome =
    | AbilityCheckInit
    | AbilityCheckJackOfAllTradesLevelTwo
    | AbilityCheckJackOfAllTradesRoundedDown
    | AbilityCheckSkillProficiency
    | AbilityCheckExpertise
    | AbilityCheckOtherProficiencyBonusApplies
    | AbilityCheckMissingBardLevelTwo

  type AbilityCheckProjectionState = {
    outcome: AbilityCheckProjectionOutcome,
    projectionTag: str,
    sourceUnitId: str,
    skill: str,
    bonus: int,
    replayIndex: int,
  }

  var qState: AbilityCheckProjectionState

  action recordProjection(
    outcome: AbilityCheckProjectionOutcome,
    projectionTag: str,
    sourceUnitId: str,
    skill: str,
    bonus: int,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      projectionTag: projectionTag,
      sourceUnitId: sourceUnitId,
      skill: skill,
      bonus: bonus,
      replayIndex: replayIndex,
    },
  }

  pure def projectionTag(projection: AbilityCheckProficiencyBonusProjection): str =
    match projection.kind {
      | NoAbilityCheckProficiencyBonus => "none"
      | SkillProficiencyBonus => "skillProficiency"
      | ExpertiseProficiencyBonus => "expertise"
      | JackOfAllTradesProficiencyBonus => "jackOfAllTrades"
  }

  action recordAbilityCheckProjection(
    outcome: AbilityCheckProjectionOutcome,
    projection: AbilityCheckProficiencyBonusProjection,
    sourceUnitId: str,
    skill: str,
    replayIndex: int,
  ): bool =
    recordProjection(
      outcome,
      projectionTag(projection),
      sourceUnitId,
      skill,
      projection.bonus,
      replayIndex
    )

  action init =
    recordProjection(AbilityCheckInit, "none", "none", "none", 0, 0)

  action doProjectJackOfAllTradesLevelTwo = all {
    qState.replayIndex == 0,
    recordAbilityCheckProjection(
      AbilityCheckJackOfAllTradesLevelTwo,
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
    qState.replayIndex == 1,
    recordAbilityCheckProjection(
      AbilityCheckJackOfAllTradesRoundedDown,
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
    qState.replayIndex == 2,
    recordAbilityCheckProjection(
      AbilityCheckSkillProficiency,
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
    qState.replayIndex == 3,
    recordAbilityCheckProjection(
      AbilityCheckExpertise,
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
    qState.replayIndex == 4,
    recordAbilityCheckProjection(
      AbilityCheckOtherProficiencyBonusApplies,
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
    qState.replayIndex == 5,
    recordAbilityCheckProjection(
      AbilityCheckMissingBardLevelTwo,
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
