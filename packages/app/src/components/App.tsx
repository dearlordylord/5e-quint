import { CLASS_NAMES, type ClassName, singleClassHitDice } from "@dnd/core/features/class-tables.ts"
import type { BridgeResult } from "@dnd/core/features/feature-bridge.ts"
import { creatureMachine, type DndSnapshot } from "@dnd/core/machine.ts"
import type { DndContext, DndEvent, DndMachineInput } from "@dnd/core/machine-types.ts"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createActor } from "xstate"

import { EventPanel } from "#/components/EventPanel.tsx"
import { FeaturePanel } from "#/components/FeaturePanel.tsx"
import { PageShell } from "#/components/PageShell.tsx"
import { StatePanel } from "#/components/StatePanel.tsx"
import { type LogEntry, stateKey, TransitionLog } from "#/components/TransitionLog.tsx"
import { type FeatureConfig, useFeatures } from "#/features/useFeatures.ts"
import { I18nContext, type Locale, LocaleContext, messages, useLocale, useT } from "#/i18n.ts"

const DEFAULT_MAX_HP = 20
export const DEFAULT_SPEED = 30
const DEFAULT_CLASS_LEVEL = 5
const INITIAL_CURSOR = -1

function getClassFromUrl(): ClassName {
  const raw = new URLSearchParams(window.location.search).get("class") ?? "fighter"
  return CLASS_NAMES.includes(raw as ClassName) ? (raw as ClassName) : "fighter"
}

export const DEFAULT_HIT_DICE = singleClassHitDice(getClassFromUrl(), DEFAULT_CLASS_LEVEL)

const FEATURE_CONFIG: FeatureConfig = {
  className: getClassFromUrl(),
  level: DEFAULT_CLASS_LEVEL,
  strMod: 3,
  profBonus: 3
}

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
): { actor: ReturnType<typeof createActor<typeof creatureMachine>>; snapshot: DndSnapshot } {
  const actor = createActor(creatureMachine, { input })
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

  const actorRef = useRef<ReturnType<typeof createActor<typeof creatureMachine>> | null>(null)
  const [snapshot, setSnapshot] = useState<DndSnapshot | null>(null)
  const [log, setLog] = useState<Array<LogEntry>>([])
  const [cursor, setCursor] = useState(INITIAL_CURSOR)
  const logIdRef = useRef(0)
  const cursorRef = useRef(INITIAL_CURSOR)
  const logRef = useRef<Array<LogEntry>>([])

  const features = useFeatures(FEATURE_CONFIG, snapshot)
  const { dispatch: dispatchFeature, notify: notifyFeatures, resetToInitial } = features
  // Ref breaks a circular dependency: `send` needs to call `notifyFeatures` after
  // dispatching, but `send` is defined before `useFeatures` runs. The ref lets `send`
  // call whatever `notifyFeatures` points to at invocation time.
  // TODO: find a cleaner way to wire feature notifications without the ref indirection.
  const notifyFeaturesRef = useRef<((event: DndEvent) => void) | null>(null)
  // eslint-disable-next-line functional/immutable-data
  notifyFeaturesRef.current = notifyFeatures

  const updateCursor = useCallback((val: number) => {
    // eslint-disable-next-line functional/immutable-data
    cursorRef.current = val
    setCursor(val)
  }, [])

  const initActor = useCallback(
    (input: DndMachineInput) => {
      actorRef.current?.stop()
      const actor = createActor(creatureMachine, { input })
      actor.subscribe(setSnapshot)
      actor.start()
      // eslint-disable-next-line functional/immutable-data
      actorRef.current = actor
      setSnapshot(actor.getSnapshot())
      // eslint-disable-next-line functional/immutable-data
      logRef.current = []
      setLog([])
      updateCursor(INITIAL_CURSOR)
      // eslint-disable-next-line functional/immutable-data
      logIdRef.current = 0
    },
    [updateCursor]
  )

  useEffect(() => {
    initActor(DEFAULT_INPUT)
    return () => {
      actorRef.current?.stop()
    }
  }, [initActor])

  const appendLogEntry = useCallback(
    (event: DndEvent, featureAction?: BridgeResult["featureAction"]) => {
      if (!actorRef.current) return
      const before = stateKey(actorRef.current.getSnapshot())
      actorRef.current.send(event)
      const after = stateKey(actorRef.current.getSnapshot())
      const newEntry: LogEntry = {
        // eslint-disable-next-line functional/immutable-data
        id: ++logIdRef.current,
        event,
        fromState: before,
        toState: after,
        ...(featureAction ? { featureAction } : {})
      }
      const truncateAt = cursorRef.current + 1
      const nextLog = [...logRef.current.slice(0, truncateAt), newEntry]
      // eslint-disable-next-line functional/immutable-data
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
      if (targetIndex < INITIAL_CURSOR || targetIndex >= currentLog.length) return
      actorRef.current?.stop()
      const eventsToReplay = currentLog.slice(0, targetIndex + 1).map((e) => e.event)
      const { actor, snapshot: newSnap } = replayEvents(DEFAULT_INPUT, eventsToReplay)
      actor.subscribe(setSnapshot)
      // eslint-disable-next-line functional/immutable-data
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
        <PageShell title={messages[locale].title} actions={<LangToggle />}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <StatePanel snapshot={snapshot} ctx={ctx} />
            <MemoEventPanel send={send} snapshot={snapshot} rageResistances={features.rageResistances} />
            <FeaturePanel features={features} config={FEATURE_CONFIG} onFeatureAction={onFeatureAction} />
            <TransitionLog log={log} cursor={cursor} onJumpTo={jumpTo} onClear={onClear} />
          </div>
        </PageShell>
      </I18nContext>
    </LocaleContext>
  )
}

const MemoEventPanel = memo(EventPanel)
