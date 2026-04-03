import { useEffect, useRef } from "react"

export interface EventLogEntry {
  label: string
  detail?: string
}

interface EventLogData {
  entries: ReadonlyArray<EventLogEntry>
  cursor: number
}

export interface EventLogProps extends EventLogData {
  onJumpTo: (index: number) => void
}

export function EventLog({ cursor, entries, onJumpTo }: EventLogProps) {
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

  if (entries.length === 0) {
    return (
      <div className="w-full max-w-3xl mt-4 rounded-xl border border-gray-700 bg-gray-800 p-4 text-center text-sm text-gray-500">
        No events yet
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl mt-4">
      <div ref={scrollRef} className="max-h-64 overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 text-xs">
        <table className="w-full">
          <tbody>
            {entries.map((entry, i) => {
              const isCurrent = i === cursor
              const isFuture = i > cursor
              return (
                <tr
                  key={i}
                  ref={(el) => {
                    if (el) rowRefs.current.set(i, el)
                  }}
                  className={`cursor-pointer transition-colors hover:bg-amber-400/5 ${
                    isCurrent ? "bg-amber-400/10" : isFuture ? "opacity-35" : ""
                  }`}
                  onClick={() => onJumpTo(i)}
                >
                  <td className="w-6 px-2 py-1 text-center text-gray-500">{isCurrent ? "\u25B6" : ""}</td>
                  <td className="w-8 px-1 py-1 font-mono text-gray-500">{i}</td>
                  <td className="px-2 py-1 text-gray-300">{entry.label}</td>
                  {entry.detail && <td className="px-2 py-1 text-gray-500">{entry.detail}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
