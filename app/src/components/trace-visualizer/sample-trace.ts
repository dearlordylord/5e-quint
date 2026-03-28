/* eslint-disable max-lines */
/**
 * Sample MBT trace data for the Trace Replay Visualizer.
 *
 * This is a hardcoded trace representing a realistic Fighter combat sequence.
 * In the real MBT pipeline, traces come from `quint run` in ITF format and are
 * replayed against the XState machine field-by-field. Here we bundle both the
 * Quint state and the (identical) XState state for each step so the visualizer
 * can show the side-by-side comparison.
 *
 * The NormalizedState shape matches machine.mbt.test.ts exactly.
 */

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
  /** Quint state after this step */
  readonly quintState: NormalizedState
  /** XState state after this step (should match Quint exactly) */
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

// Helper to create a step where both states match (the normal case)
function step(quintAction: string, xstateEvent: string, description: string, state: NormalizedState): TraceStep {
  return { quintAction, xstateEvent, description, quintState: state, xstateState: state }
}

// --- The sample trace: a Level 5 Champion Fighter combat sequence ---

const s0 = defaultState()

const s1 = defaultState({
  turnPhase: "waitingForTurn"
})

const s2 = defaultState({
  turnPhase: "acting",
  movementRemaining: 30,
  effectiveSpeed: 30,
  actionsRemaining: 1,
  reactionAvailable: true,
  extraAttacksRemaining: 1
})

const s3 = defaultState({
  turnPhase: "acting",
  movementRemaining: 5,
  effectiveSpeed: 30,
  actionsRemaining: 1,
  reactionAvailable: true,
  extraAttacksRemaining: 1
})

const s4 = defaultState({
  turnPhase: "acting",
  movementRemaining: 5,
  effectiveSpeed: 30,
  actionsRemaining: 0,
  attackActionUsed: true,
  reactionAvailable: true,
  extraAttacksRemaining: 1
})

const s5 = defaultState({
  turnPhase: "acting",
  movementRemaining: 5,
  effectiveSpeed: 30,
  actionsRemaining: 0,
  attackActionUsed: true,
  reactionAvailable: true,
  extraAttacksRemaining: 0
})

// End turn 1 — spec preserves turnState and fighterState unchanged
const s7 = defaultState({
  turnPhase: "waitingForTurn",
  movementRemaining: 5,
  effectiveSpeed: 30,
  actionsRemaining: 0,
  attackActionUsed: true,
  reactionAvailable: true,
  extraAttacksRemaining: 0
})

// Take 18 damage between turns — turnState/fighterState unchanged
const s8 = defaultState({
  hp: 26,
  turnPhase: "waitingForTurn",
  movementRemaining: 5,
  effectiveSpeed: 30,
  actionsRemaining: 0,
  attackActionUsed: true,
  reactionAvailable: true,
  extraAttacksRemaining: 0
})

// Start turn 2
const s9 = defaultState({
  hp: 26,
  turnPhase: "acting",
  movementRemaining: 30,
  effectiveSpeed: 30,
  actionsRemaining: 1,
  reactionAvailable: true,
  extraAttacksRemaining: 1,
  actionSurgeUsedThisTurn: false
})

// Second Wind: heal 1d10(7) + 5 = 12, bonus action spent, charge 3->2
// Tactical Shift (L5): bonus movement = effectiveSpeed/2 = 15, OA-free
const s10 = defaultState({
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

// Attack action
const s11 = defaultState({
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

// Extra Attack
const s12 = defaultState({
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

// Action Surge! Get another action
const s13 = defaultState({
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

// Attack action with surged action — extraAttacks NOT refilled by pUseAction
const s14 = defaultState({
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

// End turn 2 — spec preserves turnState and fighterState
const s16 = defaultState({
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

// Massive damage: 50 points — turnState/fighterState preserved from s16
const s17 = defaultState({
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

// Death save: roll 14, success — turnState/fighterState preserved
const s18 = defaultState({
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

// Death save: nat 20! Regain 1 HP, wake up — turnState/fighterState preserved
const s19 = defaultState({
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

// Turn 3: stand up, finish the ogre
// Start turn 3 — 1 HP, prone, no charges
const s20 = defaultState({
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

// Stand from prone — costs half speed (15 ft)
const s21 = defaultState({
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

// Attack action — the killing blow
const s22 = defaultState({
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

// End turn 3 — spec preserves turnState from s22
const s23 = defaultState({
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

// Exit combat — turnState preserved
const s24 = defaultState({
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

// Short rest — spend 3 hit dice: d10 rolls 6,8,4 + CON(2) = 8+10+6 = 24 HP healed
// Also recover 1 Second Wind charge + all Action Surge charges
const s25 = defaultState({
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

export const SAMPLE_TRACE: ReadonlyArray<TraceStep> = [
  step("init", "(initial)", "Level 5 Champion Fighter initialized: 44 HP, 30ft speed", s0),
  step("doEnterCombat", "ENTER_COMBAT", "Fighter enters combat, waiting for initiative", s1),
  step("doStartTurn", "START_TURN", "Turn 1 begins: speed set to 30ft, 1 action + 1 extra attack", s2),
  step("doUseMovement", "USE_MOVEMENT", "Move 25ft toward the Ogre (5ft remaining)", s3),
  step("doUseAction", "USE_ACTION", "Take the Attack action (attack type)", s4),
  step("doUseExtraAttack", "USE_EXTRA_ATTACK", "Extra Attack: second strike with longsword", s5),
  step("doEndTurn", "END_TURN", "End turn 1 -- action economy resets", s7),
  step("doTakeDamage", "TAKE_DAMAGE", "Ogre hits for 18 bludgeoning damage (44 -> 26 HP)", s8),
  step("doStartTurn", "START_TURN", "Turn 2 begins: 26 HP, need healing", s9),
  step(
    "doUseSecondWind",
    "USE_SECOND_WIND",
    "Second Wind! Roll d10(7) + 5 = heal 12 HP (26 -> 38 HP), bonus action spent",
    s10
  ),
  step("doUseAction", "USE_ACTION", "Take the Attack action again", s11),
  step("doUseExtraAttack", "USE_EXTRA_ATTACK", "Extra Attack: second strike", s12),
  step("doUseActionSurge", "USE_ACTION_SURGE", "ACTION SURGE! Gain an additional action this turn", s13),
  step("doUseAction", "USE_ACTION", "Use the surged action: Attack again (no extra attack -- extras spent)", s14),
  step("doEndTurn", "END_TURN", "End turn 2 -- all charges spent", s16),
  step(
    "doTakeDamage",
    "TAKE_DAMAGE",
    "Ogre crits for 50 bludgeoning! Fighter drops to 0 HP, falls unconscious and prone",
    s17
  ),
  step("doDeathSave", "DEATH_SAVE", "Death save: rolls 14 -- one success", s18),
  step("doDeathSave", "DEATH_SAVE", "Death save: NATURAL 20! Regain 1 HP, conscious again (still prone)", s19),
  step("doStartTurn", "START_TURN", "Turn 3 begins: 1 HP, still prone, no charges left. Do or die.", s20),
  step("doStandFromProne", "STAND_FROM_PRONE", "Stand up -- costs 15ft (half speed). Ready to fight.", s21),
  step("doUseAction", "USE_ACTION", "Attack action: longsword strikes true. The Ogre falls.", s22),
  step("doEndTurn", "END_TURN", "End turn 3 -- the Ogre is slain", s23),
  step("doExitCombat", "EXIT_COMBAT", "Combat ends. The Fighter stands victorious at 1 HP.", s24),
  step(
    "doShortRest",
    "SHORT_REST",
    "Short rest: spend 3 hit dice (d10+2 each: 8+10+6 = 24 HP). Charges restored. 1 -> 25 HP.",
    s25
  )
]

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
