// -*- mode: Bluespec; -*-

module battleRuntimeSeeInvisibilityConstants {
  type SeeInvisibleWitnessPlane =
    | MaterialPlane
    | EtherealPlane

  pure def seeInvisibilityDurationTicks: int = 60 * 10
}
