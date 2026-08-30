// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// Reusable reducer-owned timing core for area and emanation triggers. The core
// accepts table-supplied area-membership or movement witnesses as facts; it does
// not derive placement, geometry, pathing, or who occupies an area.
//
// RAW anchors:
// - Spells/Descriptions-E-L.md lines 525-527: Flaming Sphere end-turn and
//   sphere-enters-space save triggers.
// - Spells/Descriptions-E-L.md lines 895-897: Grease area-entry and end-turn
//   save triggers.
// - Spells/Descriptions-M-P.md lines 454-456: Moonbeam appears, moves into
//   space, enters-area, and end-turn save triggers with once-per-turn limiting.
// - Spells/Descriptions-S-Z.md lines 361-363: Sleet Storm first-entry and
//   start-turn save triggers.
// - Spells/Descriptions-S-Z.md lines 1269-1275: Web first-entry and start-turn
//   save triggers.
// - UBIQUITOUS_LANGUAGE.md entries for Turn, Boundary Crossing, and Movement.

module battleRuntimeAreaTriggerTiming {
  type AreaEffectTriggerTiming =
    | AreaAppearsInSpace
    | AreaMovesIntoSpace
    | CreatureEntersArea
    | CreatureStartsTurnInArea
    | CreatureEndsTurnInArea
    | CreatureEndsTurnNearArea

  type AreaEffectTriggerProfile =
    | EveryQualifiedAreaTriggerProfile({
        qualifiedTimings: Set[AreaEffectTriggerTiming],
      })
    | FirstPerTimingPerTurnAreaTriggerProfile({
        qualifiedTimings: Set[AreaEffectTriggerTiming],
        resolvedTimings: Set[AreaEffectTriggerTiming],
      })
    | OnceAcrossQualifiedAreaTriggersProfile({
        qualifiedTimings: Set[AreaEffectTriggerTiming],
        anyResolvedThisTurn: bool,
      })

  pure def everyQualifiedAreaTriggerProfile(
    qualifiedTimings: Set[AreaEffectTriggerTiming],
  ): AreaEffectTriggerProfile =
    EveryQualifiedAreaTriggerProfile({ qualifiedTimings: qualifiedTimings })

  pure def firstPerTimingPerTurnAreaTriggerProfile(
    qualifiedTimings: Set[AreaEffectTriggerTiming],
    resolvedTimings: Set[AreaEffectTriggerTiming],
  ): AreaEffectTriggerProfile =
    FirstPerTimingPerTurnAreaTriggerProfile({
      qualifiedTimings: qualifiedTimings,
      resolvedTimings: resolvedTimings,
    })

  pure def onceAcrossQualifiedAreaTriggersProfile(
    qualifiedTimings: Set[AreaEffectTriggerTiming],
    anyResolvedThisTurn: bool,
  ): AreaEffectTriggerProfile =
    OnceAcrossQualifiedAreaTriggersProfile({
      qualifiedTimings: qualifiedTimings,
      anyResolvedThisTurn: anyResolvedThisTurn,
    })

  pure def areaEffectTriggerProfileIncludesTiming(
    profile: AreaEffectTriggerProfile,
    timing: AreaEffectTriggerTiming,
  ): bool =
    match profile {
      | EveryQualifiedAreaTriggerProfile(data) =>
          data.qualifiedTimings.contains(timing)
      | FirstPerTimingPerTurnAreaTriggerProfile(data) =>
          data.qualifiedTimings.contains(timing)
      | OnceAcrossQualifiedAreaTriggersProfile(data) =>
          data.qualifiedTimings.contains(timing)
    }

  pure def areaEffectTriggerAlreadyResolved(
    profile: AreaEffectTriggerProfile,
    timing: AreaEffectTriggerTiming,
  ): bool =
    match profile {
      | EveryQualifiedAreaTriggerProfile(_) => false
      | FirstPerTimingPerTurnAreaTriggerProfile(data) =>
          data.resolvedTimings.contains(timing)
      | OnceAcrossQualifiedAreaTriggersProfile(data) => data.anyResolvedThisTurn
    }

  pure def areaEffectTriggerCanResolve(
    areaActive: bool,
    tableWitnessPresent: bool,
    profile: AreaEffectTriggerProfile,
    timing: AreaEffectTriggerTiming,
  ): bool =
    areaActive and
    tableWitnessPresent and
    areaEffectTriggerProfileIncludesTiming(profile, timing) and
    not(areaEffectTriggerAlreadyResolved(profile, timing))
}
