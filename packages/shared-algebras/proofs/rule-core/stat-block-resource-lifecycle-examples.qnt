// -*- mode: Bluespec; -*-

module statBlockResourceLifecycleExamples {
  import statBlockResourceLifecycle.* from "./stat-block-resource-lifecycle"

  run test_limited_usage_resource_lifecycles_are_distinct = {
    val daily = spendStatBlockLimitedUse(
      StatBlockDailyUse(initialStatBlockDailyUseResource)
    )
    val recharge = spendStatBlockLimitedUse(
      StatBlockRechargeUse(initialStatBlockRechargeResource)
    )
    val failedRoll = processStatBlockRechargeRoll(
      initialStatBlockRechargeResource.with("available", false),
      RechargeD6Four
    )
    val successfulRoll = processStatBlockRechargeRoll(failedRoll, RechargeD6Five)
    val restRecharge = spendStatBlockLimitedUse(
      StatBlockRechargeAfterRestUse(initialStatBlockRechargeAfterRestResource)
    )
    val shortRested = refreshStatBlockResourceAfterShortRest(restRecharge.resource)
    val depletedDaily = StatBlockDailyUse({ usesRemaining: 0, maximumUses: 1 })
    val longRested = refreshStatBlockResourceAfterLongRest(depletedDaily)
    all {
      assert(daily == {
        resource: StatBlockDailyUse({ usesRemaining: 0, maximumUses: 1 }),
        spent: true,
      }),
      assert(recharge == {
        resource: StatBlockRechargeUse({ minimumRoll: 5, available: false }),
        spent: true,
      }),
      assert(not(failedRoll.available)),
      assert(successfulRoll.available),
      assert(restRecharge.spent),
      assert(shortRested == StatBlockRechargeAfterRestUse({ available: true })),
      assert(longRested == StatBlockDailyUse({ usesRemaining: 1, maximumUses: 1 })),
    }
  }

  run test_recharge_threshold_five_covers_every_d6_result = {
    val unavailable = initialStatBlockRechargeResource.with("available", false)
    all {
      assert(not(processStatBlockRechargeRoll(unavailable, RechargeD6One).available)),
      assert(not(processStatBlockRechargeRoll(unavailable, RechargeD6Two).available)),
      assert(not(processStatBlockRechargeRoll(unavailable, RechargeD6Three).available)),
      assert(not(processStatBlockRechargeRoll(unavailable, RechargeD6Four).available)),
      assert(processStatBlockRechargeRoll(unavailable, RechargeD6Five).available),
      assert(processStatBlockRechargeRoll(unavailable, RechargeD6Six).available),
    }
  }
}
