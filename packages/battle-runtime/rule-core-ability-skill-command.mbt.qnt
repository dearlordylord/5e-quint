// -*- mode: Bluespec; -*-

module ruleCoreAbilitySkillCommandMbt {
  // Self-contained literal projection witness for deterministic ability, skill,
  // Search, and Command replay scenarios. The TS test discovers the runtime
  // projection independently; this QNT side records the fixed expected facts
  // without importing reducer closures.

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

  action doSearchFails = {
    all {
      qReplayIndex == 0,
      recordProjection(
        searchFails, true, false, 0, 0, false, true, 0, "Goblin",
        "none", 0, false, false, "none", "none", 1,
      ),
    }
  }

  action doSearchSucceeds = {
    all {
      qReplayIndex == 1,
      recordProjection(
        searchSucceeds, false, false, 0, 0, false, true, 0, "Goblin",
        "none", 0, false, false, "none", "none", 2,
      ),
    }
  }

  action doGuidanceSkillProjection(
    scenario: str,
    skillName: str,
    expectedReplayIndex: int,
    nextReplayIndex: int,
  ): bool = {
    all {
      qReplayIndex == expectedReplayIndex,
      recordProjection(
        scenario, false, false, 1, 1, false, true, 0, "Fighter",
        "none", 0, false, false, skillName, "none", nextReplayIndex,
      ),
    }
  }

  action doGuidanceSkillAcrobatics = doGuidanceSkillProjection(guidanceSkillAcrobatics, "acrobatics", 2, 3)
  action doGuidanceSkillAnimalHandling = doGuidanceSkillProjection(guidanceSkillAnimalHandling, "animal_handling", 3, 4)
  action doGuidanceSkillArcana = doGuidanceSkillProjection(guidanceSkillArcana, "arcana", 4, 5)
  action doGuidanceSkillAthletics = doGuidanceSkillProjection(guidanceSkillAthletics, "athletics", 5, 6)
  action doGuidanceSkillDeception = doGuidanceSkillProjection(guidanceSkillDeception, "deception", 6, 7)
  action doGuidanceSkillHistory = doGuidanceSkillProjection(guidanceSkillHistory, "history", 7, 8)
  action doGuidanceSkillInsight = doGuidanceSkillProjection(guidanceSkillInsight, "insight", 8, 9)
  action doGuidanceSkillIntimidation = doGuidanceSkillProjection(guidanceSkillIntimidation, "intimidation", 9, 10)
  action doGuidanceSkillInvestigation = doGuidanceSkillProjection(guidanceSkillInvestigation, "investigation", 10, 11)
  action doGuidanceSkillMedicine = doGuidanceSkillProjection(guidanceSkillMedicine, "medicine", 11, 12)
  action doGuidanceSkillNature = doGuidanceSkillProjection(guidanceSkillNature, "nature", 12, 13)
  action doGuidanceSkillPerception = doGuidanceSkillProjection(guidanceSkillPerception, "perception", 13, 14)
  action doGuidanceSkillPerformance = doGuidanceSkillProjection(guidanceSkillPerformance, "performance", 14, 15)
  action doGuidanceSkillPersuasion = doGuidanceSkillProjection(guidanceSkillPersuasion, "persuasion", 15, 16)
  action doGuidanceSkillReligion = doGuidanceSkillProjection(guidanceSkillReligion, "religion", 16, 17)
  action doGuidanceSkillSleightOfHand = doGuidanceSkillProjection(guidanceSkillSleightOfHand, "sleight_of_hand", 17, 18)
  action doGuidanceSkillStealth = doGuidanceSkillProjection(guidanceSkillStealth, "stealth", 18, 19)
  action doGuidanceSkillSurvival = doGuidanceSkillProjection(guidanceSkillSurvival, "survival", 19, 20)

  action doEnhanceAbilityChoice = {
    all {
      qReplayIndex == 20,
      recordProjection(
        enhanceAbilityChoice, false, false, 1, 0, false, true, 0, "Fighter",
        "none", 0, false, false, "none", "dex", 21,
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
    all {
      qReplayIndex == 22,
      recordProjection(
        commandFollowGrovel, false, true, 0, 0, true, true, 0, "Fighter",
        "none", 0, false, false, "none", "none", 23,
      ),
    }
  }

  action doCommandFollowDrop = {
    all {
      qReplayIndex == 23,
      recordProjection(
        commandFollowDrop, false, false, 0, 0, true, true, 0, "Fighter",
        "none", 1, false, false, "none", "none", 24,
      ),
    }
  }

  action doCommandHaltSuppresses = {
    all {
      qReplayIndex == 24,
      recordProjection(
        commandHaltSuppresses, false, false, 1, 0, false, false, 30, "Goblin",
        "halt", 0, false, true, "none", "none", 25,
      ),
    }
  }

  action doCommandFollowApproachContinues = {
    all {
      qReplayIndex == 25,
      recordProjection(
        commandFollowApproachContinues, false, false, 0, 0, true, true, 10, "Goblin",
        "none", 0, false, false, "none", "none", 26,
      ),
    }
  }

  action doCommandFollowApproachWithinFive = {
    all {
      qReplayIndex == 26,
      recordProjection(
        commandFollowApproachWithinFive, false, false, 0, 0, true, true, 10, "Fighter",
        "none", 0, false, false, "none", "none", 27,
      ),
    }
  }

  action doCommandFollowApproachNoMovement = {
    all {
      qReplayIndex == 27,
      recordProjection(
        commandFollowApproachNoMovement, false, false, 0, 0, true, true, 0, "Goblin",
        "none", 0, false, false, "none", "none", 28,
      ),
    }
  }

  action doCommandFollowFlee = {
    all {
      qReplayIndex == 28,
      recordProjection(
        commandFollowFlee, false, false, 0, 0, true, true, 30, "Fighter",
        "none", 0, false, false, "none", "none", 29,
      ),
    }
  }

  action doCommandFollowFleePartialRejected = {
    all {
      qReplayIndex == 29,
      recordProjection(
        commandFollowFleePartialRejected, false, false, 1, 0, true, true, 0, "Goblin",
        "flee", 0, false, false, "none", "none", 30,
      ),
    }
  }

  action doCommandFollowFleeNoMovement = {
    all {
      qReplayIndex == 30,
      recordProjection(
        commandFollowFleeNoMovement, false, false, 0, 0, true, true, 0, "Fighter",
        "none", 0, false, false, "none", "none", 31,
      ),
    }
  }

  action doCommandFollowFleeOpportunityAttack = {
    all {
      qReplayIndex == 31,
      recordProjection(
        commandFollowFleeOpportunityAttack, false, false, 1, 0, true, true, 0, "Goblin",
        "flee", 0, true, false, "none", "none", 32,
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
