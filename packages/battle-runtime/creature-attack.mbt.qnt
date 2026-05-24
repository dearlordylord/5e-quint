// -*- mode: Bluespec; -*-

module creatureAttackMbt {
  import creatureAttack.* from "./creature-attack"

  var qCreatureAHp: int
  var qCreatureBHp: int

  pure val initialHp: int = 20
  pure val maxDamageRoll: int = 6

  action recordNextState(nextState: CreatureAttackState): bool = all {
    qCreatureAHp' = nextState.creatureAHp,
    qCreatureBHp' = nextState.creatureBHp,
  }

  action init = all {
    qCreatureAHp' = initialHp,
    qCreatureBHp' = initialHp,
  }

  action doAttackerAAttacks = {
    nondet damage = 0.to(maxDamageRoll).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      recordNextState(resolveCreatureAttack(
        { creatureAHp: qCreatureAHp, creatureBHp: qCreatureBHp },
        AttackerA,
        { damage: damage, hit: hit },
      )),
    }
  }

  action doAttackerBAttacks = {
    nondet damage = 0.to(maxDamageRoll).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      recordNextState(resolveCreatureAttack(
        { creatureAHp: qCreatureAHp, creatureBHp: qCreatureBHp },
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
