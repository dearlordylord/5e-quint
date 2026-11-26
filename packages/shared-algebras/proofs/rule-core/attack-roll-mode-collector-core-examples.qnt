// -*- mode: Bluespec; -*-

module attackRollModeCollectorCoreExamples {
  import d20TestCircumstanceCore.* from "./d20-test-circumstance-core"
  import attackRollModeCollectorCore.* from "./attack-roll-mode-collector-core"

  pure val plainCircumstances: AttackRollCircumstances = {
    targetKind: CreatureAttackRollTarget,
    attacker: noAttackerAttackRollConditions,
    target: noTargetAttackRollConditions,
    targetUnconscious: false,
    targetDistanceFeet: 5,
    attackerGrappledByOtherThanTarget: false,
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    attackerHidden: false,
    targetHidden: false,
    targetDodging: false,
    attackerHelpedAgainstTarget: false,
    ranged: false,
    longRange: false,
    enemies: [],
  }

  pure def againstObject(c: AttackRollCircumstances): AttackRollCircumstances =
    { ...c, targetKind: ObjectAttackRollTarget }

  pure val grappledAttacker: AttackRollCircumstances =
    { ...plainCircumstances, attackerGrappledByOtherThanTarget: true }

  // Every creature-side Advantage at once: none of it reaches an object.
  pure val everyCreatureSideAdvantage: AttackRollCircumstances = {
    ...plainCircumstances,
    target: {
      paralyzed: true,
      petrified: true,
      prone: true,
      restrained: true,
      stunned: true,
    },
    targetUnconscious: true,
    targetCanSeeAttacker: false,
    attackerHelpedAgainstTarget: true,
  }

  pure val everyCreatureSideSource: AttackRollCircumstances = {
    ...everyCreatureSideAdvantage,
    targetHidden: true,
    targetDodging: true,
  }

  pure val adjacentWatchingEnemy: RangedAttackProximityEnemy = {
    distanceFeet: 5,
    canSeeAttacker: true,
    incapacitated: false,
  }

  run grappledAttackerReachesEveryTarget = all {
    assert(collectedAttackRollMode(grappledAttacker) == DisadvantageD20TestRoll),
    assert(collectedAttackRollMode(againstObject(grappledAttacker)) == DisadvantageD20TestRoll),
    assert(collectedAttackRollMode(plainCircumstances) == NormalD20TestRoll),
  }

  run unseenTargetReachesEveryTarget = all {
    val unseen = { ...plainCircumstances, attackerCanSeeTarget: false }
    all {
      assert(collectedAttackRollMode(unseen) == DisadvantageD20TestRoll),
      assert(collectedAttackRollMode(againstObject(unseen)) == DisadvantageD20TestRoll),
    }
  }

  run creatureSideSourcesDoNotReachAnObject = all {
    assert(collectedAttackRollMode(everyCreatureSideAdvantage) == AdvantageD20TestRoll),
    assert(collectedAttackRollMode(againstObject(everyCreatureSideAdvantage)) == NormalD20TestRoll),
    assert(collectedAttackRollSources(againstObject(everyCreatureSideSource)) == noSources),
    assert(attackRollModeSources.forall(source =>
      sourceContribution(source, againstObject(everyCreatureSideSource)) == noSources
    )),
  }

  // Invisible: the attacker's Advantage is lost only to a creature that sees
  // it, so it reaches an object; the hidden target's Disadvantage doesn't.
  run hiddenAttackerReachesEveryTarget = all {
    val hidden = { ...plainCircumstances, attackerHidden: true }
    val hiddenTarget = { ...plainCircumstances, targetHidden: true }
    all {
      assert(collectedAttackRollMode(hidden) == AdvantageD20TestRoll),
      assert(collectedAttackRollMode(againstObject(hidden)) == AdvantageD20TestRoll),
      assert(collectedAttackRollMode(hiddenTarget) == DisadvantageD20TestRoll),
      assert(collectedAttackRollMode(againstObject(hiddenTarget)) == NormalD20TestRoll),
    }
  }

  run unconsciousTargetGivesAdvantage = all {
    val unconscious = { ...plainCircumstances, targetUnconscious: true, targetDistanceFeet: 30 }
    all {
      assert(collectedAttackRollMode(unconscious) == AdvantageD20TestRoll),
      assert(collectedAttackRollMode(againstObject(unconscious)) == NormalD20TestRoll),
    }
  }

  run rangedSourcesReachEveryTarget = all {
    val closeCombat = { ...plainCircumstances, ranged: true, enemies: [adjacentWatchingEnemy] }
    val longRange = { ...plainCircumstances, ranged: true, longRange: true }
    all {
      assert(collectedAttackRollMode(closeCombat) == DisadvantageD20TestRoll),
      assert(collectedAttackRollMode(againstObject(closeCombat)) == DisadvantageD20TestRoll),
      assert(collectedAttackRollMode(againstObject(longRange)) == DisadvantageD20TestRoll),
      assert(collectedAttackRollMode({ ...closeCombat, ranged: false }) == NormalD20TestRoll),
    }
  }

  run sourcesCombineBeforeCancellation = all {
    val restrainedAgainstProne = {
      ...plainCircumstances,
      attacker: { ...noAttackerAttackRollConditions, restrained: true },
      target: { ...noTargetAttackRollConditions, prone: true },
    }
    all {
      assert(collectedAttackRollMode(restrainedAgainstProne) == NormalD20TestRoll),
      assert(collectedAttackRollMode(againstObject(restrainedAgainstProne)) == DisadvantageD20TestRoll),
      assert(collectedAttackRollMode({ ...restrainedAgainstProne, targetDistanceFeet: 10 }) == DisadvantageD20TestRoll),
    }
  }
}
