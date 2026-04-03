/**
 * Layer C: Layout — pure math converting SceneSnapshot + VisualCueState to pixel coordinates.
 * Grid positions to pixels, feet to squares to pixels, bar dimensions, AoE circle radii.
 */
import { type CreatureCue, EMPTY_CUE, type VisualCueState } from "./director.ts"
import type { AoEZoneSnapshot, CreatureSnapshot, SceneSnapshot } from "./scene-snapshot.ts"
import { damageTypeVisuals } from "./visual-catalog.ts"

// --- Config ---

export interface LayoutConfig {
  cellSize: number // px per grid square
  gridCols: number
  gridRows: number
  tokenRadius: number
  barWidth: number
  barHeight: number
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  cellSize: 60,
  gridCols: 11,
  gridRows: 11,
  tokenRadius: 22,
  barWidth: 44,
  barHeight: 5
}

// --- Layout types ---

export interface BarLayout {
  x: number
  y: number
  totalWidth: number
  fillWidth: number
  height: number
  color: string
}

export interface CreatureLayout {
  id: string
  cx: number
  cy: number
  tokenRadius: number
  teamColor: string
  opacity: number
  label: string
  hpBar: BarLayout
  tempHpBar: BarLayout | null
  castBar: BarLayout | null
  slotPips: { x: number; y: number; filled: number; total: number }
  damageFlash: boolean
  castingGlow: boolean
  justBecameUnconscious: boolean
}

export interface AoELayout {
  zoneId: string
  cx: number
  cy: number
  r: number
  color: string
  opacity: number
}

export interface LayoutState {
  viewBox: { width: number; height: number }
  gridLines: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }>
  creatures: ReadonlyArray<CreatureLayout>
  aoeZones: ReadonlyArray<AoELayout>
  interruptOverlay: { opacity: number; label: string | null }
  spellAnnouncement: { spellName: string; casterId: string } | null
}

// --- Pure computation ---

const TEAM_COLORS = { blue: "#3b82f6", red: "#ef4444" } as const

/** Safe Record lookup — returns EMPTY_CUE if key is missing (noUncheckedIndexedAccess is off). */
function lookupCue(cues: Record<string, CreatureCue>, id: string): CreatureCue {
  return (cues as Partial<Record<string, CreatureCue>>)[id] ?? EMPTY_CUE
}

function gridToPixel(row: number, col: number, cellSize: number): { cx: number; cy: number } {
  return {
    cx: col * cellSize + cellSize / 2,
    cy: row * cellSize + cellSize / 2
  }
}

function computeGridLines(config: LayoutConfig): LayoutState["gridLines"] {
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const w = config.gridCols * config.cellSize
  const h = config.gridRows * config.cellSize
  for (let r = 0; r <= config.gridRows; r++) {
    const y = r * config.cellSize
    lines.push({ x1: 0, y1: y, x2: w, y2: y })
  }
  for (let c = 0; c <= config.gridCols; c++) {
    const x = c * config.cellSize
    lines.push({ x1: x, y1: 0, x2: x, y2: h })
  }
  return lines
}

function computeCreatureLayout(creature: CreatureSnapshot, cues: VisualCueState, config: LayoutConfig): CreatureLayout {
  const { cx, cy } = gridToPixel(creature.gridPos.row, creature.gridPos.col, config.cellSize)
  const cue = lookupCue(cues.creatureCues, creature.id)

  const opacity = creature.dead ? 0 : creature.unconscious ? 0.3 : 1

  const barX = cx - config.barWidth / 2
  const hpBarY = cy + config.tokenRadius + 4

  const hpBar: BarLayout = {
    x: barX,
    y: hpBarY,
    totalWidth: config.barWidth,
    fillWidth: config.barWidth * creature.hpRatio,
    height: config.barHeight,
    color: creature.hpRatio > 0.5 ? "#22c55e" : creature.hpRatio > 0.25 ? "#eab308" : "#ef4444"
  }

  const tempHpBar: BarLayout | null =
    creature.tempHp > 0
      ? {
          x: barX,
          y: hpBarY + config.barHeight + 2,
          totalWidth: config.barWidth,
          fillWidth: config.barWidth * (creature.maxHp > 0 ? Math.min(creature.tempHp / creature.maxHp, 1) : 0),
          height: config.barHeight,
          color: "#60a5fa"
        }
      : null

  // Cast bar from Director
  let castBar: BarLayout | null = null
  if (cues.castBar && cues.castBar.casterId === creature.id) {
    castBar = {
      x: barX,
      y: cy - config.tokenRadius - config.barHeight - 4,
      totalWidth: config.barWidth,
      fillWidth: config.barWidth * cues.castBar.progress,
      height: config.barHeight,
      color: "#a78bfa"
    }
  }

  return {
    id: creature.id,
    cx,
    cy,
    tokenRadius: config.tokenRadius,
    teamColor: TEAM_COLORS[creature.team],
    opacity,
    label: creature.name,
    hpBar,
    tempHpBar,
    castBar,
    slotPips: {
      x: barX,
      y: hpBarY + config.barHeight + (tempHpBar ? config.barHeight + 4 : 2),
      filled: creature.totalSlotsRemaining,
      total: creature.totalSlotsMax
    },
    damageFlash: cue.damageFlash,
    castingGlow: cue.castingGlow,
    justBecameUnconscious: cue.justBecameUnconscious
  }
}

function computeAoELayout(zone: AoEZoneSnapshot, config: LayoutConfig): AoELayout {
  const { cx, cy } = gridToPixel(zone.centerGridPos.row, zone.centerGridPos.col, config.cellSize)
  const radiusSquares = zone.radiusFeet / 5
  const r = radiusSquares * config.cellSize
  const visual = damageTypeVisuals[zone.damageType]
  return {
    zoneId: zone.zoneId,
    cx,
    cy,
    r,
    color: visual.aoeColor,
    opacity: 0.25
  }
}

export function computeLayout(
  snapshot: SceneSnapshot,
  cues: VisualCueState,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): LayoutState {
  return {
    viewBox: {
      width: config.gridCols * config.cellSize,
      height: config.gridRows * config.cellSize
    },
    gridLines: computeGridLines(config),
    creatures: snapshot.creatures.map((c) => computeCreatureLayout(c, cues, config)),
    aoeZones: snapshot.aoeZones.map((z) => computeAoELayout(z, config)),
    interruptOverlay: {
      opacity: cues.interruptOverlay.opacity,
      label: cues.interruptOverlay.label || null
    },
    spellAnnouncement: cues.spellAnnouncement
  }
}
