// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.HELP.ABILITY_CHECK_ASSIST
module helpAbilityCheckCore {
  // .references/srd-5.2.1/rules-glossary.md "Help [Action]", "Assist an
  // Ability Check.": "Choose one of your skill or tool proficiencies and one
  // ally who is near enough for you to assist verbally or physically when they
  // make an ability check. That ally has Advantage on the next ability check
  // they make with the chosen skill or tool. This benefit expires if the ally
  // doesn't use it before the start of your next turn. The GM has final say on
  // whether your assistance is possible."
  //
  // Whether a creature is an ally, and whether the helper can assist it, are
  // Table Decisions (UBIQUITOUS_LANGUAGE.md "Table Decisions"); the admission
  // receives the second as allyCanBeAssisted.

  type HelpAbilityCheckBenefit = {
    helperId: int,
    allyId: int,
    skill: str,
  }

  // .references/srd-5.2.1/monsters.md "Skills": "The Skills entry specifies a
  // monster's skill proficiencies". .references/srd-5.2.1/classes.md "Wild
  // Shape", "Game Statistics.": "You also retain your skill and saving throw
  // proficiencies ... in addition to gaining the proficiencies of the
  // creature."
  pure def wildShapeSkillProficiencies(
    characterSkills: Set[str],
    formSkills: Set[str],
  ): Set[str] = characterSkills.union(formSkills)

  pure def helpAbilityCheckOffered(
    helperId: int,
    liveCreatureIds: Set[int],
    helperSkills: Set[str],
  ): bool = all {
    liveCreatureIds.exclude(Set(helperId)).size() > 0,
    helperSkills.size() > 0,
  }

  pure def helpAbilityCheckAdmitted(
    helperId: int,
    liveCreatureIds: Set[int],
    helperSkills: Set[str],
    allyId: int,
    skill: str,
    allyCanBeAssisted: bool,
  ): bool = all {
    allyId != helperId,
    liveCreatureIds.contains(allyId),
    helperSkills.contains(skill),
    allyCanBeAssisted,
  }

  pure def helpAbilityCheckApplies(
    benefit: HelpAbilityCheckBenefit,
    allyId: int,
    skill: str,
  ): bool = benefit.allyId == allyId and benefit.skill == skill

  pure def helpAbilityCheckAdvantage(
    benefits: Set[HelpAbilityCheckBenefit],
    allyId: int,
    skill: str,
  ): bool = benefits.exists(benefit => helpAbilityCheckApplies(benefit, allyId, skill))

  // Every benefit for that ally and skill applies to its next check with the
  // skill, so that check uses them all.
  pure def benefitsAfterAbilityCheck(
    benefits: Set[HelpAbilityCheckBenefit],
    allyId: int,
    skill: str,
  ): Set[HelpAbilityCheckBenefit] =
    benefits.filter(benefit => not(helpAbilityCheckApplies(benefit, allyId, skill)))

  pure def benefitsAtStartOfTurn(
    benefits: Set[HelpAbilityCheckBenefit],
    actorId: int,
  ): Set[HelpAbilityCheckBenefit] =
    benefits.filter(benefit => benefit.helperId != actorId)
}
