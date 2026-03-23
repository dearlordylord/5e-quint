import { useSelector } from "@xstate/react"
import { memo, useCallback, useMemo, useState } from "react"
import { createActor } from "xstate"

import { EventPanel } from "#/components/EventPanel.tsx"
import { StatePanel } from "#/components/StatePanel.tsx"
import { I18nContext, type Locale, LocaleContext, messages, useLocale, useT } from "#/i18n.ts"
import type { DndContext, DndEvent, DndSnapshot } from "#/machine.ts"
import { dndMachine } from "#/machine.ts"

const DEFAULT_MAX_HP = 20
const DEFAULT_SPEED = 30

function createInitialActor() {
  const actor = createActor(dndMachine, {
    input: {
      maxHp: DEFAULT_MAX_HP,
      effectiveSpeed: DEFAULT_SPEED,
      movementRemaining: DEFAULT_SPEED,
      extraAttacksRemaining: 1,
      hitDiceRemaining: 5
    }
  })
  actor.start()
  return actor
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
  const [actor] = useState(createInitialActor)
  const snapshot = useSelector(actor, (s: DndSnapshot) => s)
  const ctx: DndContext = snapshot.context
  const send = useCallback((e: DndEvent) => actor.send(e), [actor])

  const localeValue = useMemo(() => ({ locale, setLocale }), [locale])

  return (
    <LocaleContext value={localeValue}>
      <I18nContext value={messages[locale]}>
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-amber-400">{messages[locale].title}</h1>
            <LangToggle />
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StatePanel snapshot={snapshot} ctx={ctx} />
            <MemoEventPanel send={send} />
          </div>
        </div>
      </I18nContext>
    </LocaleContext>
  )
}

const MemoEventPanel = memo(EventPanel)
