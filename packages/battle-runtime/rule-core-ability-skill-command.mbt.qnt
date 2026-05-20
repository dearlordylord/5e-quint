// -*- mode: Bluespec; -*-

module ruleCoreAbilitySkillCommandMbt {
  import battleRuntimeCommandChoice.* from "./battle-runtime-command-choice"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeRollModifierChoice.* from "./battle-runtime-roll-modifier-choice"

  var qLastScenario: str
  var qTargetHidden: bool
  var qTargetProne: bool
  var qTargetEffectCount: int
  var qCasterEffectCount: int
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qMovementSpentFeet: int
  var qCurrentActor: str
  var qPendingCommandOption: str
  var qDroppedObjectCount: int
  var qReactionWindowOpen: bool
  var qHaltSuppressed: bool
  var qD20ModifierSkill: str
  var qAbilityCheckModeAbility: str
  var qReplayIndex: int

  pure def searchFails: str = "search-fails"
  pure def searchSucceeds: str = "search-succeeds"
  pure def guidanceSkillAcrobatics: str = "guidance-skill-acrobatics"
  pure def guidanceSkillAnimalHandling: str = "guidance-skill-animal-handling"
  pure def guidanceSkillArcana: str = "guidance-skill-arcana"
  pure def guidanceSkillAthletics: str = "guidance-skill-athletics"
  pure def guidanceSkillDeception: str = "guidance-skill-deception"
  pure def guidanceSkillHistory: str = "guidance-skill-history"
  pure def guidanceSkillInsight: str = "guidance-skill-insight"
  pure def guidanceSkillIntimidation: str = "guidance-skill-intimidation"
  pure def guidanceSkillInvestigation: str = "guidance-skill-investigation"
  pure def guidanceSkillMedicine: str = "guidance-skill-medicine"
  pure def guidanceSkillNature: str = "guidance-skill-nature"
  pure def guidanceSkillPerception: str = "guidance-skill-perception"
  pure def guidanceSkillPerformance: str = "guidance-skill-performance"
  pure def guidanceSkillPersuasion: str = "guidance-skill-persuasion"
  pure def guidanceSkillReligion: str = "guidance-skill-religion"
  pure def guidanceSkillSleightOfHand: str = "guidance-skill-sleight-of-hand"
  pure def guidanceSkillStealth: str = "guidance-skill-stealth"
  pure def guidanceSkillSurvival: str = "guidance-skill-survival"
  pure def enhanceAbilityChoice: str = "enhance-ability-choice"
  pure def commandCastGrovel: str = "command-cast-grovel"
  pure def commandFollowGrovel: str = "command-follow-grovel"
  pure def commandFollowDrop: str = "command-follow-drop"
  pure def commandHaltSuppresses: str = "command-halt-suppresses"
  pure def commandFollowApproachContinues: str = "command-follow-approach-continues"
  pure def commandFollowApproachWithinFive: str = "command-follow-approach-within-five"
  pure def commandFollowApproachNoMovement: str = "command-follow-approach-no-movement"
  pure def commandFollowFlee: str = "command-follow-flee"
  pure def commandFollowFleePartialRejected: str = "command-follow-flee-partial-rejected"
  pure def commandFollowFleeNoMovement: str = "command-follow-flee-no-movement"
  pure def commandFollowFleeOpportunityAttack: str = "command-follow-flee-opportunity-attack"

  pure def abilityCheckSkillName(skill: AbilityCheckSkill): str =
    match skill {
      | AcrobaticsSkill => "acrobatics"
      | AnimalHandlingSkill => "animal_handling"
      | ArcanaSkill => "arcana"
      | AthleticsSkill => "athletics"
      | DeceptionSkill => "deception"
      | HistorySkill => "history"
      | InsightSkill => "insight"
      | IntimidationSkill => "intimidation"
      | InvestigationSkill => "investigation"
      | MedicineSkill => "medicine"
      | NatureSkill => "nature"
      | PerceptionSkill => "perception"
      | PerformanceSkill => "performance"
      | PersuasionSkill => "persuasion"
      | ReligionSkill => "religion"
      | SleightOfHandSkill => "sleight_of_hand"
      | StealthSkill => "stealth"
      | SurvivalSkill => "survival"
    }

  pure def abilityName(ability: Ability): str =
    match ability {
      | StrAbility => "str"
      | DexAbility => "dex"
      | ConAbility => "con"
      | IntAbility => "int"
      | WisAbility => "wis"
      | ChaAbility => "cha"
    }

  pure def d20ModifierSkillName(effect: ActiveEffect): str =
    match effect {
      | GuidanceAbilityCheckBonus(data) => abilityCheckSkillName(data.skill)
      | _ => "none"
    }

  pure def abilityCheckModeAbilityName(effect: ActiveEffect): str =
    match effect {
      | EnhanceAbilityCheckAdvantage(data) => abilityName(data.ability)
      | _ => "none"
    }

  pure def pendingEffectCount(pendingOption: str): int =
    if (pendingOption == "none") 0 else 1

  pure def commandApproachCurrentActorName(outcome: CommandApproachFollowOutcome): str =
    match outcome {
      | CommandApproachNoMovement => "Goblin"
      | CommandApproachMovementRejected => "Goblin"
      | CommandApproachMovementContinues => "Goblin"
      | CommandApproachMovementEndsTurn => "Fighter"
    }

  pure def commandApproachPendingOption(outcome: CommandApproachFollowOutcome): str =
    match outcome {
      | CommandApproachMovementRejected => "approach"
      | _ => "none"
    }

  pure def commandApproachMovementSpent(outcome: CommandApproachFollowOutcome, movementCost: int): int =
    match outcome {
      | CommandApproachMovementContinues => movementCost
      | CommandApproachMovementEndsTurn => movementCost
      | _ => 0
    }

  pure def commandFleeCurrentActorName(outcome: CommandFleeFollowOutcome): str =
    match outcome {
      | CommandFleeNoMovementEndsTurn => "Fighter"
      | CommandFleeMovementRejected => "Goblin"
      | CommandFleeOpportunityAttackContinuation => "Goblin"
      | CommandFleeMovementEndsTurn => "Fighter"
    }

  pure def commandFleePendingOption(outcome: CommandFleeFollowOutcome): str =
    match outcome {
      | CommandFleeMovementRejected => "flee"
      | CommandFleeOpportunityAttackContinuation => "flee"
      | _ => "none"
    }

  pure def commandFleeMovementSpent(outcome: CommandFleeFollowOutcome, movementCost: int): int =
    match outcome {
      | CommandFleeMovementEndsTurn => movementCost
      | _ => 0
    }

  pure def commandFleeReactionWindowOpen(outcome: CommandFleeFollowOutcome): bool =
    match outcome {
      | CommandFleeOpportunityAttackContinuation => true
      | _ => false
    }

  pure def commandDropObjectCount(outcome: CommandDropFollowOutcome): int =
    match outcome {
      | CommandDropObjectsAndEndsTurn(data) => data.droppedObjectCount
      | CommandDropIgnored => 0
    }

  pure def commandHaltIsSuppressed(outcome: CommandHaltFollowOutcome): bool =
    match outcome {
      | CommandHaltSuppressesActionBonusAndMovement => true
      | CommandHaltIgnored => false
    }

  action recordProjection(
    scenario: str,
    targetHidden: bool,
    targetProne: bool,
    targetEffectCount: int,
    casterEffectCount: int,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    movementSpentFeet: int,
    currentActorName: str,
    pendingOption: str,
    droppedObjectCount: int,
    reactionWindowOpen: bool,
    haltSuppressed: bool,
    d20ModifierSkill: str,
    abilityCheckModeAbility: str,
    nextReplayIndex: int,
  ): bool = all {
    qLastScenario' = scenario,
    qTargetHidden' = targetHidden,
    qTargetProne' = targetProne,
    qTargetEffectCount' = targetEffectCount,
    qCasterEffectCount' = casterEffectCount,
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qMovementSpentFeet' = movementSpentFeet,
    qCurrentActor' = currentActorName,
    qPendingCommandOption' = pendingOption,
    qDroppedObjectCount' = droppedObjectCount,
    qReactionWindowOpen' = reactionWindowOpen,
    qHaltSuppressed' = haltSuppressed,
    qD20ModifierSkill' = d20ModifierSkill,
    qAbilityCheckModeAbility' = abilityCheckModeAbility,
    qReplayIndex' = nextReplayIndex,
  }

  action init = recordProjection(
    "init", false, false, 0, 0, true, true, 0, "Fighter",
    "none", 0, false, false, "none", "none", 0,
  )

  action doSearchFails = all {
    qReplayIndex == 0,
    recordProjection(
      searchFails, true, false, 0, 0, false, true, 0, "Goblin",
      "none", 0, false, false, "none", "none", 1,
    ),
  }

  action doSearchSucceeds = all {
    qReplayIndex == 1,
    recordProjection(
      searchSucceeds, false, false, 0, 0, false, true, 0, "Goblin",
      "none", 0, false, false, "none", "none", 2,
    ),
  }

  action doGuidanceSkillProjection(
    scenario: str,
    skill: AbilityCheckSkill,
    expectedReplayIndex: int,
    nextReplayIndex: int,
  ): bool = {
    val effect = rollModifierChoiceActiveEffect(GuidanceRollModifier, StrAbility, skill)
    all {
      qReplayIndex == expectedReplayIndex,
      recordProjection(
        scenario, false, false, 1, 1, false, true, 0, "Fighter",
        "none", 0, false, false, d20ModifierSkillName(effect), "none", nextReplayIndex,
      ),
    }
  }

  action doGuidanceSkillAcrobatics = doGuidanceSkillProjection(guidanceSkillAcrobatics, AcrobaticsSkill, 2, 3)
  action doGuidanceSkillAnimalHandling = doGuidanceSkillProjection(guidanceSkillAnimalHandling, AnimalHandlingSkill, 3, 4)
  action doGuidanceSkillArcana = doGuidanceSkillProjection(guidanceSkillArcana, ArcanaSkill, 4, 5)
  action doGuidanceSkillAthletics = doGuidanceSkillProjection(guidanceSkillAthletics, AthleticsSkill, 5, 6)
  action doGuidanceSkillDeception = doGuidanceSkillProjection(guidanceSkillDeception, DeceptionSkill, 6, 7)
  action doGuidanceSkillHistory = doGuidanceSkillProjection(guidanceSkillHistory, HistorySkill, 7, 8)
  action doGuidanceSkillInsight = doGuidanceSkillProjection(guidanceSkillInsight, InsightSkill, 8, 9)
  action doGuidanceSkillIntimidation = doGuidanceSkillProjection(guidanceSkillIntimidation, IntimidationSkill, 9, 10)
  action doGuidanceSkillInvestigation = doGuidanceSkillProjection(guidanceSkillInvestigation, InvestigationSkill, 10, 11)
  action doGuidanceSkillMedicine = doGuidanceSkillProjection(guidanceSkillMedicine, MedicineSkill, 11, 12)
  action doGuidanceSkillNature = doGuidanceSkillProjection(guidanceSkillNature, NatureSkill, 12, 13)
  action doGuidanceSkillPerception = doGuidanceSkillProjection(guidanceSkillPerception, PerceptionSkill, 13, 14)
  action doGuidanceSkillPerformance = doGuidanceSkillProjection(guidanceSkillPerformance, PerformanceSkill, 14, 15)
  action doGuidanceSkillPersuasion = doGuidanceSkillProjection(guidanceSkillPersuasion, PersuasionSkill, 15, 16)
  action doGuidanceSkillReligion = doGuidanceSkillProjection(guidanceSkillReligion, ReligionSkill, 16, 17)
  action doGuidanceSkillSleightOfHand = doGuidanceSkillProjection(guidanceSkillSleightOfHand, SleightOfHandSkill, 17, 18)
  action doGuidanceSkillStealth = doGuidanceSkillProjection(guidanceSkillStealth, StealthSkill, 18, 19)
  action doGuidanceSkillSurvival = doGuidanceSkillProjection(guidanceSkillSurvival, SurvivalSkill, 19, 20)

  action doEnhanceAbilityChoice = {
    val effect = rollModifierChoiceActiveEffect(EnhanceAbilityRollModifier, DexAbility, StealthSkill)
    all {
      qReplayIndex == 20,
      recordProjection(
        enhanceAbilityChoice, false, false, 1, 0, false, true, 0, "Fighter",
        "none", 0, false, false, "none", abilityCheckModeAbilityName(effect), 21,
      ),
    }
  }

  action doCommandCastGrovel = all {
    qReplayIndex == 21,
    recordProjection(
      commandCastGrovel, false, false, 1, 0, false, true, 0, "Fighter",
      "grovel", 0, false, false, "none", "none", 22,
    ),
  }

  action doCommandFollowGrovel = {
    val outcome = commandGrovelFollowOutcome(true)
    all {
      qReplayIndex == 22,
      recordProjection(
        commandFollowGrovel, false, outcome == CommandGrovelAppliesProneEndsTurn, 0, 0, true, true, 0, "Fighter",
        "none", 0, false, false, "none", "none", 23,
      ),
    }
  }

  action doCommandFollowDrop = {
    val outcome = commandDropFollowOutcome(true, 1)
    all {
      qReplayIndex == 23,
      recordProjection(
        commandFollowDrop, false, false, 0, 0, true, true, 0, "Fighter",
        "none", commandDropObjectCount(outcome), false, false, "none", "none", 24,
      ),
    }
  }

  action doCommandHaltSuppresses = {
    val outcome = commandHaltFollowOutcome(true)
    all {
      qReplayIndex == 24,
      recordProjection(
        commandHaltSuppresses, false, false, 1, 0, not(commandHaltIsSuppressed(outcome)), not(commandHaltIsSuppressed(outcome)), 30, "Goblin",
        "halt", 0, false, commandHaltIsSuppressed(outcome), "none", "none", 25,
      ),
    }
  }

  action doCommandFollowApproachContinues = {
    val outcome = commandApproachFollowOutcome(true, true, false)
    val pendingOption = commandApproachPendingOption(outcome)
    all {
      qReplayIndex == 25,
      recordProjection(
        commandFollowApproachContinues, false, false, pendingEffectCount(pendingOption), 0, true, true, commandApproachMovementSpent(outcome, 10), commandApproachCurrentActorName(outcome),
        pendingOption, 0, false, false, "none", "none", 26,
      ),
    }
  }

  action doCommandFollowApproachWithinFive = {
    val outcome = commandApproachFollowOutcome(true, true, true)
    val pendingOption = commandApproachPendingOption(outcome)
    all {
      qReplayIndex == 26,
      recordProjection(
        commandFollowApproachWithinFive, false, false, pendingEffectCount(pendingOption), 0, true, true, commandApproachMovementSpent(outcome, 10), commandApproachCurrentActorName(outcome),
        pendingOption, 0, false, false, "none", "none", 27,
      ),
    }
  }

  action doCommandFollowApproachNoMovement = {
    val outcome = commandApproachFollowOutcome(false, false, false)
    val pendingOption = commandApproachPendingOption(outcome)
    all {
      qReplayIndex == 27,
      recordProjection(
        commandFollowApproachNoMovement, false, false, pendingEffectCount(pendingOption), 0, true, true, commandApproachMovementSpent(outcome, 10), commandApproachCurrentActorName(outcome),
        pendingOption, 0, false, false, "none", "none", 28,
      ),
    }
  }

  action doCommandFollowFlee = {
    val outcome = commandFleeFollowOutcome(true, 30, 30, true, false)
    val pendingOption = commandFleePendingOption(outcome)
    all {
      qReplayIndex == 28,
      recordProjection(
        commandFollowFlee, false, false, pendingEffectCount(pendingOption), 0, true, true, commandFleeMovementSpent(outcome, 30), commandFleeCurrentActorName(outcome),
        pendingOption, 0, commandFleeReactionWindowOpen(outcome), false, "none", "none", 29,
      ),
    }
  }

  action doCommandFollowFleePartialRejected = {
    val outcome = commandFleeFollowOutcome(true, 10, 30, true, false)
    val pendingOption = commandFleePendingOption(outcome)
    all {
      qReplayIndex == 29,
      recordProjection(
        commandFollowFleePartialRejected, false, false, pendingEffectCount(pendingOption), 0, true, true, commandFleeMovementSpent(outcome, 10), commandFleeCurrentActorName(outcome),
        pendingOption, 0, commandFleeReactionWindowOpen(outcome), false, "none", "none", 30,
      ),
    }
  }

  action doCommandFollowFleeNoMovement = {
    val outcome = commandFleeFollowOutcome(false, 30, 0, false, false)
    val pendingOption = commandFleePendingOption(outcome)
    all {
      qReplayIndex == 30,
      recordProjection(
        commandFollowFleeNoMovement, false, false, pendingEffectCount(pendingOption), 0, true, true, commandFleeMovementSpent(outcome, 30), commandFleeCurrentActorName(outcome),
        pendingOption, 0, commandFleeReactionWindowOpen(outcome), false, "none", "none", 31,
      ),
    }
  }

  action doCommandFollowFleeOpportunityAttack = {
    val outcome = commandFleeFollowOutcome(true, 30, 30, true, true)
    val pendingOption = commandFleePendingOption(outcome)
    all {
      qReplayIndex == 31,
      recordProjection(
        commandFollowFleeOpportunityAttack, false, false, pendingEffectCount(pendingOption), 0, true, true, commandFleeMovementSpent(outcome, 30), commandFleeCurrentActorName(outcome),
        pendingOption, 0, commandFleeReactionWindowOpen(outcome), false, "none", "none", 32,
      ),
    }
  }

  action step = any {
    doSearchFails,
    doSearchSucceeds,
    doGuidanceSkillAcrobatics,
    doGuidanceSkillAnimalHandling,
    doGuidanceSkillArcana,
    doGuidanceSkillAthletics,
    doGuidanceSkillDeception,
    doGuidanceSkillHistory,
    doGuidanceSkillInsight,
    doGuidanceSkillIntimidation,
    doGuidanceSkillInvestigation,
    doGuidanceSkillMedicine,
    doGuidanceSkillNature,
    doGuidanceSkillPerception,
    doGuidanceSkillPerformance,
    doGuidanceSkillPersuasion,
    doGuidanceSkillReligion,
    doGuidanceSkillSleightOfHand,
    doGuidanceSkillStealth,
    doGuidanceSkillSurvival,
    doEnhanceAbilityChoice,
    doCommandCastGrovel,
    doCommandFollowGrovel,
    doCommandFollowDrop,
    doCommandHaltSuppresses,
    doCommandFollowApproachContinues,
    doCommandFollowApproachWithinFive,
    doCommandFollowApproachNoMovement,
    doCommandFollowFlee,
    doCommandFollowFleePartialRejected,
    doCommandFollowFleeNoMovement,
    doCommandFollowFleeOpportunityAttack,
  }
}
