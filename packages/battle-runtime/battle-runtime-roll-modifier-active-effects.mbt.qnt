// -*- mode: Bluespec; -*-

module battleRuntimeRollModifierActiveEffectsMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Bane:
  //   failed Charisma Saving Throws subtract 1d4 from attack rolls and
  //   Saving Throws while the spell lasts.
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Bless:
  //   targets add 1d4 to attack rolls and Saving Throws while the spell lasts.
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enhance Ability:
  //   chosen targets have Advantage on Ability Checks using a chosen ability,
  //   and higher-level slots can choose a different ability for each target.
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enthrall:
  //   failed Wisdom Saving Throws impose a -10 penalty to Wisdom (Perception)
  //   checks and Passive Perception.
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Guidance:
  //   a willing target adds 1d4 to Ability Checks using the chosen skill.
  // - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Pass without Trace:
  //   chosen creatures in the aura get +10 to Dexterity (Stealth) checks.
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Thaumaturgy:
  //   Booming Voice grants Advantage on Charisma (Intimidation) checks and
  //   shares the three active 1-minute effect cap.
  // - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage:
  //   Advantage and Disadvantage cancel to a normal d20 roll.
  // - UBIQUITOUS_LANGUAGE.md: D20 Rolls, Advantage and Disadvantage, and
  //   Spell Invocation / Spell Effect.
  type RollModifierActiveEffectsWitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qCasterConcentrating: bool,
    qTargetAttackModifier: str,
    qTargetSavingThrowModifier: str,
    qCasterAbilityCheckModifier: str,
    qTargetAbilityCheckModifier: str,
    qCasterSkill: str,
    qTargetSkill: str,
    qTargetAbilityChoice: str,
    qSecondTargetAbilityChoice: str,
    qTargetAbilityCheckRollMode: str,
    qSecondTargetAbilityCheckRollMode: str,
    qThaumaturgyIntimidationRollMode: str,
    qThaumaturgyEffectActive: bool,
    qPassivePerceptionDelta: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[str],
  }

  var qState: RollModifierActiveEffectsWitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qTargetAttackModifier: str = qState.qTargetAttackModifier
  pure def qTargetSavingThrowModifier: str = qState.qTargetSavingThrowModifier
  pure def qCasterAbilityCheckModifier: str = qState.qCasterAbilityCheckModifier
  pure def qTargetAbilityCheckModifier: str = qState.qTargetAbilityCheckModifier
  pure def qCasterSkill: str = qState.qCasterSkill
  pure def qTargetSkill: str = qState.qTargetSkill
  pure def qTargetAbilityChoice: str = qState.qTargetAbilityChoice
  pure def qSecondTargetAbilityChoice: str = qState.qSecondTargetAbilityChoice
  pure def qTargetAbilityCheckRollMode: str = qState.qTargetAbilityCheckRollMode
  pure def qSecondTargetAbilityCheckRollMode: str = qState.qSecondTargetAbilityCheckRollMode
  pure def qThaumaturgyIntimidationRollMode: str = qState.qThaumaturgyIntimidationRollMode
  pure def qThaumaturgyEffectActive: bool = qState.qThaumaturgyEffectActive
  pure def qPassivePerceptionDelta: int = qState.qPassivePerceptionDelta
  pure def qHoles: Set[str] = qState.protocol.holes
  pure def qLastResult: str = qState.qScenarioResult

  pure val noModifier: str = "none"
  pure val plusD4Modifier: str = "+1d4"
  pure val minusD4Modifier: str = "-1d4"
  pure val plusTenModifier: str = "+10"
  pure val minusTenModifier: str = "-10"
  pure val noChoice: str = "none"
  pure val dexChoice: str = "dex"
  pure val wisChoice: str = "wis"
  pure val stealthSkill: str = "stealth"
  pure val perceptionSkill: str = "perception"
  pure val normalRollMode: str = "normal"
  pure val advantageRollMode: str = "advantage"
  pure val noHoles: Set[str] = Set()
  pure val savingThrowOutcomeHoles: Set[str] = Set("SavingThrowOutcome")
  pure val skillChoiceHoles: Set[str] = Set("SkillChoice")
  pure val abilityChoiceHoles: Set[str] = Set("AbilityChoice")
  pure val targetAbilityChoicesHoles: Set[str] = Set("TargetAbilityChoices")
  pure val thaumaturgyCountHoles: Set[str] = Set("ThaumaturgyActiveOneMinuteEffectCount")

  pure def witnessProtocolForProjection(
    holes: Set[str],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[str] =
    if (scenarioResult == "init") witnessInit("")
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid("", WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid("", WStaleSubject)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("")

  action recordRollModifierState(
    actionAvailable: bool,
    spellAvailable: bool,
    casterConcentrating: bool,
    targetAttackModifier: str,
    targetSavingThrowModifier: str,
    casterAbilityCheckModifier: str,
    targetAbilityCheckModifier: str,
    casterSkill: str,
    targetSkill: str,
    targetAbilityChoice: str,
    secondTargetAbilityChoice: str,
    targetAbilityCheckRollMode: str,
    secondTargetAbilityCheckRollMode: str,
    thaumaturgyIntimidationRollMode: str,
    thaumaturgyEffectActive: bool,
    holes: Set[str],
    passivePerceptionDelta: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qCasterConcentrating: casterConcentrating,
      qTargetAttackModifier: targetAttackModifier,
      qTargetSavingThrowModifier: targetSavingThrowModifier,
      qCasterAbilityCheckModifier: casterAbilityCheckModifier,
      qTargetAbilityCheckModifier: targetAbilityCheckModifier,
      qCasterSkill: casterSkill,
      qTargetSkill: targetSkill,
      qTargetAbilityChoice: targetAbilityChoice,
      qSecondTargetAbilityChoice: secondTargetAbilityChoice,
      qTargetAbilityCheckRollMode: targetAbilityCheckRollMode,
      qSecondTargetAbilityCheckRollMode: secondTargetAbilityCheckRollMode,
      qThaumaturgyIntimidationRollMode: thaumaturgyIntimidationRollMode,
      qThaumaturgyEffectActive: thaumaturgyEffectActive,
      qPassivePerceptionDelta: passivePerceptionDelta,
      qScenarioResult: lastResult,
      protocol: witnessProtocolForProjection(holes, lastResult, ""),
    },
  }

  action recordNoEffectState(
    actionAvailable: bool,
    spellAvailable: bool,
    holes: Set[str],
    lastResult: str,
  ): bool =
    recordRollModifierState(
      actionAvailable,
      spellAvailable,
      false,
      noModifier,
      noModifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      false,
      holes,
      0,
      lastResult,
    )

  action init = all {
    recordNoEffectState(true, true, noHoles, "init"),
  }

  action doDiscoverBaneSave = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordNoEffectState(true, true, savingThrowOutcomeHoles, "needsBaneSave"),
  }

  action doCastBaneFailed = all {
    qHoles == savingThrowOutcomeHoles,
    qLastResult == "needsBaneSave",
    recordRollModifierState(
      false,
      false,
      true,
      minusD4Modifier,
      minusD4Modifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      false,
      noHoles,
      0,
      "baneFailedTarget",
    ),
  }

  action doCastBless = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordRollModifierState(
      false,
      false,
      true,
      plusD4Modifier,
      plusD4Modifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      false,
      noHoles,
      0,
      "blessTarget",
    ),
  }

  action doDiscoverGuidanceSkillChoice = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordNoEffectState(true, true, skillChoiceHoles, "needsGuidanceSkill"),
  }

  action doCastGuidanceStealth = all {
    qLastResult.in(Set("init", "needsGuidanceSkill")),
    qHoles.in(Set(noHoles, skillChoiceHoles)),
    recordRollModifierState(
      false,
      false,
      true,
      noModifier,
      noModifier,
      plusD4Modifier,
      noModifier,
      stealthSkill,
      noChoice,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      false,
      noHoles,
      0,
      "guidanceStealth",
    ),
  }

  action doCastPassWithoutTrace = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordRollModifierState(
      false,
      false,
      true,
      noModifier,
      noModifier,
      plusTenModifier,
      plusTenModifier,
      stealthSkill,
      stealthSkill,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      false,
      noHoles,
      0,
      "passWithoutTraceStealth",
    ),
  }

  action doDiscoverEnhanceAbilityChoice = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordNoEffectState(true, true, abilityChoiceHoles, "needsEnhanceAbility"),
  }

  action doCastEnhanceDex = all {
    qLastResult.in(Set("init", "needsEnhanceAbility")),
    qHoles.in(Set(noHoles, abilityChoiceHoles)),
    recordRollModifierState(
      false,
      false,
      true,
      noModifier,
      noModifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      dexChoice,
      noChoice,
      advantageRollMode,
      normalRollMode,
      normalRollMode,
      false,
      noHoles,
      0,
      "enhanceDex",
    ),
  }

  action doDiscoverEnhanceTargetAbilityChoices = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordNoEffectState(true, true, targetAbilityChoicesHoles, "needsEnhanceTargetAbilities"),
  }

  action doCastEnhancePerTarget = all {
    qLastResult.in(Set("init", "needsEnhanceTargetAbilities")),
    qHoles.in(Set(noHoles, targetAbilityChoicesHoles)),
    recordRollModifierState(
      false,
      false,
      true,
      noModifier,
      noModifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      dexChoice,
      wisChoice,
      advantageRollMode,
      advantageRollMode,
      normalRollMode,
      false,
      noHoles,
      0,
      "enhancePerTarget",
    ),
  }

  action doCastEnthrall = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordRollModifierState(
      false,
      false,
      true,
      noModifier,
      noModifier,
      noModifier,
      minusTenModifier,
      noChoice,
      perceptionSkill,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      false,
      noHoles,
      -10,
      "enthrallPerception",
    ),
  }

  action doDiscoverThaumaturgyCount = all {
    qActionAvailable,
    qSpellAvailable,
    qHoles == noHoles,
    qLastResult == "init",
    recordNoEffectState(true, true, thaumaturgyCountHoles, "needsThaumaturgyCount"),
  }

  action doCastThaumaturgyBoomingVoice = all {
    qLastResult.in(Set("init", "needsThaumaturgyCount")),
    qHoles.in(Set(noHoles, thaumaturgyCountHoles)),
    recordRollModifierState(
      false,
      false,
      false,
      noModifier,
      noModifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      advantageRollMode,
      true,
      noHoles,
      0,
      "thaumaturgyBoomingVoice",
    ),
  }

  action doCastThaumaturgyCancelled = all {
    qLastResult.in(Set("init", "needsThaumaturgyCount")),
    qHoles.in(Set(noHoles, thaumaturgyCountHoles)),
    recordRollModifierState(
      false,
      false,
      false,
      noModifier,
      noModifier,
      noModifier,
      noModifier,
      noChoice,
      noChoice,
      noChoice,
      noChoice,
      normalRollMode,
      normalRollMode,
      normalRollMode,
      true,
      noHoles,
      0,
      "thaumaturgyCancelled",
    ),
  }

  action doBreakConcentration = all {
    qCasterConcentrating,
    qHoles == noHoles,
    qLastResult.in(Set(
      "baneFailedTarget",
      "blessTarget",
      "guidanceStealth",
      "passWithoutTraceStealth",
      "enhanceDex",
      "enhancePerTarget",
      "enthrallPerception",
    )),
    recordNoEffectState(qActionAvailable, qSpellAvailable, noHoles, "concentrationBroken"),
  }

  action doStutter = all {
    qLastResult.in(Set(
      "baneFailedTarget",
      "blessTarget",
      "guidanceStealth",
      "passWithoutTraceStealth",
      "enhanceDex",
      "enhancePerTarget",
      "enthrallPerception",
      "thaumaturgyBoomingVoice",
      "thaumaturgyCancelled",
      "concentrationBroken",
    )),
    recordRollModifierState(
      qActionAvailable,
      qSpellAvailable,
      qCasterConcentrating,
      qTargetAttackModifier,
      qTargetSavingThrowModifier,
      qCasterAbilityCheckModifier,
      qTargetAbilityCheckModifier,
      qCasterSkill,
      qTargetSkill,
      qTargetAbilityChoice,
      qSecondTargetAbilityChoice,
      qTargetAbilityCheckRollMode,
      qSecondTargetAbilityCheckRollMode,
      qThaumaturgyIntimidationRollMode,
      qThaumaturgyEffectActive,
      qHoles,
      qPassivePerceptionDelta,
      qLastResult,
    ),
  }

  action step = any {
    doDiscoverBaneSave,
    doCastBaneFailed,
    doCastBless,
    doDiscoverGuidanceSkillChoice,
    doCastGuidanceStealth,
    doCastPassWithoutTrace,
    doDiscoverEnhanceAbilityChoice,
    doCastEnhanceDex,
    doDiscoverEnhanceTargetAbilityChoices,
    doCastEnhancePerTarget,
    doCastEnthrall,
    doDiscoverThaumaturgyCount,
    doCastThaumaturgyBoomingVoice,
    doCastThaumaturgyCancelled,
    doBreakConcentration,
    doStutter,
  }
}
