import { useState } from "react"

import type { InitiativeCreatureSnapshot } from "./battle-scene-layout.ts"

function SlotPips({ slots }: { readonly slots: InitiativeCreatureSnapshot["slotsByLevel"] }) {
  if (slots.length === 0) return null
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
      {slots.map((slot, slotIndex) => (
        <div key={slotIndex} className="flex items-center gap-0.5">
          <span className="text-gray-500 text-[9px]">L{slot.level}</span>
          {Array.from({ length: slot.max }, (_, pipIndex) => (
            <div
              key={pipIndex}
              className={["w-1.5 h-1.5 rounded-full", pipIndex < slot.current ? "bg-violet-400" : "bg-gray-600"].join(
                " "
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SpellList({
  hasCounterspell,
  spells
}: {
  readonly spells: ReadonlyArray<string>
  readonly hasCounterspell: boolean
}) {
  if (spells.length === 0) return null
  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {spells.map((spell) => (
        <span
          key={spell}
          className={[
            "px-1 py-px rounded text-[9px] leading-tight",
            spell === "counterspell"
              ? hasCounterspell
                ? "bg-amber-500/30 text-amber-300"
                : "bg-gray-700 text-gray-500 line-through"
              : "bg-gray-700/60 text-gray-400"
          ].join(" ")}
        >
          {spell.replace(/_/g, " ")}
        </span>
      ))}
    </div>
  )
}

export function InitiativeTracker({
  creatures,
  round
}: {
  readonly creatures: ReadonlyArray<InitiativeCreatureSnapshot>
  readonly round: number
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-0.5 w-44 shrink-0 bg-gray-900/80 backdrop-blur-sm rounded-lg p-1.5">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-0.5">Round {round}</div>
      {creatures.map((creature) => {
        const knockedOut = creature.unconscious && !creature.dead
        const active = creature.isActive && !creature.dead && !knockedOut
        const reacting = creature.isReacting && !creature.dead && !knockedOut
        const expanded = expandedId === creature.id
        const hasCounterspell = creature.preparedSpells.includes("counterspell")
        return (
          <div key={creature.id}>
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : creature.id)}
              className={[
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors w-full text-left cursor-pointer",
                reacting
                  ? "bg-violet-500/20 border border-violet-500/60"
                  : active
                    ? "bg-amber-500/20 border border-amber-500/50"
                    : "border border-transparent",
                creature.dead ? "opacity-30" : knockedOut ? "opacity-50" : ""
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div
                className={[
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  reacting ? "bg-violet-300" : active ? "bg-amber-400" : "bg-transparent"
                ].join(" ")}
              />
              <div
                className={[
                  "w-2 h-2 rounded-full shrink-0",
                  creature.team === "blue" ? "bg-blue-400" : "bg-red-400",
                  creature.dead || knockedOut ? "grayscale" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
              <span
                className={[
                  "truncate flex-1",
                  reacting
                    ? "text-violet-200 font-semibold"
                    : active
                      ? "text-amber-300 font-semibold"
                      : "text-gray-300",
                  creature.dead ? "line-through text-gray-600" : knockedOut ? "text-gray-500" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {creature.name}
              </span>
              {hasCounterspell && creature.reactionAvailable && (
                <span className="text-[8px] font-bold text-amber-400 shrink-0" title="Counterspell ready">
                  CS
                </span>
              )}
              <span
                className={[
                  "tabular-nums text-[10px] shrink-0",
                  creature.dead ? "text-gray-600" : knockedOut ? "text-gray-500" : "text-gray-400"
                ].join(" ")}
              >
                {creature.dead ? "dead" : `${creature.currentHp}/${creature.maxHp}`}
              </span>
              {!creature.dead && (
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
            {expanded && !creature.dead && (
              <div className="px-2 pb-1 pt-0.5">
                <SpellList
                  spells={creature.preparedSpells}
                  hasCounterspell={hasCounterspell && creature.reactionAvailable}
                />
                <SlotPips slots={creature.slotsByLevel} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
