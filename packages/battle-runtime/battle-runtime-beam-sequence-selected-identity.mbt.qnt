// -*- mode: Bluespec; -*-

module battleRuntimeBeamSequenceSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | BeamSequence

  type BeamSequenceSelectedIdentityScenarioOutcome = | Init | Discovered | SameTargetResolved | SplitTargetResolved | CreatureObjectResolved


  type WitnessState = {
    qInitialCreatureTargetHoles: int,
    qInitialObjectTargetHoles: int,
    qSkeletonHp: int,
    qZombieHp: int,
    qObjectHp: int,
    qActionAvailable: bool,
    qScenarioOutcome: BeamSequenceSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qInitialCreatureTargetHoles: int = qState.qInitialCreatureTargetHoles
  pure def qInitialObjectTargetHoles: int = qState.qInitialObjectTargetHoles
  pure def qSkeletonHp: int = qState.qSkeletonHp
  pure def qZombieHp: int = qState.qZombieHp
  pure def qObjectHp: int = qState.qObjectHp
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qScenarioOutcome: BeamSequenceSelectedIdentityScenarioOutcome = qState.qScenarioOutcome


  action recordProjection(
    initialCreatureTargetHoles: int,
    initialObjectTargetHoles: int,
    skeletonHp: int,
    zombieHp: int,
    objectHp: int,
    actionAvailable: bool,
    scenarioOutcome: BeamSequenceSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qInitialCreatureTargetHoles: initialCreatureTargetHoles,
      qInitialObjectTargetHoles: initialObjectTargetHoles,
      qSkeletonHp: skeletonHp,
      qZombieHp: zombieHp,
      qObjectHp: objectHp,
      qActionAvailable: actionAvailable,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(2, 2, 13, 11, 5, true, Init,
    witnessInit(BeamSequence),
  )

  action doDiscoverLevelFiveBeamTargetHoles = all {
    qScenarioOutcome == Init,
    recordProjection(2, 2, 13, 11, 5, true, Discovered,
    witnessResolved(BeamSequence),
  ),
  }

  action doResolveTwoCreatureBeamsSameTarget = all {
    qScenarioOutcome == Init,
    recordProjection(2, 2, 9, 11, 5, false, SameTargetResolved,
    witnessResolved(BeamSequence),
  ),
  }

  action doResolveTwoCreatureBeamsSplitTargets = all {
    qScenarioOutcome == Init,
    recordProjection(2, 2, 9, 7, 5, false, SplitTargetResolved,
    witnessResolved(BeamSequence),
  ),
  }

  action doResolveCreatureAndObjectBeamTargets = all {
    qScenarioOutcome == Init,
    recordProjection(2, 2, 9, 11, 1, false, CreatureObjectResolved,
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
