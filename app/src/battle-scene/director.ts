/**
 * Layer B: Director — owns temporal state, injectable clock.
 * step() is called once per event. Returns a static VisualCueState snapshot.
 * Temporal animations (cast bar fill, damage flash) are handled by Motion in Layer D.
 */
import type { BattleEvent } from "#/battle-machine-types.ts"

import type { SceneSnapshot } from "./scene-snapshot.ts"
import type { SnapshotDelta } from "./snapshot-diff.ts"
import { getSpellVisual } from "./visual-catalog.ts"

// --- Types ---

export interface CreatureCue {
  damageFlash: boolean
  justBecameUnconscious: boolean
  castingGlow: boolean
  reactionUsed: boolean
  conditionGained: boolean
}

export interface VisualCueState {
  castBar: { casterId: string; spellName: string; progress: number } | null
  interruptOverlay: { opacity: number; label: string }
  creatureCues: Record<string, CreatureCue>
  autoAdvanceDelay: number
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

export const EMPTY_CUES: VisualCueState = {
  castBar: null,
  interruptOverlay: { opacity: 0, label: "" },
  creatureCues: {},
  autoAdvanceDelay: 0
}

const EMPTY_CUE: CreatureCue = {
  damageFlash: false,
  justBecameUnconscious: false,
  castingGlow: false,
  reactionUsed: false,
  conditionGained: false
}

function applyCue(cues: Record<string, CreatureCue>, id: string, patch: Partial<CreatureCue>): void {
  Object.assign(cues[id], patch)
}

/**
 * Compute visual cues for a single event step.
 * Pure function — no side effects, no internal state.
 */
export function directorStep(
  event: BattleEvent,
  snapshot: SceneSnapshot,
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
    applyCue(creatureCues, id, { justBecameUnconscious: true })
  }
  for (const id of delta.reactionsSpent) {
    applyCue(creatureCues, id, { reactionUsed: true })
  }
  for (const id of Object.keys(delta.conditionsGained)) {
    applyCue(creatureCues, id, { conditionGained: true })
  }

  let castBar: VisualCueState["castBar"] = null
  if (event.type === "BATTLE_CAST_AOE" || event.type === "BATTLE_CAST_SAVE_SPELL") {
    const casterId = snapshot.activeCreatureId
    if (casterId) {
      const visual = getSpellVisual(event.spellName)
      castBar = { casterId, spellName: visual.label, progress: 1 }
      applyCue(creatureCues, casterId, { castingGlow: true })
    }
  }

  if (event.type === "BATTLE_RESOLVE_COUNTERSPELL" && event.reactorId) {
    const visual = getSpellVisual("counterspell")
    castBar = { casterId: event.reactorId, spellName: visual.label, progress: 1 }
    applyCue(creatureCues, event.reactorId, { castingGlow: true })
  }

  const interruptOverlay =
    snapshot.phase.type === "interrupt" ? { opacity: 0.6, label: "INTERRUPT" } : { opacity: 0, label: "" }

  const autoAdvanceDelay = timing.overrides[event.type] ?? timing.defaultDelayMs

  return { castBar, interruptOverlay, creatureCues, autoAdvanceDelay }
}
