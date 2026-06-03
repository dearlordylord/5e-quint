// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-creature-size-change

module battleRuntimeCreatureSizeChange {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

  type CreatureSizeChangeAttackKind =
    | SizeChangeWeaponAttack
    | SizeChangeUnarmedStrike
    | SizeChangeOtherAttack

  pure val creatureSizeChangeDurationTicks = 10

  pure def creatureSizeChangeActiveEffect(
    source: Actor,
    mode: CreatureSizeChangeMode,
  ): ActiveEffect =
    CreatureSizeChange({
      source: source,
      mode: mode,
      durationTicks: creatureSizeChangeDurationTicks,
    })

  pure def activeEffectsWithoutCreatureSizeChange(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | CreatureSizeChange(_) => false
      | _ => true
    })

  pure def activeEffectsContainCreatureSizeChangeMode(
    effects: Set[ActiveEffect],
    mode: CreatureSizeChangeMode,
  ): bool =
    effects.exists(effect => match effect {
      | CreatureSizeChange(data) => data.mode == mode
      | _ => false
    })

  pure def creatureSizeFromRank(rank: int): CreatureSize =
    if (rank <= 0) Tiny
    else if (rank == 1) Small
    else if (rank == 2) Medium
    else if (rank == 3) Large
    else if (rank == 4) Huge
    else Gargantuan

  pure def shiftedCreatureSize(
    baseSize: CreatureSize,
    mode: CreatureSizeChangeMode,
  ): CreatureSize = {
    val delta = if (mode == EnlargeCreatureMode) 1 else -1
    creatureSizeFromRank(creatureSizeRank(baseSize) + delta)
  }

  pure def effectiveCreatureSize(
    baseSize: CreatureSize,
    effects: Set[ActiveEffect],
  ): CreatureSize =
    if (activeEffectsContainCreatureSizeChangeMode(effects, EnlargeCreatureMode))
      shiftedCreatureSize(baseSize, EnlargeCreatureMode)
    else if (activeEffectsContainCreatureSizeChangeMode(effects, ReduceCreatureMode))
      shiftedCreatureSize(baseSize, ReduceCreatureMode)
    else
      baseSize

  pure def creatureSizeChangeStrengthAbilityCheckRollMode(
    effects: Set[ActiveEffect],
    ability: Ability,
  ): AbilityCheckRollMode =
    if (ability != StrAbility)
      NormalAbilityCheck
    else if (activeEffectsContainCreatureSizeChangeMode(effects, EnlargeCreatureMode))
      AdvantageAbilityCheck
    else if (activeEffectsContainCreatureSizeChangeMode(effects, ReduceCreatureMode))
      DisadvantageAbilityCheck
    else
      NormalAbilityCheck

  pure def creatureSizeChangeStrengthSavingThrowRollMode(
    effects: Set[ActiveEffect],
    ability: Ability,
  ): SavingThrowRollMode =
    if (ability != StrAbility)
      NormalSavingThrow
    else if (activeEffectsContainCreatureSizeChangeMode(effects, EnlargeCreatureMode))
      AdvantageSavingThrow
    else if (activeEffectsContainCreatureSizeChangeMode(effects, ReduceCreatureMode))
      DisadvantageSavingThrow
    else
      NormalSavingThrow

  pure def creatureSizeChangeAttackDamageTotal(
    attackHitDamage: int,
    effects: Set[ActiveEffect],
    attackKind: CreatureSizeChangeAttackKind,
    sizeChangeRoll: int,
  ): int =
    if (attackKind == SizeChangeOtherAttack)
      attackHitDamage
    else if (activeEffectsContainCreatureSizeChangeMode(effects, EnlargeCreatureMode))
      attackHitDamage + sizeChangeRoll
    else if (activeEffectsContainCreatureSizeChangeMode(effects, ReduceCreatureMode)) {
      val reduced = attackHitDamage - sizeChangeRoll
      if (reduced < 1) 1 else reduced
    } else
      attackHitDamage

  pure def stateWithCreatureSizeChangeTargetEffect(
    state: BattleState,
    target: Actor,
    effect: ActiveEffect,
  ): BattleState =
    // The promoted Enlarge/Reduce creature branch is target-exclusive.
    match target {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: activeEffectsWithoutCreatureSizeChange(state.fighter.activeEffects)
              .union(Set(effect)),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: activeEffectsWithoutCreatureSizeChange(state.goblin.activeEffects)
              .union(Set(effect)),
          },
        }
    }

  pure def resolveCreatureSizeChange(
    state: BattleState,
    target: Actor,
    mode: CreatureSizeChangeMode,
    targetIsWilling: bool,
    constitutionSaveSucceeded: bool,
    slotLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 2 and
      state.actionAvailable and
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
      val spendsOnly = {
        ...concentrationBase,
        actionAvailable: false,
      }
      if (not(targetIsWilling) and constitutionSaveSucceeded)
        commitActorSpellSlotUse(spendsOnly, Fighter)
      else {
        val effected = stateWithCreatureSizeChangeTargetEffect(
          concentrationBase,
          target,
          creatureSizeChangeActiveEffect(Fighter, mode),
        )
        commitActorSpellSlotUse({
          ...effected,
          fighter: { ...effected.fighter, concentrating: true },
          actionAvailable: false,
        }, Fighter)
      }
    } else
      state
}
