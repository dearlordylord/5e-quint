// -*- mode: Bluespec; -*-

module battleRuntimeEldritchBlastMbt {
  import battleRuntime.* from "./battle-runtime"
  import battleRuntimeModel.* from "./battle-runtime-model"

  var qActionAvailable: bool
  var qTargetHp: int
  var qResolvedBeams: int
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  action init = all {
    qActionAvailable' = true,
    qTargetHp' = 13,
    qResolvedBeams' = 0,
    qHoles' = Set(TargetChoice, ObjectTargetChoice),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doFillTwoCreatureTargets = all {
    qActionAvailable,
    qHoles == Set(TargetChoice, ObjectTargetChoice),
    qActionAvailable' = qActionAvailable,
    qTargetHp' = qTargetHp,
    qResolvedBeams' = qResolvedBeams,
    qHoles' = Set(AttackRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillFirstAttackMiss = all {
    qActionAvailable,
    qResolvedBeams == 0,
    qHoles == Set(AttackRoll),
    qActionAvailable' = qActionAvailable,
    qTargetHp' = qTargetHp,
    qResolvedBeams' = 1,
    qHoles' = Set(AttackRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillFirstAttackHit = all {
    qActionAvailable,
    qResolvedBeams == 0,
    qHoles == Set(AttackRoll),
    qActionAvailable' = qActionAvailable,
    qTargetHp' = qTargetHp,
    qResolvedBeams' = qResolvedBeams,
    qHoles' = Set(SpellDamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillFirstDamageLow = all {
    qActionAvailable,
    qResolvedBeams == 0,
    qHoles == Set(SpellDamageRoll),
    qActionAvailable' = qActionAvailable,
    qTargetHp' = 9,
    qResolvedBeams' = 1,
    qHoles' = Set(AttackRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillSecondAttackMiss = all {
    qActionAvailable,
    qResolvedBeams == 1,
    qHoles == Set(AttackRoll),
    qActionAvailable' = false,
    qTargetHp' = qTargetHp,
    qResolvedBeams' = 2,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillSecondAttackHit = all {
    qActionAvailable,
    qResolvedBeams == 1,
    qHoles == Set(AttackRoll),
    qActionAvailable' = qActionAvailable,
    qTargetHp' = qTargetHp,
    qResolvedBeams' = qResolvedBeams,
    qHoles' = Set(SpellDamageRoll),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillSecondDamageLow = all {
    qActionAvailable,
    qResolvedBeams == 1,
    qHoles == Set(SpellDamageRoll),
    qActionAvailable' = false,
    qTargetHp' = qTargetHp - 4,
    qResolvedBeams' = 2,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doRejectStaleAfterResolved = all {
    not(qActionAvailable),
    qHoles == Set(),
    qActionAvailable' = qActionAvailable,
    qTargetHp' = qTargetHp,
    qResolvedBeams' = qResolvedBeams,
    qHoles' = qHoles,
    qLastResult' = "invalid",
    qLastInvalidReason' = "staleSubject",
  }

  action step = any {
    doFillTwoCreatureTargets,
    doFillFirstAttackMiss,
    doFillFirstAttackHit,
    doFillFirstDamageLow,
    doFillSecondAttackMiss,
    doFillSecondAttackHit,
    doFillSecondDamageLow,
    doRejectStaleAfterResolved,
  }
}
