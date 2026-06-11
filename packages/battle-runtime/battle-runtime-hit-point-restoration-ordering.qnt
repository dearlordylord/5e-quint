// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

// Hit Point restoration hole-frontier ordering over the protocol vocabulary.
//
// RAW anchor: SRD 5.2.1 Playing the Game "Healing" says healing restores
// Hit Points and caps regained Hit Points at the target's Hit Point Maximum.
// "Dropping to 0 Hit Points" says the Death Saving Throw counts reset when a
// creature regains any Hit Points, and Falling Unconscious says Unconscious
// lasts until the creature regains any Hit Points. Spell restoration therefore
// selects target creatures before rolling the healing amount, and feature
// healing pools choose distribution before applying restored Hit Points.
module battleRuntimeHitPointRestorationOrdering {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type HitPointRestorationFrontierStage =
    | HitPointRestorationActSelectionStage
    | SpellHealingTargetChoiceStage
    | SpellHealingTargetListStage
    | SpellHealingRollStage
    | FeatureHealingPoolDistributionStage
    | HitPointRestorationResolvedStage

  type HitPointRestorationFillOrderingError =
    | HealingTargetRequired
    | HealingAmountRequired
    | HealingDistributionRequired

  type HitPointRestorationEarlierFrontierRequest = {
    error: HitPointRestorationFillOrderingError,
    stage: HitPointRestorationFrontierStage,
  }

  type HitPointRestorationFillOrderResult =
    | HitPointRestorationFillAccepted(HitPointRestorationFrontierStage)
    | HitPointRestorationFillRequestedEarlier(HitPointRestorationEarlierFrontierRequest)
    | HitPointRestorationFillNotOrderingError(HitPointRestorationFrontierStage)

  pure def hitPointRestorationHoleFrontier(
    stage: HitPointRestorationFrontierStage
  ): Set[BattleHoleFamilyKind] =
    match stage {
      | HitPointRestorationActSelectionStage => Set()
      | SpellHealingTargetChoiceStage => Set(TargetChoiceHoleKind)
      | SpellHealingTargetListStage => Set(SpellTargetListHoleKind)
      | SpellHealingRollStage => Set(RolledDiceHoleKind)
      | FeatureHealingPoolDistributionStage => Set(HitPointHealingDistributionHoleKind)
      | HitPointRestorationResolvedStage => Set()
    }

  pure def hitPointRestorationFillOrderResult(
    stage: HitPointRestorationFrontierStage,
    fillKind: BattleFillKind,
  ): HitPointRestorationFillOrderResult =
    match stage {
      | HitPointRestorationActSelectionStage =>
          HitPointRestorationFillNotOrderingError(HitPointRestorationActSelectionStage)
      | SpellHealingTargetChoiceStage =>
          if (fillKind == TargetChoiceFillKind)
            HitPointRestorationFillAccepted(SpellHealingRollStage)
          else if (fillKind == RolledDiceFillKind)
            HitPointRestorationFillRequestedEarlier(
              { error: HealingTargetRequired, stage: SpellHealingTargetChoiceStage }
            )
          else
            HitPointRestorationFillNotOrderingError(SpellHealingTargetChoiceStage)
      | SpellHealingTargetListStage =>
          if (fillKind == SpellTargetListFillKind)
            HitPointRestorationFillAccepted(SpellHealingRollStage)
          else if (fillKind == RolledDiceFillKind)
            HitPointRestorationFillRequestedEarlier(
              { error: HealingTargetRequired, stage: SpellHealingTargetListStage }
            )
          else
            HitPointRestorationFillNotOrderingError(SpellHealingTargetListStage)
      | SpellHealingRollStage =>
          if (fillKind == RolledDiceFillKind)
            HitPointRestorationFillAccepted(HitPointRestorationResolvedStage)
          else if (fillKind == TargetChoiceFillKind or fillKind == SpellTargetListFillKind)
            HitPointRestorationFillRequestedEarlier(
              { error: HealingAmountRequired, stage: SpellHealingRollStage }
            )
          else
            HitPointRestorationFillNotOrderingError(SpellHealingRollStage)
      | FeatureHealingPoolDistributionStage =>
          if (fillKind == HitPointHealingDistributionFillKind)
            HitPointRestorationFillAccepted(HitPointRestorationResolvedStage)
          else if (fillKind == RolledDiceFillKind)
            HitPointRestorationFillRequestedEarlier(
              {
                error: HealingDistributionRequired,
                stage: FeatureHealingPoolDistributionStage,
              }
            )
          else
            HitPointRestorationFillNotOrderingError(FeatureHealingPoolDistributionStage)
      | HitPointRestorationResolvedStage =>
          HitPointRestorationFillNotOrderingError(HitPointRestorationResolvedStage)
    }
}
