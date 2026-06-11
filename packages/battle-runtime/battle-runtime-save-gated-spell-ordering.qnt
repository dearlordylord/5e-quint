// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

// Save-gated spell hole-frontier ordering over the protocol vocabulary.
//
// RAW anchor: SRD 5.2.1 Playing the Game "Saving Throws" says a save's
// result is determined by the effect that caused it. "Damage Rolls" says
// damaging saving-throw effects roll damage once for simultaneous targets and
// many saving-throw effects deal half damage on a successful save. Rules
// Glossary "Area of Effect" and "Target" define the selected area or target
// population that precedes the affected creatures' save outcomes.
module battleRuntimeSaveGatedSpellOrdering {
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  type SaveGatedSpellFrontierStage =
    | SaveGatedSpellActSelectionStage
    | SaveGatedSpellTargetListAndConditionChoiceStage
    | SaveGatedSpellTargetListStage
    | SaveGatedSpellConditionChoiceStage
    | SaveGatedSpellDamageSavingThrowOutcomeStage
    | SaveGatedSpellConditionSavingThrowOutcomeStage
    | SaveGatedSpellDamageDiceStage
    | SaveGatedSpellResolvedStage

  type SaveGatedSpellFillOrderingError =
    | SaveGatedSpellTargetOrAreaRequired
    | SaveGatedSpellSavingThrowRequired

  type SaveGatedSpellFillOrderResult =
    | SaveGatedSpellFillAccepted(SaveGatedSpellFrontierStage)
    | SaveGatedSpellFillRejected(SaveGatedSpellFillOrderingError)
    | SaveGatedSpellFillNotOrderingError(SaveGatedSpellFrontierStage)

  pure def saveGatedSpellHoleFrontier(
    stage: SaveGatedSpellFrontierStage
  ): Set[BattleHoleFamilyKind] =
    match stage {
      | SaveGatedSpellActSelectionStage => Set()
      | SaveGatedSpellTargetListAndConditionChoiceStage =>
          Set(SpellTargetListHoleKind, ConditionChoiceHoleKind)
      | SaveGatedSpellTargetListStage => Set(SpellTargetListHoleKind)
      | SaveGatedSpellConditionChoiceStage => Set(ConditionChoiceHoleKind)
      | SaveGatedSpellDamageSavingThrowOutcomeStage => Set(SavingThrowOutcomeHoleKind)
      | SaveGatedSpellConditionSavingThrowOutcomeStage => Set(SavingThrowOutcomeHoleKind)
      | SaveGatedSpellDamageDiceStage => Set(RolledDiceHoleKind)
      | SaveGatedSpellResolvedStage => Set()
    }

  pure def saveGatedSpellAfterSavingThrowStage(
    damageDiceRequired: bool
  ): SaveGatedSpellFrontierStage =
    if (damageDiceRequired) SaveGatedSpellDamageDiceStage else SaveGatedSpellResolvedStage

  pure def saveGatedSpellFillOrderResult(
    stage: SaveGatedSpellFrontierStage,
    fillKind: BattleFillKind,
    damageDiceRequired: bool,
  ): SaveGatedSpellFillOrderResult =
    match stage {
      | SaveGatedSpellActSelectionStage =>
          SaveGatedSpellFillNotOrderingError(SaveGatedSpellActSelectionStage)
      | SaveGatedSpellTargetListAndConditionChoiceStage =>
          if (fillKind == SpellTargetListFillKind)
            SaveGatedSpellFillAccepted(SaveGatedSpellConditionChoiceStage)
          else if (fillKind == ConditionChoiceFillKind)
            SaveGatedSpellFillAccepted(SaveGatedSpellTargetListStage)
          else if (fillKind == SavingThrowOutcomeFillKind or fillKind == RolledDiceFillKind)
            SaveGatedSpellFillRejected(SaveGatedSpellTargetOrAreaRequired)
          else
            SaveGatedSpellFillNotOrderingError(SaveGatedSpellTargetListAndConditionChoiceStage)
      | SaveGatedSpellTargetListStage =>
          if (fillKind == SpellTargetListFillKind)
            SaveGatedSpellFillAccepted(SaveGatedSpellConditionSavingThrowOutcomeStage)
          else if (fillKind == SavingThrowOutcomeFillKind or fillKind == RolledDiceFillKind)
            SaveGatedSpellFillRejected(SaveGatedSpellTargetOrAreaRequired)
          else
            SaveGatedSpellFillNotOrderingError(SaveGatedSpellTargetListStage)
      | SaveGatedSpellConditionChoiceStage =>
          if (fillKind == ConditionChoiceFillKind)
            SaveGatedSpellFillAccepted(SaveGatedSpellConditionSavingThrowOutcomeStage)
          else if (fillKind == SavingThrowOutcomeFillKind or fillKind == RolledDiceFillKind)
            SaveGatedSpellFillRejected(SaveGatedSpellTargetOrAreaRequired)
          else
            SaveGatedSpellFillNotOrderingError(SaveGatedSpellConditionChoiceStage)
      | SaveGatedSpellDamageSavingThrowOutcomeStage =>
          if (fillKind == SavingThrowOutcomeFillKind)
            SaveGatedSpellFillAccepted(
              saveGatedSpellAfterSavingThrowStage(damageDiceRequired)
            )
          else if (fillKind == RolledDiceFillKind)
            SaveGatedSpellFillRejected(SaveGatedSpellSavingThrowRequired)
          else
            SaveGatedSpellFillNotOrderingError(SaveGatedSpellDamageSavingThrowOutcomeStage)
      | SaveGatedSpellConditionSavingThrowOutcomeStage =>
          if (fillKind == SavingThrowOutcomeFillKind)
            SaveGatedSpellFillAccepted(SaveGatedSpellResolvedStage)
          else if (fillKind == RolledDiceFillKind)
            SaveGatedSpellFillRejected(SaveGatedSpellSavingThrowRequired)
          else
            SaveGatedSpellFillNotOrderingError(SaveGatedSpellConditionSavingThrowOutcomeStage)
      | SaveGatedSpellDamageDiceStage =>
          if (fillKind == RolledDiceFillKind)
            SaveGatedSpellFillAccepted(SaveGatedSpellResolvedStage)
          else
            SaveGatedSpellFillNotOrderingError(SaveGatedSpellDamageDiceStage)
      | SaveGatedSpellResolvedStage =>
          SaveGatedSpellFillNotOrderingError(SaveGatedSpellResolvedStage)
    }
}
