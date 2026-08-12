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

  pure def opportunityAttackDamageModifier(attacker: Actor): int =
    match attacker {
      | Fighter => 3
      | Goblin => 2
    }

  pure def opportunityAttackDefenderResistances(
    state: BattleState,
    defender: Actor,
  ): Set[DamageType] =
    match defender {
      | Fighter => fighterRageResistances(state)
      | Goblin => Set()
    }

  pure def resolveOpportunityAttack(
    state: BattleState,
    attacker: Actor,
    defender: Actor,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    resolveOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
      state,
      attacker,
      defender,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      OrdinaryDamage,
      0,
      false,
    )

  pure def resolveOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
    state: BattleState,
    attackerActor: Actor,
    defenderActor: Actor,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageDisposition: DamageDisposition,
    mirrorImageDuplicateHighestRoll: int,
    attackerPerceivesTargetWithBlindsightOrTruesight: bool,
  ): BattleState = {
    val attacker = combatantForActor(state, attackerActor)
    val defender = combatantForActor(state, defenderActor)
    if (attackerActor == defenderActor or attacker.hp == 0)
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
      stateWithActorCombatant(state, defenderActor, combatantAfterMirrorImageAttackRollHit(
        attacker.activeEffects,
        defender,
        attackerPerceivesTargetWithBlindsightOrTruesight,
        mirrorImageDuplicateHighestRoll,
      ))
    else {
      val adjustedDamage = damageAfterAdjustments(
        damageRoll + opportunityAttackDamageModifier(attackerActor),
        Slashing,
        opportunityAttackDefenderResistances(state, defenderActor),
        Set(),
        Set(),
      )
      stateWithActorDamage(
        state,
        defenderActor,
        applyDamageFromSource(
          defender,
          adjustedDamage,
          if (attackIsCritical(naturalD20, 20)) 2 else 1,
          concentrationSaveSucceeded,
          damageDisposition,
          attackerActor,
        ),
      )
    }
  }

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
  ): BattleState =
    resolveOpportunityAttackWithDispositionAndMirrorImageDuplicateRoll(
      state,
      Goblin,
      Fighter,
      attackTotal,
      naturalD20,
      damageRoll,
      concentrationSaveSucceeded,
      damageDisposition,
      mirrorImageDuplicateHighestRoll,
      attackerPerceivesTargetWithBlindsightOrTruesight,
    )
}
