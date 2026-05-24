// -*- mode: Bluespec; -*-

module battleRuntimeWardingBondDamageSharingMbt {
  import battleRuntimeWardingBondDamageSharing.* from "./battle-runtime-warding-bond-damage-sharing"

  var qSourceHitPoints: int
  var qWardHitPoints: int
  var qBondPresent: bool
  var qSourceTookSharedDamage: bool

  pure def currentWardingBondDamageSharingState: WardingBondDamageSharingState = {
    sourceHitPoints: qSourceHitPoints,
    wardHitPoints: qWardHitPoints,
    bondPresent: qBondPresent,
    sourceTookSharedDamage: qSourceTookSharedDamage,
  }

  action recordNextState(nextState: WardingBondDamageSharingState): bool = all {
    qSourceHitPoints' = nextState.sourceHitPoints,
    qWardHitPoints' = nextState.wardHitPoints,
    qBondPresent' = nextState.bondPresent,
    qSourceTookSharedDamage' = nextState.sourceTookSharedDamage,
  }

  action init = {
    nondet sourceHitPoints = 0.to(12).oneOf()
    nondet wardHitPoints = 0.to(12).oneOf()
    nondet bondPresent = Set(true, false).oneOf()
    all {
      not(bondPresent) or sourceHitPoints > 0,
      recordNextState(wardingBondDamageSharingInitialState(
        sourceHitPoints,
        wardHitPoints,
        bondPresent,
      )),
    }
  }

  action doSharedDamage = {
    nondet incomingDamage = 0.to(24).oneOf()
    all {
      recordNextState(resolveWardingBondSharedDamage(
        currentWardingBondDamageSharingState,
        {
          incomingDamage: incomingDamage,
        },
      )),
    }
  }

  action doSeparationCleanup = {
    nondet separatedBeyondSixtyFeet = Set(true, false).oneOf()
    all {
      recordNextState(resolveWardingBondCleanup(
        currentWardingBondDamageSharingState,
        separatedBeyondSixtyFeet,
        false,
      )),
    }
  }

  action doRecastCleanup = {
    nondet recastOnConnectedCreature = Set(true, false).oneOf()
    all {
      recordNextState(resolveWardingBondCleanup(
        currentWardingBondDamageSharingState,
        false,
        recastOnConnectedCreature,
      )),
    }
  }

  action step = any {
    doSharedDamage,
    doSeparationCleanup,
    doRecastCleanup,
  }
}
