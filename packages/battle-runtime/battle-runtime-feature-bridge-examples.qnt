// -*- mode: Bluespec; -*-

module battleRuntimeFeatureBridgeExamples {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "../shared-algebras/proofs/rule-core/unit-feature-pool-cost-core"
  import unitFeatureActionCountCore.* from "../shared-algebras/proofs/rule-core/unit-feature-action-count-core"
  import unitFeatureRageRecklessCore.* from "../shared-algebras/proofs/rule-core/unit-feature-rage-reckless-core"
  import unitFeatureAttackRiderCore.* from "../shared-algebras/proofs/rule-core/unit-feature-attack-rider-core"
  import unitFeatureSaveDamageCore.* from "../shared-algebras/proofs/rule-core/unit-feature-save-damage-core"
  import unitFeatureReactionReductionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core"
  import unitFeatureMartialArtsCore.* from "../shared-algebras/proofs/rule-core/unit-feature-martial-arts-core"
  import battleRuntimeFeatureTurnEndEffects.* from "./battle-runtime-feature-turn-end-effects"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"

  run test_rage_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeRageDamageBonus(1) == 2),
      assert(battleRuntimeRageDamageBonus(9) == 3),
      assert(battleRuntimeRageDamageBonus(16) == 4),
      assert(battleRuntimeChampionCriticalThreshold(false) == 20),
      assert(battleRuntimeChampionCriticalThreshold(true) == 19),
      assert(battleRuntimeExtraAttackSlotsAfterAttackAction(true, true) == 1),
      assert(battleRuntimeExtraAttackSlotsAfterAttackAction(true, false) == 0),
      assert(battleRuntimeExtraAttackSlotsAfterExtraAttack(1) == 0),
      assert(battleRuntimeExtraAttackSlotsAfterEndTurn(1) == 0),
      assert(battleRuntimeRagePreventsSpellcasting(true)),
      assert(not(battleRuntimeRagePreventsSpellcasting(false))),
      assert(battleRuntimeRageGrantsResistance(true, RageBludgeoningDamage)),
      assert(not(battleRuntimeRageGrantsResistance(true, RageOtherDamage))),
    }
  }

  run test_reckless_attack_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeRecklessAttackActivates(false, false, true, true)),
      assert(not(battleRuntimeRecklessAttackActivates(true, false, true, true))),
      assert(not(battleRuntimeRecklessAttackActivates(false, true, true, true))),
      assert(battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(true)),
      assert(not(battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(false))),
    }
  }

  run test_frenzy_runtime_projection_uses_rage_and_reckless_profiles = {
    all {
      assert(battleRuntimeFrenzyDamageDice(true, true, true, true, RageUnarmedStrikeAttack, false, 3) == 2),
      assert(battleRuntimeFrenzyDamageDice(true, true, true, true, RageWeaponAttack, false, 16) == 4),
      assert(battleRuntimeFrenzyDamageDice(false, true, true, true, RageWeaponAttack, false, 3) == 0),
      assert(battleRuntimeFrenzyDamageDice(true, false, true, true, RageWeaponAttack, false, 3) == 0),
      assert(battleRuntimeFrenzyDamageDice(true, true, true, true, RageSpellAttack, false, 3) == 0),
      assert(battleRuntimeFrenzyDamageDice(true, true, true, true, RageWeaponAttack, true, 3) == 0),
    }
  }

  run test_passive_saving_throw_roll_mode_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimePassiveSavingThrowRollMode(DexteritySavingThrowFact, false) == AdvantageSavingThrowMode),
      assert(battleRuntimePassiveSavingThrowRollMode(DexteritySavingThrowFact, true) == NormalSavingThrowMode),
      assert(battleRuntimePassiveSavingThrowRollMode(ConstitutionSavingThrowFact, false) == NormalSavingThrowMode),
    }
  }

  run test_innate_sorcery_runtime_projection_uses_feature_profile = {
    val active = battleRuntimeActivateInnateSorcery(true, 2, false)
    val exhausted = battleRuntimeActivateInnateSorcery(true, 0, false)
    val noBonusAction = battleRuntimeActivateInnateSorcery(false, 2, false)
    all {
      assert(active.occurrence == InnateSorceryOneMinuteDuration),
      assert(active.pool.usesRemaining == 1),
      assert(not(active.turn.bonusActionAvailable)),
      assert(exhausted.occurrence == NoInnateSorceryOccurrence),
      assert(noBonusAction.occurrence == NoInnateSorceryOccurrence),
    }
  }

  run test_reaction_modifier_runtime_projection_uses_feature_profile = {
    all {
      assert(battleRuntimeCuttingWordsRollTotal(12, 3) == 9),
      assert(battleRuntimeCuttingWordsAbilityCheckAdmitted(15, 14, 3, true, true, true, 1)),
      assert(battleRuntimeUncannyDodgeDamage(9) == 4),
      assert(battleRuntimeDeflectAttacksDamage(8, 2, 3, 3) == 0),
      assert(battleRuntimeDeflectAttacksRedirectTargetEligible(true, true, true, false, true)),
      assert(not(battleRuntimeDeflectAttacksRedirectTargetEligible(true, false, false, true, true))),
      assert(battleRuntimeDeflectAttacksRedirectDamage(0, 3, true, false, 5, 5, 0) == 10),
      assert(battleRuntimeDeflectAttacksRedirectFocusRemaining(0, 3, true) == 2),
    }
  }

  run test_martial_arts_runtime_projection_uses_feature_profile = {
    val unarmed = battleRuntimeMartialArtsAttackProjection(
      true,
      false,
      MartialArtsUnarmedStrike,
      1,
      1,
      3,
      0,
      1,
      2
    )
    val shielded = battleRuntimeMartialArtsAttackProjection(
      true,
      true,
      MartialArtsMonkWeapon,
      17,
      1,
      3,
      1,
      4,
      2
    )
    val highLevelMonkWeapon = battleRuntimeMartialArtsAttackProjection(
      true,
      false,
      MartialArtsMonkWeapon,
      17,
      1,
      3,
      1,
      4,
      6
    )
    all {
      assert(unarmed.eligible),
      assert(unarmed.attackAbilityModifier == 3),
      assert(unarmed.damageDieSize == 6),
      assert(unarmed.unarmedStrikeSaveDc == 13),
      assert(highLevelMonkWeapon.eligible),
      assert(highLevelMonkWeapon.damageDieSize == 12),
      assert(highLevelMonkWeapon.unarmedStrikeSaveDc == 17),
      assert(not(shielded.eligible)),
      assert(shielded.attackAbilityModifier == 1),
      assert(shielded.damageDieSize == 4),
      assert(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(true, true, false, MartialArtsUnarmedStrike)),
      assert(not(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(false, true, false, MartialArtsUnarmedStrike))),
      assert(not(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(true, true, true, MartialArtsUnarmedStrike))),
      assert(not(battleRuntimeMartialArtsBonusUnarmedStrikeAdmitted(true, true, false, MartialArtsOtherWeapon))),
    }
  }
}
