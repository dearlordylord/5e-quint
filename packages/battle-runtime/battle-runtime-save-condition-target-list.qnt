// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveConditionTargetList {
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSaveConditionTargetingFacts.* from "./battle-runtime-save-condition-targeting-facts"

  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"

  pure def saveGatedConditionTarget(
    invocation: SaveGatedConditionInvocation,
    state: BattleState,
    target: Combatant,
    savingThrowSucceeded: bool,
    source: Actor,
    targetActor: Actor,
    sourceCreatureType: RuntimeCreatureType,
  ): Combatant =
    if (
      savingThrowSucceeded or
      saveGatedConditionRequiresConditionChoice(invocation) or
      saveGatedConditionPreventedByCreatureTypeProtection(invocation, sourceCreatureType, target.activeEffects)
    )
      target
    else
      {
      val baseEffects = if (invocation == ColorSpraySaveGate)
          activeEffectsWithoutColorSprayFrom(target.activeEffects, source)
        else
          target.activeEffects
        { ...target, activeEffects: baseEffects.union(saveGatedConditionFailedSaveActiveEffects(invocation, state, source)) }
      }
}
