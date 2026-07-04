// -*- mode: Bluespec; -*-

module ruleCoreSpellDamageMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Literal projection witness for QCORE10 direct damage, spell attack damage,
  // and save-gated damage procedure families.
  //
  // RAW:
  // - .references/srd-5.2.1/Spells/Descriptions-M-P.md: Magic Missile.
  // - .references/srd-5.2.1/Spells/Descriptions-Q-R.md: Ray of Frost.
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md: Acid Splash.
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
  pure def initialLevel1SlotsRemaining: int = 2

  pure def noEffect: str = "none"
  pure def speedEffect: str = "speedDelta"

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
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set(), WInit
  )

  action doMagicMissileNeedsAllocation = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("SpellTargetAllocation"), WNeedsHoles
  )

  action doMagicMissileLow = recordProjection(
    false, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), WResolved
  )

  action doRayOfFrostNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), WNeedsHoles
  )

  action doRayOfFrostNeedsAttackRoll = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("AttackRoll"), WNeedsHoles
  )

  action doRayOfFrostNeedsDamageRoll = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doRayOfFrostMiss = recordProjection(
    false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
    false, 0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false,
    false, Set(), WResolved
  )

  action doRayOfFrostHit = recordProjection(
    false, true, true, initialCasterHp, 9, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, speedEffect, false, false,
    false, Set(), WResolved
  )

  action doRayOfFrostCritical = recordProjection(
    false, true, true, initialCasterHp, 5, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, speedEffect, false, false,
    false, Set(), WResolved
  )

  action doAcidSplashNeedsSavingThrow = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("SavingThrowOutcome"), WNeedsHoles
  )

  action doAcidSplashNeedsDamageRoll = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doAcidSplashAllSuccess = recordProjection(
    false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
    false, 0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false,
    false, Set(), WResolved
  )

  action doAcidSplashOneFail = recordProjection(
    false, true, true, initialCasterHp, 9, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set(), WResolved
  )

  action step = any {
    doMagicMissileLow,
    doMagicMissileNeedsAllocation,
    doRayOfFrostMiss,
    doRayOfFrostHit,
    doRayOfFrostCritical,
    doRayOfFrostNeedsTarget,
    doRayOfFrostNeedsAttackRoll,
    doRayOfFrostNeedsDamageRoll,
    doAcidSplashAllSuccess,
    doAcidSplashOneFail,
    doAcidSplashNeedsSavingThrow,
    doAcidSplashNeedsDamageRoll,
  }
}
