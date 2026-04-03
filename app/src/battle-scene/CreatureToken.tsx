import { AnimatePresence, motion } from "motion/react"

import type { CreatureLayout } from "./layout.ts"

export function CreatureToken(props: CreatureLayout) {
  const strokeColor = props.damageFlash
    ? "#ef4444"
    : props.castingGlow
      ? "#a78bfa"
      : props.isReacting
        ? "#fbbf24"
        : props.isActive
          ? "#f8fafc"
          : "#1e293b"
  const strokeWidth = props.damageFlash || props.castingGlow || props.isReacting ? 3 : props.isActive ? 2.5 : 1.5

  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: props.opacity }} transition={{ duration: 0.3 }}>
      {/* Active creature pulsing ring */}
      {props.isActive && (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={props.tokenRadius + 4}
          fill="none"
          stroke="#f8fafc"
          strokeWidth={1}
          strokeDasharray="4 3"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Reacting creature highlight ring */}
      {props.isReacting && (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={props.tokenRadius + 4}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      <motion.circle
        cx={props.cx}
        cy={props.cy}
        r={props.tokenRadius}
        fill={props.teamColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        animate={{ scale: props.justBecameUnconscious ? [1, 1.2, 0.8, 1] : 1 }}
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

      {/* Floating decision/save label */}
      <AnimatePresence>
        {props.floatingLabel && (
          <motion.text
            key={props.floatingLabel}
            x={props.cx}
            y={props.cy - props.tokenRadius - 14}
            textAnchor="middle"
            fill={props.labelTone === "negative" ? "#ef4444" : "#fbbf24"}
            fontSize={12}
            fontWeight="bold"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {props.floatingLabel}
          </motion.text>
        )}
      </AnimatePresence>

      {/* HP bar */}
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

      {/* Slot pips — flash when just spent */}
      {props.slotPips.total > 0 && (
        <g>
          {Array.from({ length: Math.min(props.slotPips.total, 9) }, (_, i) => {
            const filled = i < props.slotPips.filled
            const justLost = props.slotJustSpent && i === props.slotPips.filled
            return (
              <motion.circle
                key={i}
                cx={props.slotPips.x + 3 + i * 5}
                cy={props.slotPips.y + 3}
                r={2}
                fill={filled ? "#a78bfa" : "#374151"}
                animate={justLost ? { fill: ["#a78bfa", "#ef4444", "#374151"] } : {}}
                transition={{ duration: 0.4 }}
              />
            )
          })}
        </g>
      )}
    </motion.g>
  )
}
