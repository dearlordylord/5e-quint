import { useEffect, useRef, useState } from "react"
import type { Observer } from "xstate"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any, functional/no-mixed-types
type InspectorHandle = { readonly inspect: Observer<any>; readonly stop: () => void }

export function BattleInspector({ cursor, events }: { events: ReadonlyArray<BattleEvent>; cursor: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const inspectorRef = useRef<InspectorHandle | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void import("@statelyai/inspect").then(({ createBrowserInspector }) => {
      if (cancelled || !iframeRef.current) return
      inspectorRef.current = createBrowserInspector({ iframe: iframeRef.current })
      setReady(true)
    })
    return () => {
      cancelled = true
      inspectorRef.current?.stop()
      inspectorRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !inspectorRef.current) return
    const actor = createActor(battleMachine, { inspect: inspectorRef.current.inspect })
    actor.start()
    for (let i = 0; i <= cursor && i < events.length; i++) {
      actor.send(events[i])
    }
    actor.stop()
  }, [ready, cursor, events])

  return (
    <iframe
      ref={iframeRef}
      data-xstate
      title="XState Inspector"
      className="w-full mt-4 border border-gray-700 rounded-lg bg-gray-900"
      style={{ height: "600px" }}
    />
  )
}
