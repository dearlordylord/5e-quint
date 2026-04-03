import { motion } from "motion/react"

import type { LayoutState } from "./layout.ts"

type Props = LayoutState["interruptOverlay"] & { viewBox: LayoutState["viewBox"] }

export function InterruptOverlay({ label, opacity, viewBox }: Props) {
  if (opacity <= 0) return null
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity }} transition={{ duration: 0.2 }}>
      <rect x={0} y={0} width={viewBox.width} height={viewBox.height} fill="#000" opacity={opacity * 0.5} />
      {label && (
        <text
          x={viewBox.width / 2}
          y={viewBox.height / 2}
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
