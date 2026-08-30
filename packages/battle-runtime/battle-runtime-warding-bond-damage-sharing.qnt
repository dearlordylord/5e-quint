// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
//
// Composite slice for Warding Bond target damage sharing. The slice starts
// after the caller has produced a nonnegative incoming damage amount and stops
// after target Resistance, same-amount source damage, and linked-effect cleanup.
//
// RAW anchors:
// - Spells/Descriptions-S-Z.md lines 1219-1230: Warding Bond gives the target
//   Resistance to all damage while within 60 feet; each time the target takes
//   damage, the source takes the same amount; the spell ends if the source
//   drops to 0 Hit Points, the creatures separate beyond 60 feet, or the spell
//   is cast again on either connected creature.
// - Rules-Glossary.md lines 560-562 and 828-830: Hit Points cannot go below 0,
//   and Resistance halves damage, rounded down.
// - UBIQUITOUS_LANGUAGE.md entries for Hit Points, Damage, and Resistance.
//
// Intentionally out of scope:
//   - spell casting, component ownership, target willingness, and duration
//   - table-owned positioning and distance measurement
//   - full damage roll, damage-type, Temporary Hit Points, and death lifecycle
//   - other active effects and concentration/repeat-save side effects

module battleRuntimeWardingBondDamageSharing {
  import battleRuntimeLinkedDefenseDamageShare.* from "./battle-runtime-linked-defense-damage-share"

  type WardingBondDamageSharingState = {
    sourceHitPoints: int,
    wardHitPoints: int,
    bondPresent: bool,
    sourceTookSharedDamage: bool,
  }

  type WardingBondDamageSharingFill = {
    incomingDamage: int,
  }

  type WardingBondCleanupFills = {
    separatedBeyondSixtyFeet: bool,
    recastOnConnectedCreature: bool,
  }

  pure def wardingBondDamageSharingInitialState(
    sourceHitPoints: int,
    wardHitPoints: int,
    bondPresent: bool,
  ): WardingBondDamageSharingState = {
    val initial = linkedDefenseDamageShareInitialState(
      sourceHitPoints,
      wardHitPoints,
      bondPresent,
    )
    {
      sourceHitPoints: initial.sourceHitPoints,
      wardHitPoints: initial.targetHitPoints,
      bondPresent: initial.linkPresent,
      sourceTookSharedDamage: initial.sourceTookSharedDamage,
    }
  }

  pure def wardingBondDamageAfterResistance(incomingDamage: int): int =
    linkedDefenseDamageAfterResistance(incomingDamage)

  pure def applyDamageToHitPoints(hitPoints: int, damage: int): int =
    hitPointsAfterLinkedDamage(hitPoints, damage)

  pure def wardingBondStateAfterCleanup(
    state: WardingBondDamageSharingState,
    fills: WardingBondCleanupFills,
  ): WardingBondDamageSharingState = {
    val cleaned = linkedDefenseStateAfterCleanup(
      {
        sourceHitPoints: state.sourceHitPoints,
        targetHitPoints: state.wardHitPoints,
        linkPresent: state.bondPresent,
        sourceTookSharedDamage: state.sourceTookSharedDamage,
      },
      {
        sourceAndTargetSeparated: fills.separatedBeyondSixtyFeet,
        linkReplaced: fills.recastOnConnectedCreature,
      },
    )
    {
      sourceHitPoints: cleaned.sourceHitPoints,
      wardHitPoints: cleaned.targetHitPoints,
      bondPresent: cleaned.linkPresent,
      sourceTookSharedDamage: cleaned.sourceTookSharedDamage,
    }
  }

  pure def resolveWardingBondSharedDamage(
    state: WardingBondDamageSharingState,
    fill: WardingBondDamageSharingFill,
  ): WardingBondDamageSharingState = {
    val resolved = resolveLinkedDefenseSharedDamage(
      {
        sourceHitPoints: state.sourceHitPoints,
        targetHitPoints: state.wardHitPoints,
        linkPresent: state.bondPresent,
        sourceTookSharedDamage: state.sourceTookSharedDamage,
      },
      { incomingDamage: fill.incomingDamage },
    )
    {
      sourceHitPoints: resolved.sourceHitPoints,
      wardHitPoints: resolved.targetHitPoints,
      bondPresent: resolved.linkPresent,
      sourceTookSharedDamage: resolved.sourceTookSharedDamage,
    }
  }

  pure def resolveWardingBondCleanup(
    state: WardingBondDamageSharingState,
    separatedBeyondSixtyFeet: bool,
    recastOnConnectedCreature: bool,
  ): WardingBondDamageSharingState =
    wardingBondStateAfterCleanup(
      { ...state, sourceTookSharedDamage: false },
      {
        separatedBeyondSixtyFeet: separatedBeyondSixtyFeet,
        recastOnConnectedCreature: recastOnConnectedCreature,
      },
    )
}
