// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save

module battleRuntimeSaveGatedSpellReplayTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveGatedSpellReplay.* from "./battle-runtime-save-gated-spell-replay"

  run test_acid_splash_replay_asks_for_saving_throw_outcomes_then_damage_on_failure = {
    all {
      assert(acidSplashReplayHoles(true, false, false) == Set(SavingThrowOutcome)),
      assert(acidSplashReplayHoles(true, true, true) == Set(DamageRoll)),
      assert(acidSplashReplayHoles(true, true, false) == Set()),
      assert(acidSplashReplayHoles(false, false, false) == Set()),
    }
  }

  run test_single_target_save_damage_replay_asks_for_target_then_saving_throw_then_damage = {
    all {
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, false, false, false) == Set(TargetChoice)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(SacredFlameSaveGate, true, true, true, false) == Set()),
      assert(saveGatedDamageReplayHoles(InflictWoundsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(MindSpikeSaveGate, true, false, false, false) == Set(TargetChoice)),
      assert(saveGatedDamageReplayHoles(MindSpikeSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(BurningHandsSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedDamageReplayHoles(FireballSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedDamageReplayHoles(FireballSaveGate, true, true, true, true) == Set(DamageRoll)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, true, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(ColorSpraySaveGate, true, false, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(EntangleSaveGate, true, true, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, false, false, false) == Set(SpellTargetList)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(CharmPersonSaveGate, true, true, false, true) == Set()),
      assert(saveGatedConditionReplayHoles(BlindnessDeafnessSaveGate, true, false, false, false) == Set(SpellTargetList)),
      assert(saveGatedConditionReplayHoles(BlindnessDeafnessSaveGate, true, true, false, false) == Set(ConditionChoice)),
      assert(saveGatedConditionReplayHoles(BlindnessDeafnessSaveGate, true, true, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(BlindnessDeafnessSaveGate, true, true, true, true) == Set()),
      assert(saveGatedConditionReplayHoles(HoldPersonSaveGate, true, false, false, false) == Set(SpellTargetList)),
      assert(saveGatedConditionReplayHoles(HoldPersonSaveGate, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionReplayHoles(HoldPersonSaveGate, true, true, false, true) == Set()),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedAttackRollAdvantageReplayHoles(FaerieFireSaveGate, true, true) == Set()),
      assert(saveGatedConditionImmunityReplayHoles(true, false) == Set(SavingThrowOutcome)),
      assert(saveGatedConditionImmunityReplayHoles(true, true) == Set()),
    }
  }

  run test_ice_knife_replay_asks_for_attack_damage_then_mandatory_burst = {
    all {
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, false, false, false, false, false, false) == Set(TargetChoice)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, false, false, false, false, false) == Set(AttackRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, false, false, false) == Set(DamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, true, true, false, false) == Set(SavingThrowOutcome)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, true, true, true, false, false, true, true) == Set(SpellDamageRoll)),
      assert(attackBurstSaveDamageReplayHoles(IceKnifeAttackBurstSaveDamage, false, false, false, false, false, false, false) == Set()),
    }
  }

}
