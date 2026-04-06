import { battleMachine } from "#/battle-machine.ts"
import { PageShell } from "#/components/PageShell.tsx"
import { creatureMachine } from "#/machine.ts"

import { SubMachineViz } from "./MachineViz.tsx"

const CREATURE_REGIONS = ["damageTrack", "turnPhase", "spellcasting"] as const

export function FullMachineVizPage() {
  return (
    <PageShell title="Full Machine Visualization">
      {/* Battle machine */}
      <section className="mb-10 max-w-[1800px] mx-auto">
        <h2 className="text-lg font-semibold text-amber-400 mb-3">Battle Machine</h2>
        <p className="text-xs text-gray-500 mb-2">
          3 top-level states, 5 child states under <code>running</code> (activeTurn, awaitingReaction, resolvingAoE,
          resolvingMovement, awaitingLegendaryAction)
        </p>
        <SubMachineViz machine={battleMachine} stateId="battle" activeStateKey="" activeEvent="" />
      </section>

      {/* Creature machine — all 4 parallel regions */}
      <section className="max-w-[1800px] mx-auto">
        <h2 className="text-lg font-semibold text-emerald-400 mb-3">Creature Machine (dnd) — 3 Parallel Regions</h2>
        <p className="text-xs text-gray-500 mb-4">
          Each creature in battle runs one copy of this machine. Regions execute in parallel.
        </p>
        <div className="flex flex-col gap-6">
          {CREATURE_REGIONS.map((region) => (
            <div key={region}>
              <h3 className="text-sm font-semibold text-gray-300 mb-1">{region}</h3>
              <SubMachineViz machine={creatureMachine} stateId={region} activeStateKey="" activeEvent="" />
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
