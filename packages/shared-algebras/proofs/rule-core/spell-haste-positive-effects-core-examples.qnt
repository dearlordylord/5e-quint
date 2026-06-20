// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-haste-positive
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS

module spellHastePositiveEffectsCoreExamples {
  import spellHastePositiveEffectsCore.* from "./spell-haste-positive-effects-core"

  run test_haste_positive_profile_admits_raw_effects_and_one_attack_action = {
    all {
      assert(hastePositiveProfileAdmitted(
        hastePositiveEffectFacts,
        { requestedAction: AttackAction, attackCount: 1 },
      )),
      assert(hastePositiveProfileAdmitted(
        hastePositiveEffectFacts,
        { requestedAction: DashAction, attackCount: 0 },
      )),
      assert(not(hastePositiveProfileAdmitted(
        hastePositiveEffectFacts,
        { requestedAction: DodgeAction, attackCount: 0 },
      ))),
      assert(not(hastePositiveProfileAdmitted(
        hastePositiveEffectFacts,
        { requestedAction: AttackAction, attackCount: 2 },
      ))),
    }
  }
}
