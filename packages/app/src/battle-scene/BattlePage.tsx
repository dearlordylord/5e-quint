import { type BattleState, snapshotBattle } from "@dnd/battle-runtime"
import { useMemo } from "react"

import { PageShell } from "#/components/PageShell.tsx"

import type { BattleSnapshotSceneMeta } from "./stat-block-battle-demo.ts"

const BATTLE_GRID_SIDE = 8
const BATTLE_GRID_CELL_COUNT = BATTLE_GRID_SIDE * BATTLE_GRID_SIDE

export function BattlePage({ meta, state }: { readonly state: BattleState; readonly meta: BattleSnapshotSceneMeta }) {
  const snapshot = useMemo(() => snapshotBattle(state), [state])
  const currentActor = snapshot.combatants.find((combatant) => combatant.combatantId === snapshot.currentActorId)

  return (
    <PageShell title="Battle Visualizer">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-lg border border-gray-800 bg-gray-900/80 p-5">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 pb-4 text-sm">
            <span className="font-semibold text-amber-300">{currentActor?.displayName ?? snapshot.currentActorId}</span>
            <span className="text-gray-500">Round {snapshot.round}</span>
            <span className="ml-auto text-gray-400">{snapshot.acts.length} acts</span>
          </div>
          <div className="mt-5 grid min-h-96 grid-cols-8 grid-rows-8 overflow-hidden rounded-md border border-gray-800 bg-gray-950">
            {Array.from({ length: BATTLE_GRID_CELL_COUNT }, (_, index) => {
              const row = Math.floor(index / BATTLE_GRID_SIDE) + 1
              const col = (index % BATTLE_GRID_SIDE) + 1
              const combatant = snapshot.combatants.find((candidate) => {
                const position = meta.gridPositions[candidate.combatantId]
                return position?.row === row && position.col === col
              })
              return (
                <div key={`${row}:${col}`} className="relative border border-gray-900/80">
                  {combatant === undefined ? null : (
                    <div className="absolute inset-1 flex items-center justify-center rounded-md border border-amber-500/80 bg-amber-500/20 px-1 text-center text-xs font-medium text-amber-100">
                      {meta.names[combatant.combatantId] ?? combatant.displayName}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
        <aside className="rounded-lg border border-gray-800 bg-gray-900/80 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Initiative</h2>
          <ol className="mt-4 space-y-2">
            {snapshot.combatants.map((combatant) => (
              <li key={combatant.combatantId} className="rounded-md border border-gray-800 bg-black/20 px-3 py-2">
                <p className="font-medium text-gray-100">
                  {meta.names[combatant.combatantId] ?? combatant.displayName}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  HP {combatant.hp}/{combatant.maxHp}
                </p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </PageShell>
  )
}
