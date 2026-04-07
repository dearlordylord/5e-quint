/**
 * Layer B: Director — owns temporal state, injectable clock.
 * step() is called once per event. Returns a static VisualCueState snapshot.
 * Temporal animations (cast bar fill, damage flash) are handled by Motion in Layer D.
 */
import type { BattleEvent } from "#/battle-machine-types.ts"
import { decomposeDice } from "#/features/decompose-dice.ts"
import { getSpellDamageDice } from "#/features/spell-dice-lookup.ts"

import type { InterruptKind, SceneSnapshot } from "./scene-snapshot.ts"
import type { SnapshotDelta } from "./snapshot-diff.ts"
import { getSpellVisual } from "./visual-catalog.ts"

// --- Types ---

export type LabelTone = "negative" | "positive"

export interface CreatureCue {
  damageFlash: boolean
  justBecameUnconscious: boolean
  castingGlow: boolean
  reactionUsed: boolean
  conditionGained: boolean
  floatingLabel: string | null
  labelTone: LabelTone
  slotJustSpent: boolean
}

export interface DiceRollCue {
  /** Die type: 4, 6, 8, 10, 12, 20 */
  readonly sides: number
  /** Pre-determined results (one per die) */
  readonly results: ReadonlyArray<number>
  /** Hex color for the dice */
  readonly color: number
}

export interface VisualCueState {
  castBar: { casterId: string; spellName: string; progress: number } | null
  castLineTargetId: string | null
  spellAnnouncement: { spellName: string; casterId: string } | null
  interruptOverlay: { opacity: number; label: string }
  creatureCues: Record<string, CreatureCue>
  autoAdvanceDelay: number
  diceRolls: ReadonlyArray<DiceRollCue>
}

export interface PlaybackTiming {
  defaultDelayMs: number
  overrides: Partial<Record<BattleEvent["type"], number>>
}

export const DEFAULT_TIMING: PlaybackTiming = {
  defaultDelayMs: 800,
  overrides: {
    BATTLE_INIT: 200,
    BATTLE_START_TURN: 500,
    BATTLE_CAST_AOE: 1000,
    BATTLE_RESOLVE_COUNTERSPELL: 600,
    BATTLE_RESOLVE_AOE_TARGET: 400,
    BATTLE_RESOLVE_SAVE_FAILED_REACTION: 300,
    BATTLE_AFTER_DAMAGE_PASS: 200,
    BATTLE_END_TURN: 400
  }
}

/** Stable empty array — avoids fresh `[]` allocations triggering React re-renders. */
export const EMPTY_DICE_ROLLS: ReadonlyArray<DiceRollCue> = []

export const EMPTY_CUES: VisualCueState = {
  castBar: null,
  castLineTargetId: null,
  spellAnnouncement: null,
  interruptOverlay: { opacity: 0, label: "" },
  creatureCues: {},
  autoAdvanceDelay: 0,
  diceRolls: EMPTY_DICE_ROLLS
}

export const EMPTY_CUE: CreatureCue = {
  damageFlash: false,
  justBecameUnconscious: false,
  castingGlow: false,
  reactionUsed: false,
  conditionGained: false,
  floatingLabel: null,
  labelTone: "positive",
  slotJustSpent: false
}

const INTERRUPT_LABELS: Record<InterruptKind, string> = {
  PISpellCast: "COUNTERSPELL WINDOW",
  PISaveFailed: "SAVE FAILED — REACTION",
  PISaveFailedAoE: "SAVE FAILED — REACTION",
  PIAttackHit: "ATTACK HIT — REACTION",
  PIAttackDamage: "DAMAGE — REACTION",
  PIAfterDamage: "AFTER DAMAGE — REACTION"
}

function applyCue(cues: Record<string, CreatureCue>, id: string, patch: Partial<CreatureCue>): void {
  const cue = cues[id]
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Record index access can be undefined at runtime
  if (cue) Object.assign(cue, patch)
}

function label(text: string, tone: LabelTone): Pick<CreatureCue, "floatingLabel" | "labelTone"> {
  return { floatingLabel: text, labelTone: tone }
}

/**
 * Compute visual cues for a single event step.
 * Pure function — no side effects, no internal state.
 */
export function directorStep(
  event: BattleEvent,
  snapshot: SceneSnapshot,
  prevSnapshot: SceneSnapshot,
  delta: SnapshotDelta,
  timing: PlaybackTiming = DEFAULT_TIMING
): VisualCueState {
  const creatureCues: Record<string, CreatureCue> = {}
  for (const c of snapshot.creatures) {
    creatureCues[c.id] = { ...EMPTY_CUE }
  }

  for (const id of Object.keys(delta.damageTaken)) {
    applyCue(creatureCues, id, { damageFlash: true })
  }
  for (const id of delta.becameUnconscious) {
    applyCue(creatureCues, id, { justBecameUnconscious: true, ...label("KO!", "negative") })
  }
  for (const id of delta.reactionsSpent) {
    applyCue(creatureCues, id, { reactionUsed: true })
  }
  for (const id of Object.keys(delta.conditionsGained)) {
    applyCue(creatureCues, id, { conditionGained: true })
  }
  for (const id of delta.slotsExpended) {
    applyCue(creatureCues, id, { slotJustSpent: true })
  }

  let castBar: VisualCueState["castBar"] = null
  if (event.type === "BATTLE_CAST_AOE" || event.type === "BATTLE_CAST_SAVE_SPELL") {
    const casterId = snapshot.activeCreatureId
    if (casterId) {
      const visual = getSpellVisual(event.spellName)
      castBar = { casterId, spellName: visual.label, progress: 1 }
      applyCue(creatureCues, casterId, { castingGlow: true, slotJustSpent: true })
    }
  }

  // Cast line target: any reaction to a spell targets that spell's caster
  const castLineTargetId: string | null =
    prevSnapshot.phase.type === "interrupt" && prevSnapshot.phase.spellCasterId
      ? prevSnapshot.phase.spellCasterId
      : null

  if (event.type === "BATTLE_RESOLVE_COUNTERSPELL" && event.reactorId) {
    const visual = getSpellVisual("counterspell")
    castBar = { casterId: event.reactorId, spellName: visual.label, progress: 1 }
    applyCue(creatureCues, event.reactorId, { castingGlow: true, slotJustSpent: true })
  }

  // Decision / save labels — derive DC from phase when available
  if (event.type === "BATTLE_RESOLVE_AOE_TARGET" && event.targetId) {
    const dc = snapshot.phase.type === "aoeResolving" ? snapshot.phase.saveDC : 0
    const saved = dc > 0 ? event.saveRoll >= dc : false
    applyCue(creatureCues, event.targetId, label(saved ? "Save!" : "Fail!", saved ? "positive" : "negative"))
  }
  if (event.type === "BATTLE_RESOLVE_SAVE_FAILED_REACTION" && event.reactorId) {
    const isLR = event.decision.tag !== "RPass"
    applyCue(creatureCues, event.reactorId, label(isLR ? "Legendary Resistance!" : "Skip", "positive"))
  }
  if (event.type === "BATTLE_AFTER_DAMAGE_PASS" && event.reactorId) {
    applyCue(creatureCues, event.reactorId, label("Skip", "positive"))
  }
  if (event.type === "BATTLE_RESOLVE_HIT_REACTION" && event.reactorId) {
    const text =
      event.decision.tag === "RShield" ? "Shield!" : event.decision.tag === "RPass" ? "Skip" : event.decision.tag
    applyCue(creatureCues, event.reactorId, label(text, "positive"))
  }
  if (event.type === "BATTLE_RESOLVE_DMG_REACTION" && event.reactorId) {
    const text =
      event.decision.tag === "RUncannyDodge" ? "Uncanny Dodge!" : event.decision.tag === "RPass" ? "Skip" : "Reduce"
    applyCue(creatureCues, event.reactorId, label(text, "positive"))
  }

  // Interrupt overlay — typed lookup, no fallback needed
  let interruptOverlay = { opacity: 0, label: "" }
  if (snapshot.phase.type === "interrupt") {
    interruptOverlay = {
      opacity: 0.6,
      label: INTERRUPT_LABELS[snapshot.phase.interruptKind]
    }
  }

  const spellAnnouncement = castBar ? { spellName: castBar.spellName, casterId: castBar.casterId } : null
  const autoAdvanceDelay = timing.overrides[event.type] ?? timing.defaultDelayMs

  const diceRolls = deriveDiceRolls(event)

  return { castBar, castLineTargetId, spellAnnouncement, interruptOverlay, creatureCues, autoAdvanceDelay, diceRolls }
}

// --- Dice roll cue derivation ---

/** Field name suffixes that indicate a d20 roll value (1–20). */
const D20_SUFFIXES = ["Roll", "AtkRoll"] as const

const ATTACK_COLOR = 0x3b82f6 // blue
const SAVE_COLOR = 0x22c55e // green
const DAMAGE_COLOR = 0xef4444 // red

/** Collect all dice roll cues for an event: damage dice + d20 rolls. */
function deriveDiceRolls(event: BattleEvent): ReadonlyArray<DiceRollCue> {
  const cues: Array<DiceRollCue> = []

  if (event.type === "BATTLE_CAST_AOE" || event.type === "BATTLE_CAST_SAVE_SPELL") {
    const expr = getSpellDamageDice(event.spellName, event.slotLvl)
    if (expr) {
      const results = decomposeDice(event.dmgOnFail, expr.dice, expr.dieSize)
      if (results) cues.push({ sides: expr.dieSize, results, color: DAMAGE_COLOR })
    }
  }

  if (event.type === "BATTLE_ATTACK") {
    const results = decomposeDice(event.dmg, event.diceCount, event.dieSize)
    if (results) cues.push({ sides: event.dieSize, results, color: DAMAGE_COLOR })
  }

  // TODO: show spell reaction dice once event carries a spell identifier for lookup

  const d20 = deriveD20Roll(event)
  if (d20) cues.push(d20)

  return cues.length > 0 ? cues : EMPTY_DICE_ROLLS
}

/** Extract d20 roll cue from event fields ending in known suffixes. */
function deriveD20Roll(event: BattleEvent): DiceRollCue | null {
  const D20_MAX = 20
  const entries = Object.entries(event).filter(
    (entry): entry is [string, number] =>
      typeof entry[1] === "number" &&
      D20_SUFFIXES.some((s) => entry[0].endsWith(s)) &&
      entry[1] >= 1 &&
      entry[1] <= D20_MAX
  )

  if (entries.length === 0) return null
  const results = entries.map(([, val]) => val)
  const isSave = entries.some(([key]) => key.toLowerCase().includes("save"))
  return { sides: D20_MAX, results, color: isSave ? SAVE_COLOR : ATTACK_COLOR }
}
