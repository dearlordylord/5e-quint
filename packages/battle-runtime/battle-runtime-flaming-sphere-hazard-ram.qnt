// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
//
// Composite slice for Flaming Sphere's bounded battle-runtime hazard and ram
// flow. The slice owns spell-slot-backed sphere activation, Dexterity
// Saving Throw half-damage branching, target Hit Point damage, and Bonus
// Action ram spending.
//
// RAW anchors:
// - Spells/Descriptions-E-L.md lines 516-531: Flaming Sphere creates a
//   5-foot-diameter sphere for Concentration up to 1 minute, damages
//   creatures that end within 5 feet, can be moved up to 30 feet as a Bonus
//   Action, and damages a creature whose space it enters.
// - Playing-the-Game.md lines 318-324, 682-716: Bonus Action availability,
//   Hit Points, damage rolls, and half damage on successful saves.
// - UBIQUITOUS_LANGUAGE.md entries for Bonus Action, Spell Slot,
//   Concentration, Duration, Saving Throw, Damage, and Hit Points.
//
// Intentionally out of scope:
//   - table-owned placement, pathing, barriers, pits, and exact area membership
//   - object ignition and Bright/Dim Light presentation projection
//   - initiative order, unrelated active effects, and reaction windows

module battleRuntimeFlamingSphereHazardRam {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import spellSaveGate.* from "../shared-algebras/proofs/rule-core/spell-save-gate"
  import spellSlotExpenditure.* from "../shared-algebras/proofs/rule-core/spell-slot-expenditure"

  pure val flamingSphereDurationTicks: int = 10
  pure val flamingSphereDiameterFeet: int = 5
  pure val flamingSphereRamMaxMoveFeet: int = 30
  pure val flamingSphereMinimumSlotLevel: int = 2
  pure val flamingSphereBaseDamageDice: int = 2

  type FlamingSphereHazardRamEntrypoint =
    | FlamingSphereEndWithinFiveFeet
    | FlamingSphereRam

  type FlamingSphereHazardRamSphere =
    | FlamingSphereAbsent
    | FlamingSphereActive({
        damageDice: int,
        durationTicks: int,
        ramMaxMoveFeet: int,
      })

  type FlamingSphereHazardRamState = {
    actionAvailable: bool,
    casterHasBonusAction: bool,
    sphere: FlamingSphereHazardRamSphere,
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
    targetVitals: CreatureVitals,
  }

  type FlamingSphereHazardRamFills = {
    savingThrowSucceeded: bool,
    rolledDamage: int,
    moveFeet: int,
  }

  pure def flamingSphereDamageDice(slotLevel: int): int =
    flamingSphereBaseDamageDice + (slotLevel - flamingSphereMinimumSlotLevel)

  pure def flamingSphereDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int = {
    val branch = spellSaveGateBranch(savingThrowSucceeded)
    val damageResult = spellSaveGateDamageResult(branch, SpellSaveGateHalfDamageOnSuccess)
    spellSaveGateDamageAmount(rolledDamage, damageResult)
  }

  pure def flamingSphereMoveDistanceAccepted(moveFeet: int, maxMoveFeet: int): bool =
    moveFeet > 0 and moveFeet <= maxMoveFeet

  pure def flamingSphereDamageRollAccepted(rolledDamage: int, damageDice: int): bool =
    rolledDamage >= damageDice and rolledDamage <= damageDice * 6

  pure def flamingSphereHazardRamTriggerTiming(entrypoint: FlamingSphereHazardRamEntrypoint): AreaEffectTriggerTiming =
    match entrypoint {
      | FlamingSphereEndWithinFiveFeet => CreatureEndsTurnNearArea
      | FlamingSphereRam => AreaMovesIntoSpace
    }

  pure def resolveFlamingSphereCast(
    state: FlamingSphereHazardRamState,
    slotLevel: int,
  ): FlamingSphereHazardRamState =
    if (not(state.actionAvailable) or slotLevel < flamingSphereMinimumSlotLevel)
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
          sphere: FlamingSphereActive({
            damageDice: flamingSphereDamageDice(slotLevel),
            durationTicks: flamingSphereDurationTicks,
            ramMaxMoveFeet: flamingSphereRamMaxMoveFeet,
          }),
          slotLedger: nextSlotState.slotLedger,
          slotSpellCastThisTurn: nextSlotState.slotSpellCastThisTurn,
        }
      }
    }

  pure def applyFlamingSphereHazardDamage(
    state: FlamingSphereHazardRamState,
    damageDice: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): FlamingSphereHazardRamState = {
    if (not(flamingSphereDamageRollAccepted(rolledDamage, damageDice)))
      state
    else {
      val damage = flamingSphereDamageAfterSave(rolledDamage, savingThrowSucceeded)
      val result = applyResolvedDamageToPositiveHitPoints(state.targetVitals, damage)
      { ...state, targetVitals: result.vitals }
    }
  }

  pure def resolveFlamingSphereHazardRam(
    state: FlamingSphereHazardRamState,
    entrypoint: FlamingSphereHazardRamEntrypoint,
    fills: FlamingSphereHazardRamFills,
  ): FlamingSphereHazardRamState =
    match state.sphere {
      | FlamingSphereAbsent => state
      | FlamingSphereActive(sphere) =>
        if (not(areaEffectTriggerCanResolve(
          true,
          true,
          FlamingSphereHazardEveryTriggerProfile,
          flamingSphereHazardRamTriggerTiming(entrypoint),
        )))
          state
        else
          match entrypoint {
            | FlamingSphereEndWithinFiveFeet =>
              applyFlamingSphereHazardDamage(state, sphere.damageDice, fills.savingThrowSucceeded, fills.rolledDamage)
            | FlamingSphereRam =>
              if (
                not(state.casterHasBonusAction) or
                not(flamingSphereMoveDistanceAccepted(fills.moveFeet, sphere.ramMaxMoveFeet))
              )
                state
              else {
                val damaged = applyFlamingSphereHazardDamage(state, sphere.damageDice, fills.savingThrowSucceeded, fills.rolledDamage)
                { ...damaged, casterHasBonusAction: false }
              }
          }
    }
}
