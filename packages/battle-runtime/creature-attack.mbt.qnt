// -*- mode: Bluespec; -*-

module creatureAttackMbt {
  import creatureAttack.* from "./creature-attack"

  var qAttackerHp: int
  var qTargetHp: int

  pure val initialHp: int = 20
  pure val maxDamageRoll: int = 6

  action recordNextState(nextState: CreatureAttackState): bool = all {
    qAttackerHp' = nextState.attackerHp,
    qTargetHp' = nextState.targetHp,
  }

  action init = all {
    qAttackerHp' = initialHp,
    qTargetHp' = initialHp,
  }

  action doAttackerAAttacks = {
    nondet damage = 0.to(maxDamageRoll).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      recordNextState(resolveAttack(
        { attackerHp: qAttackerHp, targetHp: qTargetHp },
        AttackerA,
        { damage: damage, hit: hit },
      )),
    }
  }

  action doAttackerBAttacks = {
    nondet damage = 0.to(maxDamageRoll).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      recordNextState(resolveAttack(
        { attackerHp: qAttackerHp, targetHp: qTargetHp },
        AttackerB,
        { damage: damage, hit: hit },
      )),
    }
  }

  action step = any {
    doAttackerAAttacks,
    doAttackerBAttacks,
  }
}
