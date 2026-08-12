// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeOpportunityAttack {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeDamageTypeAdjustment.* from "./battle-runtime-damage-type-adjustment"
  import battleRuntimeFighterRageResistances.* from "./battle-runtime-fighter-rage-resistances"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  pure def resolveGoblinOpportunityAttack(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveGoblinOpportunityAttackWithDisposition(state, attackTotal, naturalD20, damageRoll, concentrationSaveSucceeded, OrdinaryDamage)

  pure def resolveGoblinOpportunityAttackWithDisposition(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
  ): BattleState =
    resolveGoblinOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
      state,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      damageDisposition,
      0,
      false,
    )

  pure def resolveGoblinOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState = {
    val attacker = combatantForActor(state, Goblin)
    val defender = combatantForActor(state, Fighter)
    if (attacker.hp == 0)
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(defender), 20)))
      state
    else if (
      mirrorImageRedirectsAttackRollHit(
        attacker.activeEffects,
        defender.activeEffects,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      )
    )
      stateWithActorCombatant(state, Fighter, combatantAfterMirrorImageAttackRollHit(
        attacker.activeEffects,
        defender,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      ))
    else {
      val adjustedDamage = damageAfterAdjustments(damageRoll + 2, Slashing, fighterRageResistances(state), Set(), Set())
      stateWithFighterDamage(state, applyDamageFromSource(defender, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, damageDisposition, Goblin))
    }
  }
}
