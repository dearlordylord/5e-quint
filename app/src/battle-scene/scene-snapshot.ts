/**
 * Layer A: Scene Snapshot — pure deterministic projection of BattleContext.
 * No coordinates (pixels), no time, no animation. Grid positions and game-unit measurements only.
 */
import { isIncapacitated } from "#/battle-machine-creature.ts"
import type {
  AoESpellCtx,
  BattleContext,
  BattleCreatureState,
  BattlePhase,
  PendingInterrupt
} from "#/battle-machine-types.ts"
import type { Condition, DamageType } from "#/types.ts"
import { CONDITIONS } from "#/types.ts"

// --- Scenario metadata (provided by demo, not in BattleContext) ---

export interface ScenarioMeta {
  names: Record<string, string>
  teams: { blue: Array<string>; red: Array<string> }
  gridPositions: Record<string, { row: number; col: number }>
  aoeTargetPoints: Record<string, { row: number; col: number }>
  spellAnnotations: Record<string, string>
}

// --- Snapshot types ---

export type InterruptKind = PendingInterrupt["tag"]

export type PhaseSnapshot =
  | { type: "activeTurn" }
  | { type: "interrupt"; interruptKind: InterruptKind; reactorId?: string }
  | { type: "aoeResolving"; spellName: string; remainingCount: number; saveDC: number }
  | { type: "movement" }
  | { type: "legendaryAction" }

export interface CreatureSnapshot {
  id: string
  name: string
  team: "blue" | "red"
  gridPos: { row: number; col: number }
  hpRatio: number
  currentHp: number
  maxHp: number
  tempHp: number
  unconscious: boolean
  dead: boolean
  reactionAvailable: boolean
  concentrating: boolean
  exhaustion: number
  totalSlotsRemaining: number
  totalSlotsMax: number
  isActive: boolean
  conditions: ReadonlyArray<Condition>
}

export interface AoEZoneSnapshot {
  zoneId: string
  centerGridPos: { row: number; col: number }
  radiusFeet: number
  damageType: DamageType
  spellName: string
}

export interface SceneSnapshot {
  creatures: ReadonlyArray<CreatureSnapshot>
  phase: PhaseSnapshot
  aoeZones: ReadonlyArray<AoEZoneSnapshot>
  round: number
  activeCreatureId: string | null
}

// --- Pure projection functions ---

function extractConditions(cs: BattleCreatureState): ReadonlyArray<Condition> {
  const result: Array<Condition> = []
  for (const c of CONDITIONS) {
    if (c === "incapacitated") {
      if (isIncapacitated(cs)) result.push(c)
    } else if (cs[c]) {
      result.push(c)
    }
  }
  return result
}

function sumSlots(slots: ReadonlyArray<number>): number {
  let total = 0
  for (const s of slots) total += s
  return total
}

function deriveCreature(
  id: string,
  cs: BattleCreatureState,
  meta: ScenarioMeta,
  activeId: string | null,
  blueSet: ReadonlySet<string>
): CreatureSnapshot {
  return {
    id,
    name: meta.names[id] ?? id,
    team: blueSet.has(id) ? "blue" : "red",
    gridPos: meta.gridPositions[id] ?? { row: 0, col: 0 },
    hpRatio: cs.maxHp > 0 ? cs.hp / cs.maxHp : 0,
    currentHp: cs.hp,
    maxHp: cs.maxHp,
    tempHp: cs.tempHp,
    unconscious: cs.unconscious,
    dead: cs.dead,
    reactionAvailable: cs.reactionAvailable,
    concentrating: cs.concentrationSpellId !== "",
    exhaustion: cs.exhaustion,
    totalSlotsRemaining: sumSlots(cs.slotsCurrent) + cs.pactSlotsCurrent,
    totalSlotsMax: sumSlots(cs.slotsMax) + cs.pactSlotsMax,
    isActive: id === activeId,
    conditions: extractConditions(cs)
  }
}

function derivePhase(phase: BattlePhase): PhaseSnapshot {
  switch (phase.tag) {
    case "BPActiveTurn":
      return { type: "activeTurn" }
    case "BPAwaitingReaction": {
      const firstEligible = phase.ctx.eligible.size > 0 ? [...phase.ctx.eligible][0] : undefined
      return {
        type: "interrupt",
        interruptKind: phase.ctx.interrupt.tag,
        reactorId: firstEligible
      }
    }
    case "BPResolvingAoE":
      return {
        type: "aoeResolving",
        spellName: "AoE",
        remainingCount: phase.aoe.remaining.size,
        saveDC: phase.aoe.saveDC
      }
    case "BPResolvingMovement":
      return { type: "movement" }
    case "BPAwaitingLegendaryAction":
      return { type: "legendaryAction" }
    default: {
      const _exhaustive: never = phase
      throw new Error(`Unhandled phase: ${(_exhaustive as { tag: string }).tag}`)
    }
  }
}

function deriveAoEZones(
  phase: BattlePhase,
  meta: ScenarioMeta,
  eventIndex: string | null
): ReadonlyArray<AoEZoneSnapshot> {
  if (phase.tag !== "BPResolvingAoE") return []
  const aoe: AoESpellCtx = phase.aoe
  const centerGridPos =
    eventIndex != null ? (meta.aoeTargetPoints[eventIndex] ?? { row: 0, col: 0 }) : { row: 0, col: 0 }
  const spellName = eventIndex != null ? (meta.spellAnnotations[eventIndex] ?? "AoE") : "AoE"
  return [
    {
      zoneId: `aoe-${eventIndex ?? "0"}`,
      centerGridPos,
      radiusFeet: 20, // Fireball default; future: derive from spell catalog
      damageType: aoe.damageType,
      spellName
    }
  ]
}

/**
 * Derive a SceneSnapshot from BattleContext + scenario metadata.
 * @param ctx - Current battle context from XState
 * @param meta - Scenario metadata (names, teams, positions)
 * @param aoeEventIndex - Event index string for AoE zone lookup (optional)
 */
export function deriveSnapshot(
  ctx: BattleContext,
  meta: ScenarioMeta,
  aoeEventIndex: string | null = null
): SceneSnapshot {
  const activeId =
    ctx.initiative.length > 0 && ctx.turnIndex >= 0 && ctx.turnIndex < ctx.initiative.length
      ? ctx.initiative[ctx.turnIndex]
      : null

  const blueSet = new Set(meta.teams.blue)
  const creatures: Array<CreatureSnapshot> = []
  for (const id of ctx.initiative) {
    const cs = ctx.creatures.get(id)
    if (cs) creatures.push(deriveCreature(id, cs, meta, activeId, blueSet))
  }

  return {
    creatures,
    phase: derivePhase(ctx.phase),
    aoeZones: deriveAoEZones(ctx.phase, meta, aoeEventIndex),
    round: ctx.round,
    activeCreatureId: activeId
  }
}
