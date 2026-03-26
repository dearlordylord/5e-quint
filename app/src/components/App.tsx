import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { EventPanel } from "#/components/EventPanel.tsx"
import { FeaturePanel } from "#/components/FeaturePanel.tsx"
import { StatePanel } from "#/components/StatePanel.tsx"
import { type LogEntry, stateKey, TransitionLog } from "#/components/TransitionLog.tsx"
import type { BridgeResult } from "#/features/feature-bridge.ts"
import { type FeatureConfig, useFeatures } from "#/features/useFeatures.ts"
import { I18nContext, type Locale, LocaleContext, messages, useLocale, useT } from "#/i18n.ts"
import { dndMachine, type DndSnapshot } from "#/machine.ts"
import type { DndContext, DndEvent, DndMachineInput } from "#/machine-types.ts"

const DEFAULT_MAX_HP = 20
export const DEFAULT_SPEED = 30
export const DEFAULT_HIT_DICE = 5

const FEATURE_CONFIG: FeatureConfig = { className: "fighter", level: 5 }

const DEFAULT_INPUT: DndMachineInput = {
  maxHp: DEFAULT_MAX_HP,
  effectiveSpeed: DEFAULT_SPEED,
  movementRemaining: DEFAULT_SPEED,
  extraAttacksRemaining: 1,
  hitDiceRemaining: DEFAULT_HIT_DICE
}

function replayEvents(
  input: DndMachineInput,
  events: ReadonlyArray<DndEvent>
): { actor: ReturnType<typeof createActor<typeof dndMachine>>; snapshot: DndSnapshot } {
  const actor = createActor(dndMachine, { input })
  actor.start()
  for (const ev of events) {
    actor.send(ev)
  }
  return { actor, snapshot: actor.getSnapshot() }
}

function LangToggle() {
  const { locale, setLocale } = useLocale()
  const t = useT()
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "ru" : "en")}
      className="rounded bg-gray-700 px-3 py-1 text-sm text-white hover:bg-gray-600"
    >
      {t.lang}: {locale.toUpperCase()}
    </button>
  )
}

export function App() {
  const [locale, setLocale] = useState<Locale>("en")

  const actorRef = useRef<ReturnType<typeof createActor<typeof dndMachine>> | null>(null)
  const [snapshot, setSnapshot] = useState<DndSnapshot | null>(null)
  const [log, setLog] = useState<Array<LogEntry>>([])
  const [cursor, setCursor] = useState(-1)
  const logIdRef = useRef(0)
  const cursorRef = useRef(-1)
  const logRef = useRef<Array<LogEntry>>([])

  const features = useFeatures(FEATURE_CONFIG, snapshot)
  const { resetToInitial, notify: notifyFeatures, dispatch: dispatchFeature } = features
  // Ref breaks a circular dependency: `send` needs to call `notifyFeatures` after
  // dispatching, but `send` is defined before `useFeatures` runs. The ref lets `send`
  // call whatever `notifyFeatures` points to at invocation time.
  // TODO: find a cleaner way to wire feature notifications without the ref indirection.
  const notifyFeaturesRef = useRef<((event: DndEvent) => void) | null>(null)
  notifyFeaturesRef.current = notifyFeatures

  const updateCursor = useCallback((val: number) => {
    cursorRef.current = val
    setCursor(val)
  }, [])

  const initActor = useCallback(
    (input: DndMachineInput) => {
      actorRef.current?.stop()
      const actor = createActor(dndMachine, { input })
      actor.subscribe(setSnapshot)
      actor.start()
      actorRef.current = actor
      setSnapshot(actor.getSnapshot())
      logRef.current = []
      setLog([])
      updateCursor(-1)
      logIdRef.current = 0
    },
    [updateCursor]
  )

  useEffect(() => {
    initActor(DEFAULT_INPUT)
    return () => {
      actorRef.current?.stop()
    }
  }, [])

  const appendLogEntry = useCallback(
    (event: DndEvent, featureAction?: BridgeResult["featureAction"]) => {
      if (!actorRef.current) return
      const before = stateKey(actorRef.current.getSnapshot())
      actorRef.current.send(event)
      const after = stateKey(actorRef.current.getSnapshot())
      const newEntry: LogEntry = {
        id: ++logIdRef.current,
        event,
        fromState: before,
        toState: after,
        ...(featureAction ? { featureAction } : {})
      }
      const truncateAt = cursorRef.current + 1
      const nextLog = [...logRef.current.slice(0, truncateAt), newEntry]
      logRef.current = nextLog
      setLog(nextLog)
      updateCursor(truncateAt)
    },
    [updateCursor]
  )

  const send = useCallback(
    (event: DndEvent) => {
      appendLogEntry(event)
      notifyFeaturesRef.current?.(event)
    },
    [appendLogEntry]
  )

  const onFeatureAction = useCallback(
    (result: BridgeResult) => {
      for (let i = 0; i < result.machineEvents.length; i++) {
        const event = result.machineEvents[i]
        appendLogEntry(event, i === 0 ? result.featureAction : undefined)
      }
    },
    [appendLogEntry]
  )

  const jumpTo = useCallback(
    (targetIndex: number) => {
      const currentLog = logRef.current
      if (targetIndex < -1 || targetIndex >= currentLog.length) return
      actorRef.current?.stop()
      const eventsToReplay = currentLog.slice(0, targetIndex + 1).map((e) => e.event)
      const { actor, snapshot: newSnap } = replayEvents(DEFAULT_INPUT, eventsToReplay)
      actor.subscribe(setSnapshot)
      actorRef.current = actor
      setSnapshot(newSnap)
      // Replay feature state
      resetToInitial()
      for (const entry of currentLog.slice(0, targetIndex + 1)) {
        notifyFeatures(entry.event)
        if (entry.featureAction) dispatchFeature(entry.featureAction)
      }
      updateCursor(targetIndex)
    },
    [updateCursor, resetToInitial, notifyFeatures, dispatchFeature]
  )

  const onClear = useCallback(() => {
    initActor(DEFAULT_INPUT)
    resetToInitial()
  }, [initActor, resetToInitial])

  const localeValue = useMemo(() => ({ locale, setLocale }), [locale])

  if (!snapshot) return null

  const ctx: DndContext = snapshot.context

  return (
    <LocaleContext value={localeValue}>
      <I18nContext value={messages[locale]}>
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-amber-400">{messages[locale].title}</h1>
            <LangToggle />
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <StatePanel snapshot={snapshot} ctx={ctx} />
            <MemoEventPanel send={send} snapshot={snapshot} />
            <FeaturePanel features={features} onFeatureAction={onFeatureAction} />
            <TransitionLog log={log} cursor={cursor} onJumpTo={jumpTo} onClear={onClear} />
          </div>
        </div>
      </I18nContext>
    </LocaleContext>
  )
}

const MemoEventPanel = memo(EventPanel)
