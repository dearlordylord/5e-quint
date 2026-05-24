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
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

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
    sourceHitPoints: nonnegative(sourceHitPoints),
    wardHitPoints: nonnegative(wardHitPoints),
    bondPresent: bondPresent and sourceHitPoints > 0,
    sourceTookSharedDamage: false,
  }

  pure def wardingBondDamageAfterResistance(incomingDamage: int): int =
    nonnegative(incomingDamage) / 2

  pure def applyDamageToHitPoints(hitPoints: int, damage: int): int =
    nonnegative(hitPoints - nonnegative(damage))

  pure def wardingBondStateAfterCleanup(
    state: WardingBondDamageSharingState,
    fills: WardingBondCleanupFills,
  ): WardingBondDamageSharingState =
    if (
      state.bondPresent and (
        state.sourceHitPoints == 0 or
        fills.separatedBeyondSixtyFeet or
        fills.recastOnConnectedCreature
      )
    ) { ...state, bondPresent: false } else state

  pure def resolveWardingBondSharedDamage(
    state: WardingBondDamageSharingState,
    fill: WardingBondDamageSharingFill,
  ): WardingBondDamageSharingState = {
    val targetDamage =
      if (state.bondPresent)
        wardingBondDamageAfterResistance(fill.incomingDamage)
      else
        nonnegative(fill.incomingDamage)
    val sourceSharesDamage =
      state.bondPresent and state.sourceHitPoints > 0 and targetDamage > 0
    val damaged = {
      ...state,
      sourceHitPoints:
        if (sourceSharesDamage)
          applyDamageToHitPoints(state.sourceHitPoints, targetDamage)
        else
          state.sourceHitPoints,
      wardHitPoints: applyDamageToHitPoints(state.wardHitPoints, targetDamage),
      sourceTookSharedDamage: sourceSharesDamage,
    }
    wardingBondStateAfterCleanup(
      damaged,
      {
        separatedBeyondSixtyFeet: false,
        recastOnConnectedCreature: false,
      },
    )
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
