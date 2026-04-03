import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { FIREBALL_BATTLE, FIREBALL_BATTLE_META } from "#/demo/fireball-battle.ts"

import { BattleField } from "./BattleField.tsx"
import { BattleLog } from "./BattleLog.tsx"
import { directorStep, EMPTY_CUES } from "./director.ts"
import { computeLayout } from "./layout.ts"
import { deriveSnapshot, type ScenarioMeta } from "./scene-snapshot.ts"
import { diffSnapshots } from "./snapshot-diff.ts"

const META: ScenarioMeta = FIREBALL_BATTLE_META
const EVENTS: ReadonlyArray<BattleEvent> = FIREBALL_BATTLE

function findAoEEventIndex(events: ReadonlyArray<BattleEvent>, upTo: number): string | null {
  for (let i = upTo - 1; i >= 0; i--) {
    if (events[i].type === "BATTLE_CAST_AOE") return String(i)
  }
  return null
}

/** Replay events 0..upTo through a fresh actor, returning contexts at upTo-1 and upTo. */
function replayPair(upTo: number) {
  const actor = createActor(battleMachine)
  actor.start()
  let prevCtx = actor.getSnapshot().context
  for (let i = 0; i <= upTo; i++) {
    if (i === upTo) prevCtx = actor.getSnapshot().context
    actor.send(EVENTS[i])
  }
  return { prevCtx, currCtx: actor.getSnapshot().context }
}

const CAST_BAR_FADE_MS = 550
const SPELL_NAME_FADE_MS = 800

export function BattlePage() {
  const [cursor, setCursor] = useState(-1)
  const [autoPlay, setAutoPlay] = useState(false)
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [castBarFaded, setCastBarFaded] = useState(false)
  const [spellFaded, setSpellFaded] = useState(false)
  const castBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive snapshot + cues from cursor in a single pass (one replay, not three)
  const { cues, snapshot } = useMemo(() => {
    if (cursor < 0) return { snapshot: null, cues: EMPTY_CUES }
    const aoeIdx = findAoEEventIndex(EVENTS, cursor + 1)

    if (cursor === 0) {
      const actor = createActor(battleMachine)
      actor.start()
      actor.send(EVENTS[0])
      return {
        snapshot: deriveSnapshot(actor.getSnapshot().context, META, aoeIdx),
        cues: EMPTY_CUES
      }
    }

    const { currCtx, prevCtx } = replayPair(cursor)
    const prevSnap = deriveSnapshot(prevCtx, META, aoeIdx)
    const currSnap = deriveSnapshot(currCtx, META, aoeIdx)
    const delta = diffSnapshots(prevSnap, currSnap)
    return {
      snapshot: currSnap,
      cues: directorStep(EVENTS[cursor], currSnap, delta)
    }
  }, [cursor])

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

  const stepTo = useCallback((index: number) => {
    if (index < 0 || index >= EVENTS.length) return
    setCursor(index)
  }, [])

  const stepForward = useCallback(() => {
    setCursor((prev) => (prev + 1 < EVENTS.length ? prev + 1 : prev))
  }, [])

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
          if (next >= EVENTS.length) {
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
  }, [])

  // Cleanup autoplay timer on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
    }
  }, [])

  // Keyboard controls: left/right arrows + space for play/pause
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault()
        setCursor((prev) => (prev + 1 < EVENTS.length ? prev + 1 : prev))
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
  }, [toggleAutoPlay])

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
          disabled={cursor >= EVENTS.length - 1}
          className="px-3 py-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-40"
        >
          Next
        </button>
        <button
          onClick={toggleAutoPlay}
          className={`px-3 py-1 rounded ${autoPlay ? "bg-amber-600 hover:bg-amber-500" : "bg-slate-700 hover:bg-slate-600"}`}
        >
          {autoPlay ? "Pause" : "Play"}
        </button>
        <span className="text-sm text-slate-400 self-center">
          Step {cursor + 1} / {EVENTS.length}
        </span>
      </div>

      {layout ? (
        <BattleField layout={layout} />
      ) : (
        <div className="text-slate-500 italic">Press Next or Play to start the battle.</div>
      )}

      <BattleLog events={EVENTS} cursor={cursor} onJumpTo={stepTo} />
    </div>
  )
}
