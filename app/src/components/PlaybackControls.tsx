import { useCallback, useEffect, useRef, useState } from "react"

interface PlaybackControlsData {
  cursor: number
  total: number
}

export interface PlaybackControlsProps extends PlaybackControlsData {
  onStepTo: (index: number) => void
}

const BTN =
  "rounded border border-gray-600 px-3 py-1 text-sm font-semibold text-gray-300 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30"
const AUTO_PLAY_MS = 800

export function PlaybackControls({ cursor, onStepTo, total }: PlaybackControlsProps) {
  const [autoPlay, setAutoPlay] = useState(false)
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const atStart = cursor <= 0
  const atEnd = cursor >= total - 1

  const stepForward = useCallback(() => onStepTo(Math.min(cursor + 1, total - 1)), [cursor, total, onStepTo])
  const stepBack = useCallback(() => onStepTo(Math.max(0, cursor - 1)), [cursor, onStepTo])

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      if (prev) {
        if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
        autoPlayRef.current = null
        return false
      }
      const advance = () => {
        onStepTo(cursor + 1)
        // Re-schedule handled by effect below
      }
      advance()
      return true
    })
  }, [cursor, onStepTo])

  // Auto-play scheduling
  useEffect(() => {
    if (!autoPlay) return
    if (cursor >= total - 1) {
      setAutoPlay(false)
      return
    }
    autoPlayRef.current = setTimeout(() => onStepTo(cursor + 1), AUTO_PLAY_MS)
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
    }
  }, [autoPlay, cursor, total, onStepTo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
    }
  }, [])

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault()
        onStepTo(Math.min(cursor + 1, total - 1))
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        onStepTo(Math.max(0, cursor - 1))
      } else if (e.key === " ") {
        e.preventDefault()
        toggleAutoPlay()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [cursor, total, onStepTo, toggleAutoPlay])

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-2 flex items-center gap-2">
        <button onClick={() => onStepTo(0)} disabled={atStart} className={BTN}>
          Reset
        </button>
        <button onClick={stepBack} disabled={atStart} className={BTN}>
          Prev
        </button>
        <button onClick={stepForward} disabled={atEnd} className={BTN}>
          Next
        </button>
        <button
          onClick={toggleAutoPlay}
          disabled={!autoPlay && atEnd}
          className={`${BTN} ${autoPlay ? "!border-amber-500 !text-amber-400" : ""}`}
        >
          {autoPlay ? "Pause" : "Play"}
        </button>
        <span className="ml-auto text-sm text-gray-400">
          {cursor + 1} / {total}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={total - 1}
        value={cursor}
        onChange={(e) => onStepTo(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
    </div>
  )
}
