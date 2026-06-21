// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Making an Attack includes
//   attacks made as part of a spell in the same target/modifier/resolve order.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Attack Rolls defines
//   spell attack modifiers.
// - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Attack Roll, and Damage Type.
module battleRuntimeSpellAttackOrderingRouteMbt {
  import battleRuntimeSpellAttackOrdering.* from "./battle-runtime-spell-attack-ordering"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  var qStage: SpellAttackFrontierStage
  var qProtocol: WitnessProtocol[BattleHoleFamilyKind]
  var qLastOrderingError: str
  var qRoute: List[ReducerRouteEvent]

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

  pure def orderingErrorLabel(error: SpellAttackFillOrderingError): str =
    match error {
      | SpellAttackTargetRequired => "targetRequired"
      | SpellAttackDamageTypeRequired => "damageTypeRequired"
      | SpellAttackTargetOrDamageTypeRequired => "targetOrDamageTypeRequired"
      | SpellAttackAttackRollRequired => "attackRollRequired"
    }

  pure def acceptedStage(
    result: SpellAttackFillOrderResult,
  ): SpellAttackFrontierStage =
    match result {
      | SpellAttackFillAccepted(stage) => stage
      | SpellAttackFillRequestedEarlier(request) => request.stage
      | SpellAttackFillNotOrderingError(stage) => stage
    }

  pure def acceptedRuntimeResult(result: SpellAttackFillOrderResult): str =
    match result {
      | SpellAttackFillAccepted(stage) =>
          if (stage == SpellAttackResolvedStage) "resolved" else "needsHoles"
      | SpellAttackFillRequestedEarlier(_) => "needsHoles"
      | SpellAttackFillNotOrderingError(_) => "needsHoles"
    }

  pure def requestedEarlierLabel(result: SpellAttackFillOrderResult): str =
    match result {
      | SpellAttackFillAccepted(_) => ""
      | SpellAttackFillRequestedEarlier(request) => orderingErrorLabel(request.error)
      | SpellAttackFillNotOrderingError(_) => ""
    }

  action recordProjection(
    stage: SpellAttackFrontierStage,
    lastResult: str,
    lastOrderingError: str,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qStage' = stage,
    qProtocol' = witnessProtocolForProjection(
      spellAttackHoleFrontier(stage),
      lastResult,
    ),
    qLastOrderingError' = lastOrderingError,
    qRoute' = route,
  }

  action init = recordProjection(
    SpellAttackActSelectionStage,
    "init",
    "",
    List(routeStartBattle(BattleActionEconomyOwner)),
  )

  action doDiscoverSingleTargetSpellAttack = all {
    qStage == SpellAttackActSelectionStage,
    recordProjection(
      SpellAttackTargetChoiceStage,
      "needsHoles",
      "",
      qRoute.append(
        routeDiscoverBattleActs(
          SpellAttackRouteSubject,
          Set(TargetChoiceHoleKind),
          BattleActionEconomyOwner,
        )
      ),
    ),
  }

  action doSubmitAttackRollBeforeTargetChoice = all {
    qStage == SpellAttackTargetChoiceStage,
    val result = spellAttackFillOrderResult(qStage, AttackRollFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      requestedEarlierLabel(result),
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          AttackRollFillKind,
          spellAttackHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillTargetChoice = all {
    qStage == SpellAttackTargetChoiceStage,
    val result = spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          TargetChoiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doSubmitDamageBeforeAttackRoll = all {
    qStage == SpellAttackAttackRollStage,
    val result = spellAttackFillOrderResult(qStage, RolledDiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      requestedEarlierLabel(result),
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          RolledDiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillAttackRollMiss = all {
    qStage == SpellAttackAttackRollStage,
    val result = spellAttackFillOrderResult(qStage, AttackRollFillKind, false)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          AttackRollFillKind,
          spellAttackHoleFrontier(stage),
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doFillAttackRollHit = all {
    qStage == SpellAttackAttackRollStage,
    val result = spellAttackFillOrderResult(qStage, AttackRollFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          AttackRollFillKind,
          spellAttackHoleFrontier(stage),
          BattleAttackRollOwner,
        )
      ),
    ),
  }

  action doFillDamageDice = all {
    qStage == SpellAttackDamageDiceStage,
    val result = spellAttackFillOrderResult(qStage, RolledDiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          RolledDiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleHitPointOwner,
        )
      ),
    ),
  }

  action doDiscoverTypedSpellAttack = all {
    qStage == SpellAttackActSelectionStage,
    recordProjection(
      SpellAttackDamageTypeAndTargetChoiceStage,
      "needsHoles",
      "",
      qRoute.append(
        routeDiscoverBattleActs(
          SpellAttackRouteSubject,
          Set(DamageTypeChoiceHoleKind, TargetChoiceHoleKind),
          BattleActionEconomyOwner,
        )
      ),
    ),
  }

  action doFillDamageTypeBeforeTargetChoice = all {
    qStage == SpellAttackDamageTypeAndTargetChoiceStage,
    val result = spellAttackFillOrderResult(qStage, DamageTypeChoiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          DamageTypeChoiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillTargetChoiceBeforeDamageType = all {
    qStage == SpellAttackDamageTypeAndTargetChoiceStage,
    val result = spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          TargetChoiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleTargetSelectionOwner,
        )
      ),
    ),
  }

  action doFillDamageTypeAfterTargetChoice = all {
    qStage == SpellAttackDamageTypeChoiceStage,
    val result = spellAttackFillOrderResult(qStage, DamageTypeChoiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          DamageTypeChoiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleHoleFrontierOwner,
        )
      ),
    ),
  }

  action doFillTargetChoiceAfterDamageType = all {
    qStage == SpellAttackTypedTargetChoiceStage,
    val result = spellAttackFillOrderResult(qStage, TargetChoiceFillKind, true)
    val stage = acceptedStage(result)
    recordProjection(
      stage,
      acceptedRuntimeResult(result),
      "",
      qRoute.append(
        routeResolveBattleSubject(
          SpellAttackRouteSubject,
          TargetChoiceFillKind,
          spellAttackHoleFrontier(stage),
          BattleTargetSelectionOwner,
        )
      ),
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
