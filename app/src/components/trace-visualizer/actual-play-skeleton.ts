/**
 * Actual-Play Trace: Skeleton — Monster Perspective
 *
 * The same Castle Ravenloft setting as the Roll20 trace, but from the
 * SKELETON'S perspective. Demonstrates the engine running a monster:
 *   - Stat-block-sourced speed (30ft) and no Extra Attack
 *   - Poison damage immunity (damage nullified)
 *   - Poisoned condition immunity (condition rejected)
 *   - Bludgeoning vulnerability (damage doubled)
 *   - Instant death at 0 HP (no unconscious, no death saves)
 *
 * Contrast with the PC traces: when a PC drops to 0 HP they go unconscious
 * and start making death saves. This skeleton just dies.
 *
 * All values match the SRD 5.2.1 Skeleton stat block.
 * Fabricated encounter inspired by the PHB 2024 Ravenloft example.
 */

import type { DndEvent } from "#/machine-types.ts"
import type { DamageType } from "#/types.ts"

import type { ActualPlayStep, EncounterDef } from "./actual-play-types.ts"
import { endTurn, replayActualPlayTrace } from "./actual-play-types.ts"
import type { NormalizedState, TraceStep } from "./sample-trace.ts"

// --- Monster damage helper (with stat-block R/V/I) ---

const SKELETON_RESISTANCES: ReadonlySet<never> = new Set()
const SKELETON_VULNERABILITIES: ReadonlySet<DamageType> = new Set(["bludgeoning"])
const SKELETON_IMMUNITIES: ReadonlySet<DamageType> = new Set(["poison"])

function skeletonDamage(amount: number, damageType: DamageType, isCritical = false): DndEvent {
  return {
    type: "TAKE_DAMAGE",
    amount,
    damageType,
    resistances: SKELETON_RESISTANCES,
    vulnerabilities: SKELETON_VULNERABILITIES,
    immunities: SKELETON_IMMUNITIES,
    isCritical
  }
}

function skeletonStartTurn(): DndEvent {
  return {
    type: "START_TURN",
    baseSpeed: 30,
    armorPenalty: 0,
    extraAttacks: 0, // Skeleton has no Multiattack
    callerSpeedModifier: 0,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false,
    startOfTurnEffects: []
  }
}

/** Skeleton default state: 13 HP, no fighter features, monster kind. */
function skeletonState(overrides: Partial<NormalizedState> = {}): NormalizedState {
  return {
    hp: 13,
    maxHp: 13,
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
    hitPointDiceRemaining: 2, // 2d8
    activeEffects: [],
    movementRemaining: 30,
    effectiveSpeed: 30,
    actionsRemaining: 1,
    attackActionUsed: false,
    bonusActionUsed: false,
    reactionAvailable: true,
    freeInteractionUsed: false,
    extraAttacksRemaining: 0, // no Multiattack
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
    secondWindCharges: 0,
    secondWindMax: 0,
    actionSurgeCharges: 0,
    actionSurgeMax: 0,
    actionSurgeUsedThisTurn: false,
    indomitableCharges: 0,
    indomitableMax: 0,
    heroicInspiration: false,
    fighterLevel: 0,
    ...overrides
  }
}

// --- Encounter definition ---

const ENCOUNTER: EncounterDef = {
  title: "Castle Ravenloft — Skeleton Perspective",
  source: {
    name: "Fabricated (inspired by PHB 2024 combat example)",
    refKills: 0
  },
  perspectiveCharacter: "Skeleton (SRD 5.2.1 stat block)",
  enemies: {
    shreeve: { name: "Shreeve (Champion Fighter L5)" },
    elara: { name: "Elara (Cleric)" }
  },
  machineInput: {
    maxHp: 13,
    hitDiceRemaining: 2,
    effectiveSpeed: 30,
    movementRemaining: 30,
    extraAttacksRemaining: 0,
    fighterLevel: 0,
    creatureKind: "Monster"
  }
}

// Shorthand for acting skeleton at full turn
const ACTING = { turnPhase: "acting" as const }
const WAITING = { turnPhase: "waitingForTurn" as const }

// --- The trace ---

const TRACE_STEPS: ReadonlyArray<ActualPlayStep> = [
  // ===== INITIALIZATION =====

  {
    round: 0,
    source: "fabricated",
    quintAction: "init",
    xstateEvent: "(initial)",
    description:
      "A Skeleton guards the crypt beneath Castle Ravenloft. " +
      "AC 14, 13 HP (2d8+4), Shortsword +5 / Shortbow +5. " +
      "Vulnerable to Bludgeoning. Immune to Poison damage and the Poisoned condition.",
    events: [],
    expectedQuintState: skeletonState()
  },

  {
    round: 0,
    source: "fabricated",
    quintAction: "doEnterCombat",
    xstateEvent: "ENTER_COMBAT",
    description:
      "Adventurers kick open the crypt door. Initiative: Skeleton 16 (+3 DEX), " +
      "Shreeve 12, Elara 9. The Skeleton acts first.",
    events: [{ type: "ENTER_COMBAT" }],
    expectedQuintState: skeletonState(WAITING)
  },

  // ===== ROUND 1: Skeleton's turn =====

  {
    round: 1,
    source: "fabricated",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description:
      "R1 Skeleton's turn begins. 13 HP, 30ft movement, 1 action, no Extra Attack " +
      "(Skeleton has no Multiattack — just one Shortsword or Shortbow per turn).",
    events: [skeletonStartTurn()],
    expectedQuintState: skeletonState(ACTING)
  },

  {
    round: 1,
    source: "fabricated",
    quintAction: "doUseMovement",
    xstateEvent: "USE_MOVEMENT",
    description: "The Skeleton advances 20ft toward Shreeve, shortsword raised.",
    events: [{ type: "USE_MOVEMENT", feet: 20, movementCost: 1 }],
    expectedQuintState: skeletonState({ ...ACTING, movementRemaining: 10 })
  },

  {
    round: 1,
    source: "fabricated",
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Attack action: Shortsword. Roll 17 + 5 = 22 vs Shreeve's AC 18 — hit! " +
      "6 Piercing damage (1d6+3). No extra attacks available.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: skeletonState({
      ...ACTING,
      movementRemaining: 10,
      actionsRemaining: 0,
      attackActionUsed: true
    })
  },

  {
    round: 1,
    source: "fabricated",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "Skeleton ends its turn. 13 HP, unscathed.",
    events: [endTurn()],
    expectedQuintState: skeletonState(WAITING)
  },

  // ===== ROUND 1: Shreeve's turn (Skeleton takes damage) =====

  {
    round: 1,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "Shreeve attacks with a longsword. Roll 14 + 7 = 21 vs AC 14 — hit! " +
      "8 Slashing damage. No vulnerability or immunity. Skeleton drops to 5 HP.",
    events: [skeletonDamage(8, "slashing")],
    expectedQuintState: skeletonState({ ...WAITING, hp: 5 })
  },

  // ===== ROUND 1: Elara's turn (Poison — immunity showcase) =====

  {
    round: 1,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "Elara casts Poison Spray. The Skeleton fails its CON save — but it doesn't matter. " +
      "12 Poison damage → 0. IMMUNE. The Skeleton is Undead; Poison does nothing.",
    events: [skeletonDamage(12, "poison")],
    // Poison immunity: 12 damage nullified entirely. HP unchanged at 5.
    expectedQuintState: skeletonState({ ...WAITING, hp: 5 })
  },

  {
    round: 1,
    source: "fabricated",
    quintAction: "doApplyCondition",
    xstateEvent: "APPLY_CONDITION",
    description:
      "Elara also tries to inflict the Poisoned condition — also immune! " +
      "Skeleton's condition immunities include Poisoned. No effect.",
    events: [{ type: "APPLY_CONDITION", condition: "poisoned", conditionImmunities: new Set(["poisoned"]) }],
    // Condition immunity: Poisoned rejected. No state change.
    expectedQuintState: skeletonState({ ...WAITING, hp: 5 })
  },

  // ===== ROUND 2: Skeleton's last turn =====

  {
    round: 2,
    source: "fabricated",
    quintAction: "doStartTurn",
    xstateEvent: "START_TURN",
    description: "R2 Skeleton's turn. 5 HP remaining. It presses the attack.",
    events: [skeletonStartTurn()],
    expectedQuintState: skeletonState({ ...ACTING, hp: 5 })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doUseAction",
    xstateEvent: "USE_ACTION",
    description:
      "Shortsword attack at Shreeve. Roll 8 + 5 = 13 vs AC 18 — miss! " + "The blade glances off Shreeve's armor.",
    events: [{ type: "USE_ACTION", actionType: "attack" }],
    expectedQuintState: skeletonState({
      ...ACTING,
      hp: 5,
      actionsRemaining: 0,
      attackActionUsed: true
    })
  },

  {
    round: 2,
    source: "fabricated",
    quintAction: "doEndTurn",
    xstateEvent: "END_TURN",
    description: "Skeleton ends its turn. 5 HP. This won't last.",
    events: [endTurn()],
    expectedQuintState: skeletonState({ ...WAITING, hp: 5 })
  },

  // ===== ROUND 2: Shreeve finishes it (vulnerability showcase + instant death) =====

  {
    round: 2,
    source: "fabricated",
    quintAction: "doTakeDamage",
    xstateEvent: "TAKE_DAMAGE",
    description:
      "Shreeve switches to her warhammer. Roll 19 + 7 = 26 vs AC 14 — hit! " +
      "4 Bludgeoning damage, DOUBLED to 8 by vulnerability. " +
      "Skeleton at 5 HP takes 8 → drops to 0 HP → DEAD. " +
      "No unconscious. No death saves. Monsters die instantly.",
    events: [skeletonDamage(4, "bludgeoning")],
    // 4 Bludgeoning → 8 after vulnerability → 5 HP - 8 = 0 → dead (monster, not PC)
    expectedQuintState: skeletonState({
      ...WAITING,
      hp: 0,
      dead: true
    })
  }
]

// --- Export ---

const { summary, trace } = replayActualPlayTrace(ENCOUNTER, TRACE_STEPS)

export const SKELETON_TRACE: ReadonlyArray<TraceStep> = trace
export const SKELETON_ENCOUNTER: EncounterDef = ENCOUNTER
export const SKELETON_SUMMARY = summary
