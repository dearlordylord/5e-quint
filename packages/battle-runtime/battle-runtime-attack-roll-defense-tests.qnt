// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.attack-roll-defense
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof table-caller.marked-creature-defenses
// RAW: .references/srd-5.2.1/classes.md:6813-6816,6825-6832.
module battleRuntimeAttackRollDefenseTests {
  import attackRollDefenseCore.* from "../shared-algebras/proofs/rule-core/attack-roll-defense-core"
  import markedCreatureDisclosureCore.* from "../shared-algebras/proofs/rule-core/marked-creature-disclosure-core"
  run test_opportunityDefense = all {
    assert(grantsDisadvantage(OpportunityDefense, true, false)),
    assert(not(grantsDisadvantage(OpportunityDefense, false, true))),
    assert(not(recordsHit(OpportunityDefense, true))),
  }
  run test_repeatAttackerDefense = all {
    assert(not(grantsDisadvantage(RepeatAttackerDefense, false, false))),
    assert(recordsHit(RepeatAttackerDefense, true)),
    assert(not(recordsHit(RepeatAttackerDefense, false))),
    assert(grantsDisadvantage(RepeatAttackerDefense, false, true)),
    assert(not(grantsDisadvantage(RepeatAttackerDefense, true, false))),
  }
  run test_scopedHitLifecycle = {
    val effects = hitEffects(RepeatAttackerDefense, Set(), 1, 2, true)
    all {
      assert(effects.contains({ attacker: 1, defender: 2 })),
      assert(not(effects.contains({ attacker: 3, defender: 2 }))),
      assert(not(effects.contains({ attacker: 1, defender: 3 }))),
      assert(hitEffects(RepeatAttackerDefense, effects, 1, 2, true) == effects),
      assert(endTurnEffects(effects) == Set()),
    }
  }
  run test_ownMarkedTargetKnowledge = {
    val base = { damageImmunities: Set("poison"), conditionImmunities: Set("poisoned"), resistances: Set("cold"), vulnerabilities: Set("bludgeoning") }
    val defended = currentCreatureDefenses(base, Set("fire"), Set("charmed"))
    val expired = currentCreatureDefenses(base, Set(), Set())
    all {
      assert(canDisclose(true, true)),
      assert(not(canDisclose(true, false))),
      assert(not(canDisclose(false, true))),
      assert(defended.resistances == Set("cold", "fire")),
      assert(defended.conditionImmunities == Set("poisoned", "charmed")),
      assert(defended.damageImmunities == base.damageImmunities),
      assert(defended.vulnerabilities == base.vulnerabilities),
      assert(expired == base),
    }
  }
}
