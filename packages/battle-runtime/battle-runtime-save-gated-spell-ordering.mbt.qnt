// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeSaveGatedSpellOrderingMbt {
  import battleRuntimeSaveGatedSpellOrdering.* from "./battle-runtime-save-gated-spell-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: SaveGatedSpellFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str

  pure def openHoles: Set[BattleHoleFamilyKind] = qProtocol.holes

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    holes: Set[BattleHoleFamilyKind],
    result: WitnessResult,
  ): WitnessProtocol[BattleHoleFamilyKind] =
    witnessProtocolFromResult(holes, witnessHoleType, result)

  pure def orderingErrorLabel(error: SaveGatedSpellFillOrderingError): str =
    match error {
      | SaveGatedSpellTargetOrAreaRequired => "targetOrAreaRequired"
      | SaveGatedSpellSavingThrowRequired => "savingThrowRequired"
    }

  pure def acceptedStage(
    result: SaveGatedSpellFillOrderResult,
    fallback: SaveGatedSpellFrontierStage,
  ): SaveGatedSpellFrontierStage =
    match result {
      | SaveGatedSpellFillAccepted(stage) => stage
      | SaveGatedSpellFillRejected(_) => fallback
      | SaveGatedSpellFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: SaveGatedSpellFillOrderResult): WitnessResult =
    match result {
      | SaveGatedSpellFillAccepted(stage) =>
          if (stage == SaveGatedSpellResolvedStage) WResolved else WNeedsHoles
      | SaveGatedSpellFillRejected(_) => WNeedsHoles
      | SaveGatedSpellFillNotOrderingError(_) => WNeedsHoles
    }

  pure def rejectedOrderingLabel(result: SaveGatedSpellFillOrderResult): str =
    match result {
      | SaveGatedSpellFillAccepted(_) => ""
      | SaveGatedSpellFillRejected(error) => orderingErrorLabel(error)
      | SaveGatedSpellFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: SaveGatedSpellFrontierStage,
    result: WitnessResult,
    lastOrderingError: str,
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      saveGatedSpellHoleFrontier(stage),
      result,
    ),
    qLastOrderingError' = lastOrderingError,
  }

  action init = recordProjection(SaveGatedSpellActSelectionStage, WInit, "")

  action doDiscoverAreaSaveDamage = all {
    qStage == SaveGatedSpellActSelectionStage,
    recordProjection(SaveGatedSpellDamageSavingThrowOutcomeStage, WNeedsHoles, ""),
  }

  action doSubmitDamageBeforeSavingThrow = all {
    qStage == SaveGatedSpellDamageSavingThrowOutcomeStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, RolledDiceFillKind, true),
        qStage,
      ),
      WNeedsHoles,
      rejectedOrderingLabel(
        saveGatedSpellFillOrderResult(qStage, RolledDiceFillKind, true)
      ),
    ),
  }

  action doFillAreaSaveFailed = all {
    qStage == SaveGatedSpellDamageSavingThrowOutcomeStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, SavingThrowOutcomeFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, SavingThrowOutcomeFillKind, true)
      ),
      "",
    ),
  }

  action doFillAreaDamageDice = all {
    qStage == SaveGatedSpellDamageDiceStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, RolledDiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, RolledDiceFillKind, true)
      ),
      "",
    ),
  }

  action doDiscoverTargetListConditionChoice = all {
    qStage == SaveGatedSpellActSelectionStage,
    recordProjection(
      SaveGatedSpellTargetListAndConditionChoiceStage,
      WNeedsHoles,
      "",
    ),
  }

  action doFillTargetListBeforeConditionChoice = all {
    qStage == SaveGatedSpellTargetListAndConditionChoiceStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, SpellTargetListFillKind, false),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, SpellTargetListFillKind, false)
      ),
      "",
    ),
  }

  action doFillConditionChoiceAfterTargetList = all {
    qStage == SaveGatedSpellConditionChoiceStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, ConditionChoiceFillKind, false),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, ConditionChoiceFillKind, false)
      ),
      "",
    ),
  }

  action doFillConditionChoiceBeforeTargetList = all {
    qStage == SaveGatedSpellTargetListAndConditionChoiceStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, ConditionChoiceFillKind, false),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, ConditionChoiceFillKind, false)
      ),
      "",
    ),
  }

  action doFillTargetListAfterConditionChoice = all {
    qStage == SaveGatedSpellTargetListStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, SpellTargetListFillKind, false),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, SpellTargetListFillKind, false)
      ),
      "",
    ),
  }

  action doFillConditionSavingThrow = all {
    qStage == SaveGatedSpellConditionSavingThrowOutcomeStage,
    recordProjection(
      acceptedStage(
        saveGatedSpellFillOrderResult(qStage, SavingThrowOutcomeFillKind, false),
        qStage,
      ),
      acceptedRuntimeResult(
        saveGatedSpellFillOrderResult(qStage, SavingThrowOutcomeFillKind, false)
      ),
      "",
    ),
  }

  action step = any {
    doDiscoverAreaSaveDamage,
    doSubmitDamageBeforeSavingThrow,
    doFillAreaSaveFailed,
    doFillAreaDamageDice,
    doDiscoverTargetListConditionChoice,
    doFillTargetListBeforeConditionChoice,
    doFillConditionChoiceAfterTargetList,
    doFillConditionChoiceBeforeTargetList,
    doFillTargetListAfterConditionChoice,
    doFillConditionSavingThrow,
  }
}
