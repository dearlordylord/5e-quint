// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-feather-fall-mitigation

module battleRuntimeFeatherFall {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  pure def featherFallMitigationActiveEffect(): ActiveEffect =
    FeatherFallMitigation({ durationTicks: 10 })

  pure def activeFeatherFallDescentRateCapFeetPerRound(effects: Set[ActiveEffect]): int =
    if (effects.exists(effect => match effect {
      | FeatherFallMitigation(_) => true
      | _ => false
    })) 60 else 0

  pure def activeEffectsWithoutFeatherFallMitigation(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FeatherFallMitigation(_) => false
      | _ => true
    })

  pure def activeEffectsContainFeatherFallMitigation(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | FeatherFallMitigation(_) => true
      | _ => false
    })

  pure def featherFallLandingState(result: FeatherFallLandingResult): BattleState =
    match result {
      | FeatherFallLandingMitigated(data) => data.state
      | FeatherFallLandingUnmitigated(data) => data.state
    }

  pure def featherFallLandingFallDamagePrevented(result: FeatherFallLandingResult): bool =
    match result {
      | FeatherFallLandingMitigated(_) => true
      | FeatherFallLandingUnmitigated(_) => false
    }

  pure def featherFallLandingFallingPronePrevented(result: FeatherFallLandingResult): bool =
    match result {
      | FeatherFallLandingMitigated(_) => true
      | FeatherFallLandingUnmitigated(_) => false
    }

  pure def resolveFeatherFallSpell(
    state: BattleState,
    reactor: Actor,
    targets: Set[Actor],
    fallingTargets: Set[Actor],
    targetCount: int,
  ): BattleState =
    if (
      reactorCanReact(state, reactor) and
      canActorExpendSpellSlotThisTurn(state, reactor) and
      targets.size() >= 1 and
      targetCount == targets.size() and
      targetCount <= 5 and
      targets.forall(target => fallingTargets.contains(target))
    ) {
      val spentReaction = spendReaction(state, reactor)
      val effect = featherFallMitigationActiveEffect
      commitActorSpellSlotUse({
        ...spentReaction,
        fighter: if (targets.contains(Fighter))
          { ...spentReaction.fighter, activeEffects: spentReaction.fighter.activeEffects.union(Set(effect)) }
        else
          spentReaction.fighter,
        goblin: if (targets.contains(Goblin))
          { ...spentReaction.goblin, activeEffects: spentReaction.goblin.activeEffects.union(Set(effect)) }
        else
          spentReaction.goblin,
      }, reactor)
    } else {
      state
    }

  pure def resolveFeatherFallLanding(state: BattleState, target: Actor): FeatherFallLandingResult =
    val targetEffects = match target {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }
    val mitigated = activeEffectsContainFeatherFallMitigation(targetEffects)
    val nextState = if (mitigated) {
      match target {
        | Fighter => {
            ...state,
            fighter: {
              ...state.fighter,
              activeEffects: activeEffectsWithoutFeatherFallMitigation(state.fighter.activeEffects),
            },
          }
        | Goblin => {
            ...state,
            goblin: {
              ...state.goblin,
              activeEffects: activeEffectsWithoutFeatherFallMitigation(state.goblin.activeEffects),
            },
          }
      }
    } else {
      state
    }
    if (mitigated)
      FeatherFallLandingMitigated({ state: nextState })
    else
      FeatherFallLandingUnmitigated({ state: nextState })
}
