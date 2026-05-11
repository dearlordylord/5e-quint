// -*- mode: Bluespec; -*-

module battleRuntimePublicTraceContract {
  type PublicTraceHole =
    | PublicTargetChoiceHole
    | PublicAttackRollHole
    | PublicRolledDiceHole

  type PublicTraceCheckpoint =
    | PublicActAvailable({ holes: Set[PublicTraceHole] })
    | PublicNeedsHoles({ holes: Set[PublicTraceHole] })
    | PublicResolved
    | PublicInvalid

  pure def weaponAttackHitTraceCheckpoints: List[PublicTraceCheckpoint] =
    [
      PublicActAvailable({ holes: Set(PublicTargetChoiceHole) }),
      PublicNeedsHoles({ holes: Set(PublicAttackRollHole) }),
      PublicNeedsHoles({ holes: Set(PublicRolledDiceHole) }),
      PublicResolved,
    ]

  pure def weaponAttackMissTraceCheckpoints: List[PublicTraceCheckpoint] =
    [
      PublicActAvailable({ holes: Set(PublicTargetChoiceHole) }),
      PublicNeedsHoles({ holes: Set(PublicAttackRollHole) }),
      PublicResolved,
    ]

  run test_public_attack_trace_contract_records_hit_checkpoint_order = {
    all {
      assert(weaponAttackHitTraceCheckpoints.length() == 4),
      assert(weaponAttackHitTraceCheckpoints[0] == PublicActAvailable({ holes: Set(PublicTargetChoiceHole) })),
      assert(weaponAttackHitTraceCheckpoints[1] == PublicNeedsHoles({ holes: Set(PublicAttackRollHole) })),
      assert(weaponAttackHitTraceCheckpoints[2] == PublicNeedsHoles({ holes: Set(PublicRolledDiceHole) })),
      assert(weaponAttackHitTraceCheckpoints[3] == PublicResolved),
    }
  }

  run test_public_attack_trace_contract_records_miss_checkpoint_order = {
    all {
      assert(weaponAttackMissTraceCheckpoints.length() == 3),
      assert(weaponAttackMissTraceCheckpoints[0] == PublicActAvailable({ holes: Set(PublicTargetChoiceHole) })),
      assert(weaponAttackMissTraceCheckpoints[1] == PublicNeedsHoles({ holes: Set(PublicAttackRollHole) })),
      assert(weaponAttackMissTraceCheckpoints[2] == PublicResolved),
    }
  }
}
