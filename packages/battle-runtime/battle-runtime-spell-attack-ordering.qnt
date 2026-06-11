// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

// Spell-attack hole-frontier ordering over the protocol vocabulary.
//
// RAW anchor: SRD 5.2.1 Playing the Game "Making an Attack" applies the
// attack structure to attacks made as part of a spell: choose a target,
// determine modifiers, then resolve the attack. Spells/Gaining and Casting
// "Attack Rolls" defines the spell attack modifier, and "Damage Rolls" says
// a spell tells which damage dice to roll. Damage-type choice is a
// reducer-exposed Spell Invocation fact for typed spell-attack damage before
// the attack can be resolved.
module battleRuntimeSpellAttackOrdering {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type SpellAttackFrontierStage =
    | SpellAttackActSelectionStage
    | SpellAttackTargetChoiceStage
    | SpellAttackTypedTargetChoiceStage
    | SpellAttackTargetListStage
    | SpellAttackTargetAllocationStage
    | SpellAttackDamageTypeAndTargetChoiceStage
    | SpellAttackDamageTypeChoiceStage
    | SpellAttackAttackRollStage
    | SpellAttackDamageDiceStage
    | SpellAttackResolvedStage

  type SpellAttackFillOrderingError =
    | SpellAttackTargetRequired
    | SpellAttackDamageTypeRequired
    | SpellAttackTargetOrDamageTypeRequired
    | SpellAttackAttackRollRequired

  type SpellAttackEarlierFrontierRequest = {
    error: SpellAttackFillOrderingError,
    stage: SpellAttackFrontierStage,
  }

  type SpellAttackFillOrderResult =
    | SpellAttackFillAccepted(SpellAttackFrontierStage)
    | SpellAttackFillRequestedEarlier(SpellAttackEarlierFrontierRequest)
    | SpellAttackFillNotOrderingError(SpellAttackFrontierStage)

  pure def spellAttackHoleFrontier(stage: SpellAttackFrontierStage): Set[BattleHoleFamilyKind] =
    match stage {
      | SpellAttackActSelectionStage => Set()
      | SpellAttackTargetChoiceStage => Set(TargetChoiceHoleKind)
      | SpellAttackTypedTargetChoiceStage => Set(TargetChoiceHoleKind)
      | SpellAttackTargetListStage => Set(SpellTargetListHoleKind)
      | SpellAttackTargetAllocationStage => Set(SpellTargetAllocationHoleKind)
      | SpellAttackDamageTypeAndTargetChoiceStage =>
          Set(DamageTypeChoiceHoleKind, TargetChoiceHoleKind)
      | SpellAttackDamageTypeChoiceStage => Set(DamageTypeChoiceHoleKind)
      | SpellAttackAttackRollStage => Set(AttackRollHoleKind)
      | SpellAttackDamageDiceStage => Set(RolledDiceHoleKind)
      | SpellAttackResolvedStage => Set()
    }

  pure def spellAttackAfterAttackRollStage(attackRollHits: bool): SpellAttackFrontierStage =
    if (attackRollHits) SpellAttackDamageDiceStage else SpellAttackResolvedStage

  pure def spellAttackFillOrderResult(
    stage: SpellAttackFrontierStage,
    fillKind: BattleFillKind,
    attackRollHits: bool,
  ): SpellAttackFillOrderResult =
    match stage {
      | SpellAttackActSelectionStage =>
          SpellAttackFillNotOrderingError(SpellAttackActSelectionStage)
      | SpellAttackTargetChoiceStage =>
          if (fillKind == TargetChoiceFillKind)
            SpellAttackFillAccepted(SpellAttackAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              { error: SpellAttackTargetRequired, stage: SpellAttackTargetChoiceStage }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackTargetChoiceStage)
      | SpellAttackTypedTargetChoiceStage =>
          if (fillKind == TargetChoiceFillKind)
            SpellAttackFillAccepted(SpellAttackAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              { error: SpellAttackTargetRequired, stage: SpellAttackTypedTargetChoiceStage }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackTypedTargetChoiceStage)
      | SpellAttackTargetListStage =>
          if (fillKind == SpellTargetListFillKind)
            SpellAttackFillAccepted(SpellAttackAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              { error: SpellAttackTargetRequired, stage: SpellAttackTargetListStage }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackTargetListStage)
      | SpellAttackTargetAllocationStage =>
          if (fillKind == SpellTargetAllocationFillKind)
            SpellAttackFillAccepted(SpellAttackAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              { error: SpellAttackTargetRequired, stage: SpellAttackTargetAllocationStage }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackTargetAllocationStage)
      | SpellAttackDamageTypeAndTargetChoiceStage =>
          if (fillKind == DamageTypeChoiceFillKind)
            SpellAttackFillAccepted(SpellAttackTypedTargetChoiceStage)
          else if (fillKind == TargetChoiceFillKind)
            SpellAttackFillAccepted(SpellAttackDamageTypeChoiceStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              {
                error: SpellAttackTargetOrDamageTypeRequired,
                stage: SpellAttackDamageTypeAndTargetChoiceStage,
              }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackDamageTypeAndTargetChoiceStage)
      | SpellAttackDamageTypeChoiceStage =>
          if (fillKind == DamageTypeChoiceFillKind)
            SpellAttackFillAccepted(SpellAttackAttackRollStage)
          else if (fillKind == AttackRollFillKind or fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              { error: SpellAttackDamageTypeRequired, stage: SpellAttackDamageTypeChoiceStage }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackDamageTypeChoiceStage)
      | SpellAttackAttackRollStage =>
          if (fillKind == AttackRollFillKind)
            SpellAttackFillAccepted(spellAttackAfterAttackRollStage(attackRollHits))
          else if (fillKind == RolledDiceFillKind)
            SpellAttackFillRequestedEarlier(
              { error: SpellAttackAttackRollRequired, stage: SpellAttackAttackRollStage }
            )
          else
            SpellAttackFillNotOrderingError(SpellAttackAttackRollStage)
      | SpellAttackDamageDiceStage =>
          if (fillKind == RolledDiceFillKind)
            SpellAttackFillAccepted(SpellAttackResolvedStage)
          else
            SpellAttackFillNotOrderingError(SpellAttackDamageDiceStage)
      | SpellAttackResolvedStage =>
          SpellAttackFillNotOrderingError(SpellAttackResolvedStage)
    }
}
