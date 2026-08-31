// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-haste-positive
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS

module spellHastePositiveEffectsCoreExamples {
  import compositeTargetBuffCore.* from "./composite-target-buff-core"

  run test_haste_positive_profile_admits_raw_effects_and_one_attack_action = {
    all {
      assert(compositeTargetBuffProfileAdmitted(
        compositeTargetBuffFacts,
        { requestedAction: AttackAction, attackCount: 1 },
      )),
      assert(compositeTargetBuffProfileAdmitted(
        compositeTargetBuffFacts,
        { requestedAction: DashAction, attackCount: 0 },
      )),
      assert(not(compositeTargetBuffProfileAdmitted(
        compositeTargetBuffFacts,
        { requestedAction: DodgeAction, attackCount: 0 },
      ))),
      assert(not(compositeTargetBuffProfileAdmitted(
        compositeTargetBuffFacts,
        { requestedAction: AttackAction, attackCount: 2 },
      ))),
    }
  }
}
