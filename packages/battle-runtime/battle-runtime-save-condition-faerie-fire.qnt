// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-attack-roll-advantage-save

module battleRuntimeSaveConditionFaerieFire {
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"

  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def saveGatedAttackRollAdvantageTarget(
    invocation: SaveGatedAttackRollAdvantageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, activeEffects: target.activeEffects.union(saveGatedAttackRollAdvantageFailedSaveActiveEffects(invocation)) }
  pure def resolveFaerieFireWithObjects(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
    objectTargets: Set[ObjectTarget],
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.fighter, fighterSavingThrowSucceeded), concentrating: true },
        goblin: saveGatedAttackRollAdvantageTarget(FaerieFireSaveGate, withoutPrior.goblin, goblinSavingThrowSucceeded),
        objectOutlines: withoutPrior.objectOutlines.union(
          objectTargets.map(objectTarget => FaerieFireObjectOutline({ source: Fighter, object: objectTarget }))
        ),
        actionAvailable: false,
      }, Fighter)
    }
  pure def resolveFaerieFire(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveFaerieFireWithObjects(state, fighterSavingThrowSucceeded, goblinSavingThrowSucceeded, Set())
}
