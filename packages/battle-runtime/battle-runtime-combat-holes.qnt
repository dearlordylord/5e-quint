// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
module battleRuntimeCombatHoles {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  pure def combatAttackTargetArmorClass(state: BattleState): int =
    if (currentActor(state) == Fighter) combatantArmorClass(state.goblin) else combatantArmorClass(state.fighter)

  pure def combatOpenHoles(state: BattleState): Set[Hole] =
    if (currentActor(state) == Goblin and not(state.goblin.rechargeAvailable))
      Set(StatBlockRechargeRoll)
    else if (currentActorCanAttack(state))
      Set(TargetChoice)
    else Set()

  pure def combatAttackReplayHoles(state: BattleState, replay: AttackReplay): Set[Hole] =
    if (not(currentActorCanAttack(state)))
      Set()
    else match replay {
      | AttackNeedsTarget => Set(TargetChoice)
      | AttackNeedsAttackRoll => Set(AttackRoll)
      | AttackRollFilled(roll) =>
          if (not(attackHits(roll.attackTotal, roll.naturalD20, combatAttackTargetArmorClass(state), attackCriticalThreshold(state, currentActor(state)))))
            Set()
          else {
            val attacker = combatantForActor(state, currentActor(state))
            val target = combatantForActor(state, if (currentActor(state) == Fighter) Goblin else Fighter)
            if (mirrorImageRequiresDuplicateRollForAttackRollHit(attacker.activeEffects, target.activeEffects, false))
              Set(MirrorImageDuplicateRoll)
            else
              Set(DamageRoll)
          }
      | AttackReplayComplete => Set()
    }
}
