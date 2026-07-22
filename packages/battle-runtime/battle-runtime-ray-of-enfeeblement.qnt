// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-damage-penalty

module battleRuntimeRayOfEnfeeblement {
  import battleRuntimeRayOfEnfeeblementFacts.* from "./battle-runtime-ray-of-enfeeblement-facts"
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"

  import battleRuntimeModel.* from "./battle-runtime-model"

  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure def rayOfEnfeeblementD20LifecycleSavingThrowAbility: Ability = ConAbility
  pure def rayOfEnfeeblementD20LifecycleSuccessActiveEffects(source: Actor): Set[ActiveEffect] =
    Set(RayOfEnfeeblementNextAttackDisadvantage({ source: source }))
  pure def rayOfEnfeeblementD20LifecycleEffectFromSource(
    effect: ActiveEffect,
    source: Actor,
  ): bool =
    match effect {
      | RayOfEnfeeblementNextAttackDisadvantage(data) => data.source == source
      | RayOfEnfeeblementD20Lifecycle(data) => data.source == source
      | RayOfEnfeeblementDamageRollPenalty(data) => data.source == source
      | _ => false
    }
  pure def rayOfEnfeeblementD20LifecycleHasActiveEffect(
    effects: Set[ActiveEffect],
    source: Actor,
  ): bool =
    effects.exists(effect => rayOfEnfeeblementD20LifecycleEffectFromSource(effect, source))
  pure def rayOfEnfeeblementD20LifecycleConcentratingAfterEffectsChange(
    effects: Set[ActiveEffect],
    source: Actor,
    sourceConcentrating: bool,
  ): bool =
    sourceConcentrating and rayOfEnfeeblementD20LifecycleHasActiveEffect(effects, source)
  pure def rayOfEnfeeblementD20LifecycleActiveEffectsAfterNextAttack(
    effects: Set[ActiveEffect],
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | RayOfEnfeeblementNextAttackDisadvantage(data) => data.source != source
      | _ => true
    })
  pure def rayOfEnfeeblementD20LifecycleEndTurnRepeatSaveAbility: Ability = ConAbility
  pure def rayOfEnfeeblementD20LifecycleActiveEffectsAfterRepeatSave(
    effects: Set[ActiveEffect],
    source: Actor,
    savingThrowSucceeded: bool,
  ): Set[ActiveEffect] =
    if (savingThrowSucceeded)
      effects.filter(effect => match effect {
        | RayOfEnfeeblementD20Lifecycle(data) => data.source != source
        | RayOfEnfeeblementDamageRollPenalty(data) => data.source != source
        | _ => true
      })
    else
      effects
  pure def rayOfEnfeeblementDamageRollPenaltyApplies(
    effects: Set[ActiveEffect],
    source: Actor,
  ): bool =
    effects.exists(effect => match effect {
      | RayOfEnfeeblementDamageRollPenalty(data) => data.source == source
      | _ => false
    })
  pure def damageAfterRayOfEnfeeblementDamageRollPenalty(
    effects: Set[ActiveEffect],
    source: Actor,
    rolledDamage: int,
    penaltyRoll: int,
  ): int =
    if (rolledDamage > 0 and rayOfEnfeeblementDamageRollPenaltyApplies(effects, source))
      if (rolledDamage - penaltyRoll < 0) 0 else rolledDamage - penaltyRoll
    else
      rolledDamage
  pure def saveGatedDamageAfterRayPenaltyAndTargetAdjustments(
    invocation: SaveGatedDamageInvocation,
    sourceEffects: Set[ActiveEffect],
    source: Actor,
    rolledDamage: int,
    penaltyRoll: int,
    savingThrowSucceeded: bool,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
  ): int = {
    val sourceAdjustedDamage =
      damageAfterRayOfEnfeeblementDamageRollPenalty(sourceEffects, source, rolledDamage, penaltyRoll)
    damageAfterAdjustments(
      saveGatedDamageAmount(invocation, sourceAdjustedDamage, savingThrowSucceeded),
      saveGatedDamageType(invocation),
      resistances,
      vulnerabilities,
      immunities,
    )
  }
  pure def saveGatedDamageAfterRayPenaltyResistanceSpellReduction(
    invocation: SaveGatedDamageInvocation,
    sourceEffects: Set[ActiveEffect],
    targetEffects: Set[ActiveEffect],
    source: Actor,
    rolledDamage: int,
    penaltyRoll: int,
    savingThrowSucceeded: bool,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
    reductionRoll: int,
  ): int =
    damageAfterResistanceSpellReduction(
      saveGatedDamageAfterRayPenaltyAndTargetAdjustments(
        invocation,
        sourceEffects,
        source,
        rolledDamage,
        penaltyRoll,
        savingThrowSucceeded,
        resistances,
        vulnerabilities,
        immunities,
      ),
      saveGatedDamageType(invocation),
      targetEffects,
      reductionRoll,
    )
  pure def rayOfEnfeeblementD20LifecycleAttackRollMode(
    effects: Set[ActiveEffect],
    attackAbility: Ability,
  ): SpellAttackRollMode =
    if (
      attackAbility == StrAbility
        and effects.exists(effect => match effect {
          | RayOfEnfeeblementD20Lifecycle(_) => true
          | _ => false
        })
    )
      DisadvantageSpellAttackRoll
    else
      NormalSpellAttackRoll
  pure def rayOfEnfeeblementD20LifecycleAbilityCheckRollMode(
    effects: Set[ActiveEffect],
    ability: Ability,
  ): AbilityCheckRollMode =
    if (
      ability == StrAbility
        and effects.exists(effect => match effect {
          | RayOfEnfeeblementD20Lifecycle(_) => true
          | _ => false
        })
    )
      DisadvantageAbilityCheck
    else
      NormalAbilityCheck
  pure def rayOfEnfeeblementD20LifecycleSavingThrowRollMode(
    effects: Set[ActiveEffect],
    ability: Ability,
  ): SavingThrowRollMode =
    if (
      ability == StrAbility
        and effects.exists(effect => match effect {
          | RayOfEnfeeblementD20Lifecycle(_) => true
          | _ => false
        })
    )
      DisadvantageSavingThrow
    else
      NormalSavingThrow
  pure def rayOfEnfeeblementD20LifecycleTargetAfterSave(
    target: Combatant,
    source: Actor,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      { ...target, activeEffects: target.activeEffects.union(rayOfEnfeeblementD20LifecycleSuccessActiveEffects(source)) }
    else
      { ...target, activeEffects: target.activeEffects.union(rayOfEnfeeblementD20LifecycleFailedSaveActiveEffects(source)) }
  pure def resolveRayOfEnfeeblementD20Lifecycle(
    state: BattleState,
    target: Actor,
    savingThrowSucceeded: bool,
  ): BattleState =
    match target {
      | Fighter => {
          ...state,
          fighter: rayOfEnfeeblementD20LifecycleTargetAfterSave(
            { ...state.fighter, concentrating: true },
            Fighter,
            savingThrowSucceeded,
          ),
        }
      | Goblin => {
          ...state,
          fighter: { ...state.fighter, concentrating: true },
          goblin: rayOfEnfeeblementD20LifecycleTargetAfterSave(
            state.goblin,
            Fighter,
            savingThrowSucceeded,
          ),
        }
    }
}
