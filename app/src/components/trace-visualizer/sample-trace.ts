/* eslint-disable max-lines */
/**
 * Sample MBT trace data for the Trace Replay Visualizer.
 *
 * The Quint column contains hand-written expected values ("spec says").
 * The XState column is generated at import time by replaying events through
 * the real dndMachine via trace-replay.ts ("implementation produces").
 *
 * The NormalizedState shape matches machine.mbt.test.ts exactly.
 */

import type { DndEvent } from "#/machine-types.ts"
import { d20Roll } from "#/types.ts"

import { replayTrace, type TraceEventDef } from "./trace-replay.ts"

export interface NormalizedState {
  // CreatureState
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly deathSavesSuccesses: number
  readonly deathSavesFailures: number
  readonly stable: boolean
  readonly dead: boolean
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
  readonly exhaustion: number
  readonly frightened: boolean
  readonly grappled: boolean
  readonly invisible: boolean
  readonly paralyzed: boolean
  readonly petrified: boolean
  readonly poisoned: boolean
  readonly prone: boolean
  readonly restrained: boolean
  readonly stunned: boolean
  readonly unconscious: boolean
  readonly incapacitatedSources: ReadonlyArray<string>
  readonly hitPointDiceRemaining: number
  readonly activeEffects: ReadonlyArray<{
    spellId: string
    turnsRemaining: number
    expiresAt: string
  }>
  // TurnState
  readonly movementRemaining: number
  readonly effectiveSpeed: number
  readonly actionsRemaining: number
  readonly attackActionUsed: boolean
  readonly bonusActionUsed: boolean
  readonly reactionAvailable: boolean
  readonly freeInteractionUsed: boolean
  readonly extraAttacksRemaining: number
  readonly disengaged: boolean
  readonly dodging: boolean
  readonly readiedAction: boolean
  readonly bonusActionSpellCast: boolean
  readonly nonCantripActionSpellCast: boolean
  readonly bonusMovementRemaining: number
  readonly bonusMovementOAFree: boolean
  // turnPhase
  readonly turnPhase: string
  // SpellSlotState
  readonly slotsMax: ReadonlyArray<number>
  readonly slotsCurrent: ReadonlyArray<number>
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
  // FighterState
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: number
  readonly indomitableMax: number
  readonly heroicInspiration: boolean
  readonly fighterLevel: number
}

export interface TraceStep {
  /** The Quint action name (e.g., "doTakeDamage") */
  readonly quintAction: string
  /** The corresponding XState event type (e.g., "TAKE_DAMAGE") */
  readonly xstateEvent: string
  /** Human-readable description of what happened */
  readonly description: string
  /** Quint state after this step (hand-written expected values) */
  readonly quintState: NormalizedState
  /** XState state after this step (from real machine replay) */
  readonly xstateState: NormalizedState
}

// --- Default state factory ---

function defaultState(overrides: Partial<NormalizedState> = {}): NormalizedState {
  return {
    hp: 44,
    maxHp: 44,
    tempHp: 0,
    deathSavesSuccesses: 0,
    deathSavesFailures: 0,
    stable: false,
    dead: false,
    blinded: false,
    charmed: false,
    deafened: false,
    exhaustion: 0,
    frightened: false,
    grappled: false,
    invisible: false,
    paralyzed: false,
    petrified: false,
    poisoned: false,
    prone: false,
    restrained: false,
    stunned: false,
    unconscious: false,
    incapacitatedSources: [],
    hitPointDiceRemaining: 5,
    activeEffects: [],
    movementRemaining: 30,
    effectiveSpeed: 30,
    actionsRemaining: 1,
    attackActionUsed: false,
    bonusActionUsed: false,
    reactionAvailable: true,
    freeInteractionUsed: false,
    extraAttacksRemaining: 1,
    disengaged: false,
    dodging: false,
    readiedAction: false,
    bonusActionSpellCast: false,
    nonCantripActionSpellCast: false,
    bonusMovementRemaining: 0,
    bonusMovementOAFree: false,
    turnPhase: "outOfCombat",
    slotsMax: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    slotsCurrent: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: "",
    secondWindCharges: 3,
    secondWindMax: 3,
    actionSurgeCharges: 1,
    actionSurgeMax: 1,
    actionSurgeUsedThisTurn: false,
    indomitableCharges: 0,
    indomitableMax: 0,
    heroicInspiration: false,
    fighterLevel: 5,
    ...overrides
  }
}

// --- Event helpers ---

const NO_RESISTANCES: ReadonlySet<never> = new Set()

function damage(amount: number): DndEvent {
  return {
    type: "TAKE_DAMAGE",
    amount,
    damageType: "bludgeoning",
    resistances: NO_RESISTANCES,
    vulnerabilities: NO_RESISTANCES,
    immunities: NO_RESISTANCES,
    isCritical: false
  }
}

function critDamage(amount: number): DndEvent {
  return {
    type: "TAKE_DAMAGE",
    amount,
    damageType: "bludgeoning",
    resistances: NO_RESISTANCES,
    vulnerabilities: NO_RESISTANCES,
    immunities: NO_RESISTANCES,
    isCritical: true
  }
}

function startTurn(): DndEvent {
  return {
    type: "START_TURN",
    baseSpeed: 30,
    armorPenalty: 0,
    extraAttacks: 1,
    callerSpeedModifier: 0,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false,
    startOfTurnEffects: []
  }
}

function endTurn(): DndEvent {
  return { type: "END_TURN", endOfTurnSaves: [], endOfTurnDamage: [] }
}

// --- The sample trace: event definitions + expected Quint states ---
// Each entry defines the events to send and the expected Quint state after.

const TRACE_EVENTS: ReadonlyArray<TraceEventDef> = [
  // Step 0: init — just capture the initial machine state
  {
    quintAction: "init",
    xstateEvent: "(initial)",
    description: "Level 5 Champion Fighter initialized: 44 HP, 30ft speed",
    events: [],
    expectedQuintState: defaultState()
  },

  // Step 1: Enter combat
  {
    quintAction: "doEnterCombat",
    xstateEvent: "ENTER_COMBAT",
    description: "Fighter enters combat, waiting for initiative",
    events: [{ type: "ENTER_COMBAT" }],
    expectedQuintState: defaultState({ turnPhase: "waitingForTurn" })
  },

  // Step 2: Start turn 1
  {
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "Turn 1 begins: speed set to 30ft, 1 action + 1 extra attack",
    events: [startTurn()],
    expectedQuintState: defaultState({
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      reactionAvailable: true,
      extraAttacksRemaining: 1
    })
  },

  // Step 3: Move 25ft
  {
    quintAction: "doUseMovement",
    xstateEvent: "USE_MOVEMENT",
    description: "Move 25ft toward the Ogre (5ft remaining)",
    events: [{ type: "USE_MOVEMENT", feet: 25, movementCost: 25 }],
    expectedQuintState: defaultState({
      turnPhase: "acting",
      movementRemaining: 5,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      reactionAvailable: true,
      extraAttacksRemaining: 1
    })
  },

  // Step 4: Attack action
  {
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description: "Take the Attack action (attack type)",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      turnPhase: "acting",
      movementRemaining: 5,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 1
    })
  },

  // Step 5: Extra Attack
  {
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description: "Extra Attack: second strike with longsword",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      turnPhase: "acting",
      movementRemaining: 5,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0
    })
  },

  // Step 6: End turn 1
  {
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "End turn 1 -- action economy resets",
    events: [endTurn()],
    expectedQuintState: defaultState({
      turnPhase: "waitingForTurn",
      movementRemaining: 5,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0
    })
  },

  // Step 7: Take 18 damage between turns
  {
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description: "Ogre hits for 18 bludgeoning damage (44 -> 26 HP)",
    events: [damage(18)],
    expectedQuintState: defaultState({
      hp: 26,
      turnPhase: "waitingForTurn",
      movementRemaining: 5,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0
    })
  },

  // Step 8: Start turn 2
  {
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "Turn 2 begins: 26 HP, need healing",
    events: [startTurn()],
    expectedQuintState: defaultState({
      hp: 26,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      actionSurgeUsedThisTurn: false
    })
  },

  // Step 9: Second Wind — heal 1d10(7) + 5 = 12, bonus action spent, charge 3->2
  // Tactical Shift (L5): bonus movement = effectiveSpeed/2 = 15, OA-free
  {
    quintAction: "doUseSecondWind",
    xstateEvent: "USE_SECOND_WIND",
    description: "Second Wind! Roll d10(7) + 5 = heal 12 HP (26 -> 38 HP), bonus action spent",
    events: [{ type: "USE_SECOND_WIND", d10Roll: 7, fighterLevel: 5 }],
    expectedQuintState: defaultState({
      hp: 38,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeUsedThisTurn: false,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  // Step 10: Attack action
  {
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description: "Take the Attack action again",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 38,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeUsedThisTurn: false,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  // Step 11: Extra Attack
  {
    quintAction: "doUseExtraAttack",
    xstateEvent: "USE_EXTRA_ATTACK",
    description: "Extra Attack: second strike",
    events: [{ type: "USE_EXTRA_ATTACK" }],
    expectedQuintState: defaultState({
      hp: 38,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeUsedThisTurn: false,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  // Step 12: Action Surge! Get another action
  {
    quintAction: "doUseActionSurge",
    xstateEvent: "USE_ACTION_SURGE",
    description: "ACTION SURGE! Gain an additional action this turn",
    events: [{ type: "USE_ACTION_SURGE" }],
    expectedQuintState: defaultState({
      hp: 38,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  // Step 13: Attack with surged action — extraAttacks NOT refilled
  {
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description: "Use the surged action: Attack again (no extra attack -- extras spent)",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 38,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  // Step 14: End turn 2
  {
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "End turn 2 -- all charges spent",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 38,
      turnPhase: "waitingForTurn",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true
    })
  },

  // Step 15: Massive damage — 50 points
  {
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description: "Ogre crits for 50 bludgeoning! Fighter drops to 0 HP, falls unconscious and prone",
    events: [critDamage(50)],
    expectedQuintState: defaultState({
      hp: 0,
      turnPhase: "waitingForTurn",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true,
      unconscious: true,
      incapacitatedSources: ["unconscious"],
      prone: true
    })
  },

  // Step 16: Death save — roll 14, success
  {
    quintAction: "doDeathSave",
    xstateEvent: "DEATH_SAVE",
    description: "Death save: rolls 14 -- one success",
    events: [{ type: "DEATH_SAVE", d20Roll: d20Roll(14) }],
    expectedQuintState: defaultState({
      hp: 0,
      turnPhase: "waitingForTurn",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true,
      unconscious: true,
      incapacitatedSources: ["unconscious"],
      prone: true,
      deathSavesSuccesses: 1
    })
  },

  // Step 17: Death save — nat 20! Regain 1 HP, wake up
  {
    quintAction: "doDeathSave",
    xstateEvent: "DEATH_SAVE",
    description: "Death save: NATURAL 20! Regain 1 HP, conscious again (still prone)",
    events: [{ type: "DEATH_SAVE", d20Roll: d20Roll(20) }],
    expectedQuintState: defaultState({
      hp: 1,
      turnPhase: "waitingForTurn",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 0,
      bonusActionUsed: true,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: true,
      bonusMovementRemaining: 15,
      bonusMovementOAFree: true,
      unconscious: false,
      incapacitatedSources: [],
      prone: true,
      deathSavesSuccesses: 0,
      deathSavesFailures: 0
    })
  },

  // Step 18: Start turn 3 — 1 HP, prone
  {
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "Turn 3 begins: 1 HP, still prone, no charges left. Do or die.",
    events: [startTurn()],
    expectedQuintState: defaultState({
      hp: 1,
      turnPhase: "acting",
      movementRemaining: 30,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      actionSurgeUsedThisTurn: false,
      prone: true
    })
  },

  // Step 19: Stand from prone — costs half speed (15 ft)
  {
    quintAction: "doStandFromProne",
    xstateEvent: "STAND_FROM_PRONE",
    description: "Stand up -- costs 15ft (half speed). Ready to fight.",
    events: [{ type: "STAND_FROM_PRONE" }],
    expectedQuintState: defaultState({
      hp: 1,
      turnPhase: "acting",
      movementRemaining: 15,
      effectiveSpeed: 30,
      actionsRemaining: 1,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      prone: false
    })
  },

  // Step 20: Attack — the killing blow
  {
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description: "Attack action: longsword strikes true. The Ogre falls.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: defaultState({
      hp: 1,
      turnPhase: "acting",
      movementRemaining: 15,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      secondWindCharges: 2,
      actionSurgeCharges: 0,
      prone: false
    })
  },

  // Step 21: End turn 3
  {
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "End turn 3 -- the Ogre is slain",
    events: [endTurn()],
    expectedQuintState: defaultState({
      hp: 1,
      turnPhase: "waitingForTurn",
      movementRemaining: 15,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  // Step 22: Exit combat
  {
    quintAction: "doExitCombat",
    xstateEvent: "EXIT_COMBAT",
    description: "Combat ends. The Fighter stands victorious at 1 HP.",
    events: [{ type: "EXIT_COMBAT" }],
    expectedQuintState: defaultState({
      hp: 1,
      turnPhase: "outOfCombat",
      movementRemaining: 15,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      secondWindCharges: 2,
      actionSurgeCharges: 0
    })
  },

  // Step 23: Short rest — spend 3 hit dice: d10 rolls 6,8,4 + CON(2) = 8+10+6 = 24 HP
  {
    quintAction: "doShortRest",
    xstateEvent: "SHORT_REST",
    description: "Short rest: spend 3 hit dice (d10+2 each: 8+10+6 = 24 HP). Charges restored. 1 -> 25 HP.",
    events: [{ type: "SHORT_REST", conMod: 2, hdRolls: [6, 8, 4] }],
    expectedQuintState: defaultState({
      hp: 25,
      turnPhase: "outOfCombat",
      movementRemaining: 15,
      effectiveSpeed: 30,
      actionsRemaining: 0,
      attackActionUsed: true,
      reactionAvailable: true,
      extraAttacksRemaining: 1,
      hitPointDiceRemaining: 2,
      secondWindCharges: 3,
      actionSurgeCharges: 1
    })
  }
]

// --- Replay events through real XState machine to generate the XState column ---

const MACHINE_INPUT = {
  maxHp: 44,
  hitDiceRemaining: 5,
  effectiveSpeed: 30,
  movementRemaining: 30,
  extraAttacksRemaining: 1,
  fighterLevel: 5
} as const

export const SAMPLE_TRACE: ReadonlyArray<TraceStep> = replayTrace(MACHINE_INPUT, TRACE_EVENTS)

/** Fields grouped by category for display */
export const FIELD_GROUPS = {
  "Hit Points": ["hp", "maxHp", "tempHp"],
  "Death Saves": ["deathSavesSuccesses", "deathSavesFailures", "stable", "dead"],
  Conditions: [
    "blinded",
    "charmed",
    "deafened",
    "frightened",
    "grappled",
    "invisible",
    "paralyzed",
    "petrified",
    "poisoned",
    "prone",
    "restrained",
    "stunned",
    "unconscious"
  ],
  "Action Economy": [
    "actionsRemaining",
    "attackActionUsed",
    "bonusActionUsed",
    "reactionAvailable",
    "freeInteractionUsed",
    "extraAttacksRemaining"
  ],
  Movement: ["movementRemaining", "effectiveSpeed", "disengaged"],
  "Turn Phase": ["turnPhase"],
  "Fighter (L5 Champion)": [
    "secondWindCharges",
    "secondWindMax",
    "actionSurgeCharges",
    "actionSurgeMax",
    "actionSurgeUsedThisTurn",
    "heroicInspiration",
    "fighterLevel"
  ],
  Other: ["exhaustion", "dodging", "readiedAction", "hitPointDiceRemaining", "incapacitatedSources"]
} as const
