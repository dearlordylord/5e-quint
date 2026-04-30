import { battleMachine } from "@dnd/core/battle-machine.ts"
import type { BattleCreatureState, BattleEvent } from "@dnd/core/battle-machine-types.ts"
import type { CreatureCue } from "@dnd/core/battle-scene/director.ts"
import type { ScenarioMeta, SpriteRect } from "@dnd/core/battle-scene/scene-snapshot.ts"
import { creatureMachine } from "@dnd/core/machine.ts"
import { Option } from "effect"
import { useMemo, useState } from "react"
import { createActor } from "xstate"

import { BTN_SM } from "#/components/styles.ts"
import { SubMachineViz } from "#/components/trace-visualizer/MachineViz.tsx"

// turnPhase on top, spellcasting middle, damageTrack (death) at bottom
const CREATURE_REGIONS = ["turnPhase", "spellcasting", "damageTrack"] as const
const DEATH_SPRITE_ROW = 2
const DEATH_SPRITE_COL = 5
const DEATH_SPRITE_X_BIAS = 6
const DEATH_SPRITE_Y_BIAS = 6
const COMPACT_SPRITE_SIZE = 18
const FULL_SPRITE_SIZE = 24
const COMPACT_MAX_TRANSITIONS = 10
const SPRITE_OVERFLOW_DIVISOR = 2

function replayState(events: ReadonlyArray<BattleEvent>, upTo: number) {
  const actor = createActor(battleMachine)
  actor.start()
  for (let i = 0; i <= upTo && i < events.length; i++) {
    actor.send(events[i])
  }
  const snap = actor.getSnapshot()
  actor.stop()
  return snap
}

type BattleInitiative = ReturnType<typeof replayState>["context"]["initiative"]
type BattleInitiativeCreatureId = BattleInitiative["stillToAct"][number]["creature"]

function battleInitiativeCreatureIds(initiative: BattleInitiative): ReadonlyArray<BattleInitiativeCreatureId> {
  return [...initiative.alreadyActed, ...initiative.stillToAct].map((entry) => entry.creature)
}

function activeBattleCreatureId(initiative: BattleInitiative): BattleInitiativeCreatureId {
  return initiative.stillToAct[0].creature
}

function deriveDamageTrack(cs: BattleCreatureState): string {
  if (cs.dead) return "dead"
  if (cs.hp <= 0 && cs.unconscious) return cs.stable ? "stable" : "unstable"
  return "alive"
}

function deriveTurnPhase(isActive: boolean): string {
  if (isActive) return "acting"
  return "waitingForTurn"
}

function deriveSpellcasting(cs: BattleCreatureState): string {
  return Option.isSome(cs.concentrationSpellId) ? "concentrating" : "idle"
}

function SpriteIcon({
  casting,
  dead,
  size,
  sprite
}: {
  sprite: SpriteRect
  size: number
  dead?: boolean
  casting?: boolean
}) {
  const scale = sprite.scale ?? 1
  const unit = (size * scale) / sprite.w
  const row = dead ? DEATH_SPRITE_ROW : casting ? 1 : 0
  const col = dead ? DEATH_SPRITE_COL : 0
  const xBias = dead ? DEATH_SPRITE_X_BIAS : 0
  const yBias = dead ? DEATH_SPRITE_Y_BIAS : 0
  const frameX = sprite.x + col * sprite.w
  const frameY = sprite.y + row * sprite.h
  return (
    <div
      className="rounded-full overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${sprite.url})`,
        backgroundPosition: `-${frameX * unit + (sprite.w * unit - size) / SPRITE_OVERFLOW_DIVISOR + xBias * unit}px -${frameY * unit + (sprite.h * unit - size) / SPRITE_OVERFLOW_DIVISOR + yBias * unit}px`,
        backgroundSize: `${sprite.imgW * unit}px ${sprite.imgH * unit}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated"
      }}
    />
  )
}

function CreatureStateCard({
  activeEvent,
  casting,
  compact,
  cs,
  isActive,
  name,
  sprite
}: {
  name: string
  cs: BattleCreatureState
  isActive: boolean
  activeEvent: string
  compact?: boolean
  sprite?: SpriteRect | null
  casting?: boolean
}) {
  const dt = deriveDamageTrack(cs)
  const tp = deriveTurnPhase(isActive)
  const sc = deriveSpellcasting(cs)

  return (
    <div className={`rounded-lg border border-gray-700 bg-gray-900 ${compact ? "p-1.5" : "p-3"}`}>
      <div className={`flex items-center gap-2 ${compact ? "mb-1" : "mb-2"}`}>
        {sprite && (
          <SpriteIcon
            sprite={sprite}
            size={compact ? COMPACT_SPRITE_SIZE : FULL_SPRITE_SIZE}
            dead={cs.dead || cs.unconscious}
            casting={casting}
          />
        )}
        <span
          className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${isActive ? "text-amber-300" : cs.dead ? "text-gray-600" : "text-gray-300"}`}
        >
          {name}
        </span>
        <span className="text-[10px] text-gray-500">
          HP {cs.hp}/{cs.maxHp}
          {cs.tempHp > 0 && ` +${cs.tempHp}tmp`}
        </span>
        {cs.dead && <span className="text-[10px] text-red-500 font-semibold">DEAD</span>}
        {cs.unconscious && !cs.dead && <span className="text-[10px] text-orange-400 font-semibold">UNCONSCIOUS</span>}
      </div>
      <div className={`flex flex-col ${compact ? "gap-0.5" : "gap-1"}`}>
        {CREATURE_REGIONS.map((region) => {
          const activeKey = region === "damageTrack" ? dt : region === "turnPhase" ? tp : sc
          return (
            <SubMachineViz
              key={region}
              machine={creatureMachine}
              stateId={region}
              activeStateKey={activeKey}
              activeEvent={isActive ? activeEvent : ""}
              maxTransitions={compact ? COMPACT_MAX_TRANSITIONS : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}

export function BattleInspector({
  creatureCues,
  cursor,
  events,
  meta
}: {
  events: ReadonlyArray<BattleEvent>
  cursor: number
  meta: ScenarioMeta
  creatureCues: Partial<Record<string, CreatureCue>>
}) {
  const { activeEvent, battleCtx, battleStateKey } = useMemo(() => {
    const snap = replayState(events, cursor)
    const value = snap.value
    const stateKey = typeof value === "string" ? value : (Object.values(value)[0] as string)
    return {
      battleStateKey: stateKey,
      activeEvent: events[cursor]?.type ?? "",
      battleCtx: snap.context
    }
  }, [events, cursor])

  const [compact, setCompact] = useState(false)
  const initiativeIds = battleInitiativeCreatureIds(battleCtx.initiative)
  const activeCreatureId = activeBattleCreatureId(battleCtx.initiative)

  return (
    <div className={`w-full ${compact ? "" : "max-w-4xl"} flex flex-col gap-4`}>
      <div className="flex items-center gap-2">
        <SubMachineViz
          machine={battleMachine}
          stateId="battle"
          activeStateKey={battleStateKey}
          activeEvent={activeEvent}
        />
        <button
          onClick={() => setCompact((c) => !c)}
          className={BTN_SM}
          title={compact ? "Expand to list" : "Compact grid"}
        >
          {compact ? "↕ Expand" : "↔ Grid"}
        </button>
      </div>

      {compact ? (
        <div className="grid grid-cols-6 gap-1.5">
          {initiativeIds.map((id) => {
            const cs = battleCtx.creatures.get(id)
            if (!cs) return null
            const isActive = activeCreatureId === id
            return (
              <CreatureStateCard
                key={id}
                name={meta.names[id]}
                cs={cs}
                isActive={isActive}
                activeEvent={activeEvent}
                compact
                sprite={meta.sprites?.[id]}
                casting={creatureCues[id]?.castingGlow ?? false}
              />
            )
          })}
        </div>
      ) : (
        initiativeIds.map((id) => {
          const cs = battleCtx.creatures.get(id)
          if (!cs) return null
          const isActive = activeCreatureId === id
          return (
            <CreatureStateCard
              key={id}
              name={meta.names[id]}
              cs={cs}
              isActive={isActive}
              activeEvent={activeEvent}
              sprite={meta.sprites?.[id]}
              casting={creatureCues[id]?.castingGlow ?? false}
            />
          )
        })
      )}
    </div>
  )
}
