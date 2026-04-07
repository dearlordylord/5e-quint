import type { LayoutState } from "@dnd/core/battle-scene/layout.ts"

export function GridOverlay({ lines }: { lines: LayoutState["gridLines"] }) {
  return (
    <g className="grid-overlay">
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#374151" strokeWidth={0.5} />
      ))}
    </g>
  )
}
