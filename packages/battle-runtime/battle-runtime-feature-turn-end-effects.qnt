// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-attack-count-scaling

module battleRuntimeFeatureTurnEndEffects {
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import unitFeatureActionCountCore.* from "../shared-algebras/proofs/rule-core/unit-feature-action-count-core"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  // RAW trace:
  // - Classes/Fighter.md Level 5: Extra Attack lets a Fighter attack twice
  //   instead of once when taking the Attack action on their turn.
  // - Rules-Glossary.md "Moving between Attacks" says movement may be
  //   interleaved between attacks granted by a feature such as Extra Attack.
  // The runtime-owned turn-end fact here is only cleanup of an unspent
  // Attack-action slot when the turn ends; route geometry remains table-owned.

  pure def battleRuntimeAttackCountState(
    actionAvailable: bool,
    extraAttackSlotsRemaining: AttackActionAdditionalAttacks
  ): AttackActionAttackCountState = {
    actionAvailable: actionAvailable,
    additionalAttacksRemaining: extraAttackSlotsRemaining,
    attacksResolved: 0,
    movementSegmentsTaken: 0,
    turnEnded: false,
  }

  pure def battleRuntimeExtraAttackSlotsAfterEndTurn(
    extraAttackSlotsRemaining: AttackActionAdditionalAttacks
  ): AttackActionAdditionalAttacks = {
    val ended = endTurnDuringAttackActionAttackCount(battleRuntimeAttackCountState(false, extraAttackSlotsRemaining))
    ended.additionalAttacksRemaining
  }

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
