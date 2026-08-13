// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-sanctuary-targeting-interdiction

module battleRuntimeSanctuarySpellResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"

  pure def resolveSanctuaryWardSpell(state: BattleState, target: Actor): BattleState =
    if (
      currentActor(state) != Fighter or
      not(state.bonusActionAvailable) or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state))
    )
      state
    else {
      val afterCasterEarlyEnd = battleStateAfterSanctuaryEarlyEndForActor(state, Fighter)
      val targetCombatant = combatantForActor(afterCasterEarlyEnd, target)
      stateWithActorCombatant(
        commitActorSpellSlotUse({ ...afterCasterEarlyEnd, bonusActionAvailable: false }, Fighter),
        target,
        combatantWithSanctuaryWard(targetCombatant, Fighter),
      )
    }
}
