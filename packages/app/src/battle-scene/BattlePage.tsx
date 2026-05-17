import { snapshotBattle } from "@dnd/battle-runtime"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { EventLog, type EventLogEntry } from "#/components/EventLog.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { BTN_SM } from "#/components/styles.ts"

import { computeWizardBattleScene } from "./battle-scene-layout.ts"
import { BattleField } from "./BattleField.tsx"
import { InitiativeTracker } from "./InitiativeTracker.tsx"
import type { WizardBattleDemoMeta, WizardBattleDemoStep } from "./wizard-battle-demo.ts"

const FIRST_STEP = 0
const AUTO_ADVANCE_MS = 900
const STICKY_HEADER_FALLBACK_HEIGHT = 200
const STICKY_HEADER_SCROLL_OFFSET = 40

export function BattlePage({
  meta,
  steps
}: {
  readonly steps: readonly [WizardBattleDemoStep, ...Array<WizardBattleDemoStep>]
  readonly meta: WizardBattleDemoMeta
}) {
  const [cursor, setCursor] = useState(() => initialStep(steps.length))
  const [autoPlay, setAutoPlay] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const step = steps[cursor] ?? steps[FIRST_STEP]
  const lastStep = steps.length - 1
  const snapshot = useMemo(() => snapshotBattle(step.state), [step.state])
  const projection = useMemo(
    () => computeWizardBattleScene({ meta, snapshot, step, stepIndex: cursor }),
    [cursor, meta, snapshot, step]
  )
  const logEntries: ReadonlyArray<EventLogEntry> = useMemo(
    () => steps.map((entry) => ({ detail: entry.detail, label: entry.title })),
    [steps]
  )
  const toggleAutoPlay = useCallback(() => setAutoPlay((playing) => !playing), [])

  const stepTo = useCallback(
    (nextCursor: number) => {
      const bounded = Math.max(FIRST_STEP, Math.min(nextCursor, lastStep))
      setCursor(bounded)
      if (typeof window === "undefined") return
      const url = new URL(window.location.href)
      if (bounded === FIRST_STEP) url.searchParams.delete("step")
      else url.searchParams.set("step", String(bounded))
      window.history.replaceState(null, "", url)
    },
    [lastStep]
  )
  const playbackControlProps = {
    autoPlay,
    cursor,
    lastStep,
    onStepTo: stepTo,
    onToggleAutoPlay: toggleAutoPlay,
    stepCount: steps.length
  } as const
  const playbackScrubberProps = { cursor, lastStep, onStepTo: stepTo } as const

  useEffect(() => {
    if (typeof window === "undefined") return
    const onScroll = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? STICKY_HEADER_FALLBACK_HEIGHT
      setIsStuck(window.scrollY > headerHeight - STICKY_HEADER_SCROLL_OFFSET)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!autoPlay) return
    if (cursor >= lastStep) {
      setAutoPlay(false)
      return
    }
    const timeout = setTimeout(() => stepTo(cursor + 1), AUTO_ADVANCE_MS)
    return () => clearTimeout(timeout)
  }, [autoPlay, cursor, lastStep, stepTo])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault()
        stepTo(cursor + 1)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        stepTo(cursor - 1)
      } else if (event.key === "Home") {
        event.preventDefault()
        stepTo(FIRST_STEP)
      } else if (event.key === "End") {
        event.preventDefault()
        stepTo(lastStep)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [cursor, lastStep, stepTo])

  return (
    <PageShell title="Battle Visualizer">
      <div className="flex flex-col items-center">
        <div ref={headerRef} className="sticky top-0 z-20 w-full">
          <div className={`w-full px-3 pb-2 pt-1 ${isStuck ? "invisible" : ""}`}>
            <div className="w-full max-w-3xl mx-auto">
              <PlaybackControls
                {...playbackControlProps}
                className="mb-2 flex items-center gap-2"
                counterClassName="ml-auto text-sm text-gray-400"
              />
              <PlaybackScrubber {...playbackScrubberProps} className="w-full accent-amber-500" />
            </div>

            <div className="w-full max-w-3xl mx-auto mt-3 mb-3 px-4 py-2 rounded-xl border border-gray-700 bg-gray-800 text-sm text-gray-200 text-center min-h-[2.5rem] flex items-center justify-center">
              <span className="text-amber-400 font-semibold mr-2">{projection.activeCreatureName}:</span>
              {step.detail}
            </div>
          </div>

          {isStuck && (
            <div className="absolute top-0 left-0 right-0 bg-gray-900 border-b border-gray-800/50 px-3 py-1.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 min-w-0 px-2 py-0.5 rounded border border-gray-700/60 bg-gray-800/60 text-[11px] text-gray-300 text-center truncate">
                  <span className="text-amber-400 font-semibold mr-1">{projection.activeCreatureName}:</span>
                  {step.detail}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <PlaybackControls
                    {...playbackControlProps}
                    className="flex items-center gap-1"
                    counterClassName="text-gray-500 font-mono text-[10px] w-14 text-center"
                  />
                </div>
              </div>

              <PlaybackScrubber {...playbackScrubberProps} className="w-full accent-amber-500 h-1" />
            </div>
          )}
        </div>

        <div className="relative w-full max-w-3xl">
          <BattleField layout={projection.layout} />
          <div className="absolute top-2 right-2 z-10">
            <InitiativeTracker creatures={projection.initiativeCreatures} round={projection.round} />
          </div>
        </div>
        <EventLog entries={logEntries} cursor={cursor} onJumpTo={stepTo} />
      </div>
    </PageShell>
  )
}

function initialStep(stepCount: number): number {
  if (typeof window === "undefined") return FIRST_STEP
  const raw = new URLSearchParams(window.location.search).get("step")
  if (raw === null) return FIRST_STEP
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= FIRST_STEP && parsed < stepCount ? parsed : FIRST_STEP
}

function PlaybackControls({
  autoPlay,
  className,
  counterClassName,
  cursor,
  lastStep,
  onStepTo,
  onToggleAutoPlay,
  stepCount
}: {
  readonly autoPlay: boolean
  readonly className: string
  readonly counterClassName: string
  readonly cursor: number
  readonly lastStep: number
  readonly onStepTo: (nextCursor: number) => void
  readonly onToggleAutoPlay: () => void
  readonly stepCount: number
}) {
  return (
    <div className={className}>
      <button type="button" onClick={() => onStepTo(FIRST_STEP)} disabled={cursor <= FIRST_STEP} className={BTN_SM}>
        Reset
      </button>
      <button type="button" onClick={() => onStepTo(cursor - 1)} disabled={cursor <= FIRST_STEP} className={BTN_SM}>
        Prev
      </button>
      <button type="button" onClick={() => onStepTo(cursor + 1)} disabled={cursor >= lastStep} className={BTN_SM}>
        Next
      </button>
      <button
        type="button"
        onClick={onToggleAutoPlay}
        disabled={!autoPlay && cursor >= lastStep}
        className={`${BTN_SM} ${autoPlay ? "!border-amber-500 !text-amber-400" : ""}`}
      >
        {autoPlay ? "Pause" : "Play"}
      </button>
      <span className={counterClassName}>
        {cursor + 1} / {stepCount}
      </span>
    </div>
  )
}

function PlaybackScrubber({
  className,
  cursor,
  lastStep,
  onStepTo
}: {
  readonly className: string
  readonly cursor: number
  readonly lastStep: number
  readonly onStepTo: (nextCursor: number) => void
}) {
  return (
    <input
      type="range"
      min={FIRST_STEP}
      max={lastStep}
      value={cursor}
      onChange={(event) => onStepTo(Number(event.target.value))}
      className={className}
    />
  )
}
