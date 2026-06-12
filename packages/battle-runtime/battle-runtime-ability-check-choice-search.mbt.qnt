// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES

module battleRuntimeAbilityCheckChoiceSearchMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for Ability Check/Search holes and
  // roll-modifier skill/ability choices. Search target admission and hidden
  // candidate discovery remain table-owned facts supplied by the paired TS
  // reducer driver.

  type AbilityCheckChoiceSearchScenario =
    | AbilityCheckChoiceSearchInit
    | SearchTargetChoiceOpen
    | SearchAbilityCheckOpen
    | SearchInvalidTargetRejected
    | SearchInvalidAbilityFillRejected
    | SearchFails
    | SearchSucceeds
    | GuidanceSkillChoiceOpen
    | GuidanceInvalidAbilityFillRejected
    | GuidanceSkillAthletics
    | EnhanceAbilityChoiceOpen
    | EnhanceAbilityInvalidSkillFillRejected
    | EnhanceAbilityDex

  var qScenario: AbilityCheckChoiceSearchScenario
  var qProtocol: WitnessProtocol[str]
  var qTargetHidden: bool
  var qActionAvailable: bool
  var qTargetEffectCount: int
  var qCasterEffectCount: int
  var qD20ModifierSkill: str
  var qAbilityCheckModeAbility: str
  var qTargetDexRollMode: str

  pure val witnessHoleType: str = "AbilityCheckChoiceSearch"
  pure val targetChoiceHole: str = "targetChoice"
  pure val abilityCheckHole: str = "abilityCheck"
  pure val skillChoiceHole: str = "skillChoice"
  pure val abilityChoiceHole: str = "abilityChoice"

  action recordProjection(
    scenario: AbilityCheckChoiceSearchScenario,
    protocol: WitnessProtocol[str],
    targetHidden: bool,
    actionAvailable: bool,
    targetEffectCount: int,
    casterEffectCount: int,
    d20ModifierSkill: str,
    abilityCheckModeAbility: str,
    targetDexRollMode: str,
  ): bool = all {
    qScenario' = scenario,
    qProtocol' = protocol,
    qTargetHidden' = targetHidden,
    qActionAvailable' = actionAvailable,
    qTargetEffectCount' = targetEffectCount,
    qCasterEffectCount' = casterEffectCount,
    qD20ModifierSkill' = d20ModifierSkill,
    qAbilityCheckModeAbility' = abilityCheckModeAbility,
    qTargetDexRollMode' = targetDexRollMode,
  }

  action init = recordProjection(
    AbilityCheckChoiceSearchInit,
    witnessInit(witnessHoleType),
    false,
    true,
    0,
    0,
    "none",
    "none",
    "normal",
  )

  action doSearchTargetChoiceOpen = all {
    qScenario == AbilityCheckChoiceSearchInit,
    recordProjection(
      SearchTargetChoiceOpen,
      witnessNeedsHoles(Set(targetChoiceHole)),
      true,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doSearchAbilityCheckOpen = all {
    qScenario == SearchTargetChoiceOpen,
    recordProjection(
      SearchAbilityCheckOpen,
      witnessNeedsHoles(Set(abilityCheckHole)),
      true,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doSearchInvalidTargetRejected = all {
    qScenario == SearchAbilityCheckOpen,
    recordProjection(
      SearchInvalidTargetRejected,
      witnessInvalid(witnessHoleType, WInvalidFill),
      true,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doSearchInvalidAbilityFillRejected = all {
    qScenario == SearchInvalidTargetRejected,
    recordProjection(
      SearchInvalidAbilityFillRejected,
      witnessInvalid(witnessHoleType, WInvalidFill),
      true,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doSearchFails = all {
    qScenario == SearchInvalidAbilityFillRejected,
    recordProjection(
      SearchFails,
      witnessResolved(witnessHoleType),
      true,
      false,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doSearchSucceeds = all {
    qScenario == SearchFails,
    recordProjection(
      SearchSucceeds,
      witnessResolved(witnessHoleType),
      false,
      false,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doGuidanceSkillChoiceOpen = all {
    qScenario == SearchSucceeds,
    recordProjection(
      GuidanceSkillChoiceOpen,
      witnessNeedsHoles(Set(skillChoiceHole)),
      false,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doGuidanceInvalidAbilityFillRejected = all {
    qScenario == GuidanceSkillChoiceOpen,
    recordProjection(
      GuidanceInvalidAbilityFillRejected,
      witnessInvalid(witnessHoleType, WInvalidFill),
      false,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doGuidanceSkillAthletics = all {
    qScenario == GuidanceInvalidAbilityFillRejected,
    recordProjection(
      GuidanceSkillAthletics,
      witnessResolved(witnessHoleType),
      false,
      false,
      1,
      1,
      "athletics",
      "none",
      "normal",
    ),
  }

  action doEnhanceAbilityChoiceOpen = all {
    qScenario == GuidanceSkillAthletics,
    recordProjection(
      EnhanceAbilityChoiceOpen,
      witnessNeedsHoles(Set(abilityChoiceHole)),
      false,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doEnhanceAbilityInvalidSkillFillRejected = all {
    qScenario == EnhanceAbilityChoiceOpen,
    recordProjection(
      EnhanceAbilityInvalidSkillFillRejected,
      witnessInvalid(witnessHoleType, WInvalidFill),
      false,
      true,
      0,
      0,
      "none",
      "none",
      "normal",
    ),
  }

  action doEnhanceAbilityDex = all {
    qScenario == EnhanceAbilityInvalidSkillFillRejected,
    recordProjection(
      EnhanceAbilityDex,
      witnessResolved(witnessHoleType),
      false,
      false,
      1,
      0,
      "none",
      "dex",
      "advantage",
    ),
  }

  action step = any {
    if (qScenario == AbilityCheckChoiceSearchInit) doSearchTargetChoiceOpen
    else if (qScenario == SearchTargetChoiceOpen) doSearchAbilityCheckOpen
    else if (qScenario == SearchAbilityCheckOpen) doSearchInvalidTargetRejected
    else if (qScenario == SearchInvalidTargetRejected) doSearchInvalidAbilityFillRejected
    else if (qScenario == SearchInvalidAbilityFillRejected) doSearchFails
    else if (qScenario == SearchFails) doSearchSucceeds
    else if (qScenario == SearchSucceeds) doGuidanceSkillChoiceOpen
    else if (qScenario == GuidanceSkillChoiceOpen) doGuidanceInvalidAbilityFillRejected
    else if (qScenario == GuidanceInvalidAbilityFillRejected) doGuidanceSkillAthletics
    else if (qScenario == GuidanceSkillAthletics) doEnhanceAbilityChoiceOpen
    else if (qScenario == EnhanceAbilityChoiceOpen) doEnhanceAbilityInvalidSkillFillRejected
    else if (qScenario == EnhanceAbilityInvalidSkillFillRejected) doEnhanceAbilityDex
    else recordProjection(
      qScenario,
      qProtocol,
      qTargetHidden,
      qActionAvailable,
      qTargetEffectCount,
      qCasterEffectCount,
      qD20ModifierSkill,
      qAbilityCheckModeAbility,
      qTargetDexRollMode,
    ),
  }
}
