import { Option } from "effect"
import { useMemo } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleCreatureState, BattleEvent } from "#/battle-machine-types.ts"
import { SubMachineViz } from "#/components/trace-visualizer/MachineViz.tsx"
import { creatureMachine } from "#/machine.ts"

import type { ScenarioMeta } from "./scene-snapshot.ts"

const CREATURE_REGIONS = ["damageTrack", "turnPhase", "spellcasting"] as const

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

function CreatureStateCard({
  activeEvent,
  cs,
  isActive,
  name
}: {
  name: string
  cs: BattleCreatureState
  isActive: boolean
  activeEvent: string
}) {
  const dt = deriveDamageTrack(cs)
  const tp = deriveTurnPhase(isActive)
  const sc = deriveSpellcasting(cs)

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`font-semibold text-sm ${isActive ? "text-amber-300" : cs.dead ? "text-gray-600" : "text-gray-300"}`}
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
      <div className="flex flex-col gap-1">
        {CREATURE_REGIONS.map((region) => {
          const activeKey = region === "damageTrack" ? dt : region === "turnPhase" ? tp : sc
          return (
            <SubMachineViz
              key={region}
              machine={creatureMachine}
              stateId={region}
              activeStateKey={activeKey}
              activeEvent={isActive ? activeEvent : ""}
            />
          )
        })}
      </div>
    </div>
  )
}

export function BattleInspector({
  cursor,
  events,
  meta
}: {
  events: ReadonlyArray<BattleEvent>
  cursor: number
  meta: ScenarioMeta
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

  return (
    <div className="w-full max-w-4xl flex flex-col gap-4">
      <SubMachineViz
        machine={battleMachine}
        stateId="battle"
        activeStateKey={battleStateKey}
        activeEvent={activeEvent}
      />

      {battleCtx.initiative.map((id) => {
        const cs = battleCtx.creatures.get(id)
        if (!cs) return null
        const isActive = battleCtx.initiative[battleCtx.turnIndex] === id
        return (
          <CreatureStateCard key={id} name={meta.names[id]} cs={cs} isActive={isActive} activeEvent={activeEvent} />
        )
      })}
    </div>
  )
}
