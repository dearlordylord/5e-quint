// -*- mode: Bluespec; -*-

module battleRuntimeScalarBuffMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole =
    | TargetChoice

  type ScalarBuffWitnessState = {
    fighterSpeed: int,
    goblinSpeed: int,
    actionAvailable: bool,
    protocol: WitnessProtocol[Hole],
  }

  var qState: ScalarBuffWitnessState

  action init = all {
    qState' = {
      fighterSpeed: 30,
      goblinSpeed: 30,
      actionAvailable: true,
      protocol: witnessInitWithHoles(Set(TargetChoice)),
    },
  }

  action doFillLongstriderTarget = all {
    qState.actionAvailable,
    qState.protocol.holes == Set(TargetChoice),
    qState' = {
      fighterSpeed: 30,
      goblinSpeed: 40,
      actionAvailable: false,
      protocol: witnessResolved(TargetChoice),
    },
  }

  action doRejectStaleAfterResolved = all {
    not(qState.actionAvailable),
    qState.protocol.holes == Set(),
    qState' = qState.with(
      "protocol",
      witnessInvalid(TargetChoice, WStaleSubject)
    ),
  }

  action step = any {
    doFillLongstriderTarget,
    doRejectStaleAfterResolved,
  }
}
