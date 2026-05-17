import { motion } from "motion/react"

import type { LayoutState } from "./battle-scene-layout.ts"

type Props = LayoutState["interruptOverlay"] & { readonly viewBox: LayoutState["viewBox"] }

const OVERLAY_DIM_OPACITY = 0.5
const OVERLAY_LABEL_X = 2
const OVERLAY_LABEL_Y_RATIO = 0.055

export function InterruptOverlay({ label, opacity, viewBox }: Props) {
  if (opacity <= 0) return null
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity }} transition={{ duration: 0.2 }}>
      <rect
        x={0}
        y={0}
        width={viewBox.width}
        height={viewBox.height}
        fill="#000"
        opacity={opacity * OVERLAY_DIM_OPACITY}
      />
      {label && (
        <text
          x={viewBox.width / OVERLAY_LABEL_X}
          y={viewBox.height * OVERLAY_LABEL_Y_RATIO}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fbbf24"
          fontSize={28}
          fontWeight="bold"
          letterSpacing={4}
        >
          {label}
        </text>
      )}
    </motion.g>
  )
}
