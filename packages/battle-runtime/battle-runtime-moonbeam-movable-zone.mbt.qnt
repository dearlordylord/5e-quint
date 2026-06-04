// -*- mode: Bluespec; -*-

module battleRuntimeMoonbeamMovableZoneMbt {
  import battleRuntimeMoonbeamMovableZone.* from "./battle-runtime-moonbeam-movable-zone"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

  var qActionAvailable: bool
  var qZoneActive: bool
  var qZoneDamageDice: int
  var qZoneDurationTicks: int
  var qZoneRepositionMaxMoveFeet: int
  var qZoneSavedThisTurn: bool
  var qSlotLedgerLevel: int
  var qSlotsRemaining: int
  var qSlotSpellCastThisTurn: bool
  var qTargetHitPoints: int
  var qTargetHitPointMaximum: int
  var qTargetTemporaryHitPoints: int
  var qTargetDead: bool
  var qTargetUnconscious: bool
  var qTargetShapeShift: MoonbeamTargetShapeShiftState

  pure def moonbeamMovableZoneState(
    actionAvailable: bool,
    zoneActive: bool,
    zoneDamageDice: int,
    zoneDurationTicks: int,
    zoneRepositionMaxMoveFeet: int,
    zoneSavedThisTurn: bool,
    slotLedgerLevel: int,
    slotsRemaining: int,
    slotSpellCastThisTurn: bool,
    targetHitPoints: int,
    targetHitPointMaximum: int,
    targetTemporaryHitPoints: int,
    targetDead: bool,
    targetUnconscious: bool,
    targetShapeShift: MoonbeamTargetShapeShiftState,
  ): MoonbeamMovableZoneState = {
    actionAvailable: actionAvailable,
    zone:
      if (zoneActive)
        MoonbeamZoneActive({
          damageDice: zoneDamageDice,
          durationTicks: zoneDurationTicks,
          repositionMaxMoveFeet: zoneRepositionMaxMoveFeet,
          savedThisTurn: zoneSavedThisTurn,
        })
      else
        MoonbeamZoneAbsent,
    slotLedger: {
      slotLevel: slotLedgerLevel,
      slotsRemaining: slotsRemaining,
    },
    slotSpellCastThisTurn: slotSpellCastThisTurn,
    targetVitals: {
      kind: MonsterCreature,
      hitPoints: targetHitPoints,
      hitPointMaximum: targetHitPointMaximum,
      temporaryHitPoints: targetTemporaryHitPoints,
      dead: targetDead,
      unconscious: targetUnconscious,
    },
    targetShapeShift: targetShapeShift,
  }

  pure def currentMoonbeamMovableZoneState: MoonbeamMovableZoneState =
    moonbeamMovableZoneState(
      qActionAvailable,
      qZoneActive,
      qZoneDamageDice,
      qZoneDurationTicks,
      qZoneRepositionMaxMoveFeet,
      qZoneSavedThisTurn,
      qSlotLedgerLevel,
      qSlotsRemaining,
      qSlotSpellCastThisTurn,
      qTargetHitPoints,
      qTargetHitPointMaximum,
      qTargetTemporaryHitPoints,
      qTargetDead,
      qTargetUnconscious,
      qTargetShapeShift,
    )

  action recordNextState(nextState: MoonbeamMovableZoneState): bool = all {
    qActionAvailable' = nextState.actionAvailable,
    qZoneActive' = match nextState.zone {
      | MoonbeamZoneAbsent => false
      | MoonbeamZoneActive(_) => true
    },
    qZoneDamageDice' = match nextState.zone {
      | MoonbeamZoneAbsent => 0
      | MoonbeamZoneActive(zone) => zone.damageDice
    },
    qZoneDurationTicks' = match nextState.zone {
      | MoonbeamZoneAbsent => 0
      | MoonbeamZoneActive(zone) => zone.durationTicks
    },
    qZoneRepositionMaxMoveFeet' = match nextState.zone {
      | MoonbeamZoneAbsent => 0
      | MoonbeamZoneActive(zone) => zone.repositionMaxMoveFeet
    },
    qZoneSavedThisTurn' = match nextState.zone {
      | MoonbeamZoneAbsent => false
      | MoonbeamZoneActive(zone) => zone.savedThisTurn
    },
    qSlotLedgerLevel' = nextState.slotLedger.slotLevel,
    qSlotsRemaining' = nextState.slotLedger.slotsRemaining,
    qSlotSpellCastThisTurn' = nextState.slotSpellCastThisTurn,
    qTargetHitPoints' = nextState.targetVitals.hitPoints,
    qTargetHitPointMaximum' = nextState.targetVitals.hitPointMaximum,
    qTargetTemporaryHitPoints' = nextState.targetVitals.temporaryHitPoints,
    qTargetDead' = nextState.targetVitals.dead,
    qTargetUnconscious' = nextState.targetVitals.unconscious,
    qTargetShapeShift' = nextState.targetShapeShift,
  }

  action init = {
    nondet slotLedgerLevel = moonbeamMinimumSlotLevel.to(4).oneOf()
    all {
      qActionAvailable' = true,
      qZoneActive' = false,
      qZoneDamageDice' = 0,
      qZoneDurationTicks' = 0,
      qZoneRepositionMaxMoveFeet' = 0,
      qZoneSavedThisTurn' = false,
      qSlotLedgerLevel' = slotLedgerLevel,
      qSlotsRemaining' = 1,
      qSlotSpellCastThisTurn' = false,
      qTargetHitPoints' = 20,
      qTargetHitPointMaximum' = 20,
      qTargetTemporaryHitPoints' = 0,
      qTargetDead' = false,
      qTargetUnconscious' = false,
      qTargetShapeShift' = MoonbeamTargetUnsuppressed({ shapeShift: TrueForm }),
    }
  }

  action doCastMoonbeam = {
    nondet slotLevel = moonbeamMinimumSlotLevel.to(4).oneOf()
    all {
      recordNextState(resolveMoonbeamCast(currentMoonbeamMovableZoneState, slotLevel)),
    }
  }

  action doMoonbeamSave = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet rolledDamage = 0.to(40).oneOf()
    nondet trigger = Set(
      MoonbeamAppearsInArea,
      MoonbeamAreaMovesIntoSpace,
      MoonbeamEntersArea,
      MoonbeamEndsTurnInArea,
    ).oneOf()
    all {
      recordNextState(resolveMoonbeamSave(
        currentMoonbeamMovableZoneState,
        trigger,
        {
          savingThrowSucceeded: savingThrowSucceeded,
          rolledDamage: rolledDamage,
          moveFeet: 0,
        },
      )),
    }
  }

  action doReposition = {
    nondet moveFeet = 0.to(61).oneOf()
    all {
      recordNextState(resolveMoonbeamReposition(currentMoonbeamMovableZoneState, moveFeet)),
    }
  }

  action doBeginLaterTurn = all {
    recordNextState(beginMoonbeamLaterTurn(currentMoonbeamMovableZoneState)),
  }

  action doResetSavedThisTurn = all {
    recordNextState(resetMoonbeamSavedThisTurn(currentMoonbeamMovableZoneState)),
  }

  action doCylinderExit = all {
    recordNextState(resolveMoonbeamCylinderExit(currentMoonbeamMovableZoneState)),
  }

  action doSpellCleanup = all {
    recordNextState(resolveMoonbeamSpellCleanup(currentMoonbeamMovableZoneState)),
  }

  action doShapeShift = all {
    if (qTargetShapeShift == MoonbeamTargetSuppressedTrueForm)
      recordNextState(currentMoonbeamMovableZoneState)
    else
      recordNextState({
        ...currentMoonbeamMovableZoneState,
        targetShapeShift: MoonbeamTargetUnsuppressed({
          shapeShift: SpellEffectShapeShifted({
            source: {
              sourceCombatantId: "synthetic_shape_caster",
              sourceSpellId: "synthetic_shape_spell",
            },
            replacementForm: syntheticLargeFastFormFacts,
          }),
        }),
      }),
  }

  action step = any {
    doCastMoonbeam,
    doMoonbeamSave,
    doBeginLaterTurn,
    doReposition,
    doResetSavedThisTurn,
    doCylinderExit,
    doSpellCleanup,
    doShapeShift,
  }
}
