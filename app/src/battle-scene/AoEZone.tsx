import { motion } from "motion/react"

import type { AoELayout } from "./layout.ts"

export function AoEZone(props: AoELayout) {
  return (
    <motion.g
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
      style={{ transformOrigin: `${props.cx}px ${props.cy}px` }}
    >
      <circle cx={props.cx} cy={props.cy} r={props.r} fill={props.color} opacity={props.opacity} />
      <text
        x={props.cx}
        y={props.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f8fafc"
        fontSize={24}
        fontWeight="bold"
        opacity={0.6}
        pointerEvents="none"
      >
        {props.spellName}
      </text>
    </motion.g>
  )
}
