import { creatureMachine } from "#/machine.ts"

import { SubMachineViz } from "./MachineViz.tsx"

const REGIONS = ["damageTrack", "turnPhase", "spellcasting"] as const

export function MachineVizPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <h1 className="text-lg font-bold text-gray-200 mb-4">XState Machine — All Regions</h1>
      <div className="flex flex-col gap-4">
        {REGIONS.map((region) => (
          <SubMachineViz key={region} machine={creatureMachine} stateId={region} activeStateKey="" activeEvent="" />
        ))}
      </div>

      <h1 className="text-lg font-bold text-gray-200 mt-12 mb-4">damageTrack — Isolated</h1>
      <SubMachineViz machine={creatureMachine} stateId="damageTrack" activeStateKey="" activeEvent="" />
    </div>
  )
}
