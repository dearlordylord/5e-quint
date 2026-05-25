// -*- mode: Bluespec; -*-

module battleRuntimeAbilityCheckSearchTests {
  import battleRuntimeAbilityCheckSearch.* from "./battle-runtime-ability-check-search"

  run test_ability_check_compares_total_to_dc = {
    all {
      assert(abilityCheckSucceeds({ total: 15, dc: 15 })),
      assert(not(abilityCheckSucceeds({ total: 14, dc: 15 }))),
    }
  }

  run test_search_success_reveals_hidden_target = {
    val outcome = resolveSearchHiddenTarget({
      total: 18,
      dc: 16,
    })
    all {
      assert(outcome == SearchHiddenTargetFound),
      assert(not(searchHiddenTargetStillHidden(outcome))),
    }
  }

  run test_search_failure_keeps_hidden_target_hidden = {
    val outcome = resolveSearchHiddenTarget({
      total: 15,
      dc: 16,
    })
    all {
      assert(outcome == SearchHiddenTargetStillHidden),
      assert(searchHiddenTargetStillHidden(outcome)),
    }
  }

}
