// -*- mode: Bluespec; -*-

module ruleCoreSpellRestorationMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for QCORE10 direct Hit Point restoration
  // procedure families.
  //
  // RAW:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md: Cure Wounds.
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md: Healing Word.
  // - .references/srd-5.2.1/Spells/Descriptions-M-P.md: Mass Cure Wounds and
  //   Mass Healing Word.
  // - .references/srd-5.2.1/Playing-the-Game.md: Hit Point recovery.
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

  action doHealingWordNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, 2, noEffect, false, false, false,
    Set("TargetChoice"), WNeedsHoles
  )

  action doHealingWordNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, 2, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doHealingWordWounded = recordProjection(
    true, false, true, initialCasterHp, 12, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), WResolved
  )

  action doHealingWordZeroHp = recordProjection(
    true, false, true, initialCasterHp, 5, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), WResolved
  )

  action doCureWoundsNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, 2, noEffect, false, false, false,
    Set("TargetChoice"), WNeedsHoles
  )

  action doCureWoundsNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, 2, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doCureWoundsWounded = recordProjection(
    false, true, true, initialCasterHp, 12, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), WResolved
  )

  action doMassHealingWordNeedsTargetList = recordProjection(
    true, true, true, initialCasterHp, 4, 4, false,
    0, 0, false, 0, noEffect, false, false, false,
    Set("SpellTargetList"), WNeedsHoles
  )

  action doMassHealingWordNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, 4, false,
    0, 0, false, 0, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doMassHealingWordWounded = recordProjection(
    true, false, true, initialCasterHp, 12, 12, false,
    0, 0, true, 0, noEffect, false, false, false, Set(), WResolved
  )

  action doMassCureWoundsNeedsTargetList = recordProjection(
    true, true, true, initialCasterHp, 4, 4, false,
    0, 0, false, 0, noEffect, false, false, false,
    Set("SpellTargetList"), WNeedsHoles
  )

  action doMassCureWoundsNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, 4, false,
    0, 0, false, 0, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doMassCureWoundsWounded = recordProjection(
    false, true, true, initialCasterHp, 12, 12, false,
    0, 0, true, 0, noEffect, false, false, false, Set(), WResolved
  )

  action step = any {
    doHealingWordWounded,
    doHealingWordZeroHp,
    doHealingWordNeedsTarget,
    doHealingWordNeedsHealingRoll,
    doCureWoundsWounded,
    doCureWoundsNeedsTarget,
    doCureWoundsNeedsHealingRoll,
    doMassHealingWordWounded,
    doMassHealingWordNeedsTargetList,
    doMassHealingWordNeedsHealingRoll,
    doMassCureWoundsWounded,
    doMassCureWoundsNeedsTargetList,
    doMassCureWoundsNeedsHealingRoll,
  }
}
