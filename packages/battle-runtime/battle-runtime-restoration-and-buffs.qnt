// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.scalar-buff

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
module battleRuntimeRestorationAndBuffs {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"

  pure def battleRuntimeDirectRestorationProfile(
    invocation: DirectHitPointRestorationSpell
  ): BattleRuntimeDirectHitPointRestorationProfile =
    match invocation {
      | HealingWordRestoration => BattleRuntimeHealingWordRestoration
      | CureWoundsRestoration => BattleRuntimeCureWoundsRestoration
      | MassHealingWordRestoration => BattleRuntimeMassHealingWordRestoration
    }

  pure def directHitPointRestorationActionCost(invocation: DirectHitPointRestorationSpell): SpellActionCost =
    if (battleRuntimeDirectHitPointRestorationUsesBonusAction(battleRuntimeDirectRestorationProfile(invocation)))
      SpellBonusAction
    else
      SpellMagicAction

  pure def directHitPointRestorationMaximumTargets(invocation: DirectHitPointRestorationSpell): int =
    battleRuntimeDirectHitPointRestorationMaximumTargets(battleRuntimeDirectRestorationProfile(invocation), 3)

  pure def directHitPointRestorationHealing(
    healingRoll: int,
    spellcastingAbilityModifier: int
  ): int =
    battleRuntimeDirectHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier)

  pure def resolveDirectHitPointRestoration(
    state: BattleState,
    invocation: DirectHitPointRestorationSpell,
    targetCount: int,
    healingRoll: int,
    spellcastingAbilityModifier: int,
  ): BattleState = {
    val actionCost = directHitPointRestorationActionCost(invocation)
    val validTargetCount = targetCount >= 1 and targetCount <= directHitPointRestorationMaximumTargets(invocation)
    val canSpendActionCost = canSpendFighterSpellActionCost(state, actionCost)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      canSpendActionCost and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val healed = applyHealing(
        state.fighter,
        directHitPointRestorationHealing(healingRoll, spellcastingAbilityModifier)
      )
      commitActorSpellSlotUse({
        ...spendFighterSpellActionCost(state, actionCost),
        fighter: healed,
      }, Fighter)
    } else {
      state
    }
  }

  pure def scalarBuffActionCost(invocation: ScalarBuffSpell): SpellActionCost =
    if (battleRuntimeScalarBuffUsesBonusAction(battleRuntimeScalarBuffProfileForInvocation(invocation))) SpellBonusAction
    else SpellMagicAction

  pure def scalarBuffMaximumTargets(invocation: ScalarBuffSpell, slotLevel: int): int =
    battleRuntimeScalarBuffMaximumTargets(battleRuntimeScalarBuffProfileForInvocation(invocation), slotLevel)

  pure def scalarBuffTargetDispositionIsSatisfied(
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    knownWillingTargets: Set[Actor],
  ): bool =
    if (invocation == BarkskinScalarBuff or invocation == SpiderClimbScalarBuff or invocation == FlyScalarBuff)
      targets.forall(target => knownWillingTargets.contains(target))
    else
      true

  pure def scalarBuffTemporaryHitPoints(invocation: ScalarBuffSpell, slotLevel: int, rolledDice: int): int =
    battleRuntimeScalarBuffTemporaryHitPoints(battleRuntimeScalarBuffProfileForInvocation(invocation), slotLevel, rolledDice)

  pure def aidDurationTicks: int = 8 * 60 * 10
  pure def barkskinDurationTicks: int = 1 * 60 * 10
  pure def flyDurationTicks: int = 10 * 10

  type FlySpeedGrantEndFallWitness =
    | FlyEndTargetNotAloft
    | FlyEndTargetCanStopFall
    | FlyEndTargetCannotStopFall({
        featherFallReactor: Actor,
        featherFallTargets: Set[Actor],
      })

  type FlySpeedGrantEndFallWitnessResult =
    FlyEndInvalid({ state: BattleState, target: Actor }) |
    FlyEndNoFall({ state: BattleState, target: Actor }) |
    FlyEndFalls({ state: BattleState, target: Actor })

  pure def scalarBuffActiveEffects(invocation: ScalarBuffSpell, slotLevel: int): Set[ActiveEffect] =
    battleRuntimeScalarBuffEffects(battleRuntimeScalarBuffProfileForInvocation(invocation), 0, slotLevel)
      .map(scalarBuffActiveEffect)

  pure def scalarBuffActiveEffect(effect: BattleRuntimeScalarBuffEffect): ActiveEffect =
    match effect {
      | BattleRuntimeLongstriderSpeedIncreaseEffect => LongstriderSpeedDelta
      | BattleRuntimeShieldOfFaithArmorClassBonusEffect => ShieldOfFaithArmorClassBonus
      | BattleRuntimeSpiderClimbClimbSpeedGrantEffect => SpiderClimbClimbSpeedGrant({ durationTicks: 600 })
      | BattleRuntimeFlySpeedHoverGrantEffect => FlySpeedHoverGrant({ durationTicks: flyDurationTicks })
      | BattleRuntimeBarkskinArmorClassFloorEffect => BarkskinArmorClassFloor({ durationTicks: barkskinDurationTicks })
      | BattleRuntimeHeroismFrightenedImmunityEffect => HeroismFrightenedImmunity
      | BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect(data) => HeroismTurnStartTemporaryHitPoints(data)
      | BattleRuntimeAidHitPointMaximumIncreaseEffect(data) => AidHitPointMaximumIncrease({ amount: data.amount, durationTicks: aidDurationTicks })
    }

  pure def activeEffectsWithoutFlySpeedHoverGrant(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FlySpeedHoverGrant(_) => false
      | _ => true
    })

  pure def activeEffectsContainFlySpeedHoverGrant(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | FlySpeedHoverGrant(_) => true
      | _ => false
    })

  pure def stateWithoutEndedFlySpeedGrant(state: BattleState, source: Actor, target: Actor): BattleState = {
    val cleaned = match target {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: activeEffectsWithoutFlySpeedHoverGrant(state.fighter.activeEffects),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: activeEffectsWithoutFlySpeedHoverGrant(state.goblin.activeEffects),
          },
        }
    }
    match source {
      | Fighter => { ...cleaned, fighter: { ...cleaned.fighter, concentrating: false } }
      | Goblin => { ...cleaned, goblin: { ...cleaned.goblin, concentrating: false } }
    }
  }

  pure def flySpeedGrantEndFallCleanupFrame(target: Actor): InterruptFrame =
    PendingFlySpeedGrantEndFallCleanup({ target: target })

  pure def stateWithFlySpeedGrantEndFallCleanupFrame(state: BattleState, target: Actor): BattleState =
    { ...state, interruptStack: state.interruptStack.append(flySpeedGrantEndFallCleanupFrame(target)) }

  pure def interruptStackWithoutFrame(stack: List[InterruptFrame], frameToRemove: InterruptFrame): List[InterruptFrame] =
    stack.foldl(List(), (remaining, frame) =>
      if (frame == frameToRemove)
        remaining
      else
        remaining.append(frame)
    )

  pure def stateWithoutFlySpeedGrantEndFallCleanupFrame(state: BattleState, target: Actor): BattleState =
    {
      ...state,
      interruptStack: interruptStackWithoutFrame(state.interruptStack, flySpeedGrantEndFallCleanupFrame(target)),
    }

  pure def stateHasFlySpeedGrantEndFallCleanupFrame(state: BattleState, target: Actor): bool =
    state.interruptStack.foldl(false, (found, frame) =>
      found or frame == flySpeedGrantEndFallCleanupFrame(target)
    )

  pure def breakFlySpeedGrantForEndFall(state: BattleState, source: Actor, target: Actor): BattleState =
    stateWithFlySpeedGrantEndFallCleanupFrame(
      stateWithoutEndedFlySpeedGrant(state, source, target),
      target,
    )

  pure def stateAfterFlySpeedGrantConcentrationCleanup(state: BattleState, source: Actor): BattleState = {
    val fighterCleaned =
      if (activeEffectsContainFlySpeedHoverGrant(state.fighter.activeEffects))
        breakFlySpeedGrantForEndFall(state, source, Fighter)
      else
        state
    if (activeEffectsContainFlySpeedHoverGrant(state.goblin.activeEffects))
      breakFlySpeedGrantForEndFall(fighterCleaned, source, Goblin)
    else
      fighterCleaned
  }

  pure def resolveFlySpeedGrantEndFallCleanup(
    state: BattleState,
    source: Actor,
    target: Actor,
    witness: FlySpeedGrantEndFallWitness,
  ): FlySpeedGrantEndFallWitnessResult = {
    if (not(stateHasFlySpeedGrantEndFallCleanupFrame(state, target)))
      FlyEndInvalid({ state: state, target: target })
    else {
      val cleaned = stateWithoutFlySpeedGrantEndFallCleanupFrame(state, target)
      match witness {
        | FlyEndTargetNotAloft => FlyEndNoFall({ state: cleaned, target: target })
        | FlyEndTargetCanStopFall => FlyEndNoFall({ state: cleaned, target: target })
        | FlyEndTargetCannotStopFall(data) =>
            FlyEndFalls({
              state: resolveFeatherFallSpell(
                cleaned,
                data.featherFallReactor,
                data.featherFallTargets,
                Set(target),
                data.featherFallTargets.size(),
              ),
              target: target,
            })
      }
    }
  }

  pure def combatantWithAidHitPointMaximumIncrease(
    combatant: Combatant,
    effect: Set[ActiveEffect],
  ): Combatant = {
    val activeAmount = aidHitPointMaximumIncreaseAppliedAmount(combatant.activeEffects)
    val activeEffects = combatant.activeEffects.union(effect)
    val nextActiveAmount = aidHitPointMaximumIncreaseAppliedAmount(activeEffects)
    val hpIncrease = nextActiveAmount - activeAmount
    {
      ...combatant,
      hp: combatant.hp + hpIncrease,
      maxHp: combatant.maxHp + hpIncrease,
      activeEffects: activeEffects,
    }
  }

  pure def scalarBuffCombatant(
    combatant: Combatant,
    invocation: ScalarBuffSpell,
    slotLevel: int,
    rolledDice: int,
  ): Combatant = {
    val activeEffects = scalarBuffActiveEffects(invocation, slotLevel)
    if (invocation == FalseLifeScalarBuff)
      { ...combatant, tempHp: if (combatant.tempHp > scalarBuffTemporaryHitPoints(invocation, slotLevel, rolledDice)) combatant.tempHp else scalarBuffTemporaryHitPoints(invocation, slotLevel, rolledDice) }
    else if (invocation == AidScalarBuff)
      combatantWithAidHitPointMaximumIncrease(combatant, activeEffects)
    else
      { ...combatant, activeEffects: combatant.activeEffects.union(activeEffects) }
  }

  pure def scalarBuffTargetedState(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) scalarBuffCombatant(state.fighter, invocation, slotLevel, rolledDice) else state.fighter,
      goblin: if (targets.contains(Goblin)) scalarBuffCombatant(state.goblin, invocation, slotLevel, rolledDice) else state.goblin,
    }

  pure def resolveScalarBuffSpell(
    state: BattleState,
    invocation: ScalarBuffSpell,
    targets: Set[Actor],
    knownWillingTargets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState = {
    resolveScalarBuffSpellWithActionCost(
      state,
      invocation,
      scalarBuffActionCost(invocation),
      targets,
      knownWillingTargets,
      slotLevel,
      rolledDice,
    )
  }

  pure def resolveScalarBuffSpellWithActionCost(
    state: BattleState,
    invocation: ScalarBuffSpell,
    actionCost: SpellActionCost,
    targets: Set[Actor],
    knownWillingTargets: Set[Actor],
    slotLevel: int,
    rolledDice: int,
  ): BattleState = {
    val targetCount = targets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= scalarBuffMaximumTargets(invocation, slotLevel)
    val validTargetDisposition = scalarBuffTargetDispositionIsSatisfied(invocation, targets, knownWillingTargets)
    val canSpendActionCost = canSpendFighterSpellActionCost(state, actionCost)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      validTargetDisposition and
      canSpendActionCost and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase =
        if (battleRuntimeScalarBuffRequiresConcentration(battleRuntimeScalarBuffProfileForInvocation(invocation)))
          if (invocation == FlyScalarBuff)
            stateAfterFlySpeedGrantConcentrationCleanup(state, Fighter)
          else
            {
              ...state,
              fighter: breakConcentration(state.fighter),
              goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
            }
        else
          state
      val effected = scalarBuffTargetedState(concentrationBase, invocation, targets, slotLevel, rolledDice)
      val spent = spendFighterSpellActionCost(effected, actionCost)
      commitActorSpellSlotUse({
        ...spent,
        fighter: { ...spent.fighter, concentrating: if (battleRuntimeScalarBuffRequiresConcentration(battleRuntimeScalarBuffProfileForInvocation(invocation))) true else spent.fighter.concentrating },
      }, Fighter)
    } else {
      state
    }
  }

  pure def resolveHeroismSpell(
    state: BattleState,
    targets: Set[Actor],
    slotLevel: int,
    spellcastingAbilityModifier: int,
  ): BattleState = {
    val targetCount = targets.size()
    val validTargetCount = targetCount >= 1 and targetCount <= slotLevel
    val knownWillingTargets = targets == Set(Fighter)
    if (
      currentActor(state) == Fighter and
      validTargetCount and
      knownWillingTargets and
      canSpendFighterSpellActionCost(state, SpellMagicAction) and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val heroismEffects = battleRuntimeScalarBuffEffects(BattleRuntimeHeroismScalarBuff, spellcastingAbilityModifier, slotLevel)
        .map(scalarBuffActiveEffect)
      val spent = spendFighterSpellActionCost(concentrationBase, SpellMagicAction)
      commitActorSpellSlotUse({
        ...spent,
        fighter: if (targets.contains(Fighter)) { ...spent.fighter, concentrating: true, activeEffects: spent.fighter.activeEffects.union(heroismEffects) } else { ...spent.fighter, concentrating: true },
        goblin: if (targets.contains(Goblin)) { ...spent.goblin, activeEffects: spent.goblin.activeEffects.union(heroismEffects) } else spent.goblin,
      }, Fighter)
    } else {
      state
    }
  }
}
