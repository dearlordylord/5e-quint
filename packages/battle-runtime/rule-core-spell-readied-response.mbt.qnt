// -*- mode: Bluespec; -*-

module ruleCoreSpellReadiedResponseMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for the QCORE10 Readied Spell Response
  // procedure family and same-turn second slot-spell rejection.
  //
  // RAW:
  // - .references/srd-5.2.1/Rules-Glossary.md#Ready [Action].
  // - UBIQUITOUS_LANGUAGE.md: Readied Spell Response.
  // - packages/shared-algebras/proofs/rule-core/README.md#qcore10.

  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qCasterReactionAvailable: bool
  var qCasterHp: int
  var qTargetHp: int
  var qSecondTargetHp: int
  var qTargetUnconscious: bool
  var qTargetDeathSuccesses: int
  var qTargetDeathFailures: int
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qActiveEffectKind: str
  var qReadiedHeld: bool
  var qReadiedReleased: bool
  var qConcentrationActive: bool
  var qProtocol: WitnessProtocol[str]
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def openHoles: Set[str] = qProtocol.holes

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreSpellProcedureProfileOwner)

  pure def witnessProtocolForProjection(
    holes: Set[str],
    result: WitnessResult,
  ): WitnessProtocol[str] =
    witnessProtocolFromResult(holes, "TargetChoice", result)

  pure def initialCasterHp: int = 12
  pure def initialTargetHp: int = 13
  pure def noEffect: str = "none"

  action recordProjection(
    actionAvailable: bool,
    bonusActionAvailable: bool,
    casterReactionAvailable: bool,
    casterHp: int,
    targetHp: int,
    secondTargetHp: int,
    targetUnconscious: bool,
    targetDeathSuccesses: int,
    targetDeathFailures: int,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    activeEffectKind: str,
    readiedHeld: bool,
    readiedReleased: bool,
    concentrationActive: bool,
    holes: Set[str],
    result: WitnessResult,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qCasterReactionAvailable' = casterReactionAvailable,
    qCasterHp' = casterHp,
    qTargetHp' = targetHp,
    qSecondTargetHp' = secondTargetHp,
    qTargetUnconscious' = targetUnconscious,
    qTargetDeathSuccesses' = targetDeathSuccesses,
    qTargetDeathFailures' = targetDeathFailures,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qActiveEffectKind' = activeEffectKind,
    qReadiedHeld' = readiedHeld,
    qReadiedReleased' = readiedReleased,
    qConcentrationActive' = concentrationActive,
    qProtocol' = witnessProtocolForProjection(holes, result),
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, 2, noEffect, false, false, false, Set(), WInit
  )

  action doRejectSecondSlotSpell = recordProjection(
    false, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), WInvalid(WStaleSubject)
  )

  action doReadySpellHold = recordProjection(
    false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
    false, 0, 0, true, 1, noEffect, true, false, true, Set(), WResolved
  )

  action doReleaseReadiedSpell = recordProjection(
    false, true, false, initialCasterHp - 1, 4, initialTargetHp, false,
    0, 0, false, 1, noEffect, false, true, false, Set(), WResolved
  )

  action step = any {
    doRejectSecondSlotSpell,
    doReadySpellHold,
    doReleaseReadiedSpell,
  }
}
