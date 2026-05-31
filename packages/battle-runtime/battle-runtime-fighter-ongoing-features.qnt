// -*- mode: Bluespec; -*-

module battleRuntimeFighterOngoingFeatures {
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"

  pure def fighterRageOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.get(FIGHTER_RAGE_SOURCE_KEY)

  pure def fighterRecklessAttackOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.get(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY)

  pure def fighterHasRage(state: BattleState): bool =
    fighterRageOccurrence(state) != NoActiveOngoingFeatureOccurrence

  pure def fighterHasRoundExtendedRage(state: BattleState): bool =
    match fighterRageOccurrence(state) {
      | ActiveRoundExtendedOngoingFeature(_) => true
      | _ => false
    }

  pure def fighterHasRecklessAttack(state: BattleState): bool =
    fighterRecklessAttackOccurrence(state) == ActiveStartOfTurnOngoingFeature

  pure def fighterRageResistances(state: BattleState): Set[DamageType] =
    {
      val projection = battleRuntimeRageResistanceProjection(fighterHasRage(state))
      Set()
        .union(if (projection.bludgeoning) Set(Bludgeoning) else Set())
        .union(if (projection.piercing) Set(Piercing) else Set())
        .union(if (projection.slashing) Set(Slashing) else Set())
    }

  pure def removeFighterBonusActionOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RAGE_SOURCE_KEY, NoActiveOngoingFeatureOccurrence),
      },
    }

  pure def removeFighterFirstAttackRollOngoingFeature(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY, NoActiveOngoingFeatureOccurrence),
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
          activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
            .set(FIGHTER_RAGE_SOURCE_KEY, if (state.fighter.unconscious)
              NoActiveOngoingFeatureOccurrence
            else
              match fighterRageOccurrence(state) {
                | ActiveRoundExtendedOngoingFeature(_) => NoActiveOngoingFeatureOccurrence
                | _ => fighterRageOccurrence(state)
              }),
        },
      }
    else
      state

  pure def fighterRoundExtendedOngoingFeatureMaxExpiresRound(state: BattleState): int =
    match fighterRageOccurrence(state) {
      | ActiveRoundExtendedOngoingFeature(data) => data.maxExpiresRound
      | _ => state.initiative.round + 100
    }

  pure def setFighterRoundExtendedOngoingFeatureExpiry(state: BattleState, round: int): BattleState = {
    val maxRound = fighterRoundExtendedOngoingFeatureMaxExpiresRound(state)
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
          .set(FIGHTER_RAGE_SOURCE_KEY, ActiveRoundExtendedOngoingFeature({
            expiresAtEndOfFighterTurnRound: if (round > maxRound) maxRound else round,
            maxExpiresRound: maxRound,
          })),
      },
    }
  }

  pure def startRage(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...setFighterRoundExtendedOngoingFeatureExpiry({ ...state, fighter: { ...breakConcentration(state.fighter), readiedSpellHeld: false } }, state.initiative.round + 1),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def startPersistentRage(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      usesRemaining > 0 and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor) and
      not(fighterHasRage(state))
    )
      {
        state: {
          ...state,
          fighter: {
            ...breakConcentration(state.fighter),
            activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
              .set(FIGHTER_RAGE_SOURCE_KEY, ActiveFixedDurationOngoingFeature({
                expiresAtEndOfFighterTurnRound: state.initiative.round + 100,
              })),
            readiedSpellHeld: false,
          },
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining - 1,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def extendRageWithBonusAction(state: BattleState, usesRemaining: int): SecondWindResult =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      fighterHasRage(state) and
      fighterHasRoundExtendedRage(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(state.fighter.wearingHeavyArmor)
    )
      {
        state: {
          ...setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1),
          bonusActionAvailable: false,
        },
        usesRemaining: usesRemaining,
      }
    else
      { state: state, usesRemaining: usesRemaining }

  pure def extendRageWithAttackRoll(state: BattleState, target: Actor): BattleState =
    if (currentActor(state) == Fighter and actorsAreEnemies(Fighter, target) and fighterHasRoundExtendedRage(state))
      setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1)
    else
      state

  pure def recordFighterAttackRoll(state: BattleState): BattleState =
    { ...battleStateAfterTargetActionEarlyEndForActor(extendRageWithAttackRoll(state, Goblin), Fighter), attackRollMadeThisTurn: true }

  pure def extendRageWithEnemySavingThrow(state: BattleState, target: Actor): BattleState =
    if (currentActor(state) == Fighter and actorsAreEnemies(Fighter, target) and fighterHasRoundExtendedRage(state))
      setFighterRoundExtendedOngoingFeatureExpiry(state, state.initiative.round + 1)
    else
      state

  pure def activateRecklessAttackOnFirstAttackRoll(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      battleRuntimeRecklessAttackActivates(
        fighterHasRecklessAttack(state),
        state.attackRollMadeThisTurn,
        true,
        true,
      )
    )
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeOngoingFeatureOccurrences: state.fighter.activeOngoingFeatureOccurrences
            .set(FIGHTER_RECKLESS_ATTACK_SOURCE_KEY, ActiveStartOfTurnOngoingFeature),
        },
      }
    else
      state

  pure def goblinAttackAgainstFighterHasAdvantage(state: BattleState): bool =
    battleRuntimeRecklessAttackGrantsIncomingAttackAdvantage(fighterHasRecklessAttack(state))
}
