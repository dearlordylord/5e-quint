// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveConditionBlindness {
  import battleRuntimeSaveConditionBlindnessFacts.* from "./battle-runtime-save-condition-blindness-facts"
  import battleRuntimeSaveConditionTargetingFacts.* from "./battle-runtime-save-condition-targeting-facts"

  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"

  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  pure def activeEffectsWithoutBlindnessDeafnessChoiceFrom(
    effects: Set[ActiveEffect],
    choice: BlindnessDeafnessConditionChoice,
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match choice {
      | BlindnessDeafnessBlindedChoice => match effect {
          | BlindnessDeafnessBlinded(data) => data.source != source
          | _ => true
        }
      | BlindnessDeafnessDeafenedChoice => match effect {
          | BlindnessDeafnessDeafened(data) => data.source != source
          | _ => true
        }
    })
  pure def blindnessDeafnessRepeatSaveDue(
    effects: Set[ActiveEffect],
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): bool =
    effects.exists(effect => match choice {
      | BlindnessDeafnessBlindedChoice => match effect {
          | BlindnessDeafnessBlinded(data) => data.source == source
          | _ => false
        }
      | BlindnessDeafnessDeafenedChoice => match effect {
          | BlindnessDeafnessDeafened(data) => data.source == source
          | _ => false
        }
    })
  pure def combatantWithoutBlindnessDeafnessChoiceFrom(
    target: Combatant,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): Combatant =
    { ...target, activeEffects: activeEffectsWithoutBlindnessDeafnessChoiceFrom(target.activeEffects, choice, source) }
  pure def blindnessDeafnessTarget(
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): Combatant =
    blindnessDeafnessTargetWithHeightened(target, savingThrowSucceeded, source, choice, false)
  pure def blindnessDeafnessTargetWithHeightened(
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
    heightenedRepeatSaveDisadvantage: bool,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else
      {
        ...target,
        activeEffects: activeEffectsWithoutBlindnessDeafnessChoiceFrom(target.activeEffects, choice, source)
          .union(Set(blindnessDeafnessActiveEffectWithHeightened(choice, source, heightenedRepeatSaveDisadvantage))),
      }
  pure def blindnessDeafnessEndTurnRepeatSaveRollMode(
    target: Combatant,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
  ): SavingThrowRollMode =
    if (
      target.activeEffects.exists(effect => match choice {
        | BlindnessDeafnessBlindedChoice => match effect {
            | BlindnessDeafnessBlinded(data) => data.source == source and data.heightenedRepeatSaveDisadvantage
            | _ => false
          }
        | BlindnessDeafnessDeafenedChoice => match effect {
            | BlindnessDeafnessDeafened(data) => data.source == source and data.heightenedRepeatSaveDisadvantage
            | _ => false
          }
      })
    )
      DisadvantageSavingThrow
    else
      NormalSavingThrow
  pure def resolveBlindnessDeafness(
    state: BattleState,
    slotLevel: int,
    choice: BlindnessDeafnessConditionChoice,
    fighterTargeted: bool,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveBlindnessDeafnessWithHeightenedTarget(
      state,
      slotLevel,
      choice,
      fighterTargeted,
      fighterSavingThrowSucceeded,
      goblinTargeted,
      goblinSavingThrowSucceeded,
      noSaveGatedConditionHeightenedTarget,
    )
  pure def resolveBlindnessDeafnessWithHeightenedTarget(
    state: BattleState,
    slotLevel: int,
    choice: BlindnessDeafnessConditionChoice,
    fighterTargeted: bool,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
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
      not(saveGatedConditionTargetCountIsLegal(BlindnessDeafnessSaveGate, slotLevel, fighterTargeted, goblinTargeted))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (fighterTargeted) blindnessDeafnessTargetWithHeightened(
          state.fighter,
          fighterSavingThrowSucceeded,
          Fighter,
          choice,
          saveGatedConditionHeightenedRepeatSaveDisadvantage(heightenedTarget, Fighter),
        ) else state.fighter,
        goblin: if (goblinTargeted) blindnessDeafnessTargetWithHeightened(
          state.goblin,
          goblinSavingThrowSucceeded,
          Fighter,
          choice,
          saveGatedConditionHeightenedRepeatSaveDisadvantage(heightenedTarget, Goblin),
        ) else state.goblin,
        actionAvailable: false,
      }, Fighter)
  pure def endTurnWithBlindnessDeafnessRepeatSave(
    state: BattleState,
    source: Actor,
    choice: BlindnessDeafnessConditionChoice,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (currentActor(state) == Fighter) {
      val fighter = if (savingThrowSucceeded and blindnessDeafnessRepeatSaveDue(state.fighter.activeEffects, source, choice))
        combatantWithoutBlindnessDeafnessChoiceFrom(state.fighter, source, choice)
      else
        state.fighter
      endTurn({ ...state, fighter: fighter })
    } else {
      val goblin = if (savingThrowSucceeded and blindnessDeafnessRepeatSaveDue(state.goblin.activeEffects, source, choice))
        combatantWithoutBlindnessDeafnessChoiceFrom(state.goblin, source, choice)
      else
        state.goblin
      endTurn({ ...state, goblin: goblin })
    }
}
