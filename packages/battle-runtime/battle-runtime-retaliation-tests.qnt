// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.retaliation-reaction-attack
module battleRuntimeRetaliationTests {
  import battleRuntimeRetaliation.* from "./battle-runtime-retaliation"

  def eligibleFacts = {
    positiveDamage: true,
    damageSourceIsSelf: false,
    damageSourceWithinFiveFeet: true,
    reactorHasReaction: true,
    reactorHasRetaliation: true,
    attackIsMeleeWeaponOrUnarmedStrike: true,
  }

  run test_retaliation_available_for_nearby_positive_damage = all {
    val available = retaliationReactionAttackAvailable(eligibleFacts)
    all {
      assert(available),
      assert(retaliationReactionAttackTargetIsDamageSource(available, 2, 2)),
      assert(not(retaliationReactionAttackTargetIsDamageSource(available, 2, 3))),
    }
  }

  run test_retaliation_rejects_missing_required_fact = all {
    all {
      assert(not(retaliationReactionAttackAvailable({ ...eligibleFacts, positiveDamage: false }))),
      assert(not(retaliationReactionAttackAvailable({ ...eligibleFacts, damageSourceIsSelf: true }))),
      assert(not(retaliationReactionAttackAvailable({ ...eligibleFacts, damageSourceWithinFiveFeet: false }))),
      assert(not(retaliationReactionAttackAvailable({ ...eligibleFacts, reactorHasReaction: false }))),
      assert(not(retaliationReactionAttackAvailable({ ...eligibleFacts, reactorHasRetaliation: false }))),
      assert(not(retaliationReactionAttackAvailable({ ...eligibleFacts, attackIsMeleeWeaponOrUnarmedStrike: false }))),
    }
  }
}
