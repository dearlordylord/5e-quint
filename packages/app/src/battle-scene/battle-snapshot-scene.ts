import type { BattleSnapshot } from "@dnd/battle-runtime"
import type { CreatureCue, VisualCueState } from "@dnd/core/battle-scene/director.ts"
import type { LayoutSceneSnapshot } from "@dnd/core/battle-scene/layout.ts"

export interface PromotedBattleSceneMeta {
  names: Record<string, string>
  teams: { blue: ReadonlyArray<string>; red: ReadonlyArray<string> }
  gridPositions: Record<string, { row: number; col: number }>
  sprites?: Record<string, SpriteRect>
}

export interface SpriteRect {
  url: string
  x: number
  y: number
  w: number
  h: number
  imgW: number
  imgH: number
  scale?: number
}

const EMPTY_CREATURE_CUES: Record<string, CreatureCue> = {}

export const STATIC_BATTLE_CUES: VisualCueState = {
  castBar: null,
  castLineTargetId: null,
  spellAnnouncement: null,
  interruptOverlay: { opacity: 0, label: "" },
  creatureCues: EMPTY_CREATURE_CUES,
  autoAdvanceDelay: 0,
  diceRolls: []
}

export function promotedBattleSceneSnapshot(
  snapshot: BattleSnapshot,
  meta: PromotedBattleSceneMeta
): LayoutSceneSnapshot & { readonly round: number; readonly activeCreatureId: string } {
  const blue = new Set(meta.teams.blue)
  return {
    creatures: snapshot.combatants.map((combatant) => ({
      id: combatant.combatantId,
      name: meta.names[combatant.combatantId] ?? combatant.displayName,
      team: blue.has(combatant.combatantId) ? ("blue" as const) : ("red" as const),
      sprite: meta.sprites?.[combatant.combatantId] ?? null,
      gridPos: meta.gridPositions[combatant.combatantId] ?? { row: 0, col: 0 },
      hpRatio: combatant.maxHp > 0 ? combatant.hp / combatant.maxHp : 0,
      currentHp: combatant.hp,
      maxHp: combatant.maxHp,
      tempHp: combatant.tempHp,
      unconscious: combatant.conditions.includes("unconscious"),
      dead: combatant.zeroHpLifecycle.dead,
      slotsByLevel:
        combatant.origin.kind === "character" && combatant.origin.spellcasting !== null
          ? combatant.origin.spellcasting.spellSlots.map((slot) => ({
              current: slot.count - slot.expended,
              max: slot.count
            }))
          : [],
      deathSaves:
        combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
          ? combatant.zeroHpLifecycle.deathSaves
          : { successes: 0, failures: 0 },
      isActive: combatant.combatantId === snapshot.currentActorId
    })),
    phase:
      snapshot.pendingReaction === null
        ? { type: "activeTurn" as const }
        : {
            type: "interrupt" as const,
            reactorId: snapshot.pendingReaction.decisionHole.eligibleReactors[0]
          },
    aoeZones: [],
    aoeTargetPoint: null,
    round: snapshot.round,
    activeCreatureId: snapshot.currentActorId
  }
}
