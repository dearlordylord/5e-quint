// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save

module battleRuntimeSaveConditionHoldTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSaveConditionBlindness.* from "./battle-runtime-save-condition-blindness"
  import battleRuntimeSaveConditionTargetingFacts.* from "./battle-runtime-save-condition-targeting-facts"
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveConditionHold.* from "./battle-runtime-save-condition-hold"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"

  run test_hold_person_humanoid_wisdom_save_paralyzed_concentration_and_repeat_save = {
    val paralyzed = HoldPersonParalyzed({
      source: Fighter,
      hadIncapacitated: false,
      heightenedRepeatSaveDisadvantage: false,
      durationTicks: holdPersonDurationTicks,
    })
    val rejectedBeast = resolveHoldPerson(
      initialState,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      BeastCreature,
      false,
    )
    val paralyzedGoblin = resolveHoldPerson(
      initialState,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val allSuccess = resolveHoldPerson(
      initialState,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      true,
    )
    val concentratingGoblin = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        concentrating: true,
        activeEffects: Set(HeroismTurnStartTemporaryHitPoints({ amount: 3 })),
      },
    }
    val paralyzedConcentratingGoblin = resolveHoldPerson(
      concentratingGoblin,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val illegalLevelOne = resolveHoldPerson(
      initialState,
      1,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val illegalTwoTargetsLevelTwo = resolveHoldPerson(
      initialState,
      2,
      true,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val goblinTurn = endTurn(paralyzedGoblin)
    val failedRepeat = endTurnWithHoldPersonRepeatSave(goblinTurn, Fighter, false)
    val successfulRepeat = endTurnWithHoldPersonRepeatSave(goblinTurn, Fighter, true)
    val broken = breakConcentrationSpellEffects(paralyzedGoblin, Fighter)
    val nearlyExpired = {
      ...paralyzedGoblin,
      goblin: {
        ...paralyzedGoblin.goblin,
        activeEffects: Set(HoldPersonParalyzed({
          source: Fighter,
          hadIncapacitated: false,
          heightenedRepeatSaveDisadvantage: false,
          durationTicks: 1,
        })),
      },
    }
    val expired = tickRoundDurationSpellEffects(nearlyExpired)
    all {
      assert(saveGatedConditionSavingThrowAbility(HoldPersonSaveGate) == WisAbility),
      assert(rejectedBeast == initialState),
      assert(illegalLevelOne == initialState),
      assert(illegalTwoTargetsLevelTwo == initialState),
      assert(paralyzedGoblin.fighter.concentrating),
      assert(paralyzedGoblin.goblin.incapacitated),
      assert(paralyzedGoblin.goblin.activeEffects.contains(paralyzed)),
      assert(not(allSuccess.fighter.concentrating)),
      assert(not(activeEffectsContainHoldPersonFrom(allSuccess.goblin.activeEffects, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(allSuccess, Fighter)),
      assert(not(allSuccess.actionAvailable)),
      assert(not(paralyzedConcentratingGoblin.goblin.concentrating)),
      assert(paralyzedConcentratingGoblin.goblin.incapacitated),
      assert(activeEffectsContainHoldPersonFrom(paralyzedConcentratingGoblin.goblin.activeEffects, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(paralyzedGoblin, Fighter)),
      assert(not(paralyzedGoblin.actionAvailable)),
      assert(failedRepeat.goblin.activeEffects.contains(HoldPersonParalyzed({
        source: Fighter,
        hadIncapacitated: false,
        heightenedRepeatSaveDisadvantage: false,
        durationTicks: holdPersonDurationTicks - 1,
      }))),
      assert(not(successfulRepeat.fighter.concentrating)),
      assert(not(successfulRepeat.goblin.incapacitated)),
      assert(not(activeEffectsContainHoldPersonFrom(successfulRepeat.goblin.activeEffects, Fighter))),
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.goblin.incapacitated)),
      assert(not(activeEffectsContainHoldPersonFrom(broken.goblin.activeEffects, Fighter))),
      assert(not(expired.fighter.concentrating)),
      assert(not(expired.goblin.incapacitated)),
      assert(not(activeEffectsContainHoldPersonFrom(expired.goblin.activeEffects, Fighter))),
    }
  }

  run test_hold_monster_creature_wisdom_save_paralyzed_concentration_and_repeat_save = {
    val paralyzed = HoldPersonParalyzed({
      source: Fighter,
      hadIncapacitated: false,
      heightenedRepeatSaveDisadvantage: false,
      durationTicks: holdPersonDurationTicks,
    })
    val illegalLevelFour = resolveHoldMonster(
      initialState,
      4,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val illegalTwoTargetsLevelFive = resolveHoldMonster(
      initialState,
      5,
      true,
      BeastCreature,
      false,
      true,
      UndeadCreature,
      false,
    )
    val paralyzedBeast = resolveHoldMonster(
      initialState,
      5,
      false,
      HumanoidCreature,
      true,
      true,
      BeastCreature,
      false,
    )
    val paralyzedUndead = resolveHoldMonster(
      initialState,
      5,
      false,
      HumanoidCreature,
      true,
      true,
      UndeadCreature,
      false,
    )
    val twoTargetsLevelSix = resolveHoldMonster(
      initialState,
      6,
      true,
      BeastCreature,
      false,
      true,
      UndeadCreature,
      false,
    )
    val allSuccess = resolveHoldMonster(
      initialState,
      5,
      false,
      HumanoidCreature,
      true,
      true,
      BeastCreature,
      true,
    )
    val goblinTurn = endTurn(paralyzedBeast)
    val successfulRepeat = endTurnWithHoldPersonRepeatSave(goblinTurn, Fighter, true)
    all {
      assert(saveGatedConditionSavingThrowAbility(HoldMonsterSaveGate) == WisAbility),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldMonsterSaveGate), 5) == 1),
      assert(saveGatedTargetMaxTargets(saveGatedConditionTargeting(HoldMonsterSaveGate), 6) == 2),
      assert(saveGatedConditionTargetCountIsLegal(HoldMonsterSaveGate, 6, true, true)),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, BeastCreature)),
      assert(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, UndeadCreature)),
      assert(illegalLevelFour == initialState),
      assert(illegalTwoTargetsLevelFive == initialState),
      assert(paralyzedBeast.fighter.concentrating),
      assert(paralyzedBeast.goblin.incapacitated),
      assert(paralyzedBeast.goblin.activeEffects.contains(paralyzed)),
      assert(paralyzedUndead.goblin.incapacitated),
      assert(battleActorHasCommittedSpellSlotUse(twoTargetsLevelSix, Fighter)),
      assert(not(twoTargetsLevelSix.actionAvailable)),
      assert(not(allSuccess.fighter.concentrating)),
      assert(not(activeEffectsContainHoldPersonFrom(allSuccess.goblin.activeEffects, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(allSuccess, Fighter)),
      assert(not(allSuccess.actionAvailable)),
      assert(not(successfulRepeat.fighter.concentrating)),
      assert(not(successfulRepeat.goblin.incapacitated)),
      assert(not(activeEffectsContainHoldPersonFrom(successfulRepeat.goblin.activeEffects, Fighter))),
    }
  }

  run test_heightened_save_gated_condition_repeat_save_roll_modes = {
    val heightenedHoldPersonGoblinFailed = resolveHoldPersonWithHeightenedTarget(
      initialState,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
      HeightenedSaveGatedConditionTarget({ target: Goblin }),
    )
    val heightenedHoldPersonGoblinSucceeded = resolveHoldPersonWithHeightenedTarget(
      initialState,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      true,
      HeightenedSaveGatedConditionTarget({ target: Goblin }),
    )
    val ordinaryHoldPersonGoblinFailed = resolveHoldPerson(
      initialState,
      2,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val heightenedBlindnessBothFailed = resolveBlindnessDeafnessWithHeightenedTarget(
      initialState,
      3,
      BlindnessDeafnessBlindedChoice,
      true,
      false,
      true,
      false,
      HeightenedSaveGatedConditionTarget({ target: Goblin }),
    )
    val heightenedBlindnessSelectedSucceeded = resolveBlindnessDeafnessWithHeightenedTarget(
      initialState,
      3,
      BlindnessDeafnessBlindedChoice,
      true,
      true,
      true,
      false,
      HeightenedSaveGatedConditionTarget({ target: Fighter }),
    )
    all {
      assert(holdPersonEndTurnRepeatSaveRollMode(heightenedHoldPersonGoblinFailed.goblin, Fighter) == DisadvantageSavingThrow),
      assert(holdPersonEndTurnRepeatSaveRollMode(ordinaryHoldPersonGoblinFailed.goblin, Fighter) == NormalSavingThrow),
      assert(not(activeEffectsContainHoldPersonFrom(heightenedHoldPersonGoblinSucceeded.goblin.activeEffects, Fighter))),
      assert(blindnessDeafnessEndTurnRepeatSaveRollMode(
        heightenedBlindnessBothFailed.goblin,
        Fighter,
        BlindnessDeafnessBlindedChoice,
      ) == DisadvantageSavingThrow),
      assert(blindnessDeafnessEndTurnRepeatSaveRollMode(
        heightenedBlindnessBothFailed.fighter,
        Fighter,
        BlindnessDeafnessBlindedChoice,
      ) == NormalSavingThrow),
      assert(not(blindnessDeafnessRepeatSaveDue(
        heightenedBlindnessSelectedSucceeded.fighter.activeEffects,
        Fighter,
        BlindnessDeafnessBlindedChoice,
      ))),
      assert(blindnessDeafnessEndTurnRepeatSaveRollMode(
        heightenedBlindnessSelectedSucceeded.goblin,
        Fighter,
        BlindnessDeafnessBlindedChoice,
      ) == NormalSavingThrow),
    }
  }

}
