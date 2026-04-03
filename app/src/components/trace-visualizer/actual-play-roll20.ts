/**
 * Actual-Play Trace: PHB 2024 Combat Example — "Under Castle Ravenloft"
 *
 * SOURCE: Roll20 Compendium / 2024 Player's Handbook
 * URL: https://roll20.net/compendium/dnd5e/Rules:Combat%20and%20Damage%20Example?expansion=32231
 *
 * ORIGINAL ENCOUNTER:
 *   4 PCs vs. 10 skeletons (13 HP, AC 13, Bludgeoning vulnerability).
 *   Note: AC 13 is from the 5.1 stat block; SRD 5.2.1 Skeleton has AC 14.
 *   Single-round combat. Extended to 2 rounds to exercise fighter features.
 *
 * ADAPTATION: Shreeve (Barbarian → Champion Fighter L5, 44 HP, 30ft speed).
 *   Round 1 preserves original rolls. Round 2 is fabricated.
 *   Shreeve kills 3 skeletons; other PCs handle the remaining 7 off-screen.
 *
 * Kill count, damage budget, and provenance tracked via ActualPlayStep annotations.
 */

import { singleClassHitDice } from "#/features/class-tables.ts"

import type { ActualPlayStep, EncounterDef } from "./actual-play-types.ts"
import { damage, defaultState, endTurn, replayActualPlayTrace, startTurn } from "./actual-play-types.ts"
import type { TraceStep } from "./sample-trace.ts"

// --- Encounter definition ---

const ENCOUNTER: EncounterDef = {
  title: "Under Castle Ravenloft (PHB 2024 Combat Example)",
  source: {
    name: "Roll20 Compendium / 2024 PHB",
    url: "https://roll20.net/compendium/dnd5e/Rules:Combat%20and%20Damage%20Example?expansion=32231"
  },
  perspectiveCharacter: "Shreeve (Champion Fighter L5)",
  enemies: {
    "skel-1": { name: "Skeleton (R1 target)" },
    "skel-2": { name: "Skeleton (R2 first)" },
    "skel-3": { name: "Skeleton (R2 last)" }
  },
  machineInput: {
    maxHp: 44,
    hitDiceRemaining: singleClassHitDice("fighter", 5),
    effectiveSpeed: 30,
    movementRemaining: 30,
    extraAttacksRemaining: 1,
    fighterLevel: 5
  }
}

// --- The trace ---

const TRACE_STEPS: ReadonlyArray<ActualPlayStep> = [
  // ===== INITIALIZATION =====

  {
    round: 0,
    source: "original",
    quintAction: "init",
    xstateEvent: "(initial)",
    description:
      "Shreeve the Champion Fighter (L5): 44 HP, 30ft speed, warhammer. " +
      "Castle Ravenloft dungeon, 10 skeletons ahead.",
    events: [],
    expectedQuintState: defaultState()
  },

  {
    round: 0,
    source: "original",
    quintAction: "doEnterCombat",
    xstateEvent: "ENTER_COMBAT",
    description: "Roll initiative! Skeletons 20, Shreeve 16. Skeletons go first.",
    events: [{ type: "ENTER_COMBAT" }],
    expectedQuintState: defaultState({ turnPhase: "waitingForTurn" })
  },

  // ===== ROUND 1 =====
  // Original rolls: 8 (miss), 16 (miss), 18 (hit), 20 (hit) → 9 Piercing total.

  {
    round: 1,
    source: "original",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "R1 Skeleton turn: 4 skeletons attack Shreeve. Rolls 8, 16 miss (AC 18). " +
      "Rolls 18, 20 hit. 5 + 4 = 9 Piercing damage.",
    events: [damage(9, "piercing")],
    expectedQuintState: defaultState({ hp: 35, turnPhase: "waitingForTurn" })
  },

  {
    round: 1,
    source: "original",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "R1 Shreeve's turn begins. 35 HP, 30ft movement, 1 action + 1 extra attack.",
    events: [startTurn()],
    expectedQuintState: defaultState({ hp: 35, turnPhase: "acting" })
  },

  {
    round: 1,
    source: "original",
    quintAction: "doUseMovement",
    xstateEvent: "USE_MOVEMENT",
    description: "Move 10ft to engage skeletons in melee range.",
    events: [{ type: "USE_MOVEMENT", feet: 10, movementCost: 1 }],
    expectedQuintState: defaultState({ hp: 35, turnPhase: "acting", movementRemaining: 20 })
  },

  // Original roll 21 → hit. Enemy vulnerability not tracked (attacker-side trace).

  {
    round: 1,
    source: "original",
    kills: ["skel-1"],
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Attack action: warhammer swing. Roll 21 vs AC 13 — hit! " +
      "7 Bludgeoning (14 after skeleton vulnerability). Skeleton destroyed.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "acting",
      movementRemaining: 20,
      actionsRemaining: 0,
      attackActionUsed: true
    })
  },

  // Original roll 11 → miss.

  {
    round: 1,
    source: "original",
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description: "Extra Attack: warhammer at second skeleton. Roll 11 vs AC 13 — miss!",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "acting",
      movementRemaining: 20,
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
    description: "End R1. Other PCs kill 7 skeletons off-screen. 2 remain for R2.",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 35,
      turnPhase: "waitingForTurn",
      movementRemaining: 20,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0
    })
  },

  // ===== ROUND 2 (fabricated — extends original 1-round encounter) =====

  {
    round: 2,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "R2 Skeleton turn: 2 remaining skeletons attack. Roll 17 (hit), roll 9 (miss). " + "5 Piercing damage.",
    events: [damage(5, "piercing")],
    expectedQuintState: defaultState({
      hp: 30,
      turnPhase: "waitingForTurn",
      movementRemaining: 20,
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "R2 Shreeve's turn: 30 HP, 2 skeletons left. Time to finish this.",
    events: [startTurn()],
    expectedQuintState: defaultState({ hp: 30, turnPhase: "acting" })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doUseSecondWind",
    xstateEvent: "USE_SECOND_WIND",
    description: "Second Wind! d10(8) + L5 = 13 HP healed. " + "Tactical Shift: 15ft OA-free bonus movement.",
    events: [{ type: "USE_SECOND_WIND", d10Roll: 8 }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doUseBonusMovement",
    xstateEvent: "USE_BONUS_MOVEMENT",
    description: "Tactical Shift: move 10ft toward skeletons (OA-free).",
    events: [{ type: "USE_BONUS_MOVEMENT", feet: 10 }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 5,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    kills: ["skel-2"],
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Attack action: warhammer at first skeleton. Roll 15 vs AC 13 — hit! " +
      "8 Bludgeoning (16 after vulnerability). Skeleton destroyed.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      actionsRemaining: 0,
      attackActionUsed: true,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 5,
      bonusMovementOAFree: true
    })
  },

  // Nat 19 → Improved Critical (Champion L3+: crit on 19-20).

  {
    round: 2,
    source: "fabricated",
    kills: ["skel-3"],
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description: "Extra Attack: NATURAL 19! Improved Critical (19-20 crit range). " + "Last skeleton shatters.",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 5,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doScoreCriticalHit",
    xstateEvent: "SCORE_CRITICAL_HIT",
    description: "Remarkable Athlete: crit grants 15ft OA-free movement.",
    events: [{ type: "SCORE_CRITICAL_HIT" }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doUseActionSurge",
    xstateEvent: "USE_ACTION_SURGE",
    description: "ACTION SURGE! Shreeve draws on reserves — but combat is already won.",
    events: [{ type: "USE_ACTION_SURGE" }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Surged Attack: warhammer overhead smash into empty air. " +
      "All skeletons already down — the surge was overkill.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "acting",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "End R2 turn. All 10 skeletons destroyed. Castle Ravenloft secured.",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "waitingForTurn",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doExitCombat",
    xstateEvent: "EXIT_COMBAT",
    description: "Combat ends. Shreeve stands among bone fragments at 43 HP.",
    events: [{ type: "EXIT_COMBAT" }],
    expectedQuintState: defaultState({
      hp: 43,
      turnPhase: "outOfCombat",
      actionsRemaining: 0,
      attackActionUsed: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  }
]

// --- Replay + validate ---

const { summary, trace } = replayActualPlayTrace(ENCOUNTER, TRACE_STEPS)

export const ROLL20_TRACE: ReadonlyArray<TraceStep> = trace
export const ROLL20_SUMMARY = summary
export const ROLL20_ENCOUNTER = ENCOUNTER
