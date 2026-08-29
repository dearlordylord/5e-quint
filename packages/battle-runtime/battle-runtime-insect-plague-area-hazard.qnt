// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-insect-plague-area-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
//
// Focused semantic owner for Insect Plague. Table-supplied membership facts
// select a qualified trigger; this slice deliberately does not derive geometry,
// paths, line of sight, or occupants.
//
// RAW anchors:
// - Spells/Descriptions-E-L.md "Insect Plague": Action; level 5;
//   Concentration up to 10 minutes; 20-foot-radius Sphere; Lightly Obscured
//   and Difficult Terrain; Constitution save for 4d10 Piercing damage or half
//   when the swarm appears, on first entry in a turn, or at end of turn; one
//   save per creature per turn; +1d10 per slot level above 5.
// - Rules-Glossary.md "Area of Effect", "Concentration", "Damage",
//   "Difficult Terrain", and "Lightly Obscured".
// - UBIQUITOUS_LANGUAGE.md entries for Turn Structure, Movement, Damage,
//   Concentration, Saving Throw, Spell Slot, and Area of Effect.

module battleRuntimeInsectPlagueAreaHazard {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import spellSlotExpenditure.* from "../shared-algebras/proofs/rule-core/spell-slot-expenditure"

  pure val insectPlagueMinimumSlotLevel: int = 5
  pure val insectPlagueBaseDamageDice: int = 4
  pure val insectPlagueDamageDieSize: int = 10
  pure val insectPlagueRadiusFeet: int = 20
  pure val insectPlagueDurationTicks: int = 100

  type InsectPlagueSaveTrigger =
    | InsectPlagueAppearanceOccurrence
    | InsectPlagueFirstEntryOccurrence
    | InsectPlagueTargetTurnEndOccurrence

  type InsectPlagueArea =
    | InsectPlagueAreaAbsent
    | InsectPlagueAreaActive({
        occurrenceOrdinal: int,
        damageDice: int,
        durationTicks: int,
        radiusFeet: int,
        appearanceOccurrenceOpen: bool,
        savedThisTurn: bool,
      })

  type InsectPlagueAreaHazardState = {
    actionAvailable: bool,
    targetTurn: bool,
    area: InsectPlagueArea,
    nextOccurrenceOrdinal: int,
    slotLedger: SpellSlotLedger,
    slotSpellCastThisTurn: bool,
    targetVitals: CreatureVitals,
  }

  pure def insectPlagueDamageDice(slotLevel: int): int =
    insectPlagueBaseDamageDice + slotLevel - insectPlagueMinimumSlotLevel

  pure def insectPlagueDamageRollAccepted(rolledDamage: int, damageDice: int): bool =
    rolledDamage >= damageDice and rolledDamage <= damageDice * insectPlagueDamageDieSize

  pure def insectPlagueSaveTriggerTiming(
    trigger: InsectPlagueSaveTrigger,
  ): AreaEffectTriggerTiming =
    match trigger {
      | InsectPlagueAppearanceOccurrence => AreaAppearsInSpace
      | InsectPlagueFirstEntryOccurrence => CreatureEntersArea
      | InsectPlagueTargetTurnEndOccurrence => CreatureEndsTurnInArea
    }

  pure def insectPlagueTriggerIsAvailable(
    area: {
      occurrenceOrdinal: int,
      damageDice: int,
      durationTicks: int,
      radiusFeet: int,
      appearanceOccurrenceOpen: bool,
      savedThisTurn: bool,
    },
    targetTurn: bool,
    trigger: InsectPlagueSaveTrigger,
  ): bool =
    match trigger {
      | InsectPlagueAppearanceOccurrence => area.appearanceOccurrenceOpen
      | InsectPlagueFirstEntryOccurrence => true
      | InsectPlagueTargetTurnEndOccurrence => targetTurn
    }

  pure def resolveInsectPlagueCast(
    state: InsectPlagueAreaHazardState,
    slotLevel: int,
  ): InsectPlagueAreaHazardState =
    if (
      state.targetTurn or
      not(state.actionAvailable) or
      slotLevel < insectPlagueMinimumSlotLevel
    )
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
          area: InsectPlagueAreaActive({
            occurrenceOrdinal: state.nextOccurrenceOrdinal,
            damageDice: insectPlagueDamageDice(slotLevel),
            durationTicks: insectPlagueDurationTicks,
            radiusFeet: insectPlagueRadiusFeet,
            appearanceOccurrenceOpen: true,
            savedThisTurn: false,
          }),
          nextOccurrenceOrdinal: state.nextOccurrenceOrdinal + 1,
          slotLedger: nextSlotState.slotLedger,
          slotSpellCastThisTurn: nextSlotState.slotSpellCastThisTurn,
        }
      }
    }

  pure def resolveInsectPlagueSave(
    state: InsectPlagueAreaHazardState,
    trigger: InsectPlagueSaveTrigger,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): InsectPlagueAreaHazardState =
    match state.area {
      | InsectPlagueAreaAbsent => state
      | InsectPlagueAreaActive(area) =>
          if (
            not(insectPlagueTriggerIsAvailable(area, state.targetTurn, trigger)) or
            not(areaEffectTriggerCanResolve(
              true,
              true,
              onceAcrossQualifiedAreaTriggersProfile(area.savedThisTurn),
              insectPlagueSaveTriggerTiming(trigger),
            )) or
            not(insectPlagueDamageRollAccepted(rolledDamage, area.damageDice))
          )
            state
          else {
            val damage = if (savingThrowSucceeded) rolledDamage / 2 else rolledDamage
            val damageResult = applyResolvedDamageToPositiveHitPoints(state.targetVitals, damage)
            {
              ...state,
              area: InsectPlagueAreaActive({ ...area, savedThisTurn: true }),
              targetVitals: damageResult.vitals,
            }
          }
    }

  pure def beginInsectPlagueLaterTurn(
    state: InsectPlagueAreaHazardState,
  ): InsectPlagueAreaHazardState =
    match state.area {
      | InsectPlagueAreaAbsent => {
          ...state,
          actionAvailable: true,
          targetTurn: not(state.targetTurn),
          slotSpellCastThisTurn: false,
        }
      | InsectPlagueAreaActive(area) => {
          val nextDurationTicks =
            if (state.targetTurn) area.durationTicks - 1 else area.durationTicks
          {
            ...state,
            actionAvailable: true,
            targetTurn: not(state.targetTurn),
            area:
              if (nextDurationTicks <= 0)
                InsectPlagueAreaAbsent
              else
                InsectPlagueAreaActive({
                  ...area,
                  durationTicks: nextDurationTicks,
                  appearanceOccurrenceOpen: false,
                  savedThisTurn: false,
                }),
            slotSpellCastThisTurn: false,
          }
        }
    }

  pure def resolveInsectPlagueConcentrationCleanup(
    state: InsectPlagueAreaHazardState,
  ): InsectPlagueAreaHazardState =
    { ...state, area: InsectPlagueAreaAbsent }

  pure def insectPlagueAreaActive(state: InsectPlagueAreaHazardState): bool =
    match state.area {
      | InsectPlagueAreaAbsent => false
      | InsectPlagueAreaActive(_) => true
    }

  pure def insectPlagueAreaLightlyObscured(state: InsectPlagueAreaHazardState): bool =
    insectPlagueAreaActive(state)

  pure def insectPlagueAreaDifficultTerrain(state: InsectPlagueAreaHazardState): bool =
    insectPlagueAreaActive(state)

  pure def insectPlagueConcentrationActive(state: InsectPlagueAreaHazardState): bool =
    insectPlagueAreaActive(state)
}
