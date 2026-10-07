// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-SPELLCASTING-LIMITED-GROUP-001
// KERNEL-COVERAGE: qnt-proof BATTLE.STAT_BLOCK.SPELLCASTING_LIMITED_GROUP
module statBlockSpellcastingGroupExamples {
  import statBlockSpellcastingGroup.* from "./stat-block-spellcasting-group"
  import statBlockResourceLifecycle.* from "./stat-block-resource-lifecycle"

  run test_independentInvocationPools = {
    val pools = Map(1 -> StatBlockDailyUse(initialStatBlockDailyUseResource), 2 -> StatBlockDailyUse(initialStatBlockDailyUseResource))
    val group = EachInvocationPool(Map(0 -> 1, 1 -> 2))
    val result = spendSelectedSpellcastingInvocation(pools, group, 0, true)
    all {
      assert(result.admitted),
      assert(result.pools.get(2) == pools.get(2)),
      assert(not(spendSelectedSpellcastingInvocation(result.pools, group, 0, true).admitted)),
      assert(spendSelectedSpellcastingInvocation(result.pools, group, 1, true).admitted),
      assert(spendSelectedSpellcastingInvocation(pools, group, 99, true).pools == pools),
      assert(spendSelectedSpellcastingInvocation(pools, group, 0, false).pools == pools),
    }
  }

  run test_sharedInvocationPool = {
    val pools = Map(1 -> StatBlockDailyUse(initialStatBlockDailyUseResource))
    val group = SharedGroupPool({ invocations: Set(0, 1), pool: 1 })
    val result = spendSelectedSpellcastingInvocation(pools, group, 0, true)
    all {
      assert(result.admitted),
      assert(not(spendSelectedSpellcastingInvocation(result.pools, group, 1, true).admitted)),
    }
  }
  run test_dailyRecoveryKeepsCanonicalBindings = {
    val pools = Map(1 -> StatBlockDailyUse(initialStatBlockDailyUseResource), 2 -> StatBlockDailyUse(initialStatBlockDailyUseResource))
    val group = EachInvocationPool(Map(0 -> 1, 1 -> 2))
    val spent = spendSelectedSpellcastingInvocation(pools, group, 0, true)
    val shortRest = spent.pools.keys().mapBy(pool => refreshStatBlockResourceAfterShortRest(spent.pools.get(pool)))
    val longRest = spent.pools.keys().mapBy(pool => refreshStatBlockResourceAfterLongRest(spent.pools.get(pool)))
    all {
      assert(shortRest == spent.pools),
      assert(longRest == pools),
      assert(selectedInvocationPool(group, 0) == Set(1)),
      assert(selectedInvocationPool(group, 1) == Set(2)),
    }
  }

  run test_rejectAliasedIndependentPools = {
    val pools = Map(1 -> StatBlockDailyUse(initialStatBlockDailyUseResource))
    val group = EachInvocationPool(Map(0 -> 1, 1 -> 1))
    val result = spendSelectedSpellcastingInvocation(pools, group, 0, true)
    all {
      assert(not(canonicalSpellcastingPoolBindings(group, pools))),
      assert(not(result.admitted)),
      assert(result.pools == pools),
    }
  }

}
