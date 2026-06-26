// -*- mode: Bluespec; -*-

// Leaf facts shared by the focused Magic Missile witness and its reducer-route
// connector. This file owns only literal scenario facts and pure projection
// arithmetic; it has no reducer or witness state.
module battleRuntimeMagicMissileFacts {
  pure val skeletonInitialHp: int = 13

  pure def skeletonHpAfterMagicMissileDamage(
    hp: int,
    dartRollTotal: int,
  ): int = {
    val damage = dartRollTotal + 3
    if (hp - damage < 0) 0 else hp - damage
  }
}
