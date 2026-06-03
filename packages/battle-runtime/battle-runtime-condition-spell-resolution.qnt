// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-direct-condition

module battleRuntimeConditionSpellResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"

  pure def invisibilityConditionMaxTargets(slotLevel: int): int =
    if (slotLevel >= 2) 1 + (slotLevel - 2) else 0

  pure def resolveInvisibilityConditionSpell(state: BattleState, targets: Set[Actor], slotLevel: int): BattleState =
    if (
      currentActor(state) != Fighter or
      not(state.actionAvailable) or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      slotLevel < 2 or
      targets.size() < 1 or
      targets.size() > invisibilityConditionMaxTargets(slotLevel)
    )
      state
    else {
      val afterCasterEarlyEnd = battleStateAfterTargetActionEarlyEndForActor(state, Fighter)
      val withoutPrior = breakConcentrationSpellEffects(afterCasterEarlyEnd, Fighter)
      val withTargets = {
        ...withoutPrior,
        fighter: if (targets.contains(Fighter))
          combatantWithInvisibilityCondition(withoutPrior.fighter, Fighter)
        else
          withoutPrior.fighter,
        goblin: if (targets.contains(Goblin))
          combatantWithInvisibilityCondition(withoutPrior.goblin, Fighter)
        else
          withoutPrior.goblin,
        actionAvailable: false,
      }
      commitActorSpellSlotUse({
        ...withTargets,
        fighter: { ...withTargets.fighter, concentrating: true },
      }, Fighter)
    }

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
