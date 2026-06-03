// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-roll-modifier

// KERNEL-COVERAGE: qnt-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
module battleRuntimeRollModifierChoice {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def rollModifierChoiceActiveEffect(
    invocation: RollModifierSpell,
    chosenAbility: Ability,
    chosenSkill: AbilityCheckSkill,
  ): ActiveEffect =
    match invocation {
      | BaneRollModifier => BaneD20RollPenalty
      | BlessRollModifier => BlessD20RollBonus
      | GuidanceRollModifier => GuidanceAbilityCheckBonus({ skill: chosenSkill })
      | PassWithoutTraceRollModifier => PassWithoutTraceStealthBonus
      | EnhanceAbilityRollModifier => EnhanceAbilityCheckAdvantage({ ability: chosenAbility })
      | EnthrallRollModifier => EnthrallPerceptionPenalty
    }

  pure def rollModifierChoiceMaximumTargets(invocation: RollModifierSpell, slotLevel: int): int =
    match invocation {
      | BaneRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | BlessRollModifier => 3 + (if (slotLevel > 1) slotLevel - 1 else 0)
      | GuidanceRollModifier => 1
      | PassWithoutTraceRollModifier => Set(Fighter, Goblin).size()
      | EnhanceAbilityRollModifier => 1 + (if (slotLevel > 2) slotLevel - 2 else 0)
      | EnthrallRollModifier => Set(Fighter, Goblin).size()
    }

  pure def rollModifierChoiceRequiresFailedSave(invocation: RollModifierSpell): bool =
    invocation == BaneRollModifier or invocation == EnthrallRollModifier

  pure def rollModifierChoiceSpendsLevelOneSlot(invocation: RollModifierSpell): bool =
    invocation != GuidanceRollModifier

  pure def rollModifierChoiceSelectedTargetsValid(invocation: RollModifierSpell, selectedTargets: Set[Actor], slotLevel: int): bool = {
    val targetCount = selectedTargets.size()
    targetCount >= 1 and
      targetCount <= rollModifierChoiceMaximumTargets(invocation, slotLevel) and
      (invocation != PassWithoutTraceRollModifier or selectedTargets.contains(Fighter))
  }

  pure def rollModifierFixedAbilityCheckDelta(effect: ActiveEffect, skill: AbilityCheckSkill): int =
    match effect {
      | PassWithoutTraceStealthBonus => if (skill == StealthSkill) 10 else 0
      | EnthrallPerceptionPenalty => if (skill == PerceptionSkill) -10 else 0
      | _ => 0
    }

  pure def passivePerceptionModifierDelta(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => rollModifierFixedAbilityCheckDelta(effect, PerceptionSkill))
      .fold(0, (total, delta) => total + delta)

  pure def rollModifierChoiceTargetedState(
    state: BattleState,
    invocation: RollModifierSpell,
    targets: Set[Actor],
    chosenAbility: Ability,
    chosenSkill: AbilityCheckSkill,
  ): BattleState =
    rollModifierChoiceTargetedStateWithTargetAbilities(
      state,
      invocation,
      targets,
      chosenAbility,
      chosenAbility,
      chosenSkill,
    )

  pure def rollModifierChoiceTargetedStateWithTargetAbilities(
    state: BattleState,
    invocation: RollModifierSpell,
    targets: Set[Actor],
    fighterAbility: Ability,
    goblinAbility: Ability,
    chosenSkill: AbilityCheckSkill,
  ): BattleState =
    {
      ...state,
      fighter: if (targets.contains(Fighter)) { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(rollModifierChoiceActiveEffect(invocation, fighterAbility, chosenSkill))) } else state.fighter,
      goblin: if (targets.contains(Goblin)) { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(rollModifierChoiceActiveEffect(invocation, goblinAbility, chosenSkill))) } else state.goblin,
    }

  pure def resolveRollModifierChoiceSpellWithTargetAbilities(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
    fighterAbility: Ability,
    goblinAbility: Ability,
    chosenSkill: AbilityCheckSkill,
  ): BattleState = {
    val affectedTargets =
      if (rollModifierChoiceRequiresFailedSave(invocation)) failedSaveTargets else selectedTargets
    if (
      currentActor(state) == Fighter and
      rollModifierChoiceSelectedTargetsValid(invocation, selectedTargets, slotLevel) and
      failedSaveTargets.forall(target => selectedTargets.contains(target)) and
      state.actionAvailable and
      (not(rollModifierChoiceSpendsLevelOneSlot(invocation)) or canExpendSpellSlotThisTurn(state)) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val concentrationBase = {
        ...state,
        fighter: breakConcentration(state.fighter),
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
      val effected = rollModifierChoiceTargetedStateWithTargetAbilities(
        concentrationBase,
        invocation,
        affectedTargets,
        fighterAbility,
        goblinAbility,
        chosenSkill,
      )
      val resolved = {
        ...effected,
        fighter: { ...effected.fighter, concentrating: true },
        actionAvailable: false,
      }
      if (rollModifierChoiceSpendsLevelOneSlot(invocation))
        commitActorSpellSlotUse(resolved, Fighter)
      else
        resolved
    } else {
      state
    }
  }

  pure def resolveRollModifierChoiceSpell(
    state: BattleState,
    invocation: RollModifierSpell,
    selectedTargets: Set[Actor],
    failedSaveTargets: Set[Actor],
    slotLevel: int,
    chosenAbility: Ability,
    chosenSkill: AbilityCheckSkill,
  ): BattleState =
    resolveRollModifierChoiceSpellWithTargetAbilities(
      state,
      invocation,
      selectedTargets,
      failedSaveTargets,
      slotLevel,
      chosenAbility,
      chosenAbility,
      chosenSkill,
    )
}
