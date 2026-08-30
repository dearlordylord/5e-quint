// -*- mode: Bluespec; -*-

module battleRuntimeMirrorImageConstants {
  import battleRuntimeDuplicateHitInterception.* from "./battle-runtime-duplicate-hit-interception"

  pure def mirrorImageDurationTicks: int = duplicateHitInterceptionDurationTicks
  pure def mirrorImageInitialDuplicates: int = duplicateHitInterceptionInitialDuplicates
  pure def mirrorImageDuplicateSuccessAtLeast: int = duplicateHitInterceptionSuccessAtLeast
}
