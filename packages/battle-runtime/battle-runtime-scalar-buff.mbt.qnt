// -*- mode: Bluespec; -*-

module battleRuntimeScalarBuffMbt {
  import battleRuntime.* from "./battle-runtime"

  var qFighterSpeed: int
  var qGoblinSpeed: int
  var qActionAvailable: bool
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  action init = all {
    qFighterSpeed' = 30,
    qGoblinSpeed' = 30,
    qActionAvailable' = true,
    qHoles' = Set(TargetChoice),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doFillLongstriderTarget = all {
    qActionAvailable,
    qHoles == Set(TargetChoice),
    qFighterSpeed' = 30,
    qGoblinSpeed' = 40,
    qActionAvailable' = false,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    qHoles == Set(),
    qFighterSpeed' = qFighterSpeed,
    qGoblinSpeed' = qGoblinSpeed,
    qActionAvailable' = qActionAvailable,
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastInvalidReason' = "staleSubject",
  }

  action step = any {
    doFillLongstriderTarget,
    doRejectStaleAfterResolved,
  }
}
