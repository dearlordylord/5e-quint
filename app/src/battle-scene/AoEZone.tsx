import { motion } from "motion/react"

import type { AoELayout } from "./layout.ts"

export function AoEZone(props: AoELayout) {
  return (
    <motion.circle
      cx={props.cx}
      cy={props.cy}
      r={props.r}
      fill={props.color}
      opacity={props.opacity}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    />
  )
}
