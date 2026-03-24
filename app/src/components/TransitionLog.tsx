import { memo, useMemo } from "react"

import { useT } from "#/i18n.ts"
import type { DndEvent, DndSnapshot } from "#/machine.ts"

type StateKey = "conscious" | "dying" | "stable" | "dead"

export interface LogEntry {
  id: number
  event: DndEvent
  fromState: StateKey
  toState: StateKey
}

export function stateKey(snap: DndSnapshot): StateKey {
  if (snap.matches({ damageTrack: "dead" })) return "dead"
  if (snap.matches({ damageTrack: { dying: "stable" } })) return "stable"
  if (snap.matches({ damageTrack: "dying" })) return "dying"
  return "conscious"
}

function formatEvent(e: DndEvent): string {
  switch (e.type) {
    case "TAKE_DAMAGE":
      return `TAKE_DAMAGE ${e.amount} ${e.damageType}${e.isCritical ? " crit" : ""}`
    case "HEAL":
      return `HEAL ${e.amount}`
    case "GRANT_TEMP_HP":
      return `GRANT_TEMP_HP ${e.amount}${e.keepOld ? " keepOld" : ""}`
    case "DEATH_SAVE":
      return `DEATH_SAVE d20=${e.d20Roll}`
    case "APPLY_CONDITION":
      return `APPLY ${e.condition}`
    case "REMOVE_CONDITION":
      return `REMOVE ${e.condition}`
    case "ADD_EXHAUSTION":
      return `+EXHAUSTION ${e.levels}`
    case "REDUCE_EXHAUSTION":
      return `-EXHAUSTION ${e.levels}`
    case "START_TURN":
      return "START_TURN"
    case "USE_ACTION":
      return `USE_ACTION ${e.actionType}`
    case "USE_MOVEMENT":
      return `MOVE ${e.feet}ft`
    case "EXPEND_SLOT":
      return `EXPEND_SLOT lv${e.level}`
    case "START_CONCENTRATION":
      return `CONCENTRATE ${e.spellId}`
    case "CONCENTRATION_CHECK":
      return `CON_CHECK ${e.conSaveSucceeded ? "pass" : "fail"}`
    case "SHORT_REST":
      return "SHORT_REST"
    case "LONG_REST":
      return "LONG_REST"
    case "SPEND_HIT_DIE":
      return `SPEND_HD roll=${e.dieRoll}`
    case "APPLY_FALL":
      return `FALL ${e.damageRoll}`
    case "GRAPPLE":
      return `GRAPPLE ${e.contestResult}`
    case "ESCAPE_GRAPPLE":
      return `ESCAPE_GRAPPLE ${e.contestResult}`
    case "SHOVE":
      return `SHOVE ${e.choice} ${e.contestResult}`
    case "APPLY_DEHYDRATION":
      return `DEHYDRATION${e.halfWater ? " half" : ""}${e.conSaveSucceeded ? " pass" : " fail"}`
    case "STABILIZE":
    case "KNOCK_OUT":
    case "USE_BONUS_ACTION":
    case "USE_REACTION":
    case "USE_EXTRA_ATTACK":
    case "STAND_FROM_PRONE":
    case "DROP_PRONE":
    case "MARK_BONUS_ACTION_SPELL":
    case "MARK_NON_CANTRIP_ACTION_SPELL":
    case "RELEASE_GRAPPLE":
    case "EXPEND_PACT_SLOT":
    case "BREAK_CONCENTRATION":
    case "SUFFOCATE":
    case "APPLY_STARVATION":
    case "END_TURN":
      return e.type
    case "ADD_EFFECT":
      return `ADD_EFFECT ${e.spellId}`
    case "REMOVE_EFFECT":
      return `REMOVE_EFFECT ${e.spellId}`
  }
}

const logBtnClass =
  "rounded border border-gray-600 px-2 py-0.5 text-xs font-semibold text-gray-400 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"

export const TransitionLog = memo(function TransitionLog({
  cursor,
  log,
  onClear,
  onJumpTo
}: {
  log: ReadonlyArray<LogEntry>
  cursor: number
  onJumpTo: (index: number) => void
  onClear: () => void
}) {
  const t = useT()
  const reversed = useMemo(() => [...log].reverse(), [log])
  const canUndo = cursor >= 0
  const canRedo = cursor < log.length - 1

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">{t.transitionLog}</h3>
        {log.length > 0 && (
          <div className="flex gap-1">
            <button onClick={() => onJumpTo(cursor - 1)} disabled={!canUndo} className={logBtnClass}>
              {t.btnUndo}
            </button>
            <button onClick={() => onJumpTo(cursor + 1)} disabled={!canRedo} className={logBtnClass}>
              {t.btnRedo}
            </button>
            <button onClick={onClear} className={logBtnClass}>
              {t.btnClear}
            </button>
          </div>
        )}
      </div>
      {log.length === 0 ? (
        <p className="text-xs text-gray-500">{t.logNoEvents}</p>
      ) : (
        <div className="max-h-64 overflow-y-auto text-xs">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-1 pr-2">{t.logColNumber}</th>
                <th className="pb-1 pr-2">{t.logColEvent}</th>
                <th className="pb-1 pr-2">{t.logColFrom}</th>
                <th className="pb-1">{t.logColTo}</th>
              </tr>
            </thead>
            <tbody>
              {reversed.map((entry, revIdx) => {
                const chronIdx = log.length - 1 - revIdx
                const isCurrent = chronIdx === cursor
                const isFuture = chronIdx > cursor
                return (
                  <tr
                    key={entry.id}
                    onClick={() => onJumpTo(chronIdx)}
                    className={`cursor-pointer border-t border-gray-700 transition-colors ${
                      isCurrent ? "bg-amber-400/10" : isFuture ? "opacity-35" : ""
                    } hover:bg-amber-400/5`}
                  >
                    <td className="py-1 pr-2 text-gray-500">
                      {isCurrent ? "\u25B6" : ""} {entry.id}
                    </td>
                    <td className="py-1 pr-2 font-mono">{formatEvent(entry.event)}</td>
                    <td className="py-1 pr-2">{t[entry.fromState]}</td>
                    <td className={`py-1 ${entry.fromState !== entry.toState ? "font-semibold text-amber-400" : ""}`}>
                      {t[entry.toState]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
})
