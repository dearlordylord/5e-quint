// -*- mode: Bluespec; -*-

module ruleCoreSpellsMbt {
  import spellProcedureProfiles.* from "../shared-algebras/proofs/rule-core/spell-procedure-profiles"

  // Fixture bounds:
  // - one spellcaster and up to two targets;
  // - level-1 spell slots are projected as a scalar remaining count;
  // - spell breadth is limited to QCORE10 profiles: Magic Missile, Ray of
  //   Frost, Acid Splash, Healing Word, Mage Armor, and Readied Spell Response.

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
  var qHoles: Set[str]
  var qLastResult: str
  var qLastInvalidReason: str

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
    result: str,
    invalidReason: str,
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
    qHoles' = holes,
    qLastResult' = result,
    qLastInvalidReason' = invalidReason,
  }

  action init = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set(), "init", "none"
  )

  action doMagicMissileNeedsAllocation = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("SpellTargetAllocation"), "needsHoles", "none"
  )

  action doMagicMissileLow = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: MagicMissileSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
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
        false, Set(), "resolved", "none"
      ),
    }
  }

  action doRayOfFrostNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), "needsHoles", "none"
  )

  action doRayOfFrostNeedsAttackRoll = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("AttackRoll"), "needsHoles", "none"
  )

  action doRayOfFrostNeedsDamageRoll = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), "needsHoles", "none"
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
        false, Set(), "resolved", "none"
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
        false, Set(), "resolved", "none"
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
        false, Set(), "resolved", "none"
      ),
    }
  }

  action doAcidSplashNeedsSavingThrow = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("SavingThrowOutcome"), "needsHoles", "none"
  )

  action doAcidSplashNeedsDamageRoll = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), "needsHoles", "none"
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
        false, Set(), "resolved", "none"
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
        false, Set(), "resolved", "none"
      ),
    }
  }

  action doHealingWordNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), "needsHoles", "none"
  )

  action doHealingWordNeedsHealingRoll = recordProjection(
    true, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("DamageRoll"), "needsHoles", "none"
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
        false, Set(), "resolved", "none"
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
        false, Set(), "resolved", "none"
      ),
    }
  }

  action doMageArmorNeedsTarget = recordProjection(
    true, true, true, initialCasterHp, initialTargetHp, initialTargetHp, false,
    0, 0, false, initialLevel1SlotsRemaining, noEffect, false, false, false,
    Set("TargetChoice"), "needsHoles", "none"
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
        false, false, Set(), "resolved", "none"
      ),
    }
  }

  action doRejectSecondSlotSpell = recordProjection(
    false, true, true, initialCasterHp, 4, initialTargetHp, false,
    0, 0, true, 1, noEffect, false, false, false, Set(), "invalid",
    "staleSubject"
  )

  action doReadySpellHold = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: MagicMissileSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    all {
      recordProjection(
        false, true, true, initialCasterHp, initialTargetHp, initialTargetHp,
        false, 0, 0, held.spellcasting.slotSpellCastThisTurn,
        held.spellcasting.slotLedger.slotsRemaining, noEffect, held.held,
        false, true, Set(), "resolved", "none"
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
        0, 0, false, 1, noEffect, false, true, false, Set(), "resolved",
        "none"
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
    doMageArmor,
    doMageArmorNeedsTarget,
    doRejectSecondSlotSpell,
    doReadySpellHold,
    doReleaseReadiedSpell,
  }
}
