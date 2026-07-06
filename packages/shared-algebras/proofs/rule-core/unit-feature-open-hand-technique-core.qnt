// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.open-hand-technique
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureOpenHandTechniqueCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Monk.md:192-200: Open Hand Technique
  //   Flurry of Blows hit trigger, Addle, Push Strength save up to 15 feet away,
  //   and Topple Dexterity save to Prone.
  // - UBIQUITOUS_LANGUAGE.md: Opportunity Attack, Saving Throw, Prone, Push,
  //   and Unarmed Strike.

  type OpenHandTechniqueEffect =
    | OpenHandDecline
    | OpenHandAddle
    | OpenHandPush
    | OpenHandTopple

  type OpenHandSaveRequirement =
    | OpenHandNoSave
    | OpenHandStrengthSave
    | OpenHandDexteritySave

  pure def openHandTechniqueAvailable(
    selectedProfile: bool,
    flurryOfBlowsHit: bool,
  ): bool =
    selectedProfile and flurryOfBlowsHit

  pure def openHandPushMaximumFeet: int = 15

  pure def openHandPushDistanceValid(distanceFeet: int): bool =
    distanceFeet >= 0 and distanceFeet <= openHandPushMaximumFeet

  pure def openHandSaveRequirement(effect: OpenHandTechniqueEffect): OpenHandSaveRequirement =
    match effect {
      | OpenHandDecline => OpenHandNoSave
      | OpenHandAddle => OpenHandNoSave
      | OpenHandPush => OpenHandStrengthSave
      | OpenHandTopple => OpenHandDexteritySave
    }
}
