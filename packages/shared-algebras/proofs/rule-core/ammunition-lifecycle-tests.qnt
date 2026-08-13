// -*- mode: Bluespec; -*-
module ammunitionLifecycleTests {
  import ammunitionLifecycle.* from "./ammunition-lifecycle"

  pure val arrowStock = { ammunitionKind: ArrowAmmunition, remaining: 2 }
  pure val boltStock = { ammunitionKind: BoltAmmunition, remaining: 1 }

  run ammunitionAvailabilityAndExactSpend = all {
    assert(ammunitionAttackAvailable(arrowStock, ArrowAmmunition)),
    assert(ammunitionAttackAvailable(boltStock, BoltAmmunition)),
    assert(
      ammunitionRemaining(
        ammunitionAfterAcceptedAttack(arrowStock, ArrowAmmunition),
        ArrowAmmunition,
      ) == 1
    ),
    assert(
      ammunitionRemaining(
        ammunitionAfterAcceptedAttack(boltStock, ArrowAmmunition),
        BoltAmmunition,
      ) == 1
    ),
    assert(
      not(ammunitionAttackAvailable(
        { ammunitionKind: ArrowAmmunition, remaining: 0 },
        ArrowAmmunition,
      ))
    ),
  }

  run everyAmmunitionKindUsesTheSameScalarLifecycle = all {
    assert(ammunitionAttackAvailable({ ammunitionKind: ArrowAmmunition, remaining: 1 }, ArrowAmmunition)),
    assert(ammunitionAttackAvailable({ ammunitionKind: BoltAmmunition, remaining: 1 }, BoltAmmunition)),
    assert(ammunitionAttackAvailable({ ammunitionKind: BulletAmmunition, remaining: 1 }, BulletAmmunition)),
    assert(ammunitionAttackAvailable({ ammunitionKind: NeedleAmmunition, remaining: 1 }, NeedleAmmunition)),
    assert(ammunitionAttackAvailable({ ammunitionKind: SlingBulletAmmunition, remaining: 1 }, SlingBulletAmmunition)),
    assert(ammunitionAfterAcceptedAttack({ ammunitionKind: ArrowAmmunition, remaining: 1 }, ArrowAmmunition).remaining == 0),
    assert(ammunitionAfterAcceptedAttack({ ammunitionKind: BoltAmmunition, remaining: 1 }, BoltAmmunition).remaining == 0),
    assert(ammunitionAfterAcceptedAttack({ ammunitionKind: BulletAmmunition, remaining: 1 }, BulletAmmunition).remaining == 0),
    assert(ammunitionAfterAcceptedAttack({ ammunitionKind: NeedleAmmunition, remaining: 1 }, NeedleAmmunition).remaining == 0),
    assert(ammunitionAfterAcceptedAttack({ ammunitionKind: SlingBulletAmmunition, remaining: 1 }, SlingBulletAmmunition).remaining == 0),
  }
}
