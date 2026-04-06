import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { BTN_SM } from "#/components/styles.ts"

import { BattleField } from "./BattleField.tsx"
import type { DiceRollCue } from "./director.ts"
import { directorStep, EMPTY_CUES, EMPTY_DICE_ROLLS } from "./director.ts"
import { InitiativeTracker } from "./InitiativeTracker.tsx"
import { computeLayout } from "./layout.ts"
import { narrate } from "./narrate.ts"
import { type BattleScenario, deriveSnapshot } from "./scene-snapshot.ts"
import { diffSnapshots } from "./snapshot-diff.ts"

const DiceOverlay = lazy(() => import("./dice3d/DiceOverlay.tsx").then((m) => ({ default: m.DiceOverlay })))

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

function getInitialStep(max: number): number {
  const raw = new URLSearchParams(window.location.search).get("step")
  if (raw == null) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n < max ? n : 0
}

const CAST_BAR_FADE_MS = 550
const SPELL_NAME_FADE_MS = 800

export function EmbedBattlePage({ scenario }: { scenario: BattleScenario }) {
  const { events, meta } = scenario
  const [cursor, setCursor] = useState(() => getInitialStep(events.length))
  const [castBarFaded, setCastBarFaded] = useState(false)
  const [spellFaded, setSpellFaded] = useState(false)
  const castBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [diceCues, setDiceCues] = useState<ReadonlyArray<DiceRollCue>>([])
  const [autoPlay, setAutoPlay] = useState(false)

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
      cues: directorStep(events[cursor], currSnap, prevSnap, delta)
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
    setDiceCues(cues.diceRolls)
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
      const url = new URL(window.location.href)
      if (index === 0) url.searchParams.delete("step")
      else url.searchParams.set("step", String(index))
      window.history.replaceState(null, "", url)
    },
    [events.length]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault()
        stepTo(Math.min(cursor + 1, events.length - 1))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        stepTo(Math.max(0, cursor - 1))
      } else if (e.key === "Home") {
        e.preventDefault()
        stepTo(0)
      } else if (e.key === "End") {
        e.preventDefault()
        stepTo(events.length - 1)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [cursor, events.length, stepTo])

  useEffect(() => {
    if (!autoPlay) return
    if (cursor >= events.length - 1) {
      setAutoPlay(false)
      return
    }
    const delayMs = cues.autoAdvanceDelay || 800
    const timer = setTimeout(() => stepTo(cursor + 1), delayMs)
    return () => clearTimeout(timer)
  }, [autoPlay, cursor, events.length, stepTo, cues.autoAdvanceDelay])

  const handleDiceComplete = useCallback(() => setDiceCues(EMPTY_DICE_ROLLS), [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Compact playback controls */}
      <div className="sticky top-0 z-20 bg-gray-900 border-b border-gray-800/50 px-3 py-1.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex gap-1 shrink-0">
            <button onClick={() => stepTo(0)} disabled={cursor <= 0} className={BTN_SM}>
              ⏮
            </button>
            <button onClick={() => stepTo(Math.max(0, cursor - 1))} disabled={cursor <= 0} className={BTN_SM}>
              ◀
            </button>
            <button
              onClick={() => stepTo(Math.min(cursor + 1, events.length - 1))}
              disabled={cursor >= events.length - 1}
              className={BTN_SM}
            >
              ▶
            </button>
            <button
              onClick={() => setAutoPlay((p) => !p)}
              disabled={!autoPlay && cursor >= events.length - 1}
              className={`${BTN_SM} ${autoPlay ? "!border-amber-500 !text-amber-400" : ""}`}
            >
              {autoPlay ? "⏸" : "⏵"}
            </button>
          </div>

          <div className="flex-1 min-w-0 px-2 py-0.5 rounded border border-gray-700/60 bg-gray-800/60 text-[11px] text-gray-300 text-center truncate">
            {snapshot?.activeCreatureId && (
              <span className="text-amber-400 font-semibold mr-1">
                {meta.names[snapshot.activeCreatureId] ?? snapshot.activeCreatureId}:
              </span>
            )}
            {narrate(events[cursor], meta)}
          </div>

          <span className="text-gray-500 font-mono text-[10px] w-14 text-center shrink-0">
            {cursor + 1}/{events.length}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={events.length - 1}
          value={cursor}
          onChange={(e) => stepTo(Number(e.target.value))}
          className="w-full accent-amber-500 h-1"
        />
      </div>

      {/* Battle field — fills remaining space, min-width keeps tokens legible on narrow screens */}
      <div className="flex-1 relative overflow-x-auto">
        {layout && (
          <div className="min-w-[480px]">
            <BattleField layout={layout} />
          </div>
        )}
        {diceCues.length > 0 && (
          <Suspense fallback={null}>
            <DiceOverlay cues={diceCues} onComplete={handleDiceComplete} />
          </Suspense>
        )}
        {snapshot && (
          <div className="absolute top-2 right-2 z-10">
            <InitiativeTracker creatures={snapshot.creatures} round={snapshot.round} />
          </div>
        )}
      </div>
    </div>
  )
}
