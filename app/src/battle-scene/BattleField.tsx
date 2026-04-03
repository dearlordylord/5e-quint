import { AoEZone } from "./AoEZone.tsx"
import { CastLine } from "./CastLine.tsx"
import { CreatureToken } from "./CreatureToken.tsx"
import { GridOverlay } from "./GridOverlay.tsx"
import { InterruptOverlay } from "./InterruptOverlay.tsx"
import type { LayoutState } from "./layout.ts"
import { SpellAnnouncement } from "./SpellAnnouncement.tsx"

export function BattleField({ layout }: { layout: LayoutState }) {
  return (
    <svg
      viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
      className="w-full max-w-3xl border border-slate-700 rounded bg-slate-900"
    >
      <GridOverlay lines={layout.gridLines} />
      {layout.aoeZones.map((z) => (
        <AoEZone key={z.zoneId} {...z} />
      ))}
      <CastLine line={layout.castLine} />
      {layout.creatures.map((c) => (
        <CreatureToken key={c.id} {...c} />
      ))}
      <SpellAnnouncement announcement={layout.spellAnnouncement} viewBox={layout.viewBox} />
      <InterruptOverlay {...layout.interruptOverlay} viewBox={layout.viewBox} />
    </svg>
  )
}
