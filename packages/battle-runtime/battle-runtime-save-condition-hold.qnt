// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveConditionHold {
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSaveConditionTargetingFacts.* from "./battle-runtime-save-condition-targeting-facts"
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"

  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  pure def holdPersonDurationTicks: int = 10
  pure def holdPersonTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    targetActor: Actor,
  ): Combatant =
    holdPersonTargetWithHeightened(target, savingThrowSucceeded, source, targetActor, false)
  pure def holdPersonTargetWithHeightened(
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    targetActor: Actor,
    heightenedRepeatSaveDisadvantage: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else {
      val withoutPrior = combatantWithoutHoldPersonFrom(target, source)
      val held = {
        ...withoutPrior,
        incapacitated: true,
        activeEffects: withoutPrior.activeEffects.union(Set(HoldPersonParalyzed({
          source: source,
          hadIncapacitated: withoutPrior.incapacitated,
          heightenedRepeatSaveDisadvantage: heightenedRepeatSaveDisadvantage,
          durationTicks: holdPersonDurationTicks,
        }))),
      }
      breakConcentrationFromHoldPersonAppliedIncapacitated(held, targetActor)
    }
  pure def holdPersonEndTurnRepeatSaveRollMode(target: Combatant, source: Actor): SavingThrowRollMode =
    if (
      target.activeEffects.exists(effect => match effect {
        | HoldPersonParalyzed(data) => data.source == source and data.heightenedRepeatSaveDisadvantage
        | _ => false
      })
    )
      DisadvantageSavingThrow
    else
      NormalSavingThrow
  pure def resolveHoldPerson(
    state: BattleState,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveHoldPersonWithHeightenedTarget(
      state,
      slotLevel,
      fighterTargeted,
      fighterCreatureType,
      fighterSavingThrowSucceeded,
      goblinTargeted,
      goblinCreatureType,
      goblinSavingThrowSucceeded,
      noSaveGatedConditionHeightenedTarget,
    )
  pure def resolveHoldMonster(
    state: BattleState,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveHoldMonsterWithHeightenedTarget(
      state,
      slotLevel,
      fighterTargeted,
      fighterCreatureType,
      fighterSavingThrowSucceeded,
      goblinTargeted,
      goblinCreatureType,
      goblinSavingThrowSucceeded,
      noSaveGatedConditionHeightenedTarget,
    )
  pure def resolveHoldPersonWithHeightenedTarget(
    state: BattleState,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
    heightenedTarget: SaveGatedConditionHeightenedTarget,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(saveGatedConditionTargetCountIsLegal(HoldPersonSaveGate, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveGate, goblinCreatureType)))
    )
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val withTargets = {
        ...withoutPrior,
        fighter: if (fighterTargeted) holdPersonTargetWithHeightened(
          withoutPrior.fighter,
          fighterSavingThrowSucceeded,
          Fighter,
          Fighter,
          saveGatedConditionHeightenedRepeatSaveDisadvantage(heightenedTarget, Fighter),
        ) else withoutPrior.fighter,
        goblin: if (goblinTargeted) holdPersonTargetWithHeightened(
          withoutPrior.goblin,
          goblinSavingThrowSucceeded,
          Fighter,
          Goblin,
          saveGatedConditionHeightenedRepeatSaveDisadvantage(heightenedTarget, Goblin),
        ) else withoutPrior.goblin,
        actionAvailable: false,
      }
      val holdPersonHasEffect = holdPersonStillActiveFrom(withTargets, Fighter)
      val withConcentration = if (holdPersonHasEffect and not(withTargets.fighter.incapacitated))
        { ...withTargets, fighter: { ...withTargets.fighter, concentrating: true } }
      else
        breakConcentrationSpellEffects(withTargets, Fighter)
      commitActorSpellSlotUse(withConcentration, Fighter)
    }
  pure def resolveHoldMonsterWithHeightenedTarget(
    state: BattleState,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
    heightenedTarget: SaveGatedConditionHeightenedTarget,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(saveGatedConditionTargetCountIsLegal(HoldMonsterSaveGate, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(HoldMonsterSaveGate, goblinCreatureType)))
    )
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val withTargets = {
        ...withoutPrior,
        fighter: if (fighterTargeted) holdPersonTargetWithHeightened(
          withoutPrior.fighter,
          fighterSavingThrowSucceeded,
          Fighter,
          Fighter,
          saveGatedConditionHeightenedRepeatSaveDisadvantage(heightenedTarget, Fighter),
        ) else withoutPrior.fighter,
        goblin: if (goblinTargeted) holdPersonTargetWithHeightened(
          withoutPrior.goblin,
          goblinSavingThrowSucceeded,
          Fighter,
          Goblin,
          saveGatedConditionHeightenedRepeatSaveDisadvantage(heightenedTarget, Goblin),
        ) else withoutPrior.goblin,
        actionAvailable: false,
      }
      val holdMonsterHasEffect = holdPersonStillActiveFrom(withTargets, Fighter)
      val withConcentration = if (holdMonsterHasEffect and not(withTargets.fighter.incapacitated))
        { ...withTargets, fighter: { ...withTargets.fighter, concentrating: true } }
      else
        breakConcentrationSpellEffects(withTargets, Fighter)
      commitActorSpellSlotUse(withConcentration, Fighter)
    }
  pure def endTurnWithHoldPersonRepeatSave(
    state: BattleState,
    source: Actor,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (currentActor(state) == Fighter) {
      val fighter = if (savingThrowSucceeded and activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, source))
        combatantWithoutHoldPersonFrom(state.fighter, source)
      else
        state.fighter
      endTurn(stateWithHoldPersonConcentrationClearedIfNoEffects({ ...state, fighter: fighter }, source))
    } else {
      val goblin = if (savingThrowSucceeded and activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, source))
        combatantWithoutHoldPersonFrom(state.goblin, source)
      else
        state.goblin
      endTurn(stateWithHoldPersonConcentrationClearedIfNoEffects({ ...state, goblin: goblin }, source))
    }
}
