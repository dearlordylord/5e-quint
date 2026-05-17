import type { BattleCreatureSnapshot, BattleSnapshot, CombatantId } from "@dnd/battle-runtime"

import type {
  BattleGridPosition,
  WizardBattleDemoMeta,
  WizardBattleDemoStep,
  WizardBattleSprite
} from "./wizard-battle-demo.ts"

export interface LayoutConfig {
  readonly cellSize: number
  readonly gridCols: number
  readonly gridRows: number
  readonly tokenRadius: number
  readonly barWidth: number
  readonly barHeight: number
}

export interface BarLayout {
  readonly x: number
  readonly y: number
  readonly totalWidth: number
  readonly fillWidth: number
  readonly height: number
  readonly color: string
}

export interface CreatureLayout {
  readonly id: string
  readonly cx: number
  readonly cy: number
  readonly tokenRadius: number
  readonly teamColor: string
  readonly sprite: WizardBattleSprite | null
  readonly opacity: number
  readonly label: string
  readonly labelY: number
  readonly hpBar: BarLayout
  readonly tempHpBar: BarLayout | null
  readonly castBar: BarLayout | null
  readonly slotRows: ReadonlyArray<{
    readonly x: number
    readonly y: number
    readonly level: number
    readonly filled: number
    readonly total: number
  }>
  readonly deathSaves: {
    readonly x: number
    readonly y: number
    readonly successes: number
    readonly failures: number
  } | null
  readonly unconscious: boolean
  readonly damageFlash: boolean
  readonly castingGlow: boolean
  readonly justBecameUnconscious: boolean
  readonly isActive: boolean
  readonly isReacting: boolean
  readonly floatingLabel: string | null
  readonly labelTone: "negative" | "positive"
  readonly slotJustSpent: boolean
}

export interface AoELayout {
  readonly zoneId: string
  readonly cx: number
  readonly cy: number
  readonly r: number
  readonly color: string
  readonly opacity: number
  readonly spellName: string
}

export interface CastLineLayout {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
  readonly color: string
}

export interface LayoutState {
  readonly viewBox: { readonly width: number; readonly height: number }
  readonly gridLines: ReadonlyArray<{
    readonly x1: number
    readonly y1: number
    readonly x2: number
    readonly y2: number
  }>
  readonly creatures: ReadonlyArray<CreatureLayout>
  readonly aoeZones: ReadonlyArray<AoELayout>
  readonly castLine: CastLineLayout | null
  readonly interruptOverlay: { readonly opacity: number; readonly label: string | null }
  readonly spellAnnouncement: { readonly spellName: string; readonly casterId: string } | null
}

export interface InitiativeCreatureSnapshot {
  readonly id: string
  readonly name: string
  readonly team: "blue" | "red"
  readonly currentHp: number
  readonly maxHp: number
  readonly unconscious: boolean
  readonly dead: boolean
  readonly reactionAvailable: boolean
  readonly slotsByLevel: ReadonlyArray<{ readonly current: number; readonly level: number; readonly max: number }>
  readonly preparedSpells: ReadonlyArray<string>
  readonly isActive: boolean
  readonly isReacting: boolean
}

export interface BattleSceneProjection {
  readonly layout: LayoutState
  readonly initiativeCreatures: ReadonlyArray<InitiativeCreatureSnapshot>
  readonly round: number
  readonly activeCreatureName: string
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  barHeight: 5,
  barWidth: 44,
  cellSize: 60,
  gridCols: 11,
  gridRows: 11,
  tokenRadius: 26
}
const TEAM_COLORS = { blue: "#3b82f6", red: "#ef4444" } as const
const FEET_PER_GRID_SQUARE = 5
const FULL_BAR_RATIO = 1

export function computeWizardBattleScene(input: {
  readonly snapshot: BattleSnapshot
  readonly meta: WizardBattleDemoMeta
  readonly step: WizardBattleDemoStep
  readonly stepIndex: number
  readonly config?: LayoutConfig
}): BattleSceneProjection {
  const config = input.config ?? DEFAULT_LAYOUT_CONFIG
  const initiativeCreatures = input.snapshot.combatants.map((combatant) =>
    initiativeCreatureSnapshot(combatant, input.meta, input.snapshot.currentActorId, input.step.cue.reactingId)
  )

  return {
    activeCreatureName:
      input.meta.combatants[input.snapshot.currentActorId]?.name ?? String(input.snapshot.currentActorId),
    initiativeCreatures,
    layout: {
      aoeZones: computeAoEZones(input.step, input.stepIndex, config),
      castLine: computeCastLine(input.meta, input.step, config),
      creatures: input.snapshot.combatants.map((combatant) =>
        computeCreatureLayout(combatant, input.meta, input.step, input.snapshot.currentActorId, config)
      ),
      gridLines: computeGridLines(config),
      interruptOverlay: {
        label: input.step.cue.reactingId === undefined ? null : "COUNTERSPELL WINDOW",
        opacity: input.step.cue.reactingId === undefined ? 0 : 0.95
      },
      spellAnnouncement:
        input.step.cue.spell === undefined
          ? null
          : { casterId: input.step.cue.spell.casterId, spellName: input.step.cue.spell.name },
      viewBox: {
        height: config.gridRows * config.cellSize,
        width: config.gridCols * config.cellSize
      }
    },
    round: Number(input.snapshot.round)
  }
}

function computeCreatureLayout(
  combatant: BattleCreatureSnapshot,
  meta: WizardBattleDemoMeta,
  step: WizardBattleDemoStep,
  currentActorId: CombatantId,
  config: LayoutConfig
): CreatureLayout {
  const combatantMeta = meta.combatants[combatant.combatantId]
  const gridPosition = combatantMeta?.gridPosition ?? { col: 0, row: 0 }
  const { cx, cy } = gridToPixel(gridPosition, config)
  const barX = cx - config.barWidth / 2
  const hpBarY = cy + config.tokenRadius + 4
  const hpRatio = Number(combatant.maxHp) > 0 ? Number(combatant.hp) / Number(combatant.maxHp) : 0
  const tempHp = Number(combatant.tempHp)
  const unconscious = combatant.conditions.includes("unconscious")
  const dead = combatant.zeroHpLifecycle.dead
  const floatingLabel = step.cue.labels?.find((label) => label.combatantId === combatant.combatantId)

  const tempHpBar =
    tempHp > 0
      ? {
          color: "#60a5fa",
          fillWidth: config.barWidth * Math.min(tempHp / Number(combatant.maxHp), FULL_BAR_RATIO),
          height: config.barHeight,
          totalWidth: config.barWidth,
          x: barX,
          y: hpBarY + config.barHeight + 2
        }
      : null

  return {
    castBar:
      step.cue.spell?.casterId === combatant.combatantId
        ? {
            color: "#a78bfa",
            fillWidth: config.barWidth,
            height: config.barHeight,
            totalWidth: config.barWidth,
            x: barX,
            y: cy - config.tokenRadius - config.barHeight - 4
          }
        : null,
    castingGlow: step.cue.spell?.casterId === combatant.combatantId,
    cx,
    cy,
    damageFlash: step.cue.damagedCombatantIds?.includes(combatant.combatantId) ?? false,
    deathSaves: deathSavesLayout(combatant, unconscious, barX, hpBarY, config),
    floatingLabel: floatingLabel?.text ?? null,
    hpBar: {
      color: hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444",
      fillWidth: config.barWidth * Math.max(0, Math.min(FULL_BAR_RATIO, hpRatio)),
      height: config.barHeight,
      totalWidth: config.barWidth,
      x: barX,
      y: hpBarY
    },
    id: combatant.combatantId,
    isActive: combatant.combatantId === currentActorId,
    isReacting: step.cue.reactingId === combatant.combatantId,
    justBecameUnconscious: false,
    label: combatantMeta?.name ?? combatant.displayName,
    labelTone: floatingLabel?.tone ?? "negative",
    labelY: hpBarY + config.barHeight + (tempHpBar === null ? 2 : config.barHeight + 4) + 8,
    opacity: dead ? 0.3 : unconscious ? 0.7 : 1,
    slotJustSpent: step.cue.spell?.casterId === combatant.combatantId,
    slotRows: slotRows(combatant, barX, hpBarY, tempHpBar, config),
    sprite: combatantMeta?.sprite ?? null,
    teamColor: TEAM_COLORS[combatantMeta?.team ?? "blue"],
    tempHpBar,
    tokenRadius: config.tokenRadius,
    unconscious
  }
}

function deathSavesLayout(
  combatant: BattleCreatureSnapshot,
  unconscious: boolean,
  barX: number,
  hpBarY: number,
  config: LayoutConfig
): CreatureLayout["deathSaves"] {
  if (!unconscious || combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows") return null
  return {
    failures: combatant.zeroHpLifecycle.deathSaves.failures,
    successes: combatant.zeroHpLifecycle.deathSaves.successes,
    x: barX,
    y: hpBarY + config.barHeight + 2
  }
}

function slotRows(
  combatant: BattleCreatureSnapshot,
  barX: number,
  hpBarY: number,
  tempHpBar: BarLayout | null,
  config: LayoutConfig
): CreatureLayout["slotRows"] {
  if (combatant.origin.kind !== "character" || combatant.origin.spellcasting === null) return []
  return combatant.origin.spellcasting.spellSlots.map((slot, index) => ({
    filled: Math.max(0, Number(slot.count) - Number(slot.expended)),
    level: Number(slot.spellLevel),
    total: Number(slot.count),
    x: barX,
    y: hpBarY + config.barHeight + (tempHpBar === null ? 2 : config.barHeight + 4) + 13 + index * 6
  }))
}

function initiativeCreatureSnapshot(
  combatant: BattleCreatureSnapshot,
  meta: WizardBattleDemoMeta,
  currentActorId: CombatantId,
  reactingId: CombatantId | undefined
): InitiativeCreatureSnapshot {
  const combatantMeta = meta.combatants[combatant.combatantId]
  return {
    currentHp: Number(combatant.hp),
    dead: combatant.zeroHpLifecycle.dead,
    id: combatant.combatantId,
    isActive: combatant.combatantId === currentActorId,
    isReacting: combatant.combatantId === reactingId,
    maxHp: Number(combatant.maxHp),
    name: combatantMeta?.name ?? combatant.displayName,
    preparedSpells: combatantMeta?.preparedSpellIds ?? [],
    reactionAvailable: combatant.reactionAvailable,
    slotsByLevel:
      combatant.origin.kind === "character" && combatant.origin.spellcasting !== null
        ? combatant.origin.spellcasting.spellSlots.map((slot) => ({
            current: Math.max(0, Number(slot.count) - Number(slot.expended)),
            level: Number(slot.spellLevel),
            max: Number(slot.count)
          }))
        : [],
    team: combatantMeta?.team ?? "blue",
    unconscious: combatant.conditions.includes("unconscious")
  }
}

function computeGridLines(
  config: LayoutConfig
): ReadonlyArray<{ readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }> {
  const width = config.gridCols * config.cellSize
  const height = config.gridRows * config.cellSize
  const rows = Array.from({ length: config.gridRows + 1 }, (_, row) => ({
    x1: 0,
    x2: width,
    y1: row * config.cellSize,
    y2: row * config.cellSize
  }))
  const cols = Array.from({ length: config.gridCols + 1 }, (_, col) => ({
    x1: col * config.cellSize,
    x2: col * config.cellSize,
    y1: 0,
    y2: height
  }))
  return [...rows, ...cols]
}

function computeAoEZones(
  step: WizardBattleDemoStep,
  stepIndex: number,
  config: LayoutConfig
): ReadonlyArray<AoELayout> {
  const spell = step.cue.spell
  if (spell?.areaCenter === undefined) return []
  const { cx, cy } = gridToPixel(spell.areaCenter, config)
  return [
    {
      color: spell.color,
      cx,
      cy,
      opacity: 0.25,
      r: ((spell.areaRadiusFeet ?? 20) / FEET_PER_GRID_SQUARE) * config.cellSize,
      spellName: spell.name,
      zoneId: `${stepIndex}:${spell.name}`
    }
  ]
}

function computeCastLine(
  meta: WizardBattleDemoMeta,
  step: WizardBattleDemoStep,
  config: LayoutConfig
): CastLineLayout | null {
  const spell = step.cue.spell
  if (spell === undefined) return null
  const origin = meta.combatants[spell.casterId]?.gridPosition
  if (origin === undefined) return null
  const target =
    spell.areaCenter ?? (spell.targetId === undefined ? undefined : meta.combatants[spell.targetId]?.gridPosition)
  if (target === undefined) return null
  const from = gridToPixel(origin, config)
  const to = gridToPixel(target, config)
  return { color: spell.color, x1: from.cx, x2: to.cx, y1: from.cy, y2: to.cy }
}

function gridToPixel(position: BattleGridPosition, config: LayoutConfig): { readonly cx: number; readonly cy: number } {
  return {
    cx: position.col * config.cellSize + config.cellSize / 2,
    cy: position.row * config.cellSize + config.cellSize / 2
  }
}
