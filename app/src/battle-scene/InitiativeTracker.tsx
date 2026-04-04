import type { CreatureSnapshot } from "./scene-snapshot.ts"

export function InitiativeTracker({ creatures, round }: { creatures: ReadonlyArray<CreatureSnapshot>; round: number }) {
  return (
    <div className="flex flex-col gap-0.5 w-36 shrink-0 bg-gray-900/80 backdrop-blur-sm rounded-lg p-1.5">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-2 mb-0.5">Round {round}</div>
      {creatures.map((c) => {
        const ko = c.unconscious && !c.dead
        const active = c.isActive && !c.dead && !ko
        return (
          <div
            key={c.id}
            className={[
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
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
            <span
              className={[
                "tabular-nums text-[10px] shrink-0",
                c.dead ? "text-gray-600" : ko ? "text-gray-500" : "text-gray-400"
              ].join(" ")}
            >
              {c.dead ? "\u2620" : `${c.currentHp}/${c.maxHp}`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
