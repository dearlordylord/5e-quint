// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
//
// Composite slice for Moonbeam's bounded movable Cylinder flow. The slice owns
// spell-slot-backed activation, Constitution Saving Throw half-damage
// branching, once-per-creature-per-turn save limiting, Magic Action
// reposition, target Hit Point damage, and shape-shift suppression cleanup.
//
// RAW anchors:
// - Spells/Descriptions-M-P.md lines 445-458: Moonbeam creates a
//   5-foot-radius, 40-foot-high Cylinder for Concentration up to 1 minute,
//   can be moved up to 60 feet with a later Magic Action, triggers a
//   Constitution Saving Throw when the Cylinder appears, moves into a
//   creature's space, a creature enters it, or a creature ends its turn there,
//   and limits that save to once per creature per turn.
// - Spells/Descriptions-M-P.md lines 456-458: failed saves deal Radiant
//   damage and revert admitted shape-shifted creatures, successful saves take
//   half damage only, and higher-level slots add 1d10 damage per slot level.
// - Rules-Glossary.md lines 309-313, 696-704, 869-876: Cylinder,
//   Magic Action, and Shape-Shifting.
// - UBIQUITOUS_LANGUAGE.md entries for Magic Action, Spell Slot,
//   Concentration, Saving Throw, Damage Type, Hit Points, and Area of Effect.
//
// Intentionally out of scope:
//   - table-owned placement, route, line of sight, and area membership
//   - Cylinder point identity and dim-light presentation projection
//   - stat-block shape-shift sources until their restoration owners are admitted
//   - initiative order, broad turn sequencing, and reaction windows

module battleRuntimeMoonbeamMovableZone {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import spellSaveGate.* from "../shared-algebras/proofs/rule-core/spell-save-gate"
  import spellSlotExpenditure.* from "../shared-algebras/proofs/rule-core/spell-slot-expenditure"

  pure val moonbeamDurationTicks: int = 10
  pure val moonbeamRadiusFeet: int = 5
  pure val moonbeamHeightFeet: int = 40
  pure val moonbeamRepositionMaxMoveFeet: int = 60
  pure val moonbeamMinimumSlotLevel: int = 2
  pure val moonbeamBaseDamageDice: int = 2
  pure val moonbeamDamageDieSize: int = 10

  type MoonbeamSaveTrigger =
    | MoonbeamAppearsInArea
    | MoonbeamAreaMovesIntoSpace
    | MoonbeamEntersArea
    | MoonbeamEndsTurnInArea

  type MoonbeamMovableZone =
    | MoonbeamZoneAbsent
    | MoonbeamZoneActive({
        damageDice: int,
        durationTicks: int,
        repositionMaxMoveFeet: int,
        savedThisTurn: bool,
      })

  type MoonbeamTargetShapeShiftState =
    | MoonbeamTargetUnsuppressed({ shapeShift: ShapeShiftedRuntimeState })
    | MoonbeamTargetSuppressedTrueForm

  type MoonbeamMovableZoneState = {
    actionAvailable: bool,
    zone: MoonbeamMovableZone,
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
    targetVitals: CreatureVitals,
    targetShapeShift: MoonbeamTargetShapeShiftState,
  }

  type MoonbeamMovableZoneFills = {
    savingThrowSucceeded: bool,
    rolledDamage: int,
    moveFeet: int,
  }

  pure def moonbeamDamageDice(slotLevel: int): int =
    moonbeamBaseDamageDice + (slotLevel - moonbeamMinimumSlotLevel)

  pure def moonbeamDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int = {
    val branch = spellSaveGateBranch(savingThrowSucceeded)
    val damageResult = spellSaveGateDamageResult(branch, SpellSaveGateHalfDamageOnSuccess)
    spellSaveGateDamageAmount(rolledDamage, damageResult)
  }

  pure def moonbeamDamageRollAccepted(rolledDamage: int, damageDice: int): bool =
    rolledDamage >= damageDice and rolledDamage <= damageDice * moonbeamDamageDieSize

  pure def moonbeamMoveDistanceAccepted(moveFeet: int, maxMoveFeet: int): bool =
    moveFeet > 0 and moveFeet <= maxMoveFeet

  pure def moonbeamSaveTriggerTiming(trigger: MoonbeamSaveTrigger): AreaEffectTriggerTiming =
    match trigger {
      | MoonbeamAppearsInArea => AreaAppearsInSpace
      | MoonbeamAreaMovesIntoSpace => AreaMovesIntoSpace
      | MoonbeamEntersArea => CreatureEntersArea
      | MoonbeamEndsTurnInArea => CreatureEndsTurnInArea
    }

  pure def resolveMoonbeamCast(
    state: MoonbeamMovableZoneState,
    slotLevel: int,
  ): MoonbeamMovableZoneState =
    if (not(state.actionAvailable) or slotLevel < moonbeamMinimumSlotLevel)
      state
    else {
      val slotState = {
        slotLedger: state.slotLedger,
        slotSpellCastThisTurn: state.slotSpellCastThisTurn,
      }
      val slotResult = applySpellSlotExpenditure(
        slotState,
        SpellSlotExpenditureRequired({ slotLevel: slotLevel }),
      )
      if (not(spellSlotExpenditureAccepted(slotResult)))
        state
      else {
        val nextSlotState = spellSlotExpenditureResultState(slotState, slotResult)
        {
          ...state,
          actionAvailable: false,
          zone: MoonbeamZoneActive({
            damageDice: moonbeamDamageDice(slotLevel),
            durationTicks: moonbeamDurationTicks,
            repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet,
            savedThisTurn: false,
          }),
          slotLedger: nextSlotState.slotLedger,
          slotSpellCastThisTurn: nextSlotState.slotSpellCastThisTurn,
        }
      }
    }

  pure def moonbeamZoneWithSavedThisTurn(
    zone: MoonbeamMovableZone,
    savedThisTurn: bool,
  ): MoonbeamMovableZone =
    match zone {
      | MoonbeamZoneAbsent => MoonbeamZoneAbsent
      | MoonbeamZoneActive(data) => MoonbeamZoneActive({ ...data, savedThisTurn: savedThisTurn })
    }

  pure def applyMoonbeamDamage(
    state: MoonbeamMovableZoneState,
    damageDice: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): MoonbeamMovableZoneState =
    if (not(moonbeamDamageRollAccepted(rolledDamage, damageDice)))
      state
    else {
      val damage = moonbeamDamageAfterSave(rolledDamage, savingThrowSucceeded)
      val result = applyResolvedDamageToPositiveHitPoints(state.targetVitals, damage)
      { ...state, targetVitals: result.vitals }
    }

  pure def applyMoonbeamShapeShiftRider(
    state: MoonbeamMovableZoneState,
    savingThrowSucceeded: bool,
  ): MoonbeamMovableZoneState =
    if (savingThrowSucceeded)
      state
    else
      match state.targetShapeShift {
        | MoonbeamTargetSuppressedTrueForm => state
        | MoonbeamTargetUnsuppressed(target) =>
            match revertShapeShiftedRuntimeState(target.shapeShift) {
              | ShapeShiftAlreadyTrueForm => state
              | ShapeShiftRevertedToTrueForm =>
                  {
                    ...state,
                    targetShapeShift: MoonbeamTargetSuppressedTrueForm,
                  }
            }
      }

  pure def resolveMoonbeamSave(
    state: MoonbeamMovableZoneState,
    trigger: MoonbeamSaveTrigger,
    fills: MoonbeamMovableZoneFills,
  ): MoonbeamMovableZoneState =
    match state.zone {
      | MoonbeamZoneAbsent => state
      | MoonbeamZoneActive(zone) =>
        if (
          not(areaEffectTriggerCanResolve(
            true,
            true,
            moonbeamOnceAcrossQualifiedTriggersProfile(zone.savedThisTurn),
            moonbeamSaveTriggerTiming(trigger),
          )) or
          not(moonbeamDamageRollAccepted(fills.rolledDamage, zone.damageDice))
        )
          state
        else {
          val damaged = applyMoonbeamDamage(state, zone.damageDice, fills.savingThrowSucceeded, fills.rolledDamage)
          val shifted = applyMoonbeamShapeShiftRider(damaged, fills.savingThrowSucceeded)
          { ...shifted, zone: moonbeamZoneWithSavedThisTurn(shifted.zone, true) }
        }
    }

  pure def resolveMoonbeamReposition(
    state: MoonbeamMovableZoneState,
    moveFeet: int,
  ): MoonbeamMovableZoneState =
    match state.zone {
      | MoonbeamZoneAbsent => state
      | MoonbeamZoneActive(zone) =>
        if (
          not(state.actionAvailable) or
          not(moonbeamMoveDistanceAccepted(moveFeet, zone.repositionMaxMoveFeet))
        )
          state
        else
          { ...state, actionAvailable: false }
    }

  pure def resetMoonbeamSavedThisTurn(state: MoonbeamMovableZoneState): MoonbeamMovableZoneState =
    { ...state, zone: moonbeamZoneWithSavedThisTurn(state.zone, false) }

  pure def beginMoonbeamLaterTurn(state: MoonbeamMovableZoneState): MoonbeamMovableZoneState =
    match state.zone {
      | MoonbeamZoneAbsent => state
      | MoonbeamZoneActive(_) =>
        {
          ...resetMoonbeamSavedThisTurn(state),
          actionAvailable: true,
          slotSpellCastThisTurn: false,
        }
    }

  pure def resolveMoonbeamCylinderExit(state: MoonbeamMovableZoneState): MoonbeamMovableZoneState =
    match state.targetShapeShift {
      | MoonbeamTargetUnsuppressed(_) => state
      | MoonbeamTargetSuppressedTrueForm => { ...state, targetShapeShift: MoonbeamTargetUnsuppressed({ shapeShift: TrueForm }) }
    }

  pure def resolveMoonbeamSpellCleanup(state: MoonbeamMovableZoneState): MoonbeamMovableZoneState =
    { ...resolveMoonbeamCylinderExit(state), zone: MoonbeamZoneAbsent }
}
