// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-self-transformation-mode

module battleRuntimeSelfTransformation {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeMovement.* from "./battle-runtime-movement"

  pure def alterSelfDurationTicks: int = 60 * 10

  pure def alterSelfNaturalWeaponsMode(
    damageType: DamageType,
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): SelfTransformationMode =
    NaturalWeaponsMode({
      damageType: damageType,
      spellcastingAbilityModifier: spellcastingAbilityModifier,
      attackBonus: spellcastingAbilityModifier + proficiencyBonus,
    })

  pure def selfTransformationModeIsSameOption(
    left: SelfTransformationMode,
    right: SelfTransformationMode,
  ): bool =
    match left {
      | AquaticAdaptationMode => right == AquaticAdaptationMode
      | ChangeAppearanceMode => right == ChangeAppearanceMode
      | NaturalWeaponsMode(_) => match right {
        | NaturalWeaponsMode(_) => true
        | _ => false
      }
    }

  pure def selfTransformationModeIsNaturalWeapons(mode: SelfTransformationMode): bool =
    match mode {
      | NaturalWeaponsMode(_) => true
      | _ => false
    }

  pure def naturalWeaponsUnarmedStrikeDamageDieSize(mode: SelfTransformationMode): int =
    match mode {
      | NaturalWeaponsMode(_) => 6
      | _ => 0
    }

  pure def naturalWeaponsUnarmedStrikeDamageType(mode: SelfTransformationMode): DamageType =
    match mode {
      | NaturalWeaponsMode(data) => data.damageType
      | _ => Bludgeoning
    }

  pure def naturalWeaponsUnarmedStrikeAttackBonus(mode: SelfTransformationMode): int =
    match mode {
      | NaturalWeaponsMode(data) => data.attackBonus
      | _ => 0
    }

  pure def naturalWeaponsUnarmedStrikeDamage(
    mode: SelfTransformationMode,
    damageRoll: int,
  ): int =
    match mode {
      | NaturalWeaponsMode(data) => damageRoll + data.spellcastingAbilityModifier
      | _ => 0
    }

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

  pure def activeEffectsContainSelfTransformationModeOption(
    effects: Set[ActiveEffect],
    source: Actor,
    mode: SelfTransformationMode,
  ): bool =
    effects.exists(effect => match effect {
      | SelfTransformationModeEffect(data) =>
        data.source == source and selfTransformationModeIsSameOption(data.mode, mode)
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
      not(activeEffectsContainSelfTransformationModeOption(state.fighter.activeEffects, Fighter, mode)) and
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
