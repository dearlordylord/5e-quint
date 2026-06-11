// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeWeaponAttackOrderingMbt {
  import battleRuntimeWeaponAttackOrdering.* from "./battle-runtime-weapon-attack-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: WeaponAttackFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str

  pure def qHoles: Set[BattleHoleFamilyKind] = qProtocol.holes

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    holes: Set[BattleHoleFamilyKind],
    lastResult: str,
  ): WitnessProtocol[BattleHoleFamilyKind] =
    if (lastResult == "init") witnessInit(witnessHoleType)
    else if (lastResult == "invalid") witnessInvalidWithHoles(holes, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(witnessHoleType)

  pure def orderingErrorLabel(error: WeaponAttackFillOrderingError): str =
    match error {
      | WeaponAttackTargetChoiceRequired => "targetChoiceRequired"
      | WeaponAttackAttackRollRequired => "attackRollRequired"
    }

  pure def rejectedOrderingLabel(result: WeaponAttackFillOrderResult): str =
    match result {
      | WeaponAttackFillAccepted(_) => ""
      | WeaponAttackFillRejected(error) => orderingErrorLabel(error)
      | WeaponAttackFillNotOrderingError(_) => ""
    }

  action init = all {
    qStage' = WeaponAttackActSelectionStage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(WeaponAttackActSelectionStage),
      "init",
    ),
    qLastOrderingError' = "",
  }

  action doDiscoverAttack = all {
    qStage == WeaponAttackActSelectionStage,
    qStage' = WeaponAttackTargetChoiceStage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(WeaponAttackTargetChoiceStage),
      "needsHoles",
    ),
    qLastOrderingError' = "",
  }

  action doRejectAttackRollBeforeTargetChoice = all {
    qStage == WeaponAttackTargetChoiceStage,
    qStage' = qStage,
    qProtocol' = witnessProtocolForProjection(qHoles, "invalid"),
    qLastOrderingError' =
      rejectedOrderingLabel(
        weaponAttackFillOrderResult(qStage, AttackRollFillKind, false)
      ),
  }

  action doFillTargetChoice = all {
    qStage == WeaponAttackTargetChoiceStage,
    qStage' = WeaponAttackAttackRollStage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(WeaponAttackAttackRollStage),
      "needsHoles",
    ),
    qLastOrderingError' = "",
  }

  action doRejectDamageBeforeAttackRoll = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = qStage,
    qProtocol' = witnessProtocolForProjection(qHoles, "invalid"),
    qLastOrderingError' =
      rejectedOrderingLabel(
        weaponAttackFillOrderResult(qStage, RolledDiceFillKind, false)
      ),
  }

  action doFillAttackRollMiss = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = WeaponAttackResolvedStage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(WeaponAttackResolvedStage),
      "resolved",
    ),
    qLastOrderingError' = "",
  }

  action doFillAttackRollHit = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = WeaponAttackDamageDiceStage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(WeaponAttackDamageDiceStage),
      "needsHoles",
    ),
    qLastOrderingError' = "",
  }

  action doFillDamageDice = all {
    qStage == WeaponAttackDamageDiceStage,
    qStage' = WeaponAttackResolvedStage,
    qProtocol' = witnessProtocolForProjection(
      weaponAttackHoleFrontier(WeaponAttackResolvedStage),
      "resolved",
    ),
    qLastOrderingError' = "",
  }

  action step = any {
    doDiscoverAttack,
    doRejectAttackRollBeforeTargetChoice,
    doFillTargetChoice,
    doRejectDamageBeforeAttackRoll,
    doFillAttackRollMiss,
    doFillAttackRollHit,
    doFillDamageDice,
  }
}
