// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

module battleRuntimeSpellAttackOrderingMbt {
  import battleRuntimeSpellAttackOrdering.* from "./battle-runtime-spell-attack-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: SpellAttackFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str

  pure def openHoles: Set[BattleHoleFamilyKind] = qProtocol.holes

  pure val witnessHoleType: BattleHoleFamilyKind = TargetChoiceHoleKind

  pure def witnessProtocolForProjection(
    holes: Set[BattleHoleFamilyKind],
    result: WitnessResult,
  ): WitnessProtocol[BattleHoleFamilyKind] =
    witnessProtocolFromResult(holes, witnessHoleType, result)

  pure def orderingErrorLabel(error: SpellAttackFillOrderingError): str =
    match error {
      | SpellAttackTargetRequired => "targetRequired"
      | SpellAttackDamageTypeRequired => "damageTypeRequired"
      | SpellAttackTargetOrDamageTypeRequired => "targetOrDamageTypeRequired"
      | SpellAttackAttackRollRequired => "attackRollRequired"
    }

  pure def acceptedStage(
    result: SpellAttackFillOrderResult,
    fallback: SpellAttackFrontierStage,
  ): SpellAttackFrontierStage =
    match result {
      | SpellAttackFillAccepted(stage) => stage
      | SpellAttackFillRequestedEarlier(request) => request.stage
      | SpellAttackFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: SpellAttackFillOrderResult): WitnessResult =
    match result {
      | SpellAttackFillAccepted(stage) =>
          if (stage == SpellAttackResolvedStage) WResolved else WNeedsHoles
      | SpellAttackFillRequestedEarlier(_) => WNeedsHoles
      | SpellAttackFillNotOrderingError(_) => WNeedsHoles
    }

  pure def requestedEarlierLabel(result: SpellAttackFillOrderResult): str =
    match result {
      | SpellAttackFillAccepted(_) => ""
      | SpellAttackFillRequestedEarlier(request) => orderingErrorLabel(request.error)
      | SpellAttackFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: SpellAttackFrontierStage,
    result: WitnessResult,
    lastOrderingError: str,
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      spellAttackHoleFrontier(stage),
      result,
    ),
    qLastOrderingError' = lastOrderingError,
  }

  action init = recordProjection(SpellAttackActSelectionStage, WInit, "")

  action doDiscoverSingleTargetSpellAttack = all {
    qStage == SpellAttackActSelectionStage,
    recordProjection(SpellAttackTargetChoiceStage, WNeedsHoles, ""),
  }

  action doSubmitAttackRollBeforeTargetChoice = all {
    qStage == SpellAttackTargetChoiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, true)
      ),
      requestedEarlierLabel(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, true)
      ),
    ),
  }

  action doFillTargetChoice = all {
    qStage == SpellAttackTargetChoiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true)
      ),
      "",
    ),
  }

  action doSubmitDamageBeforeAttackRoll = all {
    qStage == SpellAttackAttackRollStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, RolledDiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, RolledDiceFillKind, true)
      ),
      requestedEarlierLabel(
        spellAttackFillOrderResult(qStage, RolledDiceFillKind, true)
      ),
    ),
  }

  action doFillAttackRollMiss = all {
    qStage == SpellAttackAttackRollStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, false),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, false)
      ),
      "",
    ),
  }

  action doFillAttackRollHit = all {
    qStage == SpellAttackAttackRollStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, AttackRollFillKind, true)
      ),
      "",
    ),
  }

  action doFillDamageDice = all {
    qStage == SpellAttackDamageDiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, RolledDiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, RolledDiceFillKind, true)
      ),
      "",
    ),
  }

  action doDiscoverTypedSpellAttack = all {
    qStage == SpellAttackActSelectionStage,
    recordProjection(
      SpellAttackDamageTypeAndTargetChoiceStage,
      WNeedsHoles,
      "",
    ),
  }

  action doFillDamageTypeBeforeTargetChoice = all {
    qStage == SpellAttackDamageTypeAndTargetChoiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, DamageTypeChoiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, DamageTypeChoiceFillKind, true)
      ),
      "",
    ),
  }

  action doFillTargetChoiceBeforeDamageType = all {
    qStage == SpellAttackDamageTypeAndTargetChoiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true)
      ),
      "",
    ),
  }

  action doFillDamageTypeAfterTargetChoice = all {
    qStage == SpellAttackDamageTypeChoiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, DamageTypeChoiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, DamageTypeChoiceFillKind, true)
      ),
      "",
    ),
  }

  action doFillTargetChoiceAfterDamageType = all {
    qStage == SpellAttackTypedTargetChoiceStage,
    recordProjection(
      acceptedStage(
        spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true),
        qStage,
      ),
      acceptedRuntimeResult(
        spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true)
      ),
      "",
    ),
  }

  action step = any {
    doDiscoverSingleTargetSpellAttack,
    doSubmitAttackRollBeforeTargetChoice,
    doFillTargetChoice,
    doSubmitDamageBeforeAttackRoll,
    doFillAttackRollMiss,
    doFillAttackRollHit,
    doFillDamageDice,
    doDiscoverTypedSpellAttack,
    doFillDamageTypeBeforeTargetChoice,
    doFillTargetChoiceBeforeDamageType,
    doFillDamageTypeAfterTargetChoice,
    doFillTargetChoiceAfterDamageType,
  }
}
