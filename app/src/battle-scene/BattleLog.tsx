import { useEffect, useRef } from "react"

import type { BattleEvent } from "#/battle-machine-types.ts"

interface BattleLogData {
  events: ReadonlyArray<BattleEvent>
  cursor: number
}

interface BattleLogProps extends BattleLogData {
  onJumpTo: (index: number) => void
}

export function BattleLog({ cursor, events, onJumpTo }: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map())

  useEffect(() => {
    const row = rowRefs.current.get(cursor)
    const container = scrollRef.current
    if (row && container) {
      const rowTop = row.offsetTop
      const rowHeight = row.offsetHeight
      const containerHeight = container.clientHeight
      const scrollTop = container.scrollTop
      if (rowTop < scrollTop) {
        container.scrollTop = rowTop
      } else if (rowTop + rowHeight > scrollTop + containerHeight) {
        container.scrollTop = rowTop + rowHeight - containerHeight
      }
    }
  }, [cursor])

  return (
    <div className="w-full max-w-3xl mt-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-2">Battle Log</h3>
      <div ref={scrollRef} className="max-h-48 overflow-y-auto bg-slate-800 rounded border border-slate-700 text-xs">
        <table className="w-full">
          <tbody>
            {events.map((ev, i) => (
              <tr
                key={i}
                ref={(el) => {
                  if (el) rowRefs.current.set(i, el)
                }}
                className={`cursor-pointer hover:bg-slate-700 ${
                  i === cursor ? "bg-slate-600 text-white" : i > cursor ? "text-slate-500" : "text-slate-300"
                }`}
                onClick={() => onJumpTo(i)}
              >
                <td className="px-2 py-1 font-mono text-slate-500 w-8">{i}</td>
                <td className="px-2 py-1">{ev.type.replace("BATTLE_", "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
