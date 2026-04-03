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
  const r = props.tokenRadius

  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: props.opacity }} transition={{ duration: 0.3 }}>
      {props.isActive && (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={r + 4}
          fill="none"
          stroke="#f8fafc"
          strokeWidth={1}
          strokeDasharray="4 3"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {props.isReacting && (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={r + 4}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      {props.sprite ? (
        <>
          <defs>
            <clipPath id={`clip-${props.id}`}>
              <circle cx={props.cx} cy={props.cy} r={r} />
            </clipPath>
          </defs>
          <foreignObject
            x={props.cx - r}
            y={props.cy - r}
            width={r * 2}
            height={r * 2}
            clipPath={`url(#clip-${props.id})`}
          >
            <div
              style={{
                width: r * 2,
                height: r * 2,
                backgroundImage: `url(${props.sprite.url})`,
                backgroundPosition: `-${(props.sprite.x * (r * 2)) / props.sprite.w}px -${(props.sprite.y * (r * 2)) / props.sprite.w}px`,
                backgroundSize: `${(props.sprite.imgW * (r * 2)) / props.sprite.w}px auto`,
                backgroundRepeat: "no-repeat",
                borderRadius: "50%",
                overflow: "hidden"
              }}
            />
          </foreignObject>
          <circle cx={props.cx} cy={props.cy} r={r} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        </>
      ) : (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={r}
          fill={props.teamColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          animate={{ scale: props.justBecameUnconscious ? [1, 1.2, 0.8, 1] : 1 }}
          transition={{ duration: 0.4 }}
        />
      )}

      <text x={props.cx} y={props.cy + r + 14} textAnchor="middle" fill="#94a3b8" fontSize={8} pointerEvents="none">
        {props.label}
      </text>

      <AnimatePresence>
        {props.floatingLabel && (
          <motion.text
            key={props.floatingLabel}
            x={props.cx}
            y={props.cy - r - 14}
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

      {props.slotRows.map((row) => (
        <g key={row.level}>
          <text x={row.x - 3} y={row.y + 4} fontSize={7} fill="#9ca3af" textAnchor="end" fontFamily="monospace">
            {row.level}
          </text>
          {Array.from({ length: row.total }, (_, i) => {
            const filled = i < row.filled
            const justLost = props.slotJustSpent && i === row.filled
            return (
              <motion.circle
                key={i}
                cx={row.x + 3 + i * 5}
                cy={row.y + 3}
                r={2}
                fill={filled ? "#a78bfa" : "#374151"}
                animate={justLost ? { fill: ["#a78bfa", "#ef4444", "#374151"] } : {}}
                transition={{ duration: 0.4 }}
              />
            )
          })}
        </g>
      ))}

      {props.deathSaves && (
        <g>
          {Array.from({ length: 3 }, (_, i) => (
            <circle
              key={`s${i}`}
              cx={props.deathSaves!.x + 3 + i * 6}
              cy={props.deathSaves!.y + 3}
              r={2.5}
              fill={i < props.deathSaves!.successes ? "#22c55e" : "#374151"}
              stroke="#22c55e"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: 3 }, (_, i) => (
            <circle
              key={`f${i}`}
              cx={props.deathSaves!.x + 22 + i * 6}
              cy={props.deathSaves!.y + 3}
              r={2.5}
              fill={i < props.deathSaves!.failures ? "#ef4444" : "#374151"}
              stroke="#ef4444"
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}
    </motion.g>
  )
}
