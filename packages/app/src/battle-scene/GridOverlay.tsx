import type { LayoutState } from "./battle-scene-layout.ts"

export function GridOverlay({ lines }: { readonly lines: LayoutState["gridLines"] }) {
  return (
    <g className="grid-overlay">
      {lines.map((line, index) => (
        <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#374151" strokeWidth={0.5} />
      ))}
    </g>
  )
}
