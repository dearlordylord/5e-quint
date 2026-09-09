// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-persistent-armor-effect
module battleRuntimeArmorSpellResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"

  pure def resolveArmorOfShadowsMageArmorSpell(state: BattleState): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      state.fighter.wearingHeavyArmor
    )
      state
    else
      { ...state, fighter: combatantWithMageArmor(state.fighter), actionAvailable: false }
}
