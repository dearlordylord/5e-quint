import { Option } from "effect"
import { useEffect, useRef, useState } from "react"
import type { AnyActorRef, Observer } from "xstate"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleCreatureState, BattleEvent } from "#/battle-machine-types.ts"
import { dndMachine } from "#/machine.ts"
import { resourceCount } from "#/types.ts"

import type { ScenarioMeta } from "./scene-snapshot.ts"

// eslint-disable-next-line @typescript-eslint/no-explicit-any, functional/no-mixed-types
type InspectorHandle = { readonly inspect: Observer<any>; readonly stop: () => void }

/**
 * Send creature-level events to a dndMachine actor to approximate the
 * BattleCreatureState. This isn't a perfect replay — it's a best-effort
 * sync so the iframe inspector shows meaningful state machine positions.
 */
function syncCreatureActor(actor: AnyActorRef, cs: BattleCreatureState, isActive: boolean) {
  // Enter combat
  actor.send({ type: "ENTER_COMBAT" })

  // If active creature, start their turn
  if (isActive) {
    actor.send({
      type: "START_TURN",
      effectiveSpeed: cs.effectiveSpeed,
      extraAttacks: cs.extraAttacksRemaining,
      bonusMovement: cs.bonusMovementRemaining,
      bonusMovementOAFree: cs.bonusMovementOAFree
    })
  }

  // Apply damage to match HP
  const hpLost = cs.maxHp - cs.hp
  if (hpLost > 0) {
    actor.send({
      type: "TAKE_DAMAGE",
      amount: hpLost,
      damageType: "bludgeoning" as const,
      isCritical: false,
      resistances: [],
      vulnerabilities: [],
      immunities: []
    })
  }

  // Handle death saves if dying
  if (cs.hp <= 0 && cs.unconscious && !cs.dead) {
    // Already at 0 HP from damage above — now in dying state
    if (cs.stable) {
      actor.send({ type: "STABILIZE" })
    }
  }

  // Start concentration if applicable
  if (Option.isSome(cs.concentrationSpellId)) {
    actor.send({
      type: "START_CONCENTRATION",
      spellId: cs.concentrationSpellId.value
    })
  }
}

export function BattleIframeInspector({
  cursor,
  events,
  meta
}: {
  events: ReadonlyArray<BattleEvent>
  cursor: number
  meta: ScenarioMeta
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const inspectorRef = useRef<InspectorHandle | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const iframe = iframeRef.current
    void import("@statelyai/inspect").then(({ createBrowserInspector }) => {
      if (cancelled || !iframe) return
      inspectorRef.current = createBrowserInspector({ iframe })
      // createBrowserInspector sets iframe.src to stately.ai/inspect (async navigation).
      // Listen for load to know when the inspector UI is ready to receive events.
      iframe.addEventListener(
        "load",
        () => {
          if (!cancelled) setReady(true)
        },
        { once: true }
      )
      // Timeout fallback: if stately.ai is unreachable, proceed anyway after 8s.
      // Events will be lost but at least the UI won't hang forever.
      setTimeout(() => {
        if (!cancelled) setReady(true)
      }, 8000)
    })
    return () => {
      cancelled = true
      inspectorRef.current?.stop()
      inspectorRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !inspectorRef.current) return
    const inspect = inspectorRef.current.inspect
    const actors: Array<AnyActorRef> = []

    // 1. Replay battle to get context at cursor
    const battleActor = createActor(battleMachine, { inspect, systemId: "battle" })
    actors.push(battleActor)
    battleActor.start()
    for (let i = 0; i <= cursor && i < events.length; i++) {
      battleActor.send(events[i])
    }
    const ctx = battleActor.getSnapshot().context

    // 2. Spawn a dndMachine actor per creature
    for (const id of ctx.initiative) {
      const cs = ctx.creatures.get(id)
      if (!cs) continue
      const name = meta.names[id]
      const isActive = ctx.initiative[ctx.turnIndex] === id

      const creatureActor = createActor(dndMachine, {
        inspect,
        systemId: name,
        input: {
          maxHp: cs.maxHp,
          creatureKind: cs.creatureKind,
          effectiveSpeed: cs.effectiveSpeed,
          extraAttacksRemaining: cs.extraAttacksRemaining,
          legendaryActionsRemaining: resourceCount(cs.legendaryActionsRemaining),
          legendaryResistancesRemaining: resourceCount(cs.legendaryResistancesRemaining)
        }
      })
      actors.push(creatureActor)
      creatureActor.start()
      syncCreatureActor(creatureActor, cs, isActive)
    }

    return () => {
      for (const a of actors) a.stop()
    }
  }, [ready, cursor, events, meta])

  return (
    <div className="relative w-full max-w-4xl">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700 z-10">
          <span className="text-gray-400 text-sm">Loading stately.ai inspector...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        data-xstate
        title="XState Inspector"
        className="w-full border border-gray-700 rounded-lg bg-gray-900"
        style={{ height: "600px" }}
      />
    </div>
  )
}
