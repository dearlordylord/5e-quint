import type { CastLineLayout } from "@dnd/core/battle-scene/layout.ts"
import { AnimatePresence, motion } from "motion/react"

export function CastLine({ line }: { line: CastLineLayout | null }) {
  return (
    <AnimatePresence>
      {line && (
        <motion.line
          key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={2}
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.7 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </AnimatePresence>
  )
}
