// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-dragons-breath-granted-action
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-dragons-breath-granted-action
// RAW trace: SRD 5.2.1 Spells/Descriptions-A-D#Dragon's Breath says the
// caster touches one willing creature, chooses Acid, Cold, Fire, Lightning, or
// Poison, and the target can take a Magic action to exhale a 15-foot Cone whose
// affected creatures make Dexterity saving throws for chosen-type damage or
// half damage. Rules-Glossary#Concentration owns ending when the creator loses
// Concentration; Rules-Glossary#Cone owns geometry that callers witness.

module battleRuntimeDragonsBreath {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"

  type DragonsBreathExhaleAccumulator = { state: BattleState, resolved: bool }

  pure def dragonsBreathDurationTicks(): int = 10

  pure def dragonsBreathDamageTypeChoiceIsLegal(damageType: DamageType): bool =
    Set(Acid, Cold, Fire, Lightning, Poison).contains(damageType)

  pure def dragonsBreathDamageDice(slotLevel: int): int =
    3 + (slotLevel - 2)

  pure def dragonsBreathDamageRollAccepted(damageRoll: int, damageDice: int): bool =
    damageRoll >= damageDice and damageRoll <= damageDice * 6

  pure def dragonsBreathDamageAfterSave(damageRoll: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded) damageRoll / 2 else damageRoll

  pure def dragonsBreathInitialEffect(source: Actor, damageType: DamageType, slotLevel: int, spellSaveDc: int): ActiveEffect =
    DragonsBreathEffect({
      source: source,
      damageType: damageType,
      originalSlotLevel: slotLevel,
      spellSaveDc: spellSaveDc,
      durationTicks: dragonsBreathDurationTicks,
    })

  pure def activeEffectsWithoutDragonsBreathFrom(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | DragonsBreathEffect(data) => data.source != source
      | _ => true
    })

  pure def combatantWithDragonsBreathEffect(target: Combatant, effect: ActiveEffect, source: Actor): Combatant =
    { ...target, activeEffects: activeEffectsWithoutDragonsBreathFrom(target.activeEffects, source).union(Set(effect)) }

  pure def resolveDragonsBreathInitialSpell(
    state: BattleState,
    target: Actor,
    willingTargets: Set[Actor],
    damageType: DamageType,
    slotLevel: int,
    spellSaveDc: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      slotLevel >= 2 and
      dragonsBreathDamageTypeChoiceIsLegal(damageType) and
      willingTargets.contains(target) and
      spellSaveDc > 0
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val effect = dragonsBreathInitialEffect(Fighter, damageType, slotLevel, spellSaveDc)
      val concentratingCaster = { ...withoutPrior.fighter, concentrating: true }
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: if (target == Fighter)
          combatantWithDragonsBreathEffect(concentratingCaster, effect, Fighter)
        else
          concentratingCaster,
        goblin: if (target == Goblin)
          combatantWithDragonsBreathEffect(withoutPrior.goblin, effect, Fighter)
        else
          withoutPrior.goblin,
        bonusActionAvailable: false,
      }, Fighter)
    } else {
      state
    }

  pure def activeEffectIsDragonsBreathFromSource(effect: ActiveEffect, source: Actor): bool =
    match effect {
      | DragonsBreathEffect(data) => data.source == source
      | _ => false
    }

  pure def activeDragonsBreathEffectsFromSource(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => activeEffectIsDragonsBreathFromSource(effect, source))

  pure def dragonsBreathAffectedDamage(
    damageType: DamageType,
    damageRoll: int,
    savingThrowSucceeded: bool,
  ): int =
    damageAfterAdjustments(
      dragonsBreathDamageAfterSave(damageRoll, savingThrowSucceeded),
      damageType,
      Set(),
      Set(),
      Set(),
    )

  pure def combatantAfterDragonsBreathDamage(
    target: Combatant,
    damageType: DamageType,
    damageRoll: int,
    savingThrowSucceeded: bool,
    concentrationSaveSucceeded: bool,
    damageSource: Actor,
  ): Combatant =
    applyDamageFromSource(
      target,
      dragonsBreathAffectedDamage(damageType, damageRoll, savingThrowSucceeded),
      1,
      concentrationSaveSucceeded,
      OrdinaryDamage,
      damageSource,
    )

  pure def stateWithDragonsBreathAreaDamage(
    state: BattleState,
    areaTargets: Set[Actor],
    damageType: DamageType,
    damageRoll: int,
    successfulSaveTargets: Set[Actor],
    concentrationSaveSucceeded: bool,
    damageSource: Actor,
  ): BattleState =
    {
      ...state,
      fighter: if (areaTargets.contains(Fighter))
        combatantAfterDragonsBreathDamage(
          state.fighter,
          damageType,
          damageRoll,
          successfulSaveTargets.contains(Fighter),
          concentrationSaveSucceeded,
          damageSource,
        )
      else
        state.fighter,
      goblin: if (areaTargets.contains(Goblin))
        combatantAfterDragonsBreathDamage(
          state.goblin,
          damageType,
          damageRoll,
          successfulSaveTargets.contains(Goblin),
          concentrationSaveSucceeded,
          damageSource,
        )
      else
        state.goblin,
    }

  pure def resolveDragonsBreathExhaleFromEffect(
    accumulator: DragonsBreathExhaleAccumulator,
    effect: ActiveEffect,
    damageSource: Actor,
    areaTargets: Set[Actor],
    successfulSaveTargets: Set[Actor],
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): DragonsBreathExhaleAccumulator =
    if (accumulator.resolved)
      accumulator
    else
      match effect {
        | DragonsBreathEffect(data) =>
          if (
            data.source == Fighter and
            data.spellSaveDc > 0 and
            dragonsBreathDamageTypeChoiceIsLegal(data.damageType) and
            data.originalSlotLevel >= 2 and
            (areaTargets.size() == 0 or dragonsBreathDamageRollAccepted(damageRoll, dragonsBreathDamageDice(data.originalSlotLevel)))
          ) {
            {
              state: stateWithDragonsBreathAreaDamage(
                { ...accumulator.state, actionAvailable: false },
                areaTargets,
                data.damageType,
                damageRoll,
                successfulSaveTargets,
                concentrationSaveSucceeded,
                damageSource,
              ),
              resolved: true,
            }
          } else {
            accumulator
          }
        | _ => accumulator
      }

  pure def resolveDragonsBreathExhale(
    state: BattleState,
    target: Actor,
    areaTargets: Set[Actor],
    successfulSaveTargets: Set[Actor],
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val retainedEffects = activeDragonsBreathEffectsFromSource(combatantForActor(state, target).activeEffects, Fighter)
    if (
      currentActor(state) == target and
      state.actionAvailable and
      successfulSaveTargets.forall(saveTarget => areaTargets.contains(saveTarget)) and
      retainedEffects.size() == 1
    ) {
      retainedEffects.fold({ state: state, resolved: false }, (accumulator, effect) =>
        resolveDragonsBreathExhaleFromEffect(
          accumulator,
          effect,
          target,
          areaTargets,
          successfulSaveTargets,
          damageRoll,
          concentrationSaveSucceeded,
        )
      ).state
    } else {
      state
    }
  }
}
