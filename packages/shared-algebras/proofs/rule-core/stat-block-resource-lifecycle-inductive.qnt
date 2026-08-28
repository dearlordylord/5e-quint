// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-LIMITED-USAGE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.resource-lifecycle

module statBlockResourceLifecycleInductive {
  import statBlockResourceLifecycle.* from "./stat-block-resource-lifecycle"

  type ResourceProofKind = ProofDaily | ProofRecharge | ProofRechargeAfterRest

  var qKind: ResourceProofKind
  var qDailyUsesRemaining: int
  var qDailyUsesMaximum: int
  var qRechargeMinimumRoll: int
  var qRechargeAvailable: bool
  var qRechargeAfterRestAvailable: bool

  pure def qRecharge: StatBlockRechargeResource = {
    minimumRoll: qRechargeMinimumRoll,
    available: qRechargeAvailable,
  }

  pure def qState: StatBlockLimitedUseResource =
    if (qKind == ProofDaily) StatBlockDailyUse({
      usesRemaining: qDailyUsesRemaining,
      maximumUses: qDailyUsesMaximum,
    })
    else if (qKind == ProofRecharge) StatBlockRechargeUse(qRecharge)
    else StatBlockRechargeAfterRestUse({ available: qRechargeAfterRestAvailable })

  action recordState(state: StatBlockLimitedUseResource): bool = match state {
    | StatBlockDailyUse(daily) => all {
        qKind' = ProofDaily,
        qDailyUsesRemaining' = daily.usesRemaining,
        qDailyUsesMaximum' = daily.maximumUses,
        qRechargeMinimumRoll' = 5,
        qRechargeAvailable' = true,
        qRechargeAfterRestAvailable' = true,
      }
    | StatBlockRechargeUse(recharge) => all {
        qKind' = ProofRecharge,
        qDailyUsesRemaining' = 1,
        qDailyUsesMaximum' = 1,
        qRechargeMinimumRoll' = recharge.minimumRoll,
        qRechargeAvailable' = recharge.available,
        qRechargeAfterRestAvailable' = true,
      }
    | StatBlockRechargeAfterRestUse(rest) => all {
        qKind' = ProofRechargeAfterRest,
        qDailyUsesRemaining' = 1,
        qDailyUsesMaximum' = 1,
        qRechargeMinimumRoll' = 5,
        qRechargeAvailable' = true,
        qRechargeAfterRestAvailable' = rest.available,
      }
  }

  action init = {
    nondet resource = Set(
      StatBlockDailyUse(initialStatBlockDailyUseResource),
      StatBlockRechargeUse(initialStatBlockRechargeResource),
      StatBlockRechargeAfterRestUse(initialStatBlockRechargeAfterRestResource)
    ).oneOf()
    all { recordState(resource) }
  }
  action doUse = all { recordState(spendStatBlockLimitedUse(qState).resource) }
  action doRechargeRoll = {
    nondet roll = Set(1, 4, 5, 6).oneOf()
    val result = processStatBlockRechargeRoll(qRecharge, roll)
    all {
      qKind == ProofRecharge,
      recordState(StatBlockRechargeUse(result)),
    }
  }
  action doShortRest = all {
    recordState(refreshStatBlockResourceAfterShortRest(qState))
  }
  action doLongRest = all {
    recordState(refreshStatBlockResourceAfterLongRest(qState))
  }
  action step = any { doUse, doRechargeRoll, doShortRest, doLongRest }

  val invariant = all {
    qKind.in(Set(ProofDaily, ProofRecharge, ProofRechargeAfterRest)),
    qDailyUsesMaximum.in(1.to(6)),
    qDailyUsesRemaining.in(0.to(qDailyUsesMaximum)),
    qRechargeMinimumRoll.in(1.to(6)),
    qRechargeAvailable.in(Set(true, false)),
    qRechargeAfterRestAvailable.in(Set(true, false)),
    legalStatBlockLimitedUseResource(qState),
  }
}
