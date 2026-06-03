// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-self-ability-check-advantage

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
module battleRuntimeThaumaturgy {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def thaumaturgyBoomingVoiceDurationTicks: int = 10

  pure def thaumaturgyMaxActiveOneMinuteEffects: int = 3

  pure def thaumaturgyBoomingVoiceActiveEffect(source: Actor): ActiveEffect =
    ThaumaturgyBoomingVoice({
      source: source,
      durationTicks: thaumaturgyBoomingVoiceDurationTicks,
    })

  pure def activeEffectsWithoutThaumaturgyBoomingVoice(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ThaumaturgyBoomingVoice(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainThaumaturgyBoomingVoice(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | ThaumaturgyBoomingVoice(data) => data.source == source
      | _ => false
    })

  pure def thaumaturgyActiveOneMinuteEffectCountAfterBoomingVoiceCast(
    effects: Set[ActiveEffect],
    source: Actor,
    activeOneMinuteEffectCount: int,
  ): int =
    if (activeEffectsContainThaumaturgyBoomingVoice(effects, source))
      activeOneMinuteEffectCount
    else
      activeOneMinuteEffectCount + 1

  pure def thaumaturgyBoomingVoiceAbilityCheckRollMode(effects: Set[ActiveEffect], actor: Actor, ability: Ability, skill: AbilityCheckSkill): AbilityCheckRollMode =
    if (
      ability == ChaAbility and
      skill == IntimidationSkill and
      effects.exists(effect => match effect {
        | ThaumaturgyBoomingVoice(data) => data.source == actor
        | _ => false
      })
    ) AdvantageAbilityCheck else NormalAbilityCheck

  pure def resolveFighterThaumaturgyBoomingVoice(
    state: BattleState,
    actor: Actor,
    activeOneMinuteEffectCount: int,
    ragePreventsSpellcasting: bool,
  ): BattleState =
    if (
      actor == Fighter and
      activeOneMinuteEffectCount >= 0 and
      (
        not(activeEffectsContainThaumaturgyBoomingVoice(state.fighter.activeEffects, Fighter)) or
        activeOneMinuteEffectCount > 0
      ) and
      thaumaturgyActiveOneMinuteEffectCountAfterBoomingVoiceCast(state.fighter.activeEffects, Fighter, activeOneMinuteEffectCount) <= thaumaturgyMaxActiveOneMinuteEffects and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(ragePreventsSpellcasting)
    ) {
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutThaumaturgyBoomingVoice(state.fighter.activeEffects, Fighter)
            .union(Set(thaumaturgyBoomingVoiceActiveEffect(Fighter))),
        },
        actionAvailable: false,
      }
    } else {
      state
    }
}
