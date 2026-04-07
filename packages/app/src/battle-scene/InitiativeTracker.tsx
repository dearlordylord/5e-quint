import type { CreatureSnapshot } from "@dnd/core/battle-scene/scene-snapshot.ts"
import { useState } from "react"

function SlotPips({ slots }: { slots: CreatureSnapshot["slotsByLevel"] }) {
  if (slots.length === 0) return null
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
      {slots.map((s, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <span className="text-gray-500 text-[9px]">L{i + 1}</span>
          {Array.from({ length: s.max }, (_, j) => (
            <div
              key={j}
              className={["w-1.5 h-1.5 rounded-full", j < s.current ? "bg-violet-400" : "bg-gray-600"].join(" ")}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SpellList({ hasCounterspell, spells }: { spells: ReadonlyArray<string>; hasCounterspell: boolean }) {
  if (spells.length === 0) return null
  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {spells.map((s) => (
        <span
          key={s}
          className={[
            "px-1 py-px rounded text-[9px] leading-tight",
            s === "counterspell"
              ? hasCounterspell
                ? "bg-amber-500/30 text-amber-300"
                : "bg-gray-700 text-gray-500 line-through"
              : "bg-gray-700/60 text-gray-400"
          ].join(" ")}
        >
          {s.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  )
}

export function InitiativeTracker({ creatures, round }: { creatures: ReadonlyArray<CreatureSnapshot>; round: number }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-0.5 w-44 shrink-0 bg-gray-900/80 backdrop-blur-sm rounded-lg p-1.5">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-0.5">Round {round}</div>
      {creatures.map((c) => {
        const ko = c.unconscious && !c.dead
        const active = c.isActive && !c.dead && !ko
        const expanded = expandedId === c.id
        const hasCS = c.preparedSpells.includes("counterspell")
        return (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : c.id)}
              className={[
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors w-full text-left cursor-pointer",
                active ? "bg-amber-500/20 border border-amber-500/50" : "border border-transparent",
                c.dead ? "opacity-30" : ko ? "opacity-50" : ""
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={["w-1.5 h-1.5 rounded-full shrink-0", active ? "bg-amber-400" : "bg-transparent"].join(" ")}
              />
              <div
                className={[
                  "w-2 h-2 rounded-full shrink-0",
                  c.team === "blue" ? "bg-blue-400" : "bg-red-400",
                  c.dead || ko ? "grayscale" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              <span
                className={[
                  "truncate flex-1",
                  active ? "text-amber-300 font-semibold" : "text-gray-300",
                  c.dead ? "line-through text-gray-600" : ko ? "text-gray-500" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {c.name}
              </span>
              {hasCS && c.reactionAvailable && (
                <span className="text-[8px] font-bold text-amber-400 shrink-0" title="Counterspell ready">
                  CS
                </span>
              )}
              <span
                className={[
                  "tabular-nums text-[10px] shrink-0",
                  c.dead ? "text-gray-600" : ko ? "text-gray-500" : "text-gray-400"
                ].join(" ")}
              >
                {c.dead ? "\u2620" : `${c.currentHp}/${c.maxHp}`}
              </span>
              {!c.dead && (
                <svg
                  className={["w-2.5 h-2.5 shrink-0 transition-transform text-gray-500", expanded ? "rotate-180" : ""]
                    .filter(Boolean)
                    .join(" ")}
                  viewBox="0 0 10 10"
                  fill="currentColor"
                >
                  <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              )}
            </button>
            {expanded && !c.dead && (
              <div className="px-2 pb-1 pt-0.5">
                <SpellList spells={c.preparedSpells} hasCounterspell={hasCS && c.reactionAvailable} />
                <SlotPips slots={c.slotsByLevel} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
