import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { battleMachine } from "#/battle-machine.ts"
import type { BattleEvent } from "#/battle-machine-types.ts"
import { EventLog, type EventLogEntry } from "#/components/EventLog.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { PlaybackControls } from "#/components/PlaybackControls.tsx"

import { BattleField } from "./BattleField.tsx"
import { BattleInspector } from "./BattleInspector.tsx"
import type { DiceRollCue } from "./director.ts"
import { directorStep, EMPTY_CUES, EMPTY_DICE_ROLLS } from "./director.ts"
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
  const [showInspector, setShowInspector] = useState(() => new URLSearchParams(window.location.search).has("inspect"))

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

  const logEntries: ReadonlyArray<EventLogEntry> = useMemo(
    () => events.map((ev) => ({ label: ev.type.replace("BATTLE_", ""), detail: narrate(ev, meta) })),
    [events, meta]
  )

  const handleDiceComplete = useCallback(() => setDiceCues(EMPTY_DICE_ROLLS), [])

  return (
    <PageShell title="Battle Visualizer">
      <div className="flex flex-col items-center">
        <PlaybackControls
          cursor={cursor}
          total={events.length}
          onStepTo={stepTo}
          autoAdvanceDelayMs={cues.autoAdvanceDelay}
        />

        <div className="w-full max-w-3xl mt-3 mb-3 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-sm text-gray-200 text-center min-h-[2.5rem] flex items-center justify-center">
          {snapshot?.activeCreatureId && (
            <span className="text-amber-400 font-semibold mr-2">
              {meta.names[snapshot.activeCreatureId] ?? snapshot.activeCreatureId}:
            </span>
          )}
          {narrate(events[cursor], meta)}
        </div>

        <div className="relative w-full max-w-3xl">
          {layout && <BattleField layout={layout} />}
          {diceCues.length > 0 && (
            <Suspense fallback={null}>
              <DiceOverlay cues={diceCues} onComplete={handleDiceComplete} />
            </Suspense>
          )}
        </div>

        <EventLog entries={logEntries} cursor={cursor} onJumpTo={stepTo} />

        <button
          onClick={() => setShowInspector((v) => !v)}
          className="mt-4 px-3 py-1 text-xs rounded border border-gray-600 text-gray-400 hover:text-gray-200"
        >
          {showInspector ? "Hide Inspector" : "Show Inspector"}
        </button>
        {showInspector && <BattleInspector events={events} cursor={cursor} />}
      </div>
    </PageShell>
  )
}
