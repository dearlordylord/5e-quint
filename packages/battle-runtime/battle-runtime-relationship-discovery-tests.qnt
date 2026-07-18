module battleRuntimeRelationshipDiscoveryTests {
  import battleRuntimeRelationshipDiscovery.* from "./battle-runtime-relationship-discovery"

  run test_help_attack_candidates_depend_on_procedure_local_facts_not_partitions = {
    all {
      assert(helpAttackAllyCandidate(1, 2, false, true)),
      assert(helpAttackEnemyCandidate(1, 2, 3, false)),
      assert(not(helpAttackAllyCandidate(1, 1, false, true))),
      assert(not(helpAttackEnemyCandidate(1, 2, 2, false))),
    }
  }

  run test_cleave_accepts_any_distinct_second_creature = {
    all {
      assert(cleaveSecondTargetCandidate(1, 2, 3)),
      assert(not(cleaveSecondTargetCandidate(1, 2, 1))),
      assert(not(cleaveSecondTargetCandidate(1, 2, 2))),
    }
  }
}
