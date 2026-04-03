import { motion } from "motion/react"

import type { CreatureLayout } from "./layout.ts"

export function CreatureToken(props: CreatureLayout) {
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: props.opacity }} transition={{ duration: 0.3 }}>
      <motion.circle
        cx={props.cx}
        cy={props.cy}
        r={props.tokenRadius}
        fill={props.teamColor}
        stroke={props.damageFlash ? "#ef4444" : props.castingGlow ? "#a78bfa" : "#1e293b"}
        strokeWidth={props.damageFlash || props.castingGlow ? 3 : 1.5}
        animate={{
          scale: props.justBecameUnconscious ? [1, 1.2, 0.8, 1] : 1
        }}
        transition={{ duration: 0.4 }}
      />

      <text
        x={props.cx}
        y={props.cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={10}
        fontWeight="bold"
        pointerEvents="none"
      >
        {props.label}
      </text>

      <rect
        x={props.hpBar.x}
        y={props.hpBar.y}
        width={props.hpBar.totalWidth}
        height={props.hpBar.height}
        fill="#1e293b"
        rx={1}
      />
      <motion.rect
        x={props.hpBar.x}
        y={props.hpBar.y}
        width={props.hpBar.fillWidth}
        height={props.hpBar.height}
        fill={props.hpBar.color}
        rx={1}
        animate={{ width: props.hpBar.fillWidth }}
        transition={{ duration: 0.3 }}
      />

      {props.tempHpBar && (
        <>
          <rect
            x={props.tempHpBar.x}
            y={props.tempHpBar.y}
            width={props.tempHpBar.totalWidth}
            height={props.tempHpBar.height}
            fill="#1e293b"
            rx={1}
          />
          <rect
            x={props.tempHpBar.x}
            y={props.tempHpBar.y}
            width={props.tempHpBar.fillWidth}
            height={props.tempHpBar.height}
            fill={props.tempHpBar.color}
            rx={1}
          />
        </>
      )}

      {props.castBar && (
        <>
          <rect
            x={props.castBar.x}
            y={props.castBar.y}
            width={props.castBar.totalWidth}
            height={props.castBar.height}
            fill="#1e293b"
            rx={1}
          />
          <motion.rect
            x={props.castBar.x}
            y={props.castBar.y}
            height={props.castBar.height}
            fill={props.castBar.color}
            rx={1}
            initial={{ width: 0 }}
            animate={{ width: props.castBar.fillWidth }}
            transition={{ duration: 0.5 }}
          />
        </>
      )}

      {props.slotPips.total > 0 && (
        <g>
          {Array.from({ length: Math.min(props.slotPips.total, 9) }, (_, i) => (
            <circle
              key={i}
              cx={props.slotPips.x + 3 + i * 5}
              cy={props.slotPips.y + 3}
              r={2}
              fill={i < props.slotPips.filled ? "#a78bfa" : "#374151"}
            />
          ))}
        </g>
      )}
    </motion.g>
  )
}
