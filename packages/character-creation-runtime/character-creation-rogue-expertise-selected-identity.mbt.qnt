// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION

module characterCreationRogueExpertiseSelectedIdentityMbt {
  var qLastResult: str
  var qSelectedExpertiseUnitId: str
  var qSelectedExpertiseChoiceCount: int
  var qBuildExpertiseCount: int
  var qOwnedSkillProficiencyCount: int
  var qRogueExpertiseUnitRefPresent: bool
  var qAcrobaticsExpertisePresent: bool
  var qPerceptionExpertisePresent: bool
  var qSleightOfHandExpertisePresent: bool
  var qStealthExpertisePresent: bool
  var qTotalLevel: int

  action recordProjection(
    lastResult: str,
    selectedExpertiseUnitId: str,
    selectedExpertiseChoiceCount: int,
    buildExpertiseCount: int,
    ownedSkillProficiencyCount: int,
    rogueExpertiseUnitRefPresent: bool,
    acrobaticsExpertisePresent: bool,
    perceptionExpertisePresent: bool,
    sleightOfHandExpertisePresent: bool,
    stealthExpertisePresent: bool,
    totalLevel: int,
  ): bool = all {
    qLastResult' = lastResult,
    qSelectedExpertiseUnitId' = selectedExpertiseUnitId,
    qSelectedExpertiseChoiceCount' = selectedExpertiseChoiceCount,
    qBuildExpertiseCount' = buildExpertiseCount,
    qOwnedSkillProficiencyCount' = ownedSkillProficiencyCount,
    qRogueExpertiseUnitRefPresent' = rogueExpertiseUnitRefPresent,
    qAcrobaticsExpertisePresent' = acrobaticsExpertisePresent,
    qPerceptionExpertisePresent' = perceptionExpertisePresent,
    qSleightOfHandExpertisePresent' = sleightOfHandExpertisePresent,
    qStealthExpertisePresent' = stealthExpertisePresent,
    qTotalLevel' = totalLevel,
  }

  action init =
    recordProjection("init", "none", 0, 0, 0, false, false, false, false, false, 1)

  action doSelectLevelOneOwnedSkillExpertise = all {
    qLastResult == "init",
    recordProjection("levelOne", "rogue_expertise", 2, 2, 6, true, false, false, true, true, 1),
  }

  action doSelectLevelSixAdditionalOwnedSkillExpertise = all {
    qLastResult == "init",
    recordProjection("levelSix", "rogue_expertise", 4, 4, 6, true, true, true, true, true, 6),
  }

  action step = any {
    doSelectLevelOneOwnedSkillExpertise,
    doSelectLevelSixAdditionalOwnedSkillExpertise,
  }
}
