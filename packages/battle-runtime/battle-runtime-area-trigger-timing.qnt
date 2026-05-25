// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
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
    | GreaseGroundHazardEveryTriggerProfile
    | FlamingSphereHazardEveryTriggerProfile
    | WebRestraintFirstEntryAndStartTurnProfile({
        entryResolvedThisTurn: bool,
        startTurnResolvedThisTurn: bool,
      })
    | MoonbeamOnceAcrossQualifiedTriggersProfile({ anyResolvedThisTurn: bool })

  pure def webRestraintFirstEntryAndStartTurnProfile(
    entryResolvedThisTurn: bool,
    startTurnResolvedThisTurn: bool,
  ): AreaEffectTriggerProfile =
    WebRestraintFirstEntryAndStartTurnProfile({
      entryResolvedThisTurn: entryResolvedThisTurn,
      startTurnResolvedThisTurn: startTurnResolvedThisTurn,
    })

  pure def moonbeamOnceAcrossQualifiedTriggersProfile(
    anyResolvedThisTurn: bool,
  ): AreaEffectTriggerProfile =
    MoonbeamOnceAcrossQualifiedTriggersProfile({ anyResolvedThisTurn: anyResolvedThisTurn })

  pure def areaEffectTriggerProfileIncludesTiming(
    profile: AreaEffectTriggerProfile,
    timing: AreaEffectTriggerTiming,
  ): bool =
    match profile {
      | GreaseGroundHazardEveryTriggerProfile =>
          timing == AreaAppearsInSpace or
          timing == CreatureEntersArea or
          timing == CreatureEndsTurnInArea
      | FlamingSphereHazardEveryTriggerProfile =>
          timing == AreaMovesIntoSpace or timing == CreatureEndsTurnNearArea
      | WebRestraintFirstEntryAndStartTurnProfile(_) =>
          timing == CreatureEntersArea or timing == CreatureStartsTurnInArea
      | MoonbeamOnceAcrossQualifiedTriggersProfile(_) =>
          timing == AreaAppearsInSpace or
          timing == AreaMovesIntoSpace or
          timing == CreatureEntersArea or
          timing == CreatureEndsTurnInArea
    }

  pure def areaEffectTriggerAlreadyResolved(
    profile: AreaEffectTriggerProfile,
    timing: AreaEffectTriggerTiming,
  ): bool =
    match profile {
      | GreaseGroundHazardEveryTriggerProfile => false
      | FlamingSphereHazardEveryTriggerProfile => false
      | WebRestraintFirstEntryAndStartTurnProfile(data) =>
          if (timing == CreatureEntersArea)
            data.entryResolvedThisTurn
          else if (timing == CreatureStartsTurnInArea)
            data.startTurnResolvedThisTurn
          else
            false
      | MoonbeamOnceAcrossQualifiedTriggersProfile(data) => data.anyResolvedThisTurn
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
