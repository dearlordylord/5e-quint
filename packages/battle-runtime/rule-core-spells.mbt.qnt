// -*- mode: Bluespec; -*-

module ruleCoreSpellsMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import spellDefinitionProfiles.* from "../shared-algebras/proofs/rule-core/spell-definition-profiles"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"
  import spellInvocationActionSlotCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-action-slot-core"
  import spellDirectDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-direct-damage-projection-core"
  import spellReadiedSpellResponseCore.* from "../shared-algebras/proofs/rule-core/spell-readied-spell-response-core"
  import spellProcedureProfiles.* from "../shared-algebras/proofs/rule-core/spell-procedure-profiles"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Fixture bounds:
  // - one spellcaster and up to two targets;
  // - level-1 spell slots are projected as a scalar remaining count;
  // - spell breadth is limited to QCORE10 profiles: Magic Missile, Ray of
  //   Frost, Acid Splash, Cure Wounds, Healing Word, Mass Cure Wounds,
  //   Mass Healing Word, Mage Armor, and Readied Spell Response.

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
  pure def mageArmorEffect: str = "spellBaseArmorClass"

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

  action doMagicMissileLow = {
    val invocation = resolveRepeatedDamageAllocationInvocation(initialSpellcastingProcedureState, {
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
      repeatedEffectCount: magicMissileDartCount(1),
    })
    val damage = resolveMagicMissileDamage({
      slotLevel: 1,
      allocatedDarts: 3,
      dartDamageRoll: 3,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp,
        initialTargetHp - damage.damageAmount, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

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

  action doRayOfFrostMiss = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: RayOfFrostSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
        false, 0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

  action doRayOfFrostHit = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: RayOfFrostSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 1,
      targetsAreValid: true,
    })
    val effect = resolveRayOfFrostEffect({
      attackRoll: { naturalD20: 10, total: 14, armorClass: 13, criticalThreshold: 20 },
      baseDamageDice: 1,
      rolledDamageDiceCount: 1,
      damageRoll: 4,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp,
        initialTargetHp - effect.damageAmount, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, speedEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

  action doRayOfFrostCritical = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: RayOfFrostSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 1,
      targetsAreValid: true,
    })
    val effect = resolveRayOfFrostEffect({
      attackRoll: { naturalD20: 20, total: 20, armorClass: 13, criticalThreshold: 20 },
      baseDamageDice: 1,
      rolledDamageDiceCount: 2,
      damageRoll: 8,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp,
        initialTargetHp - effect.damageAmount, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, speedEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

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

  action doAcidSplashAllSuccess = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: AcidSplashSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 2,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
        false, 0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

  action doAcidSplashOneFail = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: AcidSplashSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 2,
      targetsAreValid: true,
    })
    val effect = resolveAcidSplashEffect({
      savingThrowFailed: true,
      damageRoll: 4,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp,
        initialTargetHp - effect.damageAmount, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

  action doHealingWordNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), WNeedsHoles
  )

  action doHealingWordNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doHealingWordWounded = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: HealingWordSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        true, false, true, initialCasterHp, 12, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

  action doHealingWordZeroHp = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: HealingWordSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        true, false, true, initialCasterHp, 5, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

  action doCureWoundsNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), WNeedsHoles
  )

  action doCureWoundsNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), WNeedsHoles
  )

  action doCureWoundsWounded = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: CureWoundsSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp, 12, initialTargetHp, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, noEffect, false, false,
        false, Set(), WResolved
      ),
    }
  }

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

  action doMassHealingWordWounded = {
    val invocation = resolveSpellInvocation({
      turn: initialSpellcastingProcedureState.turn,
      slotLedger: { slotLevel: 3, slotsRemaining: 1 },
      slotSpellCastThisTurn: false,
    }, {
      profile: MassHealingWordSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 3,
      targetCount: 2,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        true, false, true, initialCasterHp, 12, 12, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        0, noEffect, false, false, false, Set(), WResolved
      ),
    }
  }

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

  action doMassCureWoundsWounded = {
    val invocation = resolveSpellInvocation({
      turn: initialSpellcastingProcedureState.turn,
      slotLedger: { slotLevel: 5, slotsRemaining: 1 },
      slotSpellCastThisTurn: false,
    }, {
      profile: MassCureWoundsSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 5,
      targetCount: 2,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp, 12, 12, false,
        0, 0, invocation.state.slotSpellCastThisTurn,
        0, noEffect, false, false, false, Set(), WResolved
      ),
    }
  }

  action doMageArmorNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), WNeedsHoles
  )

  action doMageArmor = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: MageArmorSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      recordProjection(
        false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
        false, 0, 0, invocation.state.slotSpellCastThisTurn,
        invocation.state.slotLedger.slotsRemaining, mageArmorEffect, false,
        false, false, Set(), WResolved
      ),
    }
  }

  action doRejectSecondSlotSpell = recordProjection(
    false, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), WInvalid(WStaleSubject)
  )

  action doReadySpellHold = {
    val held = holdRepeatedDamageAllocationReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
        repeatedEffectCount: magicMissileDartCount(1),
      },
      true,
      true
    )
    all {
      recordProjection(
        false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
        false, 0, 0, held.spellcasting.slotSpellCastThisTurn,
        held.spellcasting.slotLedger.slotsRemaining, noEffect, held.held,
        false, true, Set(), WResolved
      ),
    }
  }

  action doReleaseReadiedSpell = {
    val damage = resolveMagicMissileDamage({
      slotLevel: 1,
      allocatedDarts: 3,
      dartDamageRoll: 3,
    })
    all {
      recordProjection(
        false, true, false, initialCasterHp - 1,
        initialTargetHp - damage.damageAmount, initialTargetHp, false,
        0, 0, false, 1, noEffect, false, true, false, Set(), WResolved
      ),
    }
  }

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
    doMageArmor,
    doMageArmorNeedsTarget,
    doRejectSecondSlotSpell,
    doReadySpellHold,
    doReleaseReadiedSpell,
  }
}
