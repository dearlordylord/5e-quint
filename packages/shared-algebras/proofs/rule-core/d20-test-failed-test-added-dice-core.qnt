// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.bardic-inspiration-failed-d20-test
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.failed-ability-check-resource-boost
// KERNEL-COVERAGE: qnt-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE

module d20TestFailedTestAddedDiceCore {
  // RAW anchors:
  // - classes.md: Bard, Level 1: Bardic Inspiration. "Once within the next
  //   hour when the creature fails a D20 Test, the creature can roll the
  //   Bardic Inspiration die and add the number rolled to the d20,
  //   potentially turning the failure into a success. A Bardic Inspiration
  //   die is expended when it's rolled."
  // - classes.md: Fighter, Level 2: Tactical Mind. "When you fail an ability
  //   check, you can expend a use of your Second Wind ... you roll 1d10 and
  //   add the number rolled to the ability check, potentially turning it into
  //   a success. If the check still fails, this use of Second Wind isn't
  //   expended."
  // - ASSUMPTIONS.md A68: the dice are added once the test's rerolls are
  //   decided, to the roll that stands, in the order the roller chooses, each
  //   while the test still fails. Every added die counts before the test is
  //   judged, so the resource boost's use is spent only when the test
  //   succeeds with every added die.
  //
  // An ability check has a total that the engine compares with the DC; the
  // table rules whether a saving throw succeeds, so a die added to a save
  // carries the table's ruling with the die. A decision answers an offer, so
  // a decline is invalid too on a test that stands succeeded or from a source
  // the roller doesn't have. Each source decides once on each roll and adds
  // its die at most once; a decline decides only for the roll it was made on.
  //
  // A Death Saving Throw's ruling is fixed (playing-the-game.md, Death Saving
  // Throws), so the engine judges it: the die adds to the d20 toward 10, and a
  // 1 or a 20 on the d20 decides first, whatever is added (ASSUMPTIONS.md
  // A69). Only a Bardic Inspiration die is added to one.
  //
  // An attack roll is judged against the target's Armor Class as it stands
  // (playing-the-game.md, Attack Rolls; ASSUMPTIONS.md A70), so a die is
  // offered on a roll that misses, and the die adds to the total. A 1 on the d20 misses and a 20 is
  // a Critical Hit "regardless of any modifiers" (playing-the-game.md,
  // Rolling 20 or 1), so the d20 alone decides them, whatever is added. Only
  // a Bardic Inspiration die is added to one.
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"

  type AddedDieTest =
    | AbilityCheckTest({ total: int, dc: int })
    | RuledSavingThrow({ succeeded: bool })
    | RolledDeathSavingThrow(DeathSavingThrowRoll)
    | RolledAttackRoll(AttackRollProcedureFacts)

  type AddedDieSource =
    | BardicInspirationDie
    | FailedAbilityCheckResourceBoost

  type AddedDieChoice =
    | AddedDieDeclined
    // ruledSucceeded is the table's ruling on a saving throw; an ability
    // check, a Death Saving Throw and an attack roll ignore it, since the
    // engine judges them.
    | AddedDieRolled({ dieRoll: int, ruledSucceeded: bool })

  type AddedDieDecision = { source: AddedDieSource, choice: AddedDieChoice }

  type AddedDiceFacts = {
    test: AddedDieTest,
    // The size of the Bardic Inspiration die the roller holds; 0 for none.
    bardicInspirationDieSize: int,
    // The die of the roller's failed ability check resource boost; 0 for none.
    resourceBoostDieSize: int,
    resourceBoostUsesRemaining: int,
    decisions: List[AddedDieDecision],
  }

  type AddedDiceFold = {
    test: AddedDieTest,
    invalid: bool,
    bardicInspirationTaken: bool,
    resourceBoostTaken: bool,
    bardicInspirationDecidedOnRoll: bool,
    resourceBoostDecidedOnRoll: bool,
  }

  type AddedDiceResult = {
    invalid: bool,
    // The sources the test is asked again with, after every decision.
    bardicInspirationOffered: bool,
    resourceBoostOffered: bool,
    succeeded: bool,
    test: AddedDieTest,
    bardicInspirationDieExpended: bool,
    resourceBoostUsesRemainingAfter: int,
  }

  pure def addedDieTestSucceeded(test: AddedDieTest): bool =
    match test {
      | AbilityCheckTest(check) => check.total >= check.dc
      | RuledSavingThrow(save) => save.succeeded
      | RolledDeathSavingThrow(roll) => not(deathSavingThrowRollFails(roll))
      | RolledAttackRoll(roll) => attackRollOutcomeHits(resolveAttackRoll(roll))
    }

  pure def addedDieTestIsAbilityCheck(test: AddedDieTest): bool =
    match test {
      | AbilityCheckTest(_) => true
      | RuledSavingThrow(_) => false
      | RolledDeathSavingThrow(_) => false
      | RolledAttackRoll(_) => false
    }

  pure def addedDieSourceDieSize(
    facts: AddedDiceFacts,
    source: AddedDieSource,
  ): int =
    match source {
      | BardicInspirationDie => facts.bardicInspirationDieSize
      | FailedAbilityCheckResourceBoost =>
          if (addedDieTestIsAbilityCheck(facts.test) and
              facts.resourceBoostUsesRemaining > 0)
            facts.resourceBoostDieSize
          else 0
    }

  pure def addedDieSourceAvailable(
    facts: AddedDiceFacts,
    source: AddedDieSource,
  ): bool =
    addedDieSourceDieSize(facts, source) > 0

  pure def sourceTaken(sequence: AddedDiceFold, source: AddedDieSource): bool =
    match source {
      | BardicInspirationDie => sequence.bardicInspirationTaken
      | FailedAbilityCheckResourceBoost => sequence.resourceBoostTaken
    }

  pure def sourceDecidedOnRoll(
    sequence: AddedDiceFold,
    source: AddedDieSource,
  ): bool =
    match source {
      | BardicInspirationDie => sequence.bardicInspirationDecidedOnRoll
      | FailedAbilityCheckResourceBoost => sequence.resourceBoostDecidedOnRoll
    }

  pure def testAfterAddedDie(
    test: AddedDieTest,
    dieRoll: int,
    ruledSucceeded: bool,
  ): AddedDieTest =
    match test {
      | AbilityCheckTest(check) =>
          AbilityCheckTest({ total: check.total + dieRoll, dc: check.dc })
      | RuledSavingThrow(_) => RuledSavingThrow({ succeeded: ruledSucceeded })
      | RolledDeathSavingThrow(roll) =>
          RolledDeathSavingThrow({ ...roll, bonus: roll.bonus + dieRoll })
      | RolledAttackRoll(roll) =>
          RolledAttackRoll({ ...roll, total: roll.total + dieRoll })
    }

  pure def addedDieDecisionLegal(
    facts: AddedDiceFacts,
    sequence: AddedDiceFold,
    decision: AddedDieDecision,
  ): bool =
    all {
      not(sourceTaken(sequence, decision.source)),
      not(sourceDecidedOnRoll(sequence, decision.source)),
      not(addedDieTestSucceeded(sequence.test)),
      addedDieSourceAvailable(facts, decision.source),
      match decision.choice {
        | AddedDieDeclined => true
        | AddedDieRolled(rolled) => all {
          rolled.dieRoll >= 1,
          rolled.dieRoll <= addedDieSourceDieSize(facts, decision.source),
        }
      },
    }

  pure def applyAddedDieDecision(
    facts: AddedDiceFacts,
    sequence: AddedDiceFold,
    decision: AddedDieDecision,
  ): AddedDiceFold =
    if (sequence.invalid) sequence
    else if (not(addedDieDecisionLegal(facts, sequence, decision)))
      { ...sequence, invalid: true }
    else match decision.choice {
      | AddedDieDeclined => match decision.source {
          | BardicInspirationDie =>
              { ...sequence, bardicInspirationDecidedOnRoll: true }
          | FailedAbilityCheckResourceBoost =>
              { ...sequence, resourceBoostDecidedOnRoll: true }
        }
      | AddedDieRolled(rolled) => {
          val added = {
            ...sequence,
            test: testAfterAddedDie(
              sequence.test,
              rolled.dieRoll,
              rolled.ruledSucceeded,
            ),
            bardicInspirationDecidedOnRoll: false,
            resourceBoostDecidedOnRoll: false,
          }
          match decision.source {
            | BardicInspirationDie =>
                { ...added, bardicInspirationTaken: true }
            | FailedAbilityCheckResourceBoost =>
                { ...added, resourceBoostTaken: true }
          }
        }
    }

  pure def addedDieSourceOffered(
    facts: AddedDiceFacts,
    sequence: AddedDiceFold,
    source: AddedDieSource,
  ): bool =
    all {
      not(sequence.invalid),
      addedDieSourceAvailable(facts, source),
      not(sourceTaken(sequence, source)),
      not(sourceDecidedOnRoll(sequence, source)),
      not(addedDieTestSucceeded(sequence.test)),
    }

  pure def initialAddedDiceFold(facts: AddedDiceFacts): AddedDiceFold = {
    test: facts.test,
    invalid: false,
    bardicInspirationTaken: false,
    resourceBoostTaken: false,
    bardicInspirationDecidedOnRoll: false,
    resourceBoostDecidedOnRoll: false,
  }

  pure def foldAddedDice(facts: AddedDiceFacts): AddedDiceFold =
    facts.decisions.foldl(
      initialAddedDiceFold(facts),
      (current, decision) => applyAddedDieDecision(facts, current, decision)
    )

  pure def resolveAddedDice(facts: AddedDiceFacts): AddedDiceResult = {
    val sequence = foldAddedDice(facts)
    val stands = if (sequence.invalid) facts.test else sequence.test
    val succeeded = addedDieTestSucceeded(stands)
    {
      invalid: sequence.invalid,
      bardicInspirationOffered:
        addedDieSourceOffered(facts, sequence, BardicInspirationDie),
      resourceBoostOffered:
        addedDieSourceOffered(facts, sequence, FailedAbilityCheckResourceBoost),
      succeeded: succeeded,
      test: stands,
      bardicInspirationDieExpended:
        not(sequence.invalid) and sequence.bardicInspirationTaken,
      resourceBoostUsesRemainingAfter:
        if (not(sequence.invalid) and sequence.resourceBoostTaken and succeeded)
          facts.resourceBoostUsesRemaining - 1
        else facts.resourceBoostUsesRemaining,
    }
  }
}
