import { AoEZone } from "./AoEZone.tsx"
import type { LayoutState } from "./battle-scene-layout.ts"
import { CastLine } from "./CastLine.tsx"
import { CreatureToken } from "./CreatureToken.tsx"
import { GridOverlay } from "./GridOverlay.tsx"
import { InterruptOverlay } from "./InterruptOverlay.tsx"
import { SpellAnnouncement } from "./SpellAnnouncement.tsx"

export function BattleField({ layout }: { readonly layout: LayoutState }) {
  return (
    <svg
      viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
      className="w-full max-w-3xl rounded-xl border border-gray-700 bg-gray-900"
    >
      <GridOverlay lines={layout.gridLines} />
      {layout.aoeZones.map((zone) => (
        <AoEZone key={zone.zoneId} {...zone} />
      ))}
      <CastLine line={layout.castLine} />
      {layout.creatures.map((creature) => (
        <CreatureToken key={creature.id} {...creature} />
      ))}
      <SpellAnnouncement announcement={layout.spellAnnouncement} viewBox={layout.viewBox} />
      <InterruptOverlay {...layout.interruptOverlay} viewBox={layout.viewBox} />
    </svg>
  )
}
