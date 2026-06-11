// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeWeaponAttackOrderingMbt {
  import battleRuntimeWeaponAttackOrdering.* from "./battle-runtime-weapon-attack-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  var qStage: WeaponAttackFrontierStage
  var qHoles: Set[BattleHoleFamilyKind]
  var qLastResult: str
  var qLastOrderingError: str

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
    qHoles' = weaponAttackHoleFrontier(WeaponAttackActSelectionStage),
    qLastResult' = "init",
    qLastOrderingError' = "",
  }

  action doDiscoverAttack = all {
    qStage == WeaponAttackActSelectionStage,
    qStage' = WeaponAttackTargetChoiceStage,
    qHoles' = weaponAttackHoleFrontier(WeaponAttackTargetChoiceStage),
    qLastResult' = "needsHoles",
    qLastOrderingError' = "",
  }

  action doRejectAttackRollBeforeTargetChoice = all {
    qStage == WeaponAttackTargetChoiceStage,
    qStage' = qStage,
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastOrderingError' =
      rejectedOrderingLabel(
        weaponAttackFillOrderResult(qStage, AttackRollFillKind, false)
      ),
  }

  action doFillTargetChoice = all {
    qStage == WeaponAttackTargetChoiceStage,
    qStage' = WeaponAttackAttackRollStage,
    qHoles' = weaponAttackHoleFrontier(WeaponAttackAttackRollStage),
    qLastResult' = "needsHoles",
    qLastOrderingError' = "",
  }

  action doRejectDamageBeforeAttackRoll = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = qStage,
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastOrderingError' =
      rejectedOrderingLabel(
        weaponAttackFillOrderResult(qStage, RolledDiceFillKind, false)
      ),
  }

  action doFillAttackRollMiss = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = WeaponAttackResolvedStage,
    qHoles' = weaponAttackHoleFrontier(WeaponAttackResolvedStage),
    qLastResult' = "resolved",
    qLastOrderingError' = "",
  }

  action doFillAttackRollHit = all {
    qStage == WeaponAttackAttackRollStage,
    qStage' = WeaponAttackDamageDiceStage,
    qHoles' = weaponAttackHoleFrontier(WeaponAttackDamageDiceStage),
    qLastResult' = "needsHoles",
    qLastOrderingError' = "",
  }

  action doFillDamageDice = all {
    qStage == WeaponAttackDamageDiceStage,
    qStage' = WeaponAttackResolvedStage,
    qHoles' = weaponAttackHoleFrontier(WeaponAttackResolvedStage),
    qLastResult' = "resolved",
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
