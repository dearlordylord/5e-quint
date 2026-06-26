// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Attack Rolls defines hit/miss
//   against Armor Class; this pilot receives the hit verdict as a fill.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls applies damage to
//   the target's Hit Points; this pilot receives damage as a fill.
// - UBIQUITOUS_LANGUAGE.md: Creature, Attack Roll, Hit Points.
module creatureAttackRouteMbt {
  import creatureAttack.* from "./creature-attack"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"
  import battleRuntimeHoleKinds.* from "./battle-runtime-hole-kinds"
  import battleRuntimeReducerRoute.* from "./battle-runtime-reducer-route"

  var qCreatureAHp: int
  var qCreatureBHp: int
  var qRoute: List[ReducerRouteEvent]

  pure val initialHp: int = 20
  pure val maxDamageRoll: int = 6

  pure def creatureAttackRouteForHit(
    route: List[ReducerRouteEvent],
    hit: bool,
  ): List[ReducerRouteEvent] = {
    val discoveredRoute = route.append(
      routeDiscoverBattleActs(
        CreatureAttackRouteSubject,
        Set(AttackRollHoleKind),
        BattleAttackRollOwner,
      )
    )
    val attackRoute = discoveredRoute.append(
      routeResolveBattleSubject(
        CreatureAttackRouteSubject,
        AttackRollFillKind,
        if (hit) Set(RolledDiceHoleKind) else Set(),
        BattleAttackRollOwner,
      )
    )
    if (hit)
      attackRoute.append(
        routeResolveBattleSubject(
          CreatureAttackRouteSubject,
          RolledDiceFillKind,
          Set(),
          BattleHitPointOwner,
        )
      )
    else
      attackRoute
  }

  action recordNextState(
    nextState: CreatureAttackState,
    route: List[ReducerRouteEvent],
  ): bool = all {
    qCreatureAHp' = nextState.creatureAHp,
    qCreatureBHp' = nextState.creatureBHp,
    qRoute' = route,
  }

  action init = all {
    qCreatureAHp' = initialHp,
    qCreatureBHp' = initialHp,
    qRoute' = List(routeStartBattle(BattleActionEconomyOwner)),
  }

  action doAttackerAAttacks = {
    nondet damage = 0.to(maxDamageRoll).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      recordNextState(
        resolveCreatureAttack(
          { creatureAHp: qCreatureAHp, creatureBHp: qCreatureBHp },
          AttackerA,
          { damage: damage, hit: hit },
        ),
        creatureAttackRouteForHit(qRoute, hit),
      ),
    }
  }

  action doAttackerBAttacks = {
    nondet damage = 0.to(maxDamageRoll).oneOf()
    nondet hit = Set(true, false).oneOf()
    all {
      recordNextState(
        resolveCreatureAttack(
          { creatureAHp: qCreatureAHp, creatureBHp: qCreatureBHp },
          AttackerB,
          { damage: damage, hit: hit },
        ),
        creatureAttackRouteForHit(qRoute, hit),
      ),
    }
  }

  action step = any {
    doAttackerAAttacks,
    doAttackerBAttacks,
  }
}
