// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS

module battleRuntimeAfterHitDamageRidersMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type AfterHitScenario =
    | DivineSmiteSlot
    | DivineSmiteFreeCast
    | EnsnaringStrikeFailedSave
    | EnsnaringStrikeSuccessfulSave
    | SearingSmiteHit
    | ShiningSmiteHit
    | Done

  type AfterHitPhase =
    | Fresh
    | TargetChoiceNeeded
    | AttackRollNeeded
    | AfterHitChoiceNeeded
    | EnsnaringSaveNeeded
    | AttackDamageNeeded
    | AfterDamage
    | TurnStartDamageNeeded
    | TurnStartDamageSaveNeeded
    | EscapeCheckNeeded
    | Cleaned

  type AfterHitHole =
    | TargetChoice
    | AttackRoll
    | InterruptDecision
    | SaveOutcome
    | AttackDamageRoll
    | TurnStartDamageRoll
    | TurnStartSaveOutcome
    | EscapeAbilityCheck

  type AfterHitDamageRidersWitnessState = {
    qScenario: AfterHitScenario,
    qPhase: AfterHitPhase,
    qTargetHp: int,
    qBonusActionAvailable: bool,
    qSlotExpended: bool,
    qFreeCastUsesRemaining: int,
    qLevelOnePlusCastCommitted: bool,
    qConcentrationActive: bool,
    qTargetRestrained: bool,
    qSearingBurning: bool,
    qShiningIlluminated: bool,
    protocol: WitnessProtocol[AfterHitHole],
  }

  var qState: AfterHitDamageRidersWitnessState

  pure val targetInitialHp: int = 30
  pure val noHoles: Set[AfterHitHole] = Set()

  pure def damageAfter(hp: int, damage: int): int =
    if (hp - damage < 0) 0 else hp - damage

  pure def hitDamage(weaponDiePip: int, riderDice: int, riderDiePip: int): int =
    weaponDiePip + (riderDice * riderDiePip)

  pure def protocolFor(
    holes: Set[AfterHitHole],
    result: WitnessResult,
  ): WitnessProtocol[AfterHitHole] = {
    holes: holes,
    result: result,
  }

  action recordProjection(
    scenario: AfterHitScenario,
    phase: AfterHitPhase,
    targetHp: int,
    bonusActionAvailable: bool,
    slotExpended: bool,
    freeCastUsesRemaining: int,
    levelOnePlusCastCommitted: bool,
    concentrationActive: bool,
    targetRestrained: bool,
    searingBurning: bool,
    shiningIlluminated: bool,
    holes: Set[AfterHitHole],
    result: WitnessResult,
  ): bool = all {
    qState' = {
      qScenario: scenario,
      qPhase: phase,
      qTargetHp: targetHp,
      qBonusActionAvailable: bonusActionAvailable,
      qSlotExpended: slotExpended,
      qFreeCastUsesRemaining: freeCastUsesRemaining,
      qLevelOnePlusCastCommitted: levelOnePlusCastCommitted,
      qConcentrationActive: concentrationActive,
      qTargetRestrained: targetRestrained,
      qSearingBurning: searingBurning,
      qShiningIlluminated: shiningIlluminated,
      protocol: protocolFor(holes, result),
    },
  }

  action recordFreshScenario(
    scenario: AfterHitScenario,
    freeCastUsesRemaining: int,
  ): bool =
    recordProjection(
      scenario,
      Fresh,
      targetInitialHp,
      true,
      false,
      freeCastUsesRemaining,
      false,
      false,
      false,
      false,
      false,
      noHoles,
      WResolved,
    )

  action init = recordProjection(
    DivineSmiteSlot,
    Fresh,
    targetInitialHp,
    true,
    false,
    0,
    false,
    false,
    false,
    false,
    false,
    noHoles,
    WInit,
  )

  action doDiscoverWeaponHit = all {
    qState.qPhase == Fresh,
    qState.protocol.holes == noHoles,
    qState.qBonusActionAvailable,
    recordProjection(
      qState.qScenario,
      TargetChoiceNeeded,
      qState.qTargetHp,
      true,
      false,
      qState.qFreeCastUsesRemaining,
      false,
      false,
      false,
      false,
      false,
      Set(TargetChoice),
      WNeedsHoles,
    ),
  }

  action doFillTargetChoice = all {
    qState.qPhase == TargetChoiceNeeded,
    qState.protocol.holes == Set(TargetChoice),
    recordProjection(
      qState.qScenario,
      AttackRollNeeded,
      qState.qTargetHp,
      true,
      false,
      qState.qFreeCastUsesRemaining,
      false,
      false,
      false,
      false,
      false,
      Set(AttackRoll),
      WNeedsHoles,
    ),
  }

  action doFillHitAttackRoll = all {
    qState.qPhase == AttackRollNeeded,
    qState.protocol.holes == Set(AttackRoll),
    recordProjection(
      qState.qScenario,
      AfterHitChoiceNeeded,
      qState.qTargetHp,
      true,
      false,
      qState.qFreeCastUsesRemaining,
      false,
      false,
      false,
      false,
      false,
      Set(InterruptDecision),
      WNeedsHoles,
    ),
  }

  action doChooseDivineSmiteSlot = all {
    qState.qScenario == DivineSmiteSlot,
    qState.qPhase == AfterHitChoiceNeeded,
    qState.protocol.holes == Set(InterruptDecision),
    recordProjection(
      DivineSmiteSlot,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      false,
      false,
      false,
      false,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doChooseDivineSmiteFreeCast = all {
    qState.qScenario == DivineSmiteFreeCast,
    qState.qPhase == AfterHitChoiceNeeded,
    qState.protocol.holes == Set(InterruptDecision),
    recordProjection(
      DivineSmiteFreeCast,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      false,
      0,
      true,
      false,
      false,
      false,
      false,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doChooseEnsnaringStrike = all {
    (
      qState.qScenario == EnsnaringStrikeFailedSave or
      qState.qScenario == EnsnaringStrikeSuccessfulSave
    ),
    qState.qPhase == AfterHitChoiceNeeded,
    qState.protocol.holes == Set(InterruptDecision),
    recordProjection(
      qState.qScenario,
      EnsnaringSaveNeeded,
      qState.qTargetHp,
      true,
      false,
      0,
      false,
      false,
      false,
      false,
      false,
      Set(SaveOutcome),
      WNeedsHoles,
    ),
  }

  action doFillEnsnaringFailedSave = all {
    qState.qScenario == EnsnaringStrikeFailedSave,
    qState.qPhase == EnsnaringSaveNeeded,
    qState.protocol.holes == Set(SaveOutcome),
    recordProjection(
      EnsnaringStrikeFailedSave,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      true,
      true,
      false,
      false,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillEnsnaringSuccessfulSave = all {
    qState.qScenario == EnsnaringStrikeSuccessfulSave,
    qState.qPhase == EnsnaringSaveNeeded,
    qState.protocol.holes == Set(SaveOutcome),
    recordProjection(
      EnsnaringStrikeSuccessfulSave,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      false,
      false,
      false,
      false,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doChooseSearingSmite = all {
    qState.qScenario == SearingSmiteHit,
    qState.qPhase == AfterHitChoiceNeeded,
    qState.protocol.holes == Set(InterruptDecision),
    recordProjection(
      SearingSmiteHit,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      false,
      false,
      true,
      false,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doChooseShiningSmite = all {
    qState.qScenario == ShiningSmiteHit,
    qState.qPhase == AfterHitChoiceNeeded,
    qState.protocol.holes == Set(InterruptDecision),
    recordProjection(
      ShiningSmiteHit,
      AttackDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      true,
      false,
      false,
      true,
      Set(AttackDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillDivineSmiteDamage = {
    nondet weaponDiePip = Set(1, 4).oneOf()
    nondet smiteDiePip = Set(1, 4).oneOf()
    all {
      (
        qState.qScenario == DivineSmiteSlot or
        qState.qScenario == DivineSmiteFreeCast
      ),
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        qState.qScenario,
        AfterDamage,
        damageAfter(qState.qTargetHp, hitDamage(weaponDiePip, 2, smiteDiePip)),
        false,
        qState.qSlotExpended,
        qState.qFreeCastUsesRemaining,
        true,
        false,
        false,
        false,
        false,
        noHoles,
        WResolved,
      ),
    }
  }

  action doFillEnsnaringWeaponDamage = {
    nondet weaponDiePip = Set(1, 4).oneOf()
    all {
      (
        qState.qScenario == EnsnaringStrikeFailedSave or
        qState.qScenario == EnsnaringStrikeSuccessfulSave
      ),
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        qState.qScenario,
        AfterDamage,
        damageAfter(qState.qTargetHp, weaponDiePip),
        false,
        true,
        0,
        true,
        qState.qConcentrationActive,
        qState.qTargetRestrained,
        false,
        false,
        noHoles,
        WResolved,
      ),
    }
  }

  action doFillSearingSmiteDamage = {
    nondet weaponDiePip = Set(1, 4).oneOf()
    nondet smiteDiePip = Set(1, 4).oneOf()
    all {
      qState.qScenario == SearingSmiteHit,
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        SearingSmiteHit,
        AfterDamage,
        damageAfter(qState.qTargetHp, hitDamage(weaponDiePip, 3, smiteDiePip)),
        false,
        true,
        0,
        true,
        false,
        false,
        true,
        false,
        noHoles,
        WResolved,
      ),
    }
  }

  action doFillShiningSmiteDamage = {
    nondet weaponDiePip = Set(1, 4).oneOf()
    nondet smiteDiePip = Set(1, 4).oneOf()
    all {
      qState.qScenario == ShiningSmiteHit,
      qState.qPhase == AttackDamageNeeded,
      qState.protocol.holes == Set(AttackDamageRoll),
      recordProjection(
        ShiningSmiteHit,
        AfterDamage,
        damageAfter(qState.qTargetHp, hitDamage(weaponDiePip, 3, smiteDiePip)),
        false,
        true,
        0,
        true,
        true,
        false,
        false,
        true,
        noHoles,
        WResolved,
      ),
    }
  }

  action doDiscoverEnsnaringStartTurnDamage = all {
    qState.qScenario == EnsnaringStrikeFailedSave,
    qState.qPhase == AfterDamage,
    qState.qConcentrationActive,
    qState.qTargetRestrained,
    recordProjection(
      EnsnaringStrikeFailedSave,
      TurnStartDamageNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      true,
      true,
      false,
      false,
      Set(TurnStartDamageRoll),
      WNeedsHoles,
    ),
  }

  action doFillEnsnaringStartTurnDamage = {
    nondet damageDiePip = Set(1, 4).oneOf()
    all {
      qState.qScenario == EnsnaringStrikeFailedSave,
      qState.qPhase == TurnStartDamageNeeded,
      qState.protocol.holes == Set(TurnStartDamageRoll),
      recordProjection(
        EnsnaringStrikeFailedSave,
        EscapeCheckNeeded,
        damageAfter(qState.qTargetHp, damageDiePip),
        true,
        true,
        0,
        false,
        true,
        true,
        false,
        false,
        Set(EscapeAbilityCheck),
        WNeedsHoles,
      ),
    }
  }

  action doFillEnsnaringEscapeCheck = all {
    qState.qScenario == EnsnaringStrikeFailedSave,
    qState.qPhase == EscapeCheckNeeded,
    qState.protocol.holes == Set(EscapeAbilityCheck),
    recordProjection(
      EnsnaringStrikeFailedSave,
      Cleaned,
      qState.qTargetHp,
      true,
      true,
      0,
      false,
      false,
      false,
      false,
      false,
      noHoles,
      WResolved,
    ),
  }

  action doDiscoverSearingStartTurnDamageAndSave = all {
    qState.qScenario == SearingSmiteHit,
    qState.qPhase == AfterDamage,
    qState.qSearingBurning,
    recordProjection(
      SearingSmiteHit,
      TurnStartDamageSaveNeeded,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      false,
      false,
      true,
      false,
      Set(TurnStartDamageRoll, TurnStartSaveOutcome),
      WNeedsHoles,
    ),
  }

  action doFillSearingStartTurnDamageAndSave = {
    nondet damageDiePip = Set(1, 4).oneOf()
    all {
      qState.qScenario == SearingSmiteHit,
      qState.qPhase == TurnStartDamageSaveNeeded,
      qState.protocol.holes == Set(TurnStartDamageRoll, TurnStartSaveOutcome),
      recordProjection(
        SearingSmiteHit,
        Cleaned,
        damageAfter(qState.qTargetHp, 3 * damageDiePip),
        true,
        true,
        0,
        false,
        false,
        false,
        false,
        false,
        noHoles,
        WResolved,
      ),
    }
  }

  action doBreakShiningConcentration = all {
    qState.qScenario == ShiningSmiteHit,
    qState.qPhase == AfterDamage,
    qState.qConcentrationActive,
    qState.qShiningIlluminated,
    recordProjection(
      ShiningSmiteHit,
      Cleaned,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      false,
      false,
      false,
      false,
      noHoles,
      WResolved,
    ),
  }

  action doStartDivineSmiteFreeCast = all {
    qState.qScenario == DivineSmiteSlot,
    qState.qPhase == AfterDamage,
    recordFreshScenario(DivineSmiteFreeCast, 1),
  }

  action doStartEnsnaringFailedSave = all {
    qState.qScenario == DivineSmiteFreeCast,
    qState.qPhase == AfterDamage,
    recordFreshScenario(EnsnaringStrikeFailedSave, 0),
  }

  action doStartEnsnaringSuccessfulSave = all {
    qState.qScenario == EnsnaringStrikeFailedSave,
    qState.qPhase == Cleaned,
    recordFreshScenario(EnsnaringStrikeSuccessfulSave, 0),
  }

  action doStartSearingSmite = all {
    qState.qScenario == EnsnaringStrikeSuccessfulSave,
    qState.qPhase == AfterDamage,
    recordFreshScenario(SearingSmiteHit, 0),
  }

  action doStartShiningSmite = all {
    qState.qScenario == SearingSmiteHit,
    qState.qPhase == Cleaned,
    recordFreshScenario(ShiningSmiteHit, 0),
  }

  action doFinish = all {
    qState.qScenario == ShiningSmiteHit,
    qState.qPhase == Cleaned,
    recordProjection(
      Done,
      Cleaned,
      qState.qTargetHp,
      false,
      true,
      0,
      true,
      false,
      false,
      false,
      false,
      noHoles,
      WResolved,
    ),
  }

  action step = any {
    doDiscoverWeaponHit,
    doFillTargetChoice,
    doFillHitAttackRoll,
    doChooseDivineSmiteSlot,
    doChooseDivineSmiteFreeCast,
    doChooseEnsnaringStrike,
    doFillEnsnaringFailedSave,
    doFillEnsnaringSuccessfulSave,
    doChooseSearingSmite,
    doChooseShiningSmite,
    doFillDivineSmiteDamage,
    doFillEnsnaringWeaponDamage,
    doFillSearingSmiteDamage,
    doFillShiningSmiteDamage,
    doDiscoverEnsnaringStartTurnDamage,
    doFillEnsnaringStartTurnDamage,
    doFillEnsnaringEscapeCheck,
    doDiscoverSearingStartTurnDamageAndSave,
    doFillSearingStartTurnDamageAndSave,
    doBreakShiningConcentration,
    doStartDivineSmiteFreeCast,
    doStartEnsnaringFailedSave,
    doStartEnsnaringSuccessfulSave,
    doStartSearingSmite,
    doStartShiningSmite,
    doFinish,
  }
}
