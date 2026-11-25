// -*- mode: Bluespec; -*-

module helpAbilityCheckCoreExamples {
  import helpAbilityCheckCore.* from "./help-ability-check-core"
  import movementSpatialGrapple as grapple from "./movement-spatial-grapple"

  pure val fighter = 1
  pure val goblin = 2
  pure val rogue = 3
  pure val wizard = 4

  pure val fighterHelpsRogueStealth: HelpAbilityCheckBenefit = {
    helperId: fighter,
    allyId: rogue,
    skill: "stealth",
  }

  pure val wizardHelpsRogueStealth: HelpAbilityCheckBenefit = {
    helperId: wizard,
    allyId: rogue,
    skill: "stealth",
  }

  pure val fighterHelpsRoguePerception: HelpAbilityCheckBenefit = {
    helperId: fighter,
    allyId: rogue,
    skill: "perception",
  }

  run helpAbilityCheckAdmission = all {
    assert(helpAbilityCheckOffered(fighter, Set(fighter, goblin), Set("stealth"))),
    assert(not(helpAbilityCheckOffered(fighter, Set(fighter, goblin), Set()))),
    assert(not(helpAbilityCheckOffered(fighter, Set(fighter), Set("stealth")))),
    assert(helpAbilityCheckAdmitted(fighter, Set(fighter, rogue), Set("stealth"), rogue, "stealth", true)),
    assert(not(helpAbilityCheckAdmitted(fighter, Set(fighter, rogue), Set("stealth"), rogue, "stealth", false))),
    assert(not(helpAbilityCheckAdmitted(fighter, Set(fighter, rogue), Set("stealth"), rogue, "arcana", true))),
    assert(not(helpAbilityCheckAdmitted(fighter, Set(fighter, rogue), Set("stealth"), fighter, "stealth", true))),
    assert(not(helpAbilityCheckAdmitted(fighter, Set(fighter), Set("stealth"), rogue, "stealth", true))),
    assert(wildShapeSkillProficiencies(Set("nature"), Set("perception")) == Set("nature", "perception")),
  }

  // The escaper's chosen escape skill decides which Help applies and which
  // benefits the check uses up.
  run helpAbilityCheckEscapeGrappleSkill = {
    val fighterHelpsRogueAthletics = { helperId: fighter, allyId: rogue, skill: "athletics" }
    val wizardHelpsRogueAthletics = { helperId: wizard, allyId: rogue, skill: "athletics" }
    val helped = Set(fighterHelpsRogueAthletics, wizardHelpsRogueAthletics)
    all {
      assert(grapple::escapeGrappleCheckSkills == Set("athletics", "acrobatics")),
      assert(helpAbilityCheckAdvantage(helped, rogue, "athletics")),
      assert(not(helpAbilityCheckAdvantage(helped, rogue, "acrobatics"))),
      assert(benefitsAfterAbilityCheck(helped, rogue, "athletics") == Set()),
      assert(benefitsAfterAbilityCheck(helped, rogue, "acrobatics") == helped),
    }
  }

  run helpAbilityCheckBenefitLifecycle = {
    val helped = Set(fighterHelpsRogueStealth, fighterHelpsRoguePerception)
    val bothHelpers = Set(fighterHelpsRogueStealth, wizardHelpsRogueStealth)
    all {
      assert(helpAbilityCheckAdvantage(helped, rogue, "stealth")),
      assert(not(helpAbilityCheckAdvantage(helped, rogue, "athletics"))),
      assert(not(helpAbilityCheckAdvantage(helped, wizard, "stealth"))),
      assert(benefitsAfterAbilityCheck(helped, rogue, "stealth") == Set(fighterHelpsRoguePerception)),
      assert(benefitsAfterAbilityCheck(bothHelpers, rogue, "stealth") == Set()),
      assert(benefitsAtStartOfTurn(bothHelpers, fighter) == Set(wizardHelpsRogueStealth)),
      assert(benefitsAtStartOfTurn(bothHelpers, rogue) == bothHelpers),
    }
  }
}
