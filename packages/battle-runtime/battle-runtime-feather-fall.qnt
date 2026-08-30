// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-feather-fall-mitigation

module battleRuntimeFeatherFall {
  import battleRuntimeFallingCreatureMitigationReaction.* from "./battle-runtime-falling-creature-mitigation-reaction"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  pure def featherFallMitigationActiveEffect(): ActiveEffect =
    FeatherFallMitigation({ durationTicks: fallingCreatureMitigationDurationTicks })

  pure def activeFeatherFallDescentRateCapFeetPerRound(effects: Set[ActiveEffect]): int =
    fallingCreatureMitigationDescentRateCap(effects.exists(effect => match effect {
      | FeatherFallMitigation(_) => true
      | _ => false
    }))

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
    triggeringFallingCreature: Actor,
    triggerWitness: FallingCreatureMitigationTriggerWitness[Actor],
    targets: Set[Actor],
    fallingTargets: Set[Actor],
    targetCount: int,
  ): BattleState =
    val reactor = fallingCreatureMitigationTriggerReactor(triggerWitness)
    if (fallingCreatureMitigationReactionAdmitted(
      triggerWitness,
      triggeringFallingCreature,
      reactorCanReact(state, reactor),
      canActorExpendSpellSlotThisTurn(state, reactor),
      targets.size(),
      targetCount,
      targets.forall(target => fallingTargets.contains(target)),
    )) {
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
    if (fallingCreatureLandingPreventsFallConsequences(mitigated))
      FeatherFallLandingMitigated({ state: nextState })
    else
      FeatherFallLandingUnmitigated({ state: nextState })
}
