// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-LIMITED-USAGE-001
// SRD 5.2.1 monsters.md:401-409,425-429. Uses recover through the existing lifecycle owner.
module statBlockSpellcastingGroup {
  import statBlockResourceLifecycle.* from "./stat-block-resource-lifecycle"

  type LimitedSpellcastingGroup =
    | EachInvocationPool(int -> int)
    | SharedGroupPool({ invocations: Set[int], pool: int })

  type LimitedSpellcastingSpend = {
    pools: int -> StatBlockLimitedUseResource,
    admitted: bool,
  }

  pure def selectedInvocationPool(group: LimitedSpellcastingGroup, invocation: int): Set[int] =
    match group {
      | EachInvocationPool(bindings) =>
        if (invocation.in(bindings.keys())) Set(bindings.get(invocation)) else Set()
      | SharedGroupPool(data) =>
        if (invocation.in(data.invocations)) Set(data.pool) else Set()
    }

  pure def canonicalSpellcastingPoolBindings(group: LimitedSpellcastingGroup, pools: int -> StatBlockLimitedUseResource): bool =
    match group {
      | EachInvocationPool(bindings) => all {
          bindings.keys().size() > 0,
          bindings.keys().forall(invocation => bindings.get(invocation).in(pools.keys())),
          bindings.keys().forall(left => bindings.keys().forall(right => left == right or bindings.get(left) != bindings.get(right))),
        }
      | SharedGroupPool(data) => data.invocations.size() > 0 and data.pool.in(pools.keys())
    }

  pure def spendSelectedSpellcastingInvocation(
    pools: int -> StatBlockLimitedUseResource,
    group: LimitedSpellcastingGroup,
    invocation: int,
    executionAdmitted: bool
  ): LimitedSpellcastingSpend = {
    val selected = selectedInvocationPool(group, invocation)
    val available = selected.filter(pool => pool.in(pools.keys()))
    if (not(executionAdmitted) or not(canonicalSpellcastingPoolBindings(group, pools)) or available.size() != 1) {
      pools: pools, admitted: false,
    } else {
      val pool = available.fold(0, (_, selectedPool) => selectedPool)
      val spend = spendStatBlockLimitedUse(pools.get(pool))
      {
        pools: if (spend.spent) pools.set(pool, spend.resource) else pools,
        admitted: spend.spent,
      }
    }
  }

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
