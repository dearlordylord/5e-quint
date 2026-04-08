/**
 * Typed metadata for actual-play trace steps.
 *
 * The mechanical state (HP, conditions, charges) is verified by XState replay.
 * These annotations capture the NARRATIVE layer — provenance, kill tracking,
 * damage accounting — so it can be validated programmatically instead of
 * maintained by hand in comments.
 */

import type { DndEvent, DndMachineInput } from "@dnd/core/machine-types.ts"
import type { DamageType } from "@dnd/core/types.ts"

import type { NormalizedState, TraceStep } from "./sample-trace.ts"
import { replayTrace, type TraceEventDef } from "./trace-replay.ts"

// --- Shared event helpers ---
// Extracted here to avoid duplication across trace files.

const NO_RESISTANCES: ReadonlySet<never> = new Set()

export function damage(amount: number, damageType: DamageType, isCritical = false): DndEvent {
  return {
    type: "TAKE_DAMAGE",
    amount,
    damageType,
    resistances: NO_RESISTANCES,
    vulnerabilities: NO_RESISTANCES,
    immunities: NO_RESISTANCES,
    isCritical
  }
}

export function startTurn(): DndEvent {
  return {
    type: "START_TURN",
    callerSpeedModifier: 0,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false,
    startOfTurnEffects: []
  }
}

export function endTurn(): DndEvent {
  return { type: "END_TURN", endOfTurnSaves: [], endOfTurnDamage: [] }
}

/** L5 Champion Fighter default state. Shared across all actual-play traces. */
export function defaultState(overrides: Partial<NormalizedState> = {}): NormalizedState {
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

// --- Step annotation types ---

export interface ActualPlayStep extends TraceEventDef {
  /** Combat round number (0 = pre-combat / init) */
  readonly round: number
  /** Whether this step's data comes from the source material or was invented */
  readonly source: "original" | "fabricated"
  /** Enemy IDs killed during this step (must match encounter enemy IDs) */
  readonly kills?: ReadonlyArray<string>
}

// --- Encounter definition ---

export interface EncounterSource {
  readonly name: string
  readonly url?: string
  /** Aggregate stats from the source (e.g., Omen Archive) for comparison */
  readonly refDamageTaken?: number
  readonly refKills?: number
}

export interface EncounterEnemy {
  readonly name: string
}

export interface EncounterDef {
  readonly title: string
  readonly source: EncounterSource
  readonly perspectiveCharacter: string
  readonly enemies: Readonly<Record<string, EncounterEnemy>>
  readonly machineInput: DndMachineInput
}

// --- Encounter summary (derived, not hand-written) ---

export interface EncounterSummary {
  readonly totalSteps: number
  readonly totalRounds: number
  readonly totalDamageTaken: number
  readonly damageTakenByRound: Readonly<Record<number, number>>
  readonly damageTakenByType: Readonly<Record<string, number>>
  readonly totalKills: number
  readonly killLog: ReadonlyArray<{ step: number; enemyId: string; enemyName: string }>
  readonly originalSteps: number
  readonly fabricatedSteps: number
}

// --- Validation ---

export interface ValidationError {
  readonly step: number
  readonly message: string
}

function extractDamage(events: ReadonlyArray<DndEvent>): Array<{ amount: number; type: string }> {
  return events
    .filter((e): e is Extract<DndEvent, { type: "TAKE_DAMAGE" }> => e.type === "TAKE_DAMAGE")
    .map((e) => ({ amount: e.amount, type: e.damageType }))
}

export function summarizeEncounter(encounter: EncounterDef, steps: ReadonlyArray<ActualPlayStep>): EncounterSummary {
  const damageTakenByRound: Record<number, number> = {}
  const damageTakenByType: Record<string, number> = {}
  const killLog: Array<{ step: number; enemyId: string; enemyName: string }> = []
  let totalDamageTaken = 0
  let originalSteps = 0
  let fabricatedSteps = 0
  let maxRound = 0

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (step.source === "original") originalSteps++
    else fabricatedSteps++
    if (step.round > maxRound) maxRound = step.round

    for (const dmg of extractDamage(step.events)) {
      totalDamageTaken += dmg.amount
      damageTakenByRound[step.round] = (damageTakenByRound[step.round] ?? 0) + dmg.amount
      damageTakenByType[dmg.type] = (damageTakenByType[dmg.type] ?? 0) + dmg.amount
    }

    for (const enemyId of step.kills ?? []) {
      const enemy = encounter.enemies[enemyId]
      killLog.push({ step: i, enemyId, enemyName: enemy.name })
    }
  }

  return {
    totalSteps: steps.length,
    totalRounds: maxRound,
    totalDamageTaken,
    damageTakenByRound,
    damageTakenByType,
    totalKills: killLog.length,
    killLog,
    originalSteps,
    fabricatedSteps
  }
}

function validateEncounter(
  encounter: EncounterDef,
  steps: ReadonlyArray<ActualPlayStep>,
  summary: EncounterSummary
): ReadonlyArray<ValidationError> {
  const errors: Array<ValidationError> = []
  const killedEnemies = new Set<string>()
  const enemyIds = new Set(Object.keys(encounter.enemies))

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    for (const enemyId of step.kills ?? []) {
      if (!enemyIds.has(enemyId)) {
        errors.push({ step: i, message: `Kill references unknown enemy "${enemyId}"` })
      }
      if (killedEnemies.has(enemyId)) {
        errors.push({ step: i, message: `Enemy "${enemyId}" killed again (already dead)` })
      }
      killedEnemies.add(enemyId)
    }

    if (i > 0 && step.round < steps[i - 1].round) {
      errors.push({ step: i, message: `Round ${step.round} < previous round ${steps[i - 1].round}` })
    }
  }

  if (encounter.source.refKills !== undefined && summary.totalKills !== encounter.source.refKills) {
    errors.push({
      step: -1,
      message:
        `Kill count ${summary.totalKills} differs from source reference ${encounter.source.refKills}` +
        ` (${encounter.source.name})`
    })
  }

  return errors
}

// --- Replay + validate in one call ---

export function replayActualPlayTrace(
  encounter: EncounterDef,
  steps: ReadonlyArray<ActualPlayStep>
): { trace: ReadonlyArray<TraceStep>; summary: EncounterSummary } {
  const summary = summarizeEncounter(encounter, steps)
  const errors = validateEncounter(encounter, steps, summary)
  if (errors.length > 0) {
    const msg = errors.map((e) => `  step ${e.step}: ${e.message}`).join("\n")
    throw new Error(`Encounter validation failed for "${encounter.title}":\n${msg}`)
  }

  const trace = replayTrace(encounter.machineInput, steps)
  return { trace, summary }
}
