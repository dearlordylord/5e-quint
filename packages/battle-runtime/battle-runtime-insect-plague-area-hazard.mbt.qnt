// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
//
// Focused MBT projection witness connecting the SRD-named BattleState proof
// witness and identity-free persistent-area and trigger semantic owners to the
// production runtime without duplicating their reducers.

module battleRuntimeInsectPlagueAreaHazardMbt {
  import battleRuntimeInsectPlagueAreaHazard.* from "./battle-runtime-insect-plague-area-hazard"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import spellSlotExpenditure.* from "../shared-algebras/proofs/rule-core/spell-slot-expenditure"

  var qActionAvailable: bool
  var qTargetTurn: bool
  var qAreaActive: bool
  var qAreaOccurrenceOrdinal: int
  var qAreaDamageDice: int
  var qAreaDurationTicks: int
  var qAreaRadiusFeet: int
  var qAppearanceOccurrenceOpen: bool
  var qSavedThisTurn: bool
  var qNextOccurrenceOrdinal: int
  var qSlotLevel: int
  var qSlotsRemaining: int
  var qSlotSpellCastThisTurn: bool
  var qTargetHitPoints: int
  var qTargetDead: bool
  var qTargetUnconscious: bool
  var qConcentrationActive: bool
  var qLightlyObscured: bool
  var qDifficultTerrain: bool

  type InsectPlagueMbtProjection = {
    turn: {
      actionAvailable: bool,
      targetTurn: bool,
      slotSpellCastThisTurn: bool,
    },
    area: InsectPlagueArea,
    nextOccurrenceOrdinal: int,
    slotLedger: SpellSlotLedger,
    targetVitals: CreatureVitals,
  }

  pure def insectPlagueMbtState(
    projection: InsectPlagueMbtProjection,
  ): InsectPlagueAreaHazardState = {
    actionAvailable: projection.turn.actionAvailable,
    targetTurn: projection.turn.targetTurn,
    area: projection.area,
    nextOccurrenceOrdinal: projection.nextOccurrenceOrdinal,
    slotLedger: projection.slotLedger,
    slotSpellCastThisTurn: projection.turn.slotSpellCastThisTurn,
    targetVitals: projection.targetVitals,
  }

  pure def currentInsectPlagueMbtState: InsectPlagueAreaHazardState =
    insectPlagueMbtState({
      turn: {
        actionAvailable: qActionAvailable,
        targetTurn: qTargetTurn,
        slotSpellCastThisTurn: qSlotSpellCastThisTurn,
      },
      area:
        if (qAreaActive)
          InsectPlagueAreaActive({
            occurrenceOrdinal: qAreaOccurrenceOrdinal,
            damageDice: qAreaDamageDice,
            durationTicks: qAreaDurationTicks,
            radiusFeet: qAreaRadiusFeet,
            appearanceOccurrenceOpen: qAppearanceOccurrenceOpen,
            savedThisTurn: qSavedThisTurn,
          })
        else
          InsectPlagueAreaAbsent,
      nextOccurrenceOrdinal: qNextOccurrenceOrdinal,
      slotLedger: { slotLevel: qSlotLevel, slotsRemaining: qSlotsRemaining },
      targetVitals: {
        kind: PlayerCharacter,
        hitPoints: qTargetHitPoints,
        hitPointMaximum: 500,
        temporaryHitPoints: 0,
        dead: qTargetDead,
        unconscious: qTargetUnconscious,
      },
    })

  action recordNextState(nextState: InsectPlagueAreaHazardState): bool = all {
    qActionAvailable' = nextState.actionAvailable,
    qTargetTurn' = nextState.targetTurn,
    qAreaActive' = insectPlagueAreaActive(nextState),
    qAreaOccurrenceOrdinal' = match nextState.area {
      | InsectPlagueAreaAbsent => 0
      | InsectPlagueAreaActive(area) => area.occurrenceOrdinal
    },
    qAreaDamageDice' = match nextState.area {
      | InsectPlagueAreaAbsent => 0
      | InsectPlagueAreaActive(area) => area.damageDice
    },
    qAreaDurationTicks' = match nextState.area {
      | InsectPlagueAreaAbsent => 0
      | InsectPlagueAreaActive(area) => area.durationTicks
    },
    qAreaRadiusFeet' = match nextState.area {
      | InsectPlagueAreaAbsent => 0
      | InsectPlagueAreaActive(area) => area.radiusFeet
    },
    qAppearanceOccurrenceOpen' = match nextState.area {
      | InsectPlagueAreaAbsent => false
      | InsectPlagueAreaActive(area) => area.appearanceOccurrenceOpen
    },
    qSavedThisTurn' = match nextState.area {
      | InsectPlagueAreaAbsent => false
      | InsectPlagueAreaActive(area) => area.savedThisTurn
    },
    qNextOccurrenceOrdinal' = nextState.nextOccurrenceOrdinal,
    qSlotLevel' = nextState.slotLedger.slotLevel,
    qSlotsRemaining' = nextState.slotLedger.slotsRemaining,
    qSlotSpellCastThisTurn' = nextState.slotSpellCastThisTurn,
    qTargetHitPoints' = nextState.targetVitals.hitPoints,
    qTargetDead' = nextState.targetVitals.dead,
    qTargetUnconscious' = nextState.targetVitals.unconscious,
    qConcentrationActive' = insectPlagueConcentrationActive(nextState),
    qLightlyObscured' = insectPlagueAreaLightlyObscured(nextState),
    qDifficultTerrain' = insectPlagueAreaDifficultTerrain(nextState),
  }

  action init = {
    nondet slotLevel = insectPlagueMinimumSlotLevel.to(7).oneOf()
    all {
      qActionAvailable' = true,
      qTargetTurn' = false,
      qAreaActive' = false,
      qAreaOccurrenceOrdinal' = 0,
      qAreaDamageDice' = 0,
      qAreaDurationTicks' = 0,
      qAreaRadiusFeet' = 0,
      qAppearanceOccurrenceOpen' = false,
      qSavedThisTurn' = false,
      qNextOccurrenceOrdinal' = 0,
      qSlotLevel' = slotLevel,
      qSlotsRemaining' = 1,
      qSlotSpellCastThisTurn' = false,
      qTargetHitPoints' = 500,
      qTargetDead' = false,
      qTargetUnconscious' = false,
      qConcentrationActive' = false,
      qLightlyObscured' = false,
      qDifficultTerrain' = false,
    }
  }

  action doCastInsectPlague = all {
    not(qAreaActive),
    not(qTargetTurn),
    qActionAvailable,
    qSlotsRemaining > 0,
    not(qSlotSpellCastThisTurn),
    recordNextState(resolveInsectPlagueCast(currentInsectPlagueMbtState, qSlotLevel)),
  }

  action doResolveInsectPlagueSave = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet rolledDamage = qAreaDamageDice.to(qAreaDamageDice * insectPlagueDamageDieSize).oneOf()
    nondet trigger = Set(
      InsectPlagueAppearanceOccurrence,
      InsectPlagueFirstEntryOccurrence,
      InsectPlagueTargetTurnEndOccurrence,
    ).oneOf()
    all {
      qAreaActive,
      trigger != InsectPlagueTargetTurnEndOccurrence or qTargetTurn,
      recordNextState(resolveInsectPlagueSave(
        currentInsectPlagueMbtState,
        trigger,
        savingThrowSucceeded,
        rolledDamage,
      )),
    }
  }

  action doBeginInsectPlagueLaterTurn = all {
    qAreaActive,
    recordNextState(beginInsectPlagueLaterTurn(currentInsectPlagueMbtState)),
  }

  action doEndInsectPlagueConcentration = all {
    qAreaActive,
    not(qTargetTurn),
    recordNextState(resolveInsectPlagueConcentrationCleanup(currentInsectPlagueMbtState)),
  }

  action step = any {
    doCastInsectPlague,
    doResolveInsectPlagueSave,
    doBeginInsectPlagueLaterTurn,
    doEndInsectPlagueConcentration,
  }
}
