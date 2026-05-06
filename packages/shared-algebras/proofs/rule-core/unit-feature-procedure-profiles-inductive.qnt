// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-damage-rider unit-feature.bonus-action-ongoing-rage unit-feature.first-attack-roll-reckless-advantage unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-critical-range-19

module unitFeatureProcedureProfilesInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import unitFeatureProcedureProfiles.* from "./unit-feature-procedure-profiles"

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
  var qFeatureUsesRemaining: int
  var qFeatureMaximumUses: int
  var qActionSurgeGrant: ActionSurgeActionGrant
  var qRageOccurrence: RageOccurrence
  var qInterruptedConcentration: ConcentrationState
  var qReactorConcentration: ConcentrationState
  var qRecklessOccurrence: RecklessAttackOccurrence
  var qAttackRollMadeThisTurn: bool
  var qSneakAttackUsedThisTurn: bool
  var qLastDamageAmount: int

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

  pure def qFeaturePool: FeatureUsePool = {
    usesRemaining: qFeatureUsesRemaining,
    maximumUses: qFeatureMaximumUses,
  }

  pure def qActionSurgeState: ActionSurgeState = {
    pool: qFeaturePool,
    actionGrant: qActionSurgeGrant,
  }

  pure def qRageState: RageState = {
    turn: qTurn,
    pool: qFeaturePool,
    occurrence: qRageOccurrence,
    concentration: {
      interruptedActor: qInterruptedConcentration,
      reactor: qReactorConcentration,
    },
  }

  pure def qRecklessAttackState: RecklessAttackState = {
    occurrence: qRecklessOccurrence,
    attackRollMadeThisTurn: qAttackRollMadeThisTurn,
  }

  action init = all {
    recordTurn(initialTurnProcedureState),
    qFeatureUsesRemaining' = 2,
    qFeatureMaximumUses' = 2,
    qActionSurgeGrant' = NoActionSurgeActionGrant,
    qRageOccurrence' = NoRageOccurrence,
    qInterruptedConcentration' = NoConcentration,
    qReactorConcentration' = NoConcentration,
    qRecklessOccurrence' = NoRecklessAttackOccurrence,
    qAttackRollMadeThisTurn' = false,
    qSneakAttackUsedThisTurn' = false,
    qLastDamageAmount' = 0,
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

  action recordFeaturePool(pool: FeatureUsePool): bool = all {
    qFeatureUsesRemaining' = pool.usesRemaining,
    qFeatureMaximumUses' = pool.maximumUses,
  }

  action recordActionSurge(state: ActionSurgeState): bool = all {
    recordFeaturePool(state.pool),
    qActionSurgeGrant' = state.actionGrant,
  }

  action recordRage(state: RageState): bool = all {
    recordTurn(state.turn),
    recordFeaturePool(state.pool),
    qRageOccurrence' = state.occurrence,
    qInterruptedConcentration' = state.concentration.interruptedActor,
    qReactorConcentration' = state.concentration.reactor,
  }

  action doActionSurge = {
    nondet onTurn = Set(true, false).oneOf()
    nondet requestedAction = Set(AttackAction, DashAction, MagicAction).oneOf()
    val activated = activateActionSurge(qActionSurgeState, onTurn)
    val spent = spendActionSurgeAction(activated, requestedAction)
    all {
      recordActionSurge(spent.actionSurge),
      qLastDamageAmount' = qLastDamageAmount,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      recordTurn(qTurn),
    }
  }

  action doSecondWind = {
    nondet healingRoll = Set(1, 6, 10).oneOf()
    nondet fighterLevel = Set(1, 5, 20).oneOf()
    val result = resolveSecondWind(
      qTurn,
      qFeaturePool,
      {
        kind: PlayerCharacter,
        hitPoints: 3,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      {
        healingRoll: healingRoll,
        fighterLevel: fighterLevel,
      }
    )
    all {
      recordTurn(result.turn),
      recordFeaturePool(result.pool),
      qLastDamageAmount' = result.recovery.vitals.hitPoints,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    }
  }

  action doCunningAction = {
    nondet choice = Set(CunningDash, CunningDisengage, CunningHide).oneOf()
    val result = resolveCunningAction(qTurn, {
      choice: choice,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: true, checkTotal: 18, dc: 15 },
    })
    all {
      recordTurn(result),
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qLastDamageAmount' = qLastDamageAmount,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    }
  }

  action doRage = {
    nondet heavyArmor = Set(true, false).oneOf()
    nondet incapacitated = Set(true, false).oneOf()
    nondet persistentRage = Set(true, false).oneOf()
    val result = startRage(qRageState, {
      wearingHeavyArmor: heavyArmor,
      incapacitated: incapacitated,
      persistentRage: persistentRage,
    })
    all {
      recordRage(result),
      qLastDamageAmount' = applyRageDamageBonus(result, {
        usesStrength: true,
        dealsDamage: true,
        attackForm: RageWeaponAttack,
      }, 9, 4),
      qActionSurgeGrant' = qActionSurgeGrant,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    }
  }

  action doRecklessAttack = {
    nondet chooses = Set(true, false).oneOf()
    nondet strengthAttack = Set(true, false).oneOf()
    val result = activateRecklessAttackOnFirstAttackRoll(qRecklessAttackState, {
      choosesRecklessAttack: chooses,
      strengthAttackRoll: strengthAttack,
    })
    all {
      qRecklessOccurrence' = result.occurrence,
      qAttackRollMadeThisTurn' = result.attackRollMadeThisTurn,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qLastDamageAmount' = qLastDamageAmount,
      recordTurn(qTurn),
    }
  }

  action doSneakAttack = {
    nondet hasAdvantage = Set(true, false).oneOf()
    nondet hasDisadvantage = Set(true, false).oneOf()
    val result = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: FinesseWeapon,
      hasAdvantage: hasAdvantage,
      hasDisadvantage: hasDisadvantage,
      allyWithinFiveFeet: true,
      allyIncapacitated: false,
      usedThisTurn: qSneakAttackUsedThisTurn,
      rogueLevel: 5,
      weaponDamageType: SlashingDamage,
    })
    all {
      qSneakAttackUsedThisTurn' = result.usedThisTurn,
      qLastDamageAmount' = result.damageDice,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      recordTurn(qTurn),
    }
  }

  action doReactionReduction = {
    nondet useCuttingWords = Set(true, false).oneOf()
    nondet creatureSeen = Set(true, false).oneOf()
    nondet creatureWithinSixtyFeet = Set(true, false).oneOf()
    val cuttingWords = resolveCuttingWordsDamageReaction(
      qTurn,
      qFeaturePool,
      {
        trigger: {
          creatureSeen: creatureSeen,
          creatureWithinSixtyFeet: creatureWithinSixtyFeet,
        },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    val uncannyDodge = resolveUncannyDodgeReaction(
      qTurn,
      { attackerSeen: true, hitWithAttackRoll: true, incomingDamage: 9 }
    )
    all {
      recordTurn(if (useCuttingWords) cuttingWords.turn else uncannyDodge.turn),
      if (useCuttingWords) recordFeaturePool(cuttingWords.pool)
      else recordFeaturePool(qFeaturePool),
      qLastDamageAmount' =
        if (useCuttingWords) cuttingWords.reducedAmount
        else uncannyDodge.reducedAmount,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
    }
  }

  action doCriticalThreshold = {
    nondet championImprovedCritical = Set(true, false).oneOf()
    nondet attackForm = Set(ChampionWeaponAttack, ChampionUnarmedStrikeAttack).oneOf()
    nondet naturalD20 = Set(18, 19, 20).oneOf()
    val outcome = resolveAttackRoll({
      naturalD20: naturalD20,
      total: 1,
      armorClass: 30,
      criticalThreshold:
        if (championImprovedCritical) attackCriticalThreshold(ChampionImprovedCriticalThresholdProfile({
          attackForm: attackForm,
        }))
        else attackCriticalThreshold(StandardAttackCriticalThresholdProfile),
    })
    all {
      qLastDamageAmount' = if (outcome.critical) 1 else 0,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      recordTurn(qTurn),
    }
  }

  action doEvasionReplacement = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet incapacitated = Set(true, false).oneOf()
    all {
      qLastDamageAmount' = saveDamageAfterEvasionReplacement({
        savingThrowAbility: DexteritySavingThrowFact,
        normalSuccessTakesHalfDamage: true,
        savingThrowSucceeded: savingThrowSucceeded,
        incapacitated: incapacitated,
      }, 20),
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      recordTurn(qTurn),
    }
  }

  action doStartTurn = all {
    recordTurn(startTurn(qTurn)),
    qActionSurgeGrant' = NoActionSurgeActionGrant,
    qRecklessOccurrence' = NoRecklessAttackOccurrence,
    qAttackRollMadeThisTurn' = false,
    qSneakAttackUsedThisTurn' = false,
    qFeatureUsesRemaining' = qFeatureUsesRemaining,
    qFeatureMaximumUses' = qFeatureMaximumUses,
    qRageOccurrence' = qRageOccurrence,
    qInterruptedConcentration' = qInterruptedConcentration,
    qReactorConcentration' = qReactorConcentration,
    qLastDamageAmount' = qLastDamageAmount,
  }

  action step = any {
    // Branch budget: 10 feature-profile branches plus turn refresh. Each branch
    // samples at most three bounded booleans or small fixture values.
    doActionSurge,
    doSecondWind,
    doCunningAction,
    doRage,
    doRecklessAttack,
    doSneakAttack,
    doReactionReduction,
    doCriticalThreshold,
    doEvasionReplacement,
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
    qFeatureUsesRemaining.in(0.to(6)),
    qFeatureMaximumUses.in(0.to(6)),
    qFeatureUsesRemaining <= qFeatureMaximumUses,
    qActionSurgeGrant.in(Set(
      NoActionSurgeActionGrant,
      ActionSurgeActionAvailable,
      ActionSurgeActionSpent
    )),
    qRageOccurrence.in(Set(
      NoRageOccurrence,
      RageUntilEndOfNextTurn,
      PersistentRageTenMinuteDuration
    )),
    qInterruptedConcentration.in(Set(NoConcentration, Concentrating)),
    qReactorConcentration.in(Set(NoConcentration, Concentrating)),
    qRecklessOccurrence.in(Set(
      NoRecklessAttackOccurrence,
      RecklessAttackUntilStartOfTurn
    )),
    qAttackRollMadeThisTurn.in(Set(true, false)),
    qSneakAttackUsedThisTurn.in(Set(true, false)),
    qLastDamageAmount.in(0.to(40)),
    legalTurnProcedureState(qTurn),
    legalFeatureUsePool(qFeaturePool),
    legalActionSurgeState(qActionSurgeState),
    legalRageState(qRageState),
  }
}
