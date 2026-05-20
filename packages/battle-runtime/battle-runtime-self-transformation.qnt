// -*- mode: Bluespec; -*-

module battleRuntimeSelfTransformation {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeMovement.* from "./battle-runtime-movement"

  pure def alterSelfDurationTicks: int = 60 * 10

  pure def selfTransformationModeActiveEffect(
    source: Actor,
    mode: SelfTransformationMode,
    durationTicks: int,
  ): ActiveEffect =
    SelfTransformationModeEffect({
      source: source,
      mode: mode,
      durationTicks: durationTicks,
    })

  pure def activeEffectsWithoutSelfTransformationModeFrom(
    effects: Set[ActiveEffect],
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SelfTransformationModeEffect(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainSelfTransformationModeFrom(
    effects: Set[ActiveEffect],
    source: Actor,
  ): bool =
    effects.exists(effect => match effect {
      | SelfTransformationModeEffect(data) => data.source == source
      | _ => false
    })

  pure def activeEffectsContainSelfTransformationMode(
    effects: Set[ActiveEffect],
    source: Actor,
    mode: SelfTransformationMode,
  ): bool =
    effects.exists(effect => match effect {
      | SelfTransformationModeEffect(data) => data.source == source and data.mode == mode
      | _ => false
    })

  pure def activeEffectsSelfTransformationModeDurationTicks(
    effects: Set[ActiveEffect],
    source: Actor,
  ): int =
    effects.map(effect => match effect {
      | SelfTransformationModeEffect(data) => if (data.source == source) data.durationTicks else 0
      | _ => 0
    }).fold(0, (highest, durationTicks) => if (highest > durationTicks) highest else durationTicks)

  pure def combatantCanBreatheUnderwater(combatant: Combatant, source: Actor): bool =
    activeEffectsContainSelfTransformationMode(combatant.activeEffects, source, AquaticAdaptationMode)

  pure def applySelfTransformationMode(
    combatant: Combatant,
    source: Actor,
    mode: SelfTransformationMode,
    durationTicks: int,
  ): Combatant =
    {
      ...combatant,
      activeEffects: activeEffectsWithoutSelfTransformationModeFrom(
        combatant.activeEffects,
        source
      ).union(Set(selfTransformationModeActiveEffect(source, mode, durationTicks))),
    }

  pure def resolveAlterSelfSelfTransformationMode(
    state: BattleState,
    mode: SelfTransformationMode,
    slotLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 2 and
      canSpendFighterSpellActionCost(state, SpellMagicAction) and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val withMode = {
        ...withoutPrior,
        fighter: {
          ...applySelfTransformationMode(
            withoutPrior.fighter,
            Fighter,
            mode,
            alterSelfDurationTicks
          ),
          concentrating: true,
        },
      }
      commitActorSpellSlotUse(spendFighterSpellActionCost(withMode, SpellMagicAction), Fighter)
    } else {
      state
    }

  pure def replaceAlterSelfSelfTransformationMode(
    state: BattleState,
    mode: SelfTransformationMode,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.fighter.concentrating and
      activeEffectsContainSelfTransformationModeFrom(state.fighter.activeEffects, Fighter) and
      not(activeEffectsContainSelfTransformationMode(state.fighter.activeEffects, Fighter, mode)) and
      canSpendFighterSpellActionCost(state, SpellMagicAction) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated)
    ) {
      val remainingDuration =
        activeEffectsSelfTransformationModeDurationTicks(state.fighter.activeEffects, Fighter)
      spendFighterSpellActionCost({
        ...state,
        fighter: applySelfTransformationMode(state.fighter, Fighter, mode, remainingDuration),
      }, SpellMagicAction)
    } else {
      state
    }
}
