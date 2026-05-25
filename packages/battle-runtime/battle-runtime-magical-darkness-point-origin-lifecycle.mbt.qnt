// -*- mode: Bluespec; -*-

module battleRuntimeMagicalDarknessPointOriginLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness:
  //   magical Darkness spreads from a point within range and fills a
  //   15-foot-radius Sphere; Darkvision cannot see through it, nonmagical
  //   light cannot illuminate it, overlapping spell-created Bright Light or
  //   Dim Light from level 2 or lower is dispelled, and the duration is
  //   Concentration up to 10 minutes.
  // - .references/srd-5.2.1/Rules-Glossary.md#Darkness and #Darkvision:
  //   Darkness is Heavily Obscured, and magical Darkness blocks Darkvision
  //   when a spell says so.
  // - UBIQUITOUS_LANGUAGE.md: Area of Effect, Concentration, Illumination,
  //   Obscurement, Darkvision, and Spell Slot.
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qDarknessActive: bool
  var qZoneProjected: bool
  var qCasterConcentrating: bool
  var qOrdinarySightObscurement: str
  var qDarkvisionSightObscurement: str
  var qNonmagicalLightIllumination: str
  var qOverlappingLowLevelSpellLightActive: bool
  var qOverlappingHighLevelSpellLightActive: bool
  var qNonOverlappingLowLevelSpellLightActive: bool
  var qLastResult: str

  action recordDarknessState(
    actionAvailable: bool,
    spellAvailable: bool,
    darknessActive: bool,
    zoneProjected: bool,
    casterConcentrating: bool,
    ordinarySightObscurement: str,
    darkvisionSightObscurement: str,
    nonmagicalLightIllumination: str,
    overlappingLowLevelSpellLightActive: bool,
    overlappingHighLevelSpellLightActive: bool,
    nonOverlappingLowLevelSpellLightActive: bool,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qDarknessActive' = darknessActive,
    qZoneProjected' = zoneProjected,
    qCasterConcentrating' = casterConcentrating,
    qOrdinarySightObscurement' = ordinarySightObscurement,
    qDarkvisionSightObscurement' = darkvisionSightObscurement,
    qNonmagicalLightIllumination' = nonmagicalLightIllumination,
    qOverlappingLowLevelSpellLightActive' = overlappingLowLevelSpellLightActive,
    qOverlappingHighLevelSpellLightActive' = overlappingHighLevelSpellLightActive,
    qNonOverlappingLowLevelSpellLightActive' = nonOverlappingLowLevelSpellLightActive,
    qLastResult' = lastResult,
  }

  action init = recordDarknessState(
    true,
    true,
    false,
    false,
    false,
    "none",
    "none",
    "none",
    true,
    true,
    true,
    "init",
  )

  action doCastWithAreaAndLightWitnesses = all {
    qActionAvailable,
    qSpellAvailable,
    not(qDarknessActive),
    qOverlappingLowLevelSpellLightActive,
    qOverlappingHighLevelSpellLightActive,
    qNonOverlappingLowLevelSpellLightActive,
    recordDarknessState(
      false,
      false,
      true,
      true,
      true,
      "heavilyObscured",
      "heavilyObscured",
      "darkness",
      false,
      true,
      true,
      "castWithAreaAndLightWitnesses",
    ),
  }

  action doBreakConcentration = all {
    qDarknessActive,
    qCasterConcentrating,
    recordDarknessState(
      qActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      "none",
      "none",
      "none",
      qOverlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive,
      "concentrationCleaned",
    ),
  }

  action doExpireDuration = all {
    qDarknessActive,
    qCasterConcentrating,
    recordDarknessState(
      qActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      "none",
      "none",
      "none",
      qOverlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive,
      "durationCleaned",
    ),
  }

  action doStutter = all {
    not(qDarknessActive),
    not(qSpellAvailable),
    recordDarknessState(
      qActionAvailable,
      qSpellAvailable,
      qDarknessActive,
      qZoneProjected,
      qCasterConcentrating,
      qOrdinarySightObscurement,
      qDarkvisionSightObscurement,
      qNonmagicalLightIllumination,
      qOverlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive,
      qLastResult,
    ),
  }

  action step = any {
    doCastWithAreaAndLightWitnesses,
    doBreakConcentration,
    doExpireDuration,
    doStutter,
  }
}
