// -*- mode: Bluespec; -*-

module battleRuntimeBeamSequenceSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | BeamSequence

  type WitnessState = {
    qInitialCreatureTargetHoles: int,
    qInitialObjectTargetHoles: int,
    qSkeletonHp: int,
    qZombieHp: int,
    qObjectHp: int,
    qActionAvailable: bool,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qInitialCreatureTargetHoles: int = qState.qInitialCreatureTargetHoles
  pure def qInitialObjectTargetHoles: int = qState.qInitialObjectTargetHoles
  pure def qSkeletonHp: int = qState.qSkeletonHp
  pure def qZombieHp: int = qState.qZombieHp
  pure def qObjectHp: int = qState.qObjectHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qScenarioResult: str = qState.qScenarioResult


  action recordProjection(
    initialCreatureTargetHoles: int,
    initialObjectTargetHoles: int,
    skeletonHp: int,
    zombieHp: int,
    objectHp: int,
    actionAvailable: bool,
    scenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qInitialCreatureTargetHoles: initialCreatureTargetHoles,
      qInitialObjectTargetHoles: initialObjectTargetHoles,
      qSkeletonHp: skeletonHp,
      qZombieHp: zombieHp,
      qObjectHp: objectHp,
      qActionAvailable: actionAvailable,
      qScenarioResult: scenarioResult,
      protocol: protocol,
    },
  }

  action init = recordProjection(2, 2, 13, 11, 5, true, "init",
    witnessInit(BeamSequence),
  )

  action doDiscoverLevelFiveBeamTargetHoles = all {
    qScenarioResult == "init",
    recordProjection(2, 2, 13, 11, 5, true, "discovered",
    witnessResolved(BeamSequence),
  ),
  }

  action doResolveTwoCreatureBeamsSameTarget = all {
    qScenarioResult == "init",
    recordProjection(2, 2, 9, 11, 5, false, "sameTargetResolved",
    witnessResolved(BeamSequence),
  ),
  }

  action doResolveTwoCreatureBeamsSplitTargets = all {
    qScenarioResult == "init",
    recordProjection(2, 2, 9, 7, 5, false, "splitTargetResolved",
    witnessResolved(BeamSequence),
  ),
  }

  action doResolveCreatureAndObjectBeamTargets = all {
    qScenarioResult == "init",
    recordProjection(2, 2, 9, 11, 1, false, "creatureObjectResolved",
    witnessResolved(BeamSequence),
  ),
  }

  action step = any {
    doDiscoverLevelFiveBeamTargetHoles,
    doResolveTwoCreatureBeamsSameTarget,
    doResolveTwoCreatureBeamsSplitTargets,
    doResolveCreatureAndObjectBeamTargets,
  }
}
