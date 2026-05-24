// -*- mode: Bluespec; -*-

module battleRuntimeMirrorImageHitInterceptionMbt {
  import battleRuntimeMirrorImageHitInterception.* from "./battle-runtime-mirror-image-hit-interception"

  var qRemainingDuplicates: int
  var qNormalDamageContinues: bool

  action recordNextState(nextState: MirrorImageHitInterceptionState): bool = all {
    qRemainingDuplicates' = nextState.remainingDuplicates,
    qNormalDamageContinues' = nextState.normalDamageContinues,
  }

  action init = all {
    qRemainingDuplicates' = mirrorImageHitInterceptionInitialDuplicates,
    qNormalDamageContinues' = false,
  }

  action doResolveMirrorImageHitInterception = {
    nondet attackHits = Set(true, false).oneOf()
    nondet attackerBlinded = Set(true, false).oneOf()
    nondet attackerHasBlindsight = Set(true, false).oneOf()
    nondet attackerHasTruesight = Set(true, false).oneOf()
    nondet duplicateRollSucceeds = Set(true, false).oneOf()
    all {
      qRemainingDuplicates.in(0.to(mirrorImageHitInterceptionInitialDuplicates)),
      recordNextState(resolveMirrorImageHitInterception(
        {
          remainingDuplicates: qRemainingDuplicates,
        },
        {
          attackHits: attackHits,
          attackerBlinded: attackerBlinded,
          attackerHasBlindsight: attackerHasBlindsight,
          attackerHasTruesight: attackerHasTruesight,
          duplicateRollSucceeds: duplicateRollSucceeds,
        },
      )),
    }
  }

  action step = any {
    doResolveMirrorImageHitInterception,
  }
}
