import { creatureMachine } from "#/machine.ts"

import { SubMachineViz } from "./MachineViz.tsx"

const VALID_REGIONS = new Set(["damageTrack", "turnPhase", "spellcasting"])

function getRegion(): string {
  const raw = new URLSearchParams(window.location.search).get("region")
  return raw && VALID_REGIONS.has(raw) ? raw : "damageTrack"
}

export function EmbedMachineVizPage() {
  const region = getRegion()

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <SubMachineViz machine={creatureMachine} stateId={region} activeStateKey="" activeEvent="" />
    </div>
  )
}
