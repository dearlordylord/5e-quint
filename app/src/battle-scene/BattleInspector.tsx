import { useMemo } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { SubMachineViz } from "#/components/trace-visualizer/MachineViz.tsx"

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

export function BattleInspector({ cursor, events }: { events: ReadonlyArray<BattleEvent>; cursor: number }) {
  const { activeEvent, activeStateKey } = useMemo(() => {
    const snap = replayState(events, cursor)
    const value = snap.value
    // value is "idle" | "ended" | { running: "activeTurn" | ... }
    const stateKey = typeof value === "string" ? value : (Object.values(value)[0] as string)
    return { activeStateKey: stateKey, activeEvent: events[cursor]?.type ?? "" }
  }, [events, cursor])

  return (
    <div className="w-full max-w-3xl">
      <SubMachineViz
        machine={battleMachine}
        stateId="battle"
        activeStateKey={activeStateKey}
        activeEvent={activeEvent}
      />
    </div>
  )
}
