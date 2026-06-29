// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-save-or-attack spell.hit-point-restoration spell.reaction-shield spell.readied-action-time-spell

module spellProcedureProfilesInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import movementSpatialGrapple.* from "./movement-spatial-grapple"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"
  import spellInvocationActionSlotCore.* from "./spell-invocation-action-slot-core"
  import spellInvocationTargetCardinalityCore.* from "./spell-invocation-target-cardinality-core"
  import spellDirectDamageProjectionCore.* from "./spell-direct-damage-projection-core"
  import spellHitPointRestorationCore.* from "./spell-hit-point-restoration-core"
  import spellDefensiveEffectCore.* from "./spell-defensive-effect-core"
  import spellReadiedSpellResponseCore.* from "./spell-readied-spell-response-core"
  import spellSlotExpenditure.* from "./spell-slot-expenditure"
  import spellProcedureProfiles.* from "./spell-procedure-profiles"

  var qActionQuota: ActionQuota
  var qBonusActionAvailable: bool
  var qReactionAvailable: bool
  var qDashMovementBonusFeet: int
  var qDisengaged: bool
  var qDodging: bool
  var qHidden: bool
  var qHelpAttackHeld: bool
  var qReadiedMovementHeld: bool
  var qStartOfTurnHookActive: bool
  var qEndOfTurnHookActive: bool
  var qCurrentActorOwnsTurn: bool
  var qSlotLevel: int
  var qSlotsRemaining: int
  var qSlotSpellCastThisTurn: bool
  var qReactionWindow: ReactionWindowState
  var qInterruptedConcentration: ConcentrationState
  var qReactorConcentration: ConcentrationState
  var qReadiedHeldEffect: ReadiedSpellHeldEffect
  var qLastSpellEffect: SpellEffect
  var qLastMageArmorEffect: MageArmorDefensiveEffect
  var qLastReadiedSpellRelease: ReadiedSpellRelease
  var qLastDamageAmount: int
  var qLastHealingAmount: int

  pure def qTurn: TurnProcedureState = {
    actionQuota: qActionQuota,
    bonusActionAvailable: qBonusActionAvailable,
    reactionAvailable: qReactionAvailable,
    dashMovementBonusFeet: qDashMovementBonusFeet,
    disengaged: qDisengaged,
    dodging: qDodging,
    hidden: qHidden,
    helpAttackHeld: qHelpAttackHeld,
    readiedMovementHeld: qReadiedMovementHeld,
    startOfTurnHookActive: qStartOfTurnHookActive,
    endOfTurnHookActive: qEndOfTurnHookActive,
    currentActorOwnsTurn: qCurrentActorOwnsTurn,
  }

  pure def qSlotLedger: SpellSlotLedger = {
    slotLevel: qSlotLevel,
    slotsRemaining: qSlotsRemaining,
  }

  pure def qSpellcasting: SpellcastingProcedureState = {
    turn: qTurn,
    slotLedger: qSlotLedger,
    slotSpellCastThisTurn: qSlotSpellCastThisTurn,
  }

  pure def qReactionProtocol: ReactionProtocolState = {
    interruptedActor: initialMovementGrappleState,
    reactor: initialMovementGrappleState.with("turn", qTurn),
    reactionWindow: qReactionWindow,
    concentration: {
      interruptedActor: qInterruptedConcentration,
      reactor: qReactorConcentration,
    },
  }

  pure def qReadiedSpell: ReadiedSpellProcedureState = {
    reaction: qReactionProtocol,
    heldEffect: qReadiedHeldEffect,
  }

  action init = all {
    recordTurn(initialTurnProcedureState),
    qSlotLevel' = 1,
    qSlotsRemaining' = 2,
    qSlotSpellCastThisTurn' = false,
    qReactionWindow' = NoReactionWindow,
    qInterruptedConcentration' = NoConcentration,
    qReactorConcentration' = NoConcentration,
    qReadiedHeldEffect' = NoReadiedSpellHeldEffect,
    qLastSpellEffect' = NoSpellEffect,
    qLastMageArmorEffect' = NoMageArmorDefensiveEffect,
    qLastReadiedSpellRelease' = NoReadiedSpellRelease,
    qLastDamageAmount' = 0,
    qLastHealingAmount' = 0,
  }

  action recordTurn(turn: TurnProcedureState): bool = all {
    qActionQuota' = turn.actionQuota,
    qBonusActionAvailable' = turn.bonusActionAvailable,
    qReactionAvailable' = turn.reactionAvailable,
    qDashMovementBonusFeet' = turn.dashMovementBonusFeet,
    qDisengaged' = turn.disengaged,
    qDodging' = turn.dodging,
    qHidden' = turn.hidden,
    qHelpAttackHeld' = turn.helpAttackHeld,
    qReadiedMovementHeld' = turn.readiedMovementHeld,
    qStartOfTurnHookActive' = turn.startOfTurnHookActive,
    qEndOfTurnHookActive' = turn.endOfTurnHookActive,
    qCurrentActorOwnsTurn' = turn.currentActorOwnsTurn,
  }

  action recordSpellcasting(state: SpellcastingProcedureState): bool = all {
    recordTurn(state.turn),
    qSlotLevel' = state.slotLedger.slotLevel,
    qSlotsRemaining' = state.slotLedger.slotsRemaining,
    qSlotSpellCastThisTurn' = state.slotSpellCastThisTurn,
  }

  action recordReadiedSpell(state: ReadiedSpellProcedureState): bool = all {
    recordTurn(state.reaction.reactor.turn),
    qReactionWindow' = state.reaction.reactionWindow,
    qInterruptedConcentration' = state.reaction.concentration.interruptedActor,
    qReactorConcentration' = state.reaction.concentration.reactor,
    qReadiedHeldEffect' = state.heldEffect,
  }

  action doSpellInvocation = {
    nondet profile = Set(
      RayOfFrostSpellProfile,
      AcidSplashSpellProfile,
      HealingWordSpellProfile,
      CureWoundsSpellProfile,
      MassCureWoundsSpellProfile,
      MassHealingWordSpellProfile,
      MageArmorSpellProfile
    ).oneOf()
    nondet hasSpellAccess = Set(true, false).oneOf()
    nondet targetsAreValid = Set(true, false).oneOf()
    val selectedSlotLevel =
      if (spellProfileRequiresSlot(profile)) qSlotLevel else 0
    val result = resolveSpellInvocation(qSpellcasting, {
      profile: profile,
      hasSpellAccess: hasSpellAccess,
      selectedSlotLevel: selectedSlotLevel,
      targetCount: 1,
      targetsAreValid: targetsAreValid,
    })
    all {
      recordSpellcasting(result.state),
      qReactionWindow' = qReactionWindow,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qReadiedHeldEffect' = qReadiedHeldEffect,
      qLastSpellEffect' = qLastSpellEffect,
      qLastMageArmorEffect' = qLastMageArmorEffect,
      qLastReadiedSpellRelease' = qLastReadiedSpellRelease,
      qLastDamageAmount' = qLastDamageAmount,
      qLastHealingAmount' = qLastHealingAmount,
    }
  }

  action doMagicMissile = {
    nondet slotLevel = Set(1, 2, 5).oneOf()
    val result = resolveMagicMissileDamage({
      slotLevel: slotLevel,
      allocatedDarts: magicMissileDartCount(slotLevel),
      dartDamageRoll: 3,
    })
    all {
      qLastDamageAmount' = result.damageAmount,
      qLastHealingAmount' = qLastHealingAmount,
      recordSpellcasting(qSpellcasting),
      qReactionWindow' = qReactionWindow,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qReadiedHeldEffect' = qReadiedHeldEffect,
      qLastSpellEffect' = qLastSpellEffect,
      qLastMageArmorEffect' = qLastMageArmorEffect,
      qLastReadiedSpellRelease' = qLastReadiedSpellRelease,
    }
  }

  action doRayOfFrost = {
    nondet naturalD20 = Set(1, 12, 20).oneOf()
    val critical = naturalD20 == 20
    val result = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: naturalD20,
        total: 15,
        armorClass: 13,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: criticalDamageDiceCount(1, critical),
      damageRoll: if (critical) 9 else 6,
    })
    all {
      qLastDamageAmount' = result.damageAmount,
      qLastHealingAmount' = qLastHealingAmount,
      recordSpellcasting(qSpellcasting),
      qReactionWindow' = qReactionWindow,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qReadiedHeldEffect' = qReadiedHeldEffect,
      qLastSpellEffect' = result.effect,
      qLastMageArmorEffect' = qLastMageArmorEffect,
      qLastReadiedSpellRelease' = qLastReadiedSpellRelease,
    }
  }

  action doAcidSplash = {
    nondet failed = Set(true, false).oneOf()
    val result = resolveAcidSplashEffect({
      savingThrowFailed: failed,
      damageRoll: 4,
    })
    all {
      qLastDamageAmount' = result.damageAmount,
      qLastHealingAmount' = qLastHealingAmount,
      recordSpellcasting(qSpellcasting),
      qReactionWindow' = qReactionWindow,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qReadiedHeldEffect' = qReadiedHeldEffect,
      qLastSpellEffect' = qLastSpellEffect,
      qLastMageArmorEffect' = qLastMageArmorEffect,
      qLastReadiedSpellRelease' = qLastReadiedSpellRelease,
    }
  }

  action doHealingWord = {
    val result = resolveDirectHitPointRestorationEffect(
      {
        kind: PlayerCharacter,
        hitPoints: 0,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
      { successes: 1, failures: 1, stable: false, hpRegained: false },
      NoPositiveHitPointUnconsciousRecovery,
      {
        profile: HealingWordHitPointRestorationProfile,
        slotLevel: 1,
        healingDiceRoll: 5,
        spellcastingAbilityModifier: 2,
      }
    )
    all {
      qLastHealingAmount' = result.hitPointsRegained,
      qLastDamageAmount' = qLastDamageAmount,
      recordSpellcasting(qSpellcasting),
      qReactionWindow' = qReactionWindow,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qReadiedHeldEffect' = qReadiedHeldEffect,
      qLastSpellEffect' = qLastSpellEffect,
      qLastMageArmorEffect' = qLastMageArmorEffect,
      qLastReadiedSpellRelease' = qLastReadiedSpellRelease,
    }
  }

  action doMageArmor = {
    nondet targetWearingArmor = Set(true, false).oneOf()
    nondet targetDonsArmor = Set(true, false).oneOf()
    val effect = resolveMageArmorDefensiveEffect({
      willingTarget: true,
      targetWearingArmor: targetWearingArmor,
      dexterityModifier: 2,
    })
    val endingEffect = endMageArmorDefensiveEffectIfTargetDonsArmor(effect, targetDonsArmor)
    all {
      qReadiedHeldEffect' = qReadiedHeldEffect,
      qLastSpellEffect' = qLastSpellEffect,
      qLastMageArmorEffect' = endingEffect,
      qLastDamageAmount' = qLastDamageAmount,
      qLastHealingAmount' = qLastHealingAmount,
      recordSpellcasting(qSpellcasting),
      qReactionWindow' = qReactionWindow,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qLastReadiedSpellRelease' = qLastReadiedSpellRelease,
    }
  }

  action doReadiedSpell = {
    nondet profile = Set(
      RayOfFrostSpellProfile,
      AcidSplashSpellProfile,
      CureWoundsSpellProfile,
      MassCureWoundsSpellProfile,
      MageArmorSpellProfile
    ).oneOf()
    val held = holdReadiedSpellResponse(
      qSpellcasting,
      qReadiedSpell,
      {
        profile: profile,
        hasSpellAccess: true,
        selectedSlotLevel: if (spellProfileRequiresSlot(profile)) qSlotLevel else 0,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    val offered = offerReadiedSpellReaction(held.readiedSpell)
    val releaseResult = releaseReadiedSpellReaction(offered)
    all {
      recordReadiedSpell(releaseResult.readiedSpell),
      qSlotLevel' = held.spellcasting.slotLedger.slotLevel,
      qSlotsRemaining' = held.spellcasting.slotLedger.slotsRemaining,
      qSlotSpellCastThisTurn' = held.spellcasting.slotSpellCastThisTurn,
      qLastDamageAmount' = qLastDamageAmount,
      qLastHealingAmount' = qLastHealingAmount,
      qLastSpellEffect' = qLastSpellEffect,
      qLastMageArmorEffect' = qLastMageArmorEffect,
      qLastReadiedSpellRelease' = releaseResult.released,
    }
  }

  action doStartTurn = all {
    recordTurn(startTurn(qTurn)),
    qSlotLevel' = qSlotLevel,
    qSlotsRemaining' = qSlotsRemaining,
    qSlotSpellCastThisTurn' = false,
    qReactionWindow' = NoReactionWindow,
    qInterruptedConcentration' = qInterruptedConcentration,
    qReactorConcentration' = qReactorConcentration,
    qReadiedHeldEffect' = NoReadiedSpellHeldEffect,
    qLastSpellEffect' = NoSpellEffect,
    qLastMageArmorEffect' = NoMageArmorDefensiveEffect,
    qLastReadiedSpellRelease' = NoReadiedSpellRelease,
    qLastDamageAmount' = qLastDamageAmount,
    qLastHealingAmount' = qLastHealingAmount,
  }

  action step = any {
    // Branch budget: eight spell-profile branches with small fixed samples.
    // The machine tracks scalar outputs plus ordinary and Mage Armor Spell Effect fixtures.
    doSpellInvocation,
    doMagicMissile,
    doRayOfFrost,
    doAcidSplash,
    doHealingWord,
    doMageArmor,
    doReadiedSpell,
    doStartTurn,
  }

  val invariant = all {
    qActionQuota.in(Set(ActionAvailable, ActionSpent)),
    qBonusActionAvailable.in(Set(true, false)),
    qReactionAvailable.in(Set(true, false)),
    qDashMovementBonusFeet.in(0.to(80)),
    qDisengaged.in(Set(true, false)),
    qDodging.in(Set(true, false)),
    qHidden.in(Set(true, false)),
    qHelpAttackHeld.in(Set(true, false)),
    qReadiedMovementHeld.in(Set(true, false)),
    qStartOfTurnHookActive.in(Set(true, false)),
    qEndOfTurnHookActive.in(Set(true, false)),
    qCurrentActorOwnsTurn.in(Set(true, false)),
    qSlotLevel.in(1.to(9)),
    qSlotsRemaining.in(0.to(6)),
    qSlotSpellCastThisTurn.in(Set(true, false)),
    legalReactionWindowState(qReactionWindow),
    qInterruptedConcentration.in(Set(NoConcentration, Concentrating)),
    qReactorConcentration.in(Set(NoConcentration, Concentrating)),
    qLastSpellEffect.in(legalSpellEffects),
    legalMageArmorDefensiveEffect(qLastMageArmorEffect),
    legalReadiedSpellRelease(qLastReadiedSpellRelease),
    legalReadiedSpellHeldEffect(qReadiedHeldEffect),
    legalSpellEffect(qLastSpellEffect),
    qLastDamageAmount.in(0.to(40)),
    qLastHealingAmount.in(0.to(40)),
    legalTurnProcedureState(qTurn),
    legalSpellSlotLedger(qSlotLedger),
    legalSpellcastingProcedureState(qSpellcasting),
    legalReactionProtocolState(qReactionProtocol),
    legalReadiedSpellProcedureState(qReadiedSpell),
  }
}
