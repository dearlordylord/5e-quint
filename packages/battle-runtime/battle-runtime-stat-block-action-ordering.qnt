// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

// Stat Block action-control hole-frontier ordering over the protocol
// vocabulary.
//
// RAW anchors: SRD 5.2.1 Rules Glossary "Stat Block" says a monster stat
// block lists Actions, Reactions, Attack Notation, and Damage Notation. Its
// Damage Notation says the GM chooses either the static number or the die
// expression, not both. Playing the Game "Making an Attack" orders an attack
// as Choose a Target, Determine Modifiers, then Resolve the Attack, where the
// Attack Roll precedes hit damage. "Damage Rolls" says dice are rolled when a
// damaging monster ability specifies rolled damage.
module battleRuntimeStatBlockActionOrdering {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type StatBlockActionFrontierStage =
    | StatBlockActSelectionStage
    | StatBlockAttackTargetChoiceStage
    | StatBlockAttackRollStage
    | StatBlockDamageDiceStage
    | StatBlockRechargeRollStage
    | StatBlockResolvedStage

  type StatBlockActionFillOrderingError =
    | StatBlockTargetChoiceRequired
    | StatBlockAttackRollRequired
    | StatBlockRechargeRollRequired

  type StatBlockActionFillOrderResult =
    | StatBlockActionFillAccepted(StatBlockActionFrontierStage)
    | StatBlockActionFillRejected(StatBlockActionFillOrderingError)
    | StatBlockActionFillNotOrderingError(StatBlockActionFrontierStage)

  pure def statBlockActionHoleFrontier(
    stage: StatBlockActionFrontierStage
  ): Set[BattleHoleFamilyKind] =
    match stage {
      | StatBlockActSelectionStage => Set()
      | StatBlockAttackTargetChoiceStage => Set(TargetChoiceHoleKind)
      | StatBlockAttackRollStage => Set(AttackRollHoleKind)
      | StatBlockDamageDiceStage => Set(RolledDiceHoleKind)
      | StatBlockRechargeRollStage => Set(StatBlockRechargeRollHoleKind)
      | StatBlockResolvedStage => Set()
    }

  pure def statBlockActionAfterAttackRollStage(
    attackRollHits: bool,
    usesRolledDamage: bool,
  ): StatBlockActionFrontierStage =
    if (attackRollHits and usesRolledDamage) StatBlockDamageDiceStage
    else StatBlockResolvedStage

  pure def statBlockActionFillOrderResult(
    stage: StatBlockActionFrontierStage,
    fillKind: BattleFillKind,
    attackRollHits: bool,
    usesRolledDamage: bool,
  ): StatBlockActionFillOrderResult =
    match stage {
      | StatBlockActSelectionStage =>
          StatBlockActionFillNotOrderingError(StatBlockActSelectionStage)
      | StatBlockAttackTargetChoiceStage =>
          if (fillKind == TargetChoiceFillKind)
            StatBlockActionFillAccepted(StatBlockAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            StatBlockActionFillRejected(StatBlockTargetChoiceRequired)
          else
            StatBlockActionFillNotOrderingError(StatBlockAttackTargetChoiceStage)
      | StatBlockAttackRollStage =>
          if (fillKind == AttackRollFillKind)
            StatBlockActionFillAccepted(
              statBlockActionAfterAttackRollStage(attackRollHits, usesRolledDamage)
            )
          else if (fillKind == RolledDiceFillKind)
            StatBlockActionFillRejected(StatBlockAttackRollRequired)
          else
            StatBlockActionFillNotOrderingError(StatBlockAttackRollStage)
      | StatBlockDamageDiceStage =>
          if (fillKind == RolledDiceFillKind)
            StatBlockActionFillAccepted(StatBlockResolvedStage)
          else
            StatBlockActionFillNotOrderingError(StatBlockDamageDiceStage)
      | StatBlockRechargeRollStage =>
          if (fillKind == StatBlockRechargeRollFillKind)
            StatBlockActionFillAccepted(StatBlockResolvedStage)
          else
            StatBlockActionFillRejected(StatBlockRechargeRollRequired)
      | StatBlockResolvedStage =>
          StatBlockActionFillNotOrderingError(StatBlockResolvedStage)
    }
}
