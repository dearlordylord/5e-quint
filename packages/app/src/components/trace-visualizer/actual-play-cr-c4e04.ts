/* eslint-disable max-lines */
/**
 * Actual-Play Trace: Critical Role C4E04 "Stone-Faced" — Palazzo Davinos Battle
 *
 * SOURCE: Critical Role Campaign 4, Episode 4 "Stone-Faced"
 *   - Omen Archive: https://www.omenarchive.com/c4/julien/
 *   - Campaign uses D&D 2024 (5.2.1) rules with homebrew overlay
 *
 * ORIGINAL ENCOUNTER:
 *   Seekers table (GM: Brennan Lee Mulligan). Palazzo Davinos battle vs. ghouls,
 *   shadows, and a high-level enemy mage. Nearly a TPK.
 *   Sir Julien Davinos (Matt Mercer): Rogue 1/Fighter 2-3, Daredevil homebrew.
 *   Omen Archive aggregates: 107 damage dealt, 46 taken, 6 kills.
 *
 * ADAPTATION: Julien recast as Champion Fighter L5 (44 HP, 30ft speed).
 *   5-round combat. Homebrew stripped. All class features mapped to RAW Champion.
 *
 * Kill count, damage budget, and provenance tracked via ActualPlayStep annotations.
 * Damage taken (55) exceeds Omen Archive aggregate (46) due to added rounds.
 */

import { singleClassHitDice } from "@dnd/core/features/class-tables.ts"
import { classLevel, d20Roll, healAmount } from "@dnd/core/types.ts"

import type { ActualPlayStep, EncounterDef } from "./actual-play-types.ts"
import { damage, defaultState, endTurn, replayActualPlayTrace, startTurn } from "./actual-play-types.ts"
import type { TraceStep } from "./sample-trace.ts"

// --- Encounter definition ---

const ENCOUNTER: EncounterDef = {
  title: 'Palazzo Davinos Battle (CR C4E04 "Stone-Faced")',
  source: {
    name: "Omen Archive (CR C4 Julien stats)",
    url: "https://www.omenarchive.com/c4/julien/",
    refDamageTaken: 46,
    refKills: 6
  },
  perspectiveCharacter: "Sir Julien Davinos (Champion Fighter L5)",
  enemies: {
    "ghoul-1": { name: "Ghoul" },
    "ghoul-2": { name: "Ghoul (wounded)" },
    "shadow-1": { name: "Shadow" },
    mage: { name: "Enemy Mage" },
    "shadow-2": { name: "Shadow" },
    "ghoul-3": { name: "Ghoul" }
  },
  machineInput: {
    maxHp: 44,
    hitDiceRemaining: singleClassHitDice("fighter", 5),
    effectiveSpeed: 30,
    movementRemaining: 30,
    extraAttacksRemaining: 1,
    fighterLevel: classLevel(5)
  }
}

// --- The trace: 5-round Palazzo Davinos battle ---

const TRACE_STEPS: ReadonlyArray<ActualPlayStep> = [
  // ===== INITIALIZATION =====

  {
    round: 0,
    source: "original",
    quintAction: "init",
    xstateEvent: "(initial)",
    description:
      "Sir Julien Davinos, Champion Fighter L5: 44 HP, rapier & demi-gauntlet. " +
      "Palazzo Davinos. Ghouls, shadows, and a mage lurk in the ruins.",
    events: [],
    expectedQuintState: defaultState()
  },

  {
    round: 0,
    source: "original",
    quintAction: "doEnterCombat",
    xstateEvent: "ENTER_COMBAT",
    description: "Ghouls burst from the stonework! Roll initiative. " + "Julien rolls high but ghouls act first.",
    events: [{ type: "ENTER_COMBAT" }],
    expectedQuintState: defaultState({ turnPhase: "waitingForTurn" })
  },

  // =====================================================================
  // ROUND 1: First contact — ghouls swarm, Julien strikes back
  // =====================================================================

  {
    round: 1,
    source: "original",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "R1 Ghoul turn: Two ghouls lunge. Roll 16 misses (AC 17). " +
      "Roll 19 hits — claws rake for 8 Piercing. " +
      "Con save vs paralysis: 15 — passes!",
    events: [damage(8, "piercing")],
    expectedQuintState: defaultState({ hp: 36, turnPhase: "waitingForTurn" })
  },

  {
    round: 1,
    source: "original",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description:
      "R1 Julien's turn. 36 HP. Draws rapier (Vex mastery). " + "Two ghouls in front, shadows lurking behind pillars.",
    events: [startTurn()],
    expectedQuintState: defaultState({ hp: 36, turnPhase: "acting" })
  },

  {
    round: 1,
    source: "original",
    quintAction: "doUseMovement",
    xstateEvent: "USE_MOVEMENT",
    description: "Move 5ft to engage the nearest ghoul.",
    events: [{ type: "USE_MOVEMENT", feet: 5, movementCost: 1 }],
    expectedQuintState: defaultState({ hp: 36, turnPhase: "acting", movementRemaining: 25 })
  },

  {
    round: 1,
    source: "original",
    kills: ["ghoul-1"],
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Attack: rapier thrust at ghoul. Roll 22 vs AC 12 — hit! " +
      "12 Piercing (1d8+4). Vex applied — next attack has advantage.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 36,
      turnPhase: "acting",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true
    })
  },

  {
    round: 1,
    source: "original",
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description:
      "Extra Attack (Vex advantage): rapier at second ghoul. Roll 18 vs AC 12 — hit! " +
      "10 Piercing (1d8+4). Ghoul reels but still stands.",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 36,
      turnPhase: "acting",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0
    })
  },

  {
    round: 1,
    source: "original",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "End R1. Allies engage other ghouls. Shadows begin to emerge.",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 36,
      turnPhase: "waitingForTurn",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0
    })
  },

  // =====================================================================
  // ROUND 2: Paralysis! Ghoul claws lock Julien's muscles
  // =====================================================================

  // Ghoul hit → failed Con save → Paralyzed. Shadow auto-crits (paralyzed + within 5ft).

  {
    round: 2,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "R2 Ghoul turn: Ghoul claws hit. Roll 17 vs AC 17 — hit! " +
      "6 Piercing (2d4+2). Con save vs paralysis DC 10: rolls 7 — FAILS!",
    events: [damage(6, "piercing")],
    expectedQuintState: defaultState({
      hp: 30,
      turnPhase: "waitingForTurn",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doApplyCondition",
    xstateEvent: "APPLY_CONDITION",
    description:
      "Ghoul Paralysis takes hold! Julien's body locks rigid. " +
      "Incapacitated, can't move, auto-fail STR/DEX saves, " +
      "attacks within 5ft auto-crit.",
    events: [{ type: "APPLY_CONDITION", condition: "paralyzed" }],
    expectedQuintState: defaultState({
      hp: 30,
      turnPhase: "waitingForTurn",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      paralyzed: true,
      incapacitatedSources: ["paralyzed"]
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "R2 Shadow turn: Shadow strikes paralyzed Julien — auto-critical hit! " + "6 Necrotic (Strength Drain).",
    events: [damage(6, "necrotic", true)],
    expectedQuintState: defaultState({
      hp: 24,
      turnPhase: "waitingForTurn",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      paralyzed: true,
      incapacitatedSources: ["paralyzed"]
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doRemoveCondition",
    xstateEvent: "REMOVE_CONDITION",
    description:
      "Ally breaks the paralysis! (Lesser Restoration equivalent) " + "Julien's muscles unlock — he can act again.",
    events: [{ type: "REMOVE_CONDITION", condition: "paralyzed" }],
    expectedQuintState: defaultState({
      hp: 24,
      turnPhase: "waitingForTurn",
      movementRemaining: 25,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0
    })
  },

  {
    round: 2,
    source: "original",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description:
      "R2 Julien's turn. 24 HP, freed from paralysis. Battered but determined. " +
      "Shadows closing in. Time for Second Wind.",
    events: [startTurn()],
    expectedQuintState: defaultState({ hp: 24, turnPhase: "acting" })
  },

  {
    round: 2,
    source: "original",
    quintAction: "doUseSecondWind",
    xstateEvent: "USE_SECOND_WIND",
    description:
      "Second Wind! d10(6) + L5 = 11 HP healed. " + "Tactical Shift: repositions 15ft away from the shadow cluster.",
    events: [{ type: "USE_SECOND_WIND", d10Roll: 6 }],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "acting",
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "original",
    quintAction: "doUseBonusMovement",
    xstateEvent: "USE_BONUS_MOVEMENT",
    description: "Tactical Shift: slide 15ft to flank the wounded ghoul (OA-free).",
    events: [{ type: "USE_BONUS_MOVEMENT", feet: 15 }],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "acting",
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "original",
    kills: ["ghoul-2"],
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description: "Attack: rapier finishes the wounded ghoul. Roll 20 vs AC 12 — hit! 11 Piercing.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "acting",
      actionsRemaining: 0,
      attackActionUsed: true,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "original",
    kills: ["shadow-1"],
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description: "Extra Attack: rapier at a shadow. Roll 14 vs AC 12 — hit! " + "9 Piercing. Shadow disperses.",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "acting",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "original",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description:
      "End R2. Two kills this round after recovering from paralysis. " +
      "The mage begins casting from the balcony above.",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "waitingForTurn",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  // =====================================================================
  // ROUND 3: Mage attacks — Julien Action Surges for a devastating turn
  // =====================================================================

  {
    round: 3,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description: "R3 Mage turn: enemy casts from the balcony — bolt of Force energy! " + "12 Force damage.",
    events: [damage(12, "force")],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "waitingForTurn",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "R3 Julien's turn. 23 HP. The mage is the priority target. " + "Time to burn everything.",
    events: [startTurn()],
    expectedQuintState: defaultState({ hp: 23, turnPhase: "acting", secondWindCharges: 2 })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doUseMovement",
    xstateEvent: "USE_MOVEMENT",
    description: "Sprint 20ft up the palazzo stairs toward the mage.",
    events: [{ type: "USE_MOVEMENT", feet: 20, movementCost: 1 }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      secondWindCharges: 2
    })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Attack: rapier lunges at the mage. Roll 17 vs AC 15 — hit! " +
      "13 Piercing (1d8+4, Vex applied). The mage staggers.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      secondWindCharges: 2
    })
  },

  // Nat 19 → Improved Critical (Champion L3+).

  {
    round: 3,
    source: "original",
    kills: ["mage"],
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description:
      "Extra Attack: NATURAL 19! Improved Critical — critical hit! " +
      "Rapier plunges deep. 22 Piercing (2d8+4, crit doubles dice). " +
      "The mage crumples!",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2
    })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doScoreCriticalHit",
    xstateEvent: "SCORE_CRITICAL_HIT",
    description:
      "Remarkable Athlete: critical hit grants 15ft OA-free movement. " + "Julien pivots toward the remaining shadows.",
    events: [{ type: "SCORE_CRITICAL_HIT" }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doUseActionSurge",
    xstateEvent: "USE_ACTION_SURGE",
    description: "ACTION SURGE! Julien's blade is a blur.",
    events: [{ type: "USE_ACTION_SURGE" }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doUseBonusMovement",
    xstateEvent: "USE_BONUS_MOVEMENT",
    description: "Remarkable Athlete movement: dash 15ft to reach a shadow (OA-free).",
    events: [{ type: "USE_BONUS_MOVEMENT", feet: 15 }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 3,
    source: "original",
    kills: ["shadow-2"],
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Surged Attack: rapier slashes through the shadow. Roll 16 vs AC 12 — hit! " + "9 Piercing. Shadow dissolves.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "acting",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 3,
    source: "original",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description:
      "End R3. Devastating round: 2 kills (mage + shadow) using Action Surge + crit. " +
      "But more shadows coalesce from the walls...",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 23,
      turnPhase: "waitingForTurn",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  // =====================================================================
  // ROUND 4: Near-TPK — shadow swarm drops Julien to 0 HP
  // =====================================================================

  {
    round: 4,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description: "R4 Shadow swarm: First shadow strikes. 9 Necrotic (Strength Drain).",
    events: [damage(9, "necrotic")],
    expectedQuintState: defaultState({
      hp: 14,
      turnPhase: "waitingForTurn",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  // Flanking advantage → natural 20 → auto-crit.

  {
    round: 4,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description: "Second shadow CRITS — life force torn away! 12 Necrotic.",
    events: [damage(12, "necrotic", true)],
    expectedQuintState: defaultState({
      hp: 2,
      turnPhase: "waitingForTurn",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true
    })
  },

  {
    round: 4,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "Ghoul bites the staggering fighter. 2 Piercing. Julien collapses. " +
      "Unconscious and prone — death saves begin.",
    events: [damage(2, "piercing")],
    expectedQuintState: defaultState({
      hp: 0,
      turnPhase: "waitingForTurn",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true,
      unconscious: true,
      incapacitatedSources: ["unconscious"],
      prone: true
    })
  },

  {
    round: 4,
    source: "fabricated",
    quintAction: "doDeathSave",
    xstateEvent: "DEATH_SAVE",
    description: "R4 Julien's turn: Death save. Rolls 8 — failure. " + "The shadows loom. Mercer's dice betray him.",
    events: [{ type: "DEATH_SAVE", d20Roll: d20Roll(8) }],
    expectedQuintState: defaultState({
      hp: 0,
      turnPhase: "waitingForTurn",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true,
      unconscious: true,
      incapacitatedSources: ["unconscious"],
      prone: true,
      deathSavesFailures: 1
    })
  },

  // Healing at 0 HP: regain consciousness, death saves reset, remain prone.

  {
    round: 4,
    source: "fabricated",
    quintAction: "doHeal",
    xstateEvent: "HEAL",
    description:
      "Ally pours a healing potion! 7 HP restored. " +
      "Julien gasps back to consciousness. Death saves reset. Still prone.",
    events: [{ type: "HEAL", amount: healAmount(7) }],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "waitingForTurn",
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 0,
      bonusMovementOAFree: true,
      prone: true
    })
  },

  // =====================================================================
  // ROUND 5: The comeback — Julien stands and finishes the fight
  // =====================================================================

  {
    round: 5,
    source: "fabricated",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description:
      "R5 Julien's turn. 7 HP, prone on the palazzo floor. " +
      "One ghoul and one shadow remain. No charges left. Pure steel.",
    events: [startTurn()],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "acting",
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      prone: true
    })
  },

  {
    round: 5,
    source: "fabricated",
    quintAction: "doStandFromProne",
    xstateEvent: "STAND_FROM_PRONE",
    description: "Julien hauls himself to his feet. Costs 15ft movement.",
    events: [{ type: "STAND_FROM_PRONE" }],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "acting",
      movementRemaining: 15,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  {
    round: 5,
    source: "fabricated",
    kills: ["ghoul-3"],
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description: "Attack: rapier strikes the ghoul. Roll 21 vs AC 12 — hit! " + "12 Piercing. The ghoul falls.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "acting",
      movementRemaining: 15,
      actionsRemaining: 0,
      attackActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  {
    round: 5,
    source: "fabricated",
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description:
      "Extra Attack: rapier slashes the last shadow. Roll 16 vs AC 12 — hit! " +
      "10 Piercing. Shadow staggers — ally finishes it off. Palazzo Davinos is clear.",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "acting",
      movementRemaining: 15,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  {
    round: 5,
    source: "fabricated",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "End R5. All enemies eliminated. Julien stands bloodied at 7 HP. " + "The Seekers survived — barely.",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "waitingForTurn",
      movementRemaining: 15,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  {
    round: 5,
    source: "fabricated",
    quintAction: "doExitCombat",
    xstateEvent: "EXIT_COMBAT",
    description:
      "Combat ends. The Palazzo is silent. " + "Julien sheathes his rapier at 7 HP — two dice rolls from death.",
    events: [{ type: "EXIT_COMBAT" }],
    expectedQuintState: defaultState({
      hp: 7,
      turnPhase: "outOfCombat",
      movementRemaining: 15,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  {
    round: 5,
    source: "fabricated",
    quintAction: "doShortRest",
    xstateEvent: "SHORT_REST",
    description:
      "Short rest in the palazzo ruins. Spend 3 hit dice: d10 rolls 7, 5, 9 + CON(3) each. " +
      "10 + 8 + 12 = 30 HP recovered. Charges restored.",
    events: [
      {
        type: "SHORT_REST",
        hdRolls: [
          { className: "fighter" as const, roll: 7 },
          { className: "fighter" as const, roll: 5 },
          { className: "fighter" as const, roll: 9 }
        ]
      }
    ],
    expectedQuintState: defaultState({
      hp: 37,
      turnPhase: "outOfCombat",
      movementRemaining: 15,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      hitPointDiceRemaining: 2
    })
  }
]

// --- Replay + validate ---

const { summary, trace } = replayActualPlayTrace(ENCOUNTER, TRACE_STEPS)

export const CR_C4E04_TRACE: ReadonlyArray<TraceStep> = trace
export const CR_C4E04_SUMMARY = summary
export const CR_C4E04_ENCOUNTER = ENCOUNTER
