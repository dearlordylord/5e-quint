// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-save-gated-condition-immunity

module battleRuntimeSaveConditionCalmEmotions {

  import battleRuntimeSaveGatedConditionImmunity.* from "./battle-runtime-save-gated-condition-immunity"

  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def calmEmotionsConditionImmunityEffects(): Set[ActiveEffect] =
    Set(CalmEmotionsCharmedImmunity, CalmEmotionsFrightenedImmunity)
  pure def calmEmotionsTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (saveGatedConditionImmunityApplies(savingThrowSucceeded))
      {
        ...target,
        activeEffects: target.activeEffects
          .exclude(calmEmotionsConditionImmunityEffects)
          .union(calmEmotionsConditionImmunityEffects),
      }
    else
      target
  pure def calmEmotionsIncludedTargetsAreLegal(
    fighterIncluded: bool,
    fighterCreatureType: RuntimeCreatureType,
    goblinIncluded: bool,
    goblinCreatureType: RuntimeCreatureType,
  ): bool =
    includedTargetCreatureTypeIsLegal(fighterIncluded, fighterCreatureType == HumanoidCreature) and
      includedTargetCreatureTypeIsLegal(goblinIncluded, goblinCreatureType == HumanoidCreature)
  pure def resolveCalmEmotions(
    state: BattleState,
    fighterIncluded: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinIncluded: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(calmEmotionsIncludedTargetsAreLegal(fighterIncluded, fighterCreatureType, goblinIncluded, goblinCreatureType))
    )
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val fighterTarget = if (fighterIncluded)
        calmEmotionsTarget(withoutPrior.fighter, fighterSavingThrowSucceeded)
      else
        withoutPrior.fighter
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...fighterTarget, concentrating: true },
        goblin: if (goblinIncluded) calmEmotionsTarget(withoutPrior.goblin, goblinSavingThrowSucceeded) else withoutPrior.goblin,
        actionAvailable: false,
      }, Fighter)
    }
}
