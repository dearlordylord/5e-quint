import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"

import { BattleField } from "./BattleField.tsx"
import { BattleLog } from "./BattleLog.tsx"
import { directorStep, EMPTY_CUES } from "./director.ts"
import { computeLayout } from "./layout.ts"
import { narrate } from "./narrate.ts"
import { type BattleScenario, deriveSnapshot } from "./scene-snapshot.ts"
import { diffSnapshots } from "./snapshot-diff.ts"

function findAoEEventIndex(events: ReadonlyArray<BattleEvent>, upTo: number): string | null {
  for (let i = upTo - 1; i >= 0; i--) {
    if (events[i].type === "BATTLE_CAST_AOE") return String(i)
  }
  return null
}

function replayPair(events: ReadonlyArray<BattleEvent>, upTo: number) {
  const actor = createActor(battleMachine)
  actor.start()
  let prevCtx = actor.getSnapshot().context
  for (let i = 0; i <= upTo; i++) {
    if (i === upTo) prevCtx = actor.getSnapshot().context
    actor.send(events[i])
  }
  return { prevCtx, currCtx: actor.getSnapshot().context }
}

const CAST_BAR_FADE_MS = 550
const SPELL_NAME_FADE_MS = 800

export function BattlePage({ scenario }: { scenario: BattleScenario }) {
  const { events, meta } = scenario
  const [cursor, setCursor] = useState(-1)
  const [autoPlay, setAutoPlay] = useState(false)
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [castBarFaded, setCastBarFaded] = useState(false)
  const [spellFaded, setSpellFaded] = useState(false)
  const castBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { cues, snapshot } = useMemo(() => {
    if (cursor < 0) return { snapshot: null, cues: EMPTY_CUES }
    const aoeIdx = findAoEEventIndex(events, cursor + 1)

    if (cursor === 0) {
      const actor = createActor(battleMachine)
      actor.start()
      actor.send(events[0])
      return {
        snapshot: deriveSnapshot(actor.getSnapshot().context, meta, aoeIdx),
        cues: EMPTY_CUES
      }
    }

    const { currCtx, prevCtx } = replayPair(events, cursor)
    const prevSnap = deriveSnapshot(prevCtx, meta, aoeIdx)
    const currSnap = deriveSnapshot(currCtx, meta, aoeIdx)
    const delta = diffSnapshots(prevSnap, currSnap)
    return {
      snapshot: currSnap,
      cues: directorStep(events[cursor], currSnap, delta)
    }
  }, [cursor, events, meta])

  useEffect(() => {
    setCastBarFaded(false)
    setSpellFaded(false)
    if (castBarTimerRef.current) clearTimeout(castBarTimerRef.current)
    if (spellTimerRef.current) clearTimeout(spellTimerRef.current)
    if (cues.castBar) {
      castBarTimerRef.current = setTimeout(() => setCastBarFaded(true), CAST_BAR_FADE_MS)
    }
    if (cues.spellAnnouncement) {
      spellTimerRef.current = setTimeout(() => setSpellFaded(true), SPELL_NAME_FADE_MS)
    }
    return () => {
      if (castBarTimerRef.current) clearTimeout(castBarTimerRef.current)
      if (spellTimerRef.current) clearTimeout(spellTimerRef.current)
    }
  }, [cues])

  const activeCues = useMemo(() => {
    if (!castBarFaded && !spellFaded) return cues
    return {
      ...cues,
      castBar: castBarFaded ? null : cues.castBar,
      spellAnnouncement: spellFaded ? null : cues.spellAnnouncement
    }
  }, [cues, castBarFaded, spellFaded])

  const layout = useMemo(() => {
    if (!snapshot) return null
    return computeLayout(snapshot, activeCues)
  }, [snapshot, activeCues])

  const stepTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= events.length) return
      setCursor(index)
    },
    [events.length]
  )

  const stepForward = useCallback(() => {
    setCursor((prev) => (prev + 1 < events.length ? prev + 1 : prev))
  }, [events.length])

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      if (prev) {
        if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
        autoPlayRef.current = null
        return false
      }
      const advance = () => {
        setCursor((c) => {
          const next = c + 1
          if (next >= events.length) {
            setAutoPlay(false)
            return c
          }
          autoPlayRef.current = setTimeout(advance, 800)
          return next
        })
      }
      advance()
      return true
    })
  }, [events.length])

  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault()
        setCursor((prev) => (prev + 1 < events.length ? prev + 1 : prev))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        setCursor((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === " ") {
        e.preventDefault()
        toggleAutoPlay()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [toggleAutoPlay, events.length])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-8">
      <h1 className="text-2xl font-bold mb-4">Battle Visualizer</h1>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => stepTo(0)}
          disabled={cursor <= 0}
          className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40"
        >
          Reset
        </button>
        <button
          onClick={() => stepTo(Math.max(0, cursor - 1))}
          disabled={cursor <= 0}
          className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40"
        >
          Prev
        </button>
        <button
          onClick={stepForward}
          disabled={cursor >= events.length - 1}
          className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40"
        >
          Next
        </button>
        <button
          onClick={toggleAutoPlay}
          disabled={!autoPlay && cursor >= events.length - 1}
          className={`px-3 py-1 rounded disabled:opacity-40 ${autoPlay ? "bg-amber-600 hover:bg-amber-500" : "bg-slate-700 hover:bg-slate-600"}`}
        >
          {autoPlay ? "Pause" : "Play"}
        </button>
        <span className="text-sm text-slate-400 self-center">
          Step {cursor + 1} / {events.length}
        </span>
      </div>

      {cursor >= 0 && (
        <div className="w-full max-w-3xl mb-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 text-center min-h-[2.5rem] flex items-center justify-center">
          {snapshot?.activeCreatureId && (
            <span className="text-amber-400 font-semibold mr-2">
              {meta.names[snapshot.activeCreatureId] ?? snapshot.activeCreatureId}:
            </span>
          )}
          {narrate(events[cursor], meta)}
        </div>
      )}

      {layout ? (
        <BattleField layout={layout} />
      ) : (
        <div className="text-slate-500 italic">Press Next or Play to start the battle.</div>
      )}

      <BattleLog events={events} cursor={cursor} onJumpTo={stepTo} />
    </div>
  )
}
