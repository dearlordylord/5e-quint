module battleRuntimeBardicInspirationTests {
  import attackRollDamageDiceCore.* from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"

  run test_cutting_words_ability_check_reduction = {
    val converted = cuttingWordsAbilityCheckResolution(15, 14, 3, true, true, true, 1)
    val stillSuccessful = cuttingWordsAbilityCheckResolution(19, 14, 3, true, true, true, 1)
    val preReductionFailure = cuttingWordsAbilityCheckResolution(13, 14, 3, true, true, true, 1)
    all {
      assert(not(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(15, 3), 14))),
      assert(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(19, 3), 14)),
      assert(converted.state.fighter.reactionAvailable == false),
      assert(converted.usesRemaining == 0),
      assert(stillSuccessful.state.fighter.reactionAvailable == false),
      assert(stillSuccessful.usesRemaining == 0),
      assert(preReductionFailure.state.fighter.reactionAvailable),
      assert(preReductionFailure.usesRemaining == 1),
    }
  }

  run test_bardic_inspiration_grant_admission = {
    val emptyEffects = Set()
    val granted = bardicInspirationTargetEffectsAfterGrant(emptyEffects, Fighter, 1)
    val grantedD12 = bardicInspirationTargetEffectsAfterGrant(emptyEffects, Fighter, 15)
    all {
      assert(bardicInspirationDieSizeAtClassLevel(1) == 6),
      assert(bardicInspirationDieSizeAtClassLevel(4) == 6),
      assert(bardicInspirationDieSizeAtClassLevel(5) == 8),
      assert(bardicInspirationDieSizeAtClassLevel(9) == 8),
      assert(bardicInspirationDieSizeAtClassLevel(10) == 10),
      assert(bardicInspirationDieSizeAtClassLevel(14) == 10),
      assert(bardicInspirationDieSizeAtClassLevel(15) == 12),
      assert(bardicInspirationUses(3) == 3),
      assert(bardicInspirationUses(0) == 1),
      assert(bardicInspirationGrantAdmitted(true, true, false, false, true, 1, false)),
      assert(bardicInspirationGrantAdmitted(true, false, true, false, true, 1, false)),
      assert(not(bardicInspirationGrantAdmitted(false, true, true, false, true, 1, false))),
      assert(not(bardicInspirationGrantAdmitted(true, false, false, false, true, 1, false))),
      assert(not(bardicInspirationGrantAdmitted(true, true, true, true, true, 1, false))),
      assert(not(bardicInspirationGrantAdmitted(true, true, false, false, false, 1, false))),
      assert(not(bardicInspirationGrantAdmitted(true, true, false, false, true, 0, false))),
      assert(not(bardicInspirationGrantAdmitted(true, true, false, false, true, 1, true))),
      assert(hasBardicInspirationDie(granted)),
      assert(granted.contains(BardicInspirationDie({ source: Fighter, dieSize: 6, durationTicks: 600 }))),
      assert(grantedD12.contains(BardicInspirationDie({ source: Fighter, dieSize: 12, durationTicks: 600 }))),
      assert(bardicInspirationUsesAfterGrant(2, true) == 1),
      assert(bardicInspirationUsesAfterGrant(2, false) == 2),
    }
  }

  run test_bardic_inspiration_failed_d20_test_adds_die_and_expends_effect = {
    val granted = bardicInspirationTargetEffectsAfterGrant(Set(BlessD20RollBonus), Fighter, 1)
    val convertedAbilityCheckTotal = bardicInspirationD20TestTotal(13, 3)
    val stillFailedSavingThrowTotal = bardicInspirationD20TestTotal(10, 4)
    val convertedAttackRollTotal = bardicInspirationD20TestTotal(14, 2)
    val expended = bardicInspirationEffectsAfterDieRoll(granted)
    all {
      assert(bardicInspirationDifficultyClassD20TestAdmitted(hasBardicInspirationDie(granted), 6, 13, 15, 3)),
      assert(bardicInspirationDifficultyClassD20TestSucceeds(convertedAbilityCheckTotal, 15)),
      assert(bardicInspirationDifficultyClassD20TestAdmitted(hasBardicInspirationDie(granted), 6, 10, 15, 4)),
      assert(not(bardicInspirationDifficultyClassD20TestSucceeds(stillFailedSavingThrowTotal, 15))),
      assert(bardicInspirationAttackRollAdmitted(hasBardicInspirationDie(granted), 6, 14, 10, 15, 20, 2)),
      assert(bardicInspirationAttackRollSucceeds(convertedAttackRollTotal, 10, 15, 20)),
      assert(not(bardicInspirationDifficultyClassD20TestAdmitted(hasBardicInspirationDie(granted), 6, 15, 15, 1))),
      assert(not(bardicInspirationDifficultyClassD20TestAdmitted(hasBardicInspirationDie(granted), 6, 10, 15, 7))),
      assert(not(bardicInspirationAttackRollAdmitted(hasBardicInspirationDie(granted), 6, 15, 10, 15, 20, 1))),
      assert(not(hasBardicInspirationDie(expended))),
      assert(expended.contains(BlessD20RollBonus)),
    }
  }

}
