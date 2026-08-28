// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-LIMITED-USAGE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.resource-lifecycle
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE

module statBlockResourceLifecycle {
  type StatBlockRechargeMinimumRoll = int

  type StatBlockRechargeD6Result =
    | RechargeD6One
    | RechargeD6Two
    | RechargeD6Three
    | RechargeD6Four
    | RechargeD6Five
    | RechargeD6Six

  type StatBlockDailyUseResource = {
    usesRemaining: int,
    maximumUses: int,
  }

  type StatBlockRechargeResource = {
    minimumRoll: StatBlockRechargeMinimumRoll,
    available: bool,
  }

  type StatBlockRechargeAfterRestResource = { available: bool }

  type StatBlockLimitedUseResource =
    | StatBlockDailyUse(StatBlockDailyUseResource)
    | StatBlockRechargeUse(StatBlockRechargeResource)
    | StatBlockRechargeAfterRestUse(StatBlockRechargeAfterRestResource)

  type StatBlockLimitedUseSpendResult = {
    resource: StatBlockLimitedUseResource,
    spent: bool,
  }

  pure def initialStatBlockDailyUseResource: StatBlockDailyUseResource = {
    usesRemaining: 1,
    maximumUses: 1,
  }

  pure def initialStatBlockRechargeResource: StatBlockRechargeResource = {
    minimumRoll: 5,
    available: true,
  }

  pure def initialStatBlockRechargeAfterRestResource: StatBlockRechargeAfterRestResource = {
    available: true,
  }

  pure def legalStatBlockDailyUseResource(resource: StatBlockDailyUseResource): bool = all {
    resource.maximumUses > 0,
    resource.usesRemaining >= 0,
    resource.usesRemaining <= resource.maximumUses,
  }

  pure def legalStatBlockRechargeResource(resource: StatBlockRechargeResource): bool = all {
    resource.minimumRoll.in(2.to(6)),
    resource.available.in(Set(true, false)),
  }

  pure def legalStatBlockLimitedUseResource(resource: StatBlockLimitedUseResource): bool =
    match resource {
      | StatBlockDailyUse(daily) => legalStatBlockDailyUseResource(daily)
      | StatBlockRechargeUse(recharge) => legalStatBlockRechargeResource(recharge)
      | StatBlockRechargeAfterRestUse(rest) => rest.available.in(Set(true, false))
    }

  pure def spendStatBlockLimitedUse(
    resource: StatBlockLimitedUseResource
  ): StatBlockLimitedUseSpendResult = match resource {
    | StatBlockDailyUse(daily) => {
        if (daily.usesRemaining <= 0) { resource: resource, spent: false }
        else {
          resource: StatBlockDailyUse(
            daily.with("usesRemaining", daily.usesRemaining - 1)
          ),
          spent: true,
        }
      }
    | StatBlockRechargeUse(recharge) => {
        if (not(recharge.available)) { resource: resource, spent: false }
        else {
          resource: StatBlockRechargeUse(recharge.with("available", false)),
          spent: true,
        }
      }
    | StatBlockRechargeAfterRestUse(rest) => {
        if (not(rest.available)) { resource: resource, spent: false }
        else {
          resource: StatBlockRechargeAfterRestUse(rest.with("available", false)),
          spent: true,
        }
      }
  }

  pure def processStatBlockRechargeRoll(
    recharge: StatBlockRechargeResource,
    result: StatBlockRechargeD6Result
  ): StatBlockRechargeResource = {
    val roll = statBlockRechargeD6ResultValue(result)
    if (recharge.available) recharge
    else if (roll >= recharge.minimumRoll)
      recharge.with("available", true)
    else recharge
  }

  pure def statBlockRechargeD6ResultValue(
    result: StatBlockRechargeD6Result
  ): int = match result {
    | RechargeD6One => 1
    | RechargeD6Two => 2
    | RechargeD6Three => 3
    | RechargeD6Four => 4
    | RechargeD6Five => 5
    | RechargeD6Six => 6
  }

  pure def refreshStatBlockResourceAfterShortRest(
    resource: StatBlockLimitedUseResource
  ): StatBlockLimitedUseResource = match resource {
    | StatBlockDailyUse(_) => resource
    | StatBlockRechargeUse(recharge) =>
        StatBlockRechargeUse(recharge.with("available", true))
    | StatBlockRechargeAfterRestUse(rest) =>
        StatBlockRechargeAfterRestUse(rest.with("available", true))
  }

  pure def refreshStatBlockResourceAfterLongRest(
    resource: StatBlockLimitedUseResource
  ): StatBlockLimitedUseResource = match refreshStatBlockResourceAfterShortRest(resource) {
    | StatBlockDailyUse(daily) =>
        StatBlockDailyUse(daily.with("usesRemaining", daily.maximumUses))
    | StatBlockRechargeUse(recharge) => StatBlockRechargeUse(recharge)
    | StatBlockRechargeAfterRestUse(rest) =>
        StatBlockRechargeAfterRestUse(rest)
  }
}
