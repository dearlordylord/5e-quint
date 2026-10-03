// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-sheet.use-count-resource-recovery
module useCountResourceRecoveryExamples {
  import useCountResourceRecovery.* from "./use-count-resource-recovery"
  run test_exchange_spends_one_slot_and_recovers_one_use = {
    val before = { usePool: { capacity: 3, expended: 2 }, slotPool: { capacity: 4, expended: 1 } }
    assert(canExchangeSlotForUse(before))
      .then(assert(exchangeSlotForUse(before) == { usePool: { capacity: 3, expended: 1 }, slotPool: { capacity: 4, expended: 2 } }))
  }
  run test_exchange_rejects_full_use_pool_or_empty_slot_pool = {
    assert(not(canExchangeSlotForUse({ usePool: { capacity: 3, expended: 0 }, slotPool: { capacity: 4, expended: 1 } })))
      .then(assert(not(canExchangeSlotForUse({ usePool: { capacity: 3, expended: 1 }, slotPool: { capacity: 4, expended: 4 } }))))
  }
  run test_recovery_feature_rest_cadence = {
    val pool = { capacity: 3, expended: 2 }
    assert(restRecovery(pool, false, false) == pool)
      .then(assert(restRecovery(pool, true, false) == { capacity: 3, expended: 0 }))
      .then(assert(restRecovery(pool, false, true) == { capacity: 3, expended: 0 }))
  }
}
