// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-attack-count-scaling

module battleRuntimeFeatureTurnEndEffects {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def removeFighterBonusActionOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: {
          ...state.fighter.activeOngoingFeatureOccurrences,
          rage: NoActiveOngoingFeatureOccurrence,
        },
      },
    }

  pure def removeFighterFirstAttackRollOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: {
          ...state.fighter.activeOngoingFeatureOccurrences,
          recklessAttack: NoActiveOngoingFeatureOccurrence,
        },
      },
    }

  pure def expireFighterEndOfTurnOngoingFeatures(state: BattleState): BattleState =
    if (currentActor(state) != Fighter)
      state
    else {
      val afterRoundExtended = match fighterRageOccurrence(state) {
        | ActiveRoundExtendedOngoingFeature(data) =>
            if (data.expiresAtEndOfFighterTurnRound == state.initiative.round)
              removeFighterBonusActionOngoingFeature(state)
            else
              state
        | _ => state
      }
      match fighterRageOccurrence(afterRoundExtended) {
        | ActiveFixedDurationOngoingFeature(data) =>
            if (data.expiresAtEndOfFighterTurnRound == state.initiative.round)
              removeFighterBonusActionOngoingFeature(afterRoundExtended)
            else
              afterRoundExtended
        | _ => afterRoundExtended
      }
    }

  pure def expireFighterStartOfTurnOngoingFeatures(state: BattleState, nextActor: Actor): BattleState =
    if (nextActor == Fighter)
      removeFighterFirstAttackRollOngoingFeature(state)
    else
      state

  pure def normalizeFighterEarlyEndedOngoingFeatures(state: BattleState): BattleState =
    if (state.fighter.wearingHeavyArmor)
      removeFighterBonusActionOngoingFeature(state)
    else if (state.fighter.incapacitated or state.fighter.unconscious)
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeOngoingFeatureOccurrences: {
            ...state.fighter.activeOngoingFeatureOccurrences,
            rage: if (state.fighter.unconscious)
              NoActiveOngoingFeatureOccurrence
            else
              match fighterRageOccurrence(state) {
                | ActiveRoundExtendedOngoingFeature(_) => NoActiveOngoingFeatureOccurrence
                | _ => fighterRageOccurrence(state)
              },
          },
        },
      }
    else
      state
}
