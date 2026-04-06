import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { EventLog, type EventLogEntry } from "#/components/EventLog.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { BTN_SM } from "#/components/styles.ts"

import { BattleField } from "./BattleField.tsx"
import { BattleInspector } from "./BattleInspector.tsx"
import type { DiceRollCue } from "./director.ts"
import { directorStep, EMPTY_CUES, EMPTY_DICE_ROLLS } from "./director.ts"
import { InitiativeTracker } from "./InitiativeTracker.tsx"
import { InterruptPanel } from "./InterruptPanel.tsx"
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

const CAST_BAR_FADE_MS = 550
const SPELL_NAME_FADE_MS = 800

export function BattlePage({ scenario }: { scenario: BattleScenario }) {
  const { events, meta } = scenario
  const [cursor, setCursor] = useState(0)
  const [castBarFaded, setCastBarFaded] = useState(false)
  const [spellFaded, setSpellFaded] = useState(false)
  const castBarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [diceCues, setDiceCues] = useState<ReadonlyArray<DiceRollCue>>([])
  const [isStuck, setIsStuck] = useState(false)
  const headerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onScroll = () => {
      // Switch to compact only after scrolling past the expanded header's height
      const h = headerRef.current?.offsetHeight ?? 200
      setIsStuck(window.scrollY > h - 40)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const [autoPlay, setAutoPlay] = useState(false)

  const [activeTab, setActiveTab] = useState<"field" | "machine" | "interrupts">(() => {
    const path = window.location.pathname
    if (path === "/battle/machine") return "machine"
    if (path === "/battle/interrupts") return "interrupts"
    return "field"
  })

  const navigateTab = useCallback((tab: "field" | "machine" | "interrupts") => {
    const url = tab === "field" ? "/battle" : `/battle/${tab}`
    window.history.pushState(null, "", url)
    setActiveTab(tab)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname
      if (path === "/battle/machine") setActiveTab("machine")
      else if (path === "/battle/interrupts") setActiveTab("interrupts")
      else setActiveTab("field")
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

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

  // Auto-play
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

  const logEntries: ReadonlyArray<EventLogEntry> = useMemo(
    () => events.map((ev) => ({ label: ev.type.replace("BATTLE_", ""), detail: narrate(ev, meta) })),
    [events, meta]
  )

  const handleDiceComplete = useCallback(() => setDiceCues(EMPTY_DICE_ROLLS), [])

  return (
    <PageShell title="Battle Visualizer">
      <div className="flex flex-col items-center">
        {/* Header: sticky, with two layouts overlaid.
            Expanded always occupies space (visibility:hidden when stuck).
            Compact overlays with position:absolute when stuck.
            Same container height always = no scroll jump. */}
        <div ref={headerRef} className="sticky top-0 z-20 w-full">
          {/* Expanded layout — always in flow for height reservation */}
          <div className={`w-full px-3 pb-2 pt-1 ${isStuck ? "invisible" : ""}`}>
            <div className="w-full max-w-3xl mx-auto">
              <div className="mb-2 flex items-center gap-2">
                <button onClick={() => stepTo(0)} disabled={cursor <= 0} className={BTN_SM}>
                  Reset
                </button>
                <button onClick={() => stepTo(Math.max(0, cursor - 1))} disabled={cursor <= 0} className={BTN_SM}>
                  Prev
                </button>
                <button
                  onClick={() => stepTo(Math.min(cursor + 1, events.length - 1))}
                  disabled={cursor >= events.length - 1}
                  className={BTN_SM}
                >
                  Next
                </button>
                <button
                  onClick={() => setAutoPlay((p) => !p)}
                  disabled={!autoPlay && cursor >= events.length - 1}
                  className={`${BTN_SM} ${autoPlay ? "!border-amber-500 !text-amber-400" : ""}`}
                >
                  {autoPlay ? "Pause" : "Play"}
                </button>
                <span className="ml-auto text-sm text-gray-400">
                  {cursor + 1} / {events.length}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={events.length - 1}
                value={cursor}
                onChange={(e) => stepTo(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="w-full max-w-3xl mx-auto mt-3 mb-3 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-sm text-gray-200 text-center min-h-[2.5rem] flex items-center justify-center">
              {snapshot?.activeCreatureId && (
                <span className="text-amber-400 font-semibold mr-2">
                  {meta.names[snapshot.activeCreatureId] ?? snapshot.activeCreatureId}:
                </span>
              )}
              {narrate(events[cursor], meta)}
            </div>

            <div className="flex justify-center gap-2">
              {(["field", "machine", "interrupts"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => navigateTab(tab)}
                  className={`px-3 py-1 text-xs rounded border ${
                    activeTab === tab
                      ? "border-amber-500 text-amber-400 bg-gray-800"
                      : "border-gray-600 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tab === "field" ? "Field" : tab === "machine" ? "Machine" : "Interrupts"}
                </button>
              ))}
            </div>
          </div>

          {/* Compact layout — overlays when stuck. top-0 + auto height, not inset-0 */}
          {isStuck && (
            <div className="absolute top-0 left-0 right-0 bg-gray-900 border-b border-gray-800/50 px-3 py-1.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex gap-1 shrink-0">
                  {(["field", "machine", "interrupts"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => navigateTab(tab)}
                      className={`px-2 py-0.5 text-[11px] rounded border ${
                        activeTab === tab
                          ? "border-amber-500 text-amber-400 bg-gray-800"
                          : "border-gray-700 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {tab === "field" ? "Field" : tab === "machine" ? "Machine" : "Interrupts"}
                    </button>
                  ))}
                </div>

                <div className="flex-1 min-w-0 px-2 py-0.5 rounded border border-gray-700/60 bg-gray-800/60 text-[11px] text-gray-300 text-center truncate">
                  {snapshot?.activeCreatureId && (
                    <span className="text-amber-400 font-semibold mr-1">
                      {meta.names[snapshot.activeCreatureId] ?? snapshot.activeCreatureId}:
                    </span>
                  )}
                  {narrate(events[cursor], meta)}
                </div>

                <div className="flex items-center gap-1 shrink-0">
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
                  <span className="text-gray-500 font-mono text-[10px] w-14 text-center">
                    {cursor + 1}/{events.length}
                  </span>
                </div>
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
          )}
        </div>

        {activeTab === "field" && (
          <>
            <div className="relative w-full max-w-3xl">
              {layout && <BattleField layout={layout} />}
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
            <EventLog entries={logEntries} cursor={cursor} onJumpTo={stepTo} />
          </>
        )}
        {activeTab === "machine" && (
          <BattleInspector events={events} cursor={cursor} meta={meta} creatureCues={cues.creatureCues} />
        )}
        {activeTab === "interrupts" && <InterruptPanel events={events} cursor={cursor} meta={meta} />}
      </div>
    </PageShell>
  )
}
