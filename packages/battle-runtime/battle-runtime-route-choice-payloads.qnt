// -*- mode: Bluespec; -*-

// Exact table-choice payload vocabulary for reducer-route fills.
//
// LEAF MODULE -- intentionally has no imports. These variants are SRD/runtime
// rule atoms, not authored spell, unit, fixture, or catalog identity.
module battleRuntimeRouteChoicePayloads {
  type ReducerRouteAbilityChoice =
    | RouteAbilityStr
    | RouteAbilityDex
    | RouteAbilityCon
    | RouteAbilityInt
    | RouteAbilityWis
    | RouteAbilityCha

  type ReducerRouteSkillChoice =
    | RouteSkillAcrobatics
    | RouteSkillAnimalHandling
    | RouteSkillArcana
    | RouteSkillAthletics
    | RouteSkillDeception
    | RouteSkillHistory
    | RouteSkillInsight
    | RouteSkillIntimidation
    | RouteSkillInvestigation
    | RouteSkillMedicine
    | RouteSkillNature
    | RouteSkillPerception
    | RouteSkillPerformance
    | RouteSkillPersuasion
    | RouteSkillReligion
    | RouteSkillSleightOfHand
    | RouteSkillStealth
    | RouteSkillSurvival

  type ReducerRouteTwoTargetAbilityChoices = {
    primary: ReducerRouteAbilityChoice,
    secondary: ReducerRouteAbilityChoice,
  }
}
