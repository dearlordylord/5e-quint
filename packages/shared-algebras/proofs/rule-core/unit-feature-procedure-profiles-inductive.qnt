// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.martial-arts-attack-projection unit-feature.passive-armor-class-bonus unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement

module unitFeatureProcedureProfilesInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"
  import unitFeatureActionCountCore.* from "./unit-feature-action-count-core"
  import unitFeatureRageRecklessCore.* from "./unit-feature-rage-reckless-core"
  import unitFeatureAttackRiderCore.* from "./unit-feature-attack-rider-core"
  import unitFeatureSaveDamageCore.* from "./unit-feature-save-damage-core"
  import unitFeatureReactionReductionCore.* from "./unit-feature-reaction-reduction-core"
  import unitFeaturePassiveMovementDefenseCore.* from "./unit-feature-passive-movement-defense-core"
  import unitFeatureZeroHitPointCore.* from "./unit-feature-zero-hit-point-core"

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
  var qFrenzyUsedThisTurn: bool
  var qWeaponDamageDiceRollChoiceUsedThisTurn: bool
  var qAttackRollMissToHitReplacementUsedSinceTurnStart: bool
  var qLastDamageAmount: int
  var qLastArmorClass: int

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

  pure def qFrenzyState: FrenzyState =
    initialFrenzyState(
      qRageState,
      qRecklessAttackState,
      qFrenzyUsedThisTurn
        or (qRageOccurrence != NoRageOccurrence
          and qRecklessOccurrence == RecklessAttackUntilStartOfTurn)
    ).with("firstEligibleHitResolvedThisTurn", qFrenzyUsedThisTurn)

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
    qFrenzyUsedThisTurn' = false,
    qWeaponDamageDiceRollChoiceUsedThisTurn' = false,
    qAttackRollMissToHitReplacementUsedSinceTurnStart' = false,
    qLastDamageAmount' = 0,
    qLastArmorClass' = 16,
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
      qLastArmorClass' = qLastArmorClass,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
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
      qLastArmorClass' = qLastArmorClass,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
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
      qLastArmorClass' = qLastArmorClass,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
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
      qLastArmorClass' = qLastArmorClass,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
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
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      qLastDamageAmount' = qLastDamageAmount,
      qLastArmorClass' = qLastArmorClass,
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
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      qLastDamageAmount' = result.damageDice,
      qLastArmorClass' = qLastArmorClass,
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

  action doFrenzy = {
    nondet rageActive = Set(true, false).oneOf()
    nondet recklessWhileRaging = Set(true, false).oneOf()
    nondet strengthAttack = Set(true, false).oneOf()
    nondet attackForm = Set(RageWeaponAttack, RageUnarmedStrikeAttack).oneOf()
    val state = initialFrenzyState(
      qRageState.with("occurrence", if (rageActive) RageUntilEndOfNextTurn else NoRageOccurrence),
      qRecklessAttackState
        .with("occurrence", if (recklessWhileRaging) RecklessAttackUntilStartOfTurn else NoRecklessAttackOccurrence)
        .with("attackRollMadeThisTurn", recklessWhileRaging),
      recklessWhileRaging
    ).with("firstEligibleHitResolvedThisTurn", qFrenzyUsedThisTurn)
    val result = resolveFrenzy(state, {
      hitWithAttackRoll: true,
      strengthBasedAttack: strengthAttack,
      attackForm: attackForm,
      barbarianLevel: 3,
      attackDamageType: SlashingDamage,
    })
    all {
      qFrenzyUsedThisTurn' = result.state.firstEligibleHitResolvedThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      qLastDamageAmount' = result.damageDice,
      qLastArmorClass' = qLastArmorClass,
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
      qLastArmorClass' = qLastArmorClass,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
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
      qLastArmorClass' = qLastArmorClass,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doEvasionReplacement = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet incapacitated = Set(true, false).oneOf()
    all {
      qLastDamageAmount' = saveDamageAfterSuccessToZeroFailureToHalfReplacement({
        savingThrowAbility: DexteritySavingThrowFact,
        normalSuccessfulSavingThrowDamage: HalfDamageOnSuccessfulSavingThrow,
        savingThrowSucceeded: savingThrowSucceeded,
        incapacitated: incapacitated,
      }, 20),
      qLastArmorClass' = qLastArmorClass,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doPassiveSavingThrowRollMode = {
    nondet incapacitated = Set(true, false).oneOf()
    nondet savingThrowAbility = Set(
      StrengthSavingThrowFact,
      DexteritySavingThrowFact,
      ConstitutionSavingThrowFact
    ).oneOf()
    nondet savingThrowCondition = Set(
      NoSavingThrowConditionFact,
      PoisonedSavingThrowConditionFact
    ).oneOf()
    nondet profile = Set(
      DexterityNotIncapacitatedSavingThrowAdvantageProfile,
      PoisonedConditionSavingThrowAdvantageProfile
    ).oneOf()
    val mode = passiveSavingThrowRollMode({
      profile: profile,
      savingThrowAbility: savingThrowAbility,
      savingThrowCondition: savingThrowCondition,
      incapacitated: incapacitated,
    })
    all {
      qLastDamageAmount' = if (mode == AdvantageSavingThrowMode) 1 else 0,
      qLastArmorClass' = qLastArmorClass,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doDefenseArmorClass = {
    nondet armorWorn = Set(NoArmorWorn, LightArmorWorn, MediumArmorWorn, HeavyArmorWorn).oneOf()
    all {
      qLastArmorClass' = defenseArmorClass(16, {
        armorWorn: armorWorn,
      }),
      qLastDamageAmount' = qLastDamageAmount,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doArcheryAttackRollBonus = {
    nondet weaponKind = Set(RangedWeapon, OtherWeapon).oneOf()
    val result = resolveArcheryAttackRoll({
      weaponKind: weaponKind,
      baseAttackRollTotal: 14,
      targetArmorClass: 16,
      naturalD20: 10,
    })
    all {
      qLastDamageAmount' = result.bonus,
      qLastArmorClass' = result.effectiveAttackRollTotal,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doWeaponDamageDiceRollChoice = {
    nondet criticalHit = Set(true, false).oneOf()
    nondet chooseSecond = Set(true, false).oneOf()
    val result = resolveWeaponDamageDiceRollChoice({
      hitWithWeapon: true,
      criticalHit: criticalHit,
      usedThisTurn: qWeaponDamageDiceRollChoiceUsedThisTurn,
      choosesFeature: true,
      weaponDamageDice: 1,
      weaponDamageDieSize: 8,
      firstCandidateTotal: if (criticalHit) 4 else 2,
      secondCandidateTotal: if (criticalHit) 12 else 8,
      chooseSecondCandidate: chooseSecond,
      damageModifier: 3,
    }, if (criticalHit) 6 else 4)
    all {
      qWeaponDamageDiceRollChoiceUsedThisTurn' = result.usedThisTurn,
      qLastDamageAmount' = result.effectiveDamage,
      qLastArmorClass' = result.weaponDamageDiceRolledPerCandidate,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doAttackRollMissToHitReplacement = {
    nondet naturalD20 = Set(1, 2, 10).oneOf()
    nondet choosesFeature = Set(true, false).oneOf()
    val result = resolveAttackRollMissToHitReplacement({
      naturalD20: naturalD20,
      total: if (naturalD20 == 10) 16 else 10,
      armorClass: 16,
      usedSinceTurnStart: qAttackRollMissToHitReplacementUsedSinceTurnStart,
      choosesFeature: choosesFeature,
    })
    all {
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = result.usedSinceTurnStart,
      qLastDamageAmount' = if (result.effectiveHits) 1 else 0,
      qLastArmorClass' = 16,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      recordTurn(qTurn),
    }
  }

  action doZeroHitPointReplacement = {
    nondet choosesFeature = Set(true, false).oneOf()
    nondet incomingDamage = Set(5, 16).oneOf()
    val result = resolveZeroHitPointReplacement(
      {
        kind: PlayerCharacter,
        hitPoints: 5,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      qFeaturePool,
      {
        incomingDamage: incomingDamage,
        choosesFeature: choosesFeature,
      }
    )
    all {
      recordFeaturePool(result.pool),
      qLastDamageAmount' = result.vitals.hitPoints,
      qLastArmorClass' = result.deathSavingThrows.failures,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(qTurn),
    }
  }

  action doFastMovementSpeedBonus = {
    nondet armorWorn = Set(NoArmorWorn, HeavyArmorWorn).oneOf()
    nondet movementSpentFeet = 0.to(10).oneOf()
    val result = resolvePassiveSpeedBonusDash(qTurn, NotWearingHeavyArmorSpeedBonus({
      baseSpeedFeet: 30,
      armorWorn: armorWorn,
      movementSpentFeet: movementSpentFeet,
    }))
    all {
      qLastDamageAmount' = result.movementRemainingFeet,
      qLastArmorClass' = result.speedFeet,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(resolveDash(qTurn, result.speedFeet, StandardActionCost(DashAction))),
    }
  }

  action doRovingSpeedKindGrants = {
    nondet armorWorn = Set(NoArmorWorn, HeavyArmorWorn).oneOf()
    nondet movementSpentFeet = 0.to(10).oneOf()
    nondet chosenSpeedKind = Set(WalkSpeedKind, ClimbSpeedKind, SwimSpeedKind).oneOf()
    val result = resolveRovingSpeedKindDash(qTurn, {
      baseSpeedFeet: 30,
      armorWorn: armorWorn,
      movementSpentFeet: movementSpentFeet,
      chosenSpeedKind: chosenSpeedKind,
    })
    all {
      qLastDamageAmount' = result.movementRemainingFeet,
      qLastArmorClass' = result.speedFeet,
      qFeatureUsesRemaining' = qFeatureUsesRemaining,
      qFeatureMaximumUses' = qFeatureMaximumUses,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
      recordTurn(resolveDash(qTurn, result.speedFeet, StandardActionCost(DashAction))),
    }
  }

  action doBonusActionDashTemporaryHitPoints = {
    nondet proficiencyBonus = 2.to(6).oneOf()
    nondet existingTemporaryHitPoints = 0.to(8).oneOf()
    nondet chooseNewTemporaryHitPoints = Set(true, false).oneOf()
    val result = resolveBonusActionDashTemporaryHitPoints(qTurn, qFeaturePool, {
      speedFeet: 30,
      proficiencyBonus: proficiencyBonus,
      existingTemporaryHitPoints: existingTemporaryHitPoints,
      chooseNewTemporaryHitPoints: chooseNewTemporaryHitPoints,
    })
    all {
      recordTurn(result.turn),
      recordFeaturePool(result.pool),
      qLastDamageAmount' = result.temporaryHitPoints,
      qLastArmorClass' = qLastArmorClass,
      qActionSurgeGrant' = qActionSurgeGrant,
      qRageOccurrence' = qRageOccurrence,
      qInterruptedConcentration' = qInterruptedConcentration,
      qReactorConcentration' = qReactorConcentration,
      qRecklessOccurrence' = qRecklessOccurrence,
      qAttackRollMadeThisTurn' = qAttackRollMadeThisTurn,
      qSneakAttackUsedThisTurn' = qSneakAttackUsedThisTurn,
      qFrenzyUsedThisTurn' = qFrenzyUsedThisTurn,
      qWeaponDamageDiceRollChoiceUsedThisTurn' = qWeaponDamageDiceRollChoiceUsedThisTurn,
      qAttackRollMissToHitReplacementUsedSinceTurnStart' = qAttackRollMissToHitReplacementUsedSinceTurnStart,
    }
  }

  action doStartTurn = all {
    recordTurn(startTurn(qTurn)),
    qActionSurgeGrant' = NoActionSurgeActionGrant,
    qRecklessOccurrence' = NoRecklessAttackOccurrence,
    qAttackRollMadeThisTurn' = false,
    qSneakAttackUsedThisTurn' = false,
    qFrenzyUsedThisTurn' = false,
    qWeaponDamageDiceRollChoiceUsedThisTurn' = false,
    qAttackRollMissToHitReplacementUsedSinceTurnStart' = false,
    qFeatureUsesRemaining' = qFeatureUsesRemaining,
    qFeatureMaximumUses' = qFeatureMaximumUses,
    qRageOccurrence' = qRageOccurrence,
    qInterruptedConcentration' = qInterruptedConcentration,
    qReactorConcentration' = qReactorConcentration,
    qLastDamageAmount' = qLastDamageAmount,
    qLastArmorClass' = qLastArmorClass,
  }

  action step = any {
    // Branch budget: feature-profile branches plus turn refresh. Each branch
    // samples bounded booleans or small fixture values.
    doActionSurge,
    doSecondWind,
    doCunningAction,
    doRage,
    doRecklessAttack,
    doSneakAttack,
    doFrenzy,
    doReactionReduction,
    doCriticalThreshold,
    doEvasionReplacement,
    doPassiveSavingThrowRollMode,
    doDefenseArmorClass,
    doArcheryAttackRollBonus,
    doFastMovementSpeedBonus,
    doRovingSpeedKindGrants,
    doBonusActionDashTemporaryHitPoints,
    doWeaponDamageDiceRollChoice,
    doAttackRollMissToHitReplacement,
    doZeroHitPointReplacement,
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
    qFrenzyUsedThisTurn.in(Set(true, false)),
    qWeaponDamageDiceRollChoiceUsedThisTurn.in(Set(true, false)),
    qAttackRollMissToHitReplacementUsedSinceTurnStart.in(Set(true, false)),
    qLastDamageAmount.in(0.to(120)),
    qLastArmorClass.in(0.to(40)),
    legalTurnProcedureState(qTurn),
    legalFeatureUsePool(qFeaturePool),
    legalActionSurgeState(qActionSurgeState),
    legalRageState(qRageState),
    legalFrenzyState(qFrenzyState),
  }
}
