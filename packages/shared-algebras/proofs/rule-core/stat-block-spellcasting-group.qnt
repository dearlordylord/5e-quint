// KERNEL-COVERAGE: semantic-owner BATTLE.STAT_BLOCK.SPELLCASTING_LIMITED_GROUP
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-SPELLCASTING-LIMITED-GROUP-001
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

}
