// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

// Weapon-attack hole-frontier ordering over the protocol vocabulary.
//
// RAW anchor: SRD 5.2.1 Playing the Game "Making an Attack" orders attacks as
// Choose a Target, Determine Modifiers, then Resolve the Attack. Resolving the
// attack makes the Attack Roll, and on a hit the attack rolls damage unless
// the particular attack says otherwise.
module battleRuntimeWeaponAttackOrdering {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type WeaponAttackFrontierStage =
    | WeaponAttackActSelectionStage
    | WeaponAttackTargetChoiceStage
    | WeaponAttackAttackRollStage
    | WeaponAttackDamageDiceStage
    | WeaponAttackResolvedStage

  type WeaponAttackFillOrderingError =
    | WeaponAttackTargetChoiceRequired
    | WeaponAttackAttackRollRequired

  type WeaponAttackFillOrderResult =
    | WeaponAttackFillAccepted(WeaponAttackFrontierStage)
    | WeaponAttackFillRejected(WeaponAttackFillOrderingError)
    | WeaponAttackFillNotOrderingError(WeaponAttackFrontierStage)

  pure def weaponAttackHoleFrontier(stage: WeaponAttackFrontierStage): Set[BattleHoleFamilyKind] =
    match stage {
      | WeaponAttackActSelectionStage => Set()
      | WeaponAttackTargetChoiceStage => Set(TargetChoiceHoleKind)
      | WeaponAttackAttackRollStage => Set(AttackRollHoleKind)
      | WeaponAttackDamageDiceStage => Set(RolledDiceHoleKind)
      | WeaponAttackResolvedStage => Set()
    }

  pure def weaponAttackAfterAttackRollStage(attackRollHits: bool): WeaponAttackFrontierStage =
    if (attackRollHits) WeaponAttackDamageDiceStage else WeaponAttackResolvedStage

  pure def weaponAttackFillOrderResult(
    stage: WeaponAttackFrontierStage,
    fillKind: BattleFillKind,
    attackRollHits: bool,
  ): WeaponAttackFillOrderResult =
    match stage {
      | WeaponAttackActSelectionStage =>
          WeaponAttackFillNotOrderingError(WeaponAttackActSelectionStage)
      | WeaponAttackTargetChoiceStage =>
          if (fillKind == TargetChoiceFillKind)
            WeaponAttackFillAccepted(WeaponAttackAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            WeaponAttackFillRejected(WeaponAttackTargetChoiceRequired)
          else
            WeaponAttackFillNotOrderingError(WeaponAttackTargetChoiceStage)
      | WeaponAttackAttackRollStage =>
          if (fillKind == AttackRollFillKind)
            WeaponAttackFillAccepted(weaponAttackAfterAttackRollStage(attackRollHits))
          else if (fillKind == RolledDiceFillKind)
            WeaponAttackFillRejected(WeaponAttackAttackRollRequired)
          else
            WeaponAttackFillNotOrderingError(WeaponAttackAttackRollStage)
      | WeaponAttackDamageDiceStage =>
          if (fillKind == RolledDiceFillKind)
            WeaponAttackFillAccepted(WeaponAttackResolvedStage)
          else
            WeaponAttackFillNotOrderingError(WeaponAttackDamageDiceStage)
      | WeaponAttackResolvedStage =>
          WeaponAttackFillNotOrderingError(WeaponAttackResolvedStage)
    }
}
