// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION

module characterCreationRogueExpertiseSelectedIdentityMbt {
  type CharacterCreationRogueExpertiseSelectedIdentityOutcome =
    | CharacterCreationRogueExpertiseSelectedIdentityInit
    | CharacterCreationRogueExpertiseSelectedIdentityLevelOne
    | CharacterCreationRogueExpertiseSelectedIdentityLevelSix

  type CharacterCreationRogueExpertiseSelectedIdentityState = {
    outcome: CharacterCreationRogueExpertiseSelectedIdentityOutcome,
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
  }

  var qState: CharacterCreationRogueExpertiseSelectedIdentityState

  action recordProjection(
    outcome: CharacterCreationRogueExpertiseSelectedIdentityOutcome,
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
    qState' = {
      outcome: outcome,
      selectedExpertiseUnitId: selectedExpertiseUnitId,
      selectedExpertiseChoiceCount: selectedExpertiseChoiceCount,
      buildExpertiseCount: buildExpertiseCount,
      ownedSkillProficiencyCount: ownedSkillProficiencyCount,
      rogueExpertiseUnitRefPresent: rogueExpertiseUnitRefPresent,
      acrobaticsExpertisePresent: acrobaticsExpertisePresent,
      perceptionExpertisePresent: perceptionExpertisePresent,
      sleightOfHandExpertisePresent: sleightOfHandExpertisePresent,
      stealthExpertisePresent: stealthExpertisePresent,
      totalLevel: totalLevel,
    },
  }

  action init =
    recordProjection(
      CharacterCreationRogueExpertiseSelectedIdentityInit,
      "none",
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      false,
      1,
    )

  action doSelectLevelOneOwnedSkillExpertise = all {
    qState.outcome == CharacterCreationRogueExpertiseSelectedIdentityInit,
    recordProjection(
      CharacterCreationRogueExpertiseSelectedIdentityLevelOne,
      "rogue_expertise",
      2,
      2,
      6,
      true,
      false,
      false,
      true,
      true,
      1,
    ),
  }

  action doSelectLevelSixAdditionalOwnedSkillExpertise = all {
    qState.outcome == CharacterCreationRogueExpertiseSelectedIdentityInit,
    recordProjection(
      CharacterCreationRogueExpertiseSelectedIdentityLevelSix,
      "rogue_expertise",
      4,
      4,
      6,
      true,
      true,
      true,
      true,
      true,
      6,
    ),
  }

  action step = any {
    doSelectLevelOneOwnedSkillExpertise,
    doSelectLevelSixAdditionalOwnedSkillExpertise,
  }
}
