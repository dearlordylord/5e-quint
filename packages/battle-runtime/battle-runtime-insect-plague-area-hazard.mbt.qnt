// -*- mode: Bluespec; -*-

module battleRuntimeInsectPlagueAreaHazardMbt {
  import battleRuntimeInsectPlagueAreaHazard.* from "./battle-runtime-insect-plague-area-hazard"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

  var qActionAvailable: bool
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

  pure def insectPlagueMbtState(
    actionAvailable: bool,
    areaActive: bool,
    areaOccurrenceOrdinal: int,
    areaDamageDice: int,
    areaDurationTicks: int,
    areaRadiusFeet: int,
    appearanceOccurrenceOpen: bool,
    savedThisTurn: bool,
    nextOccurrenceOrdinal: int,
    slotLevel: int,
    slotsRemaining: int,
    slotSpellCastThisTurn: bool,
    targetHitPoints: int,
    targetDead: bool,
    targetUnconscious: bool,
  ): InsectPlagueAreaHazardState = {
    actionAvailable: actionAvailable,
    area:
      if (areaActive)
        InsectPlagueAreaActive({
          occurrenceOrdinal: areaOccurrenceOrdinal,
          damageDice: areaDamageDice,
          durationTicks: areaDurationTicks,
          radiusFeet: areaRadiusFeet,
          appearanceOccurrenceOpen: appearanceOccurrenceOpen,
          savedThisTurn: savedThisTurn,
        })
      else
        InsectPlagueAreaAbsent,
    nextOccurrenceOrdinal: nextOccurrenceOrdinal,
    slotLedger: { slotLevel: slotLevel, slotsRemaining: slotsRemaining },
    slotSpellCastThisTurn: slotSpellCastThisTurn,
    targetVitals: {
      kind: PlayerCharacter,
      hitPoints: targetHitPoints,
      hitPointMaximum: 500,
      temporaryHitPoints: 0,
      dead: targetDead,
      unconscious: targetUnconscious,
    },
  }

  pure def currentInsectPlagueMbtState: InsectPlagueAreaHazardState =
    insectPlagueMbtState(
      qActionAvailable,
      qAreaActive,
      qAreaOccurrenceOrdinal,
      qAreaDamageDice,
      qAreaDurationTicks,
      qAreaRadiusFeet,
      qAppearanceOccurrenceOpen,
      qSavedThisTurn,
      qNextOccurrenceOrdinal,
      qSlotLevel,
      qSlotsRemaining,
      qSlotSpellCastThisTurn,
      qTargetHitPoints,
      qTargetDead,
      qTargetUnconscious,
    )

  action recordNextState(nextState: InsectPlagueAreaHazardState): bool = all {
    qActionAvailable' = nextState.actionAvailable,
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
    qActionAvailable,
    qSlotsRemaining > 0,
    not(qSlotSpellCastThisTurn),
    recordNextState(resolveInsectPlagueCast(currentInsectPlagueMbtState, qSlotLevel)),
  }

  action doResolveInsectPlagueSave = {
    nondet savingThrowSucceeded = Set(true, false).oneOf()
    nondet rolledDamage = qAreaDamageDice.to(qAreaDamageDice * insectPlagueDamageDieSize).oneOf()
    nondet trigger = Set(
      InsectPlagueAppearsInArea,
      InsectPlagueEntersArea,
      InsectPlagueEndsTurnInArea,
    ).oneOf()
    all {
      qAreaActive,
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
    recordNextState(resolveInsectPlagueConcentrationCleanup(currentInsectPlagueMbtState)),
  }

  action step = any {
    doCastInsectPlague,
    doResolveInsectPlagueSave,
    doBeginInsectPlagueLaterTurn,
    doEndInsectPlagueConcentration,
  }
}
