import { AnimatePresence, motion } from "motion/react"

import type { CreatureLayout } from "./battle-scene-layout.ts"
import type { WizardBattleSprite } from "./wizard-battle-demo.ts"

const ACTIVE_SPRITE_ROW = 1
const DEATH_SPRITE_ROW = 2
const DEATH_SPRITE_COL = 5
const DEATH_SPRITE_X_BIAS = 6
const DEATH_SPRITE_Y_BIAS = 6
const TOKEN_STROKE_EMPHASIS = 3
const TOKEN_STROKE_ACTIVE = 2.5
const TOKEN_STROKE_IDLE = 1.5
const TOKEN_RING_OFFSET = 4
const ACTIVE_RING_OPACITY = [0.3, 0.8, 0.3]
const REACTION_RING_OPACITY = [0.5, 1, 0.5]
const UNCONSCIOUS_SCALE = [1, 1.2, 0.8, 1]
const LABEL_FONT_SIZE = 8
const FLOATING_LABEL_Y_OFFSET = 14
const FLOATING_LABEL_FONT_SIZE = 12
const TOKEN_DIAMETER_MULTIPLIER = 2
const TOKEN_CENTER_DIVISOR = 2
const SLOT_LABEL_X_OFFSET = 3
const SLOT_LABEL_Y_OFFSET = 4
const SLOT_DOT_X_OFFSET = 3
const SLOT_DOT_Y_OFFSET = 3
const SLOT_DOT_SPACING = 5
const SLOT_DOT_RADIUS = 2
const DEATH_SAVE_COUNT = 3
const DEATH_SAVE_Y_OFFSET = 3
const DEATH_SAVE_FIRST_X_OFFSET = 3
const DEATH_SAVE_SECOND_X_OFFSET = 22
const DEATH_SAVE_SPACING = 6
const DEATH_SAVE_RADIUS = 2.5

function spriteBackgroundStyle(sprite: WizardBattleSprite, size: number, row: number, col = 0, xBias = 0, yBias = 0) {
  const scale = sprite.scale ?? 1
  const unit = (size * scale) / sprite.w
  const overflowX = sprite.w * unit - size
  const overflowY = sprite.h * unit - size
  const frameX = sprite.x + col * sprite.w
  const frameY = sprite.y + row * sprite.h
  return {
    backgroundPosition: `-${frameX * unit + overflowX / TOKEN_CENTER_DIVISOR + xBias * unit}px -${
      frameY * unit + overflowY / TOKEN_CENTER_DIVISOR + yBias * unit
    }px`,
    backgroundSize: `${sprite.imgW * unit}px ${sprite.imgH * unit}px`
  }
}

export function CreatureToken(props: CreatureLayout) {
  const strokeColor = props.damageFlash
    ? "#ef4444"
    : props.castingGlow
      ? "#a78bfa"
      : props.isReacting
        ? "#fbbf24"
        : props.isActive
          ? "#f9fafb"
          : "#1f2937"
  const strokeWidth =
    props.damageFlash || props.castingGlow || props.isReacting
      ? TOKEN_STROKE_EMPHASIS
      : props.isActive
        ? TOKEN_STROKE_ACTIVE
        : TOKEN_STROKE_IDLE
  const radius = props.tokenRadius
  const tokenSize = radius * TOKEN_DIAMETER_MULTIPLIER

  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: props.opacity }} transition={{ duration: 0.3 }}>
      {props.isActive && (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={radius + TOKEN_RING_OFFSET}
          fill="none"
          stroke="#f9fafb"
          strokeWidth={1}
          strokeDasharray="4 3"
          animate={{ opacity: ACTIVE_RING_OPACITY }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {props.isReacting && (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={radius + TOKEN_RING_OFFSET}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          animate={{ opacity: REACTION_RING_OPACITY }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}

      {props.sprite ? (
        <>
          <defs>
            <clipPath id={`clip-${props.id}`}>
              <circle cx={props.cx} cy={props.cy} r={radius} />
            </clipPath>
          </defs>
          <foreignObject
            key={props.unconscious ? "death" : props.castingGlow ? "cast" : "idle"}
            x={props.cx - radius}
            y={props.cy - radius}
            width={tokenSize}
            height={tokenSize}
            clipPath={`url(#clip-${props.id})`}
          >
            <div
              style={{
                ...spriteBackgroundStyle(
                  props.sprite,
                  tokenSize,
                  props.unconscious ? DEATH_SPRITE_ROW : props.castingGlow ? ACTIVE_SPRITE_ROW : 0,
                  props.unconscious ? DEATH_SPRITE_COL : 0,
                  props.unconscious ? DEATH_SPRITE_X_BIAS : 0,
                  props.unconscious ? DEATH_SPRITE_Y_BIAS : 0
                ),
                backgroundImage: `url(${props.sprite.url})`,
                backgroundRepeat: "no-repeat",
                borderRadius: "50%",
                height: tokenSize,
                imageRendering: "pixelated",
                overflow: "hidden",
                width: tokenSize
              }}
            />
          </foreignObject>
          <circle cx={props.cx} cy={props.cy} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
        </>
      ) : (
        <motion.circle
          cx={props.cx}
          cy={props.cy}
          r={radius}
          fill={props.teamColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          animate={{ scale: props.justBecameUnconscious ? UNCONSCIOUS_SCALE : 1 }}
          transition={{ duration: 0.4 }}
        />
      )}

      <text
        x={props.cx}
        y={props.labelY}
        textAnchor="middle"
        fill="#9ca3af"
        fontSize={LABEL_FONT_SIZE}
        pointerEvents="none"
      >
        {props.label}
      </text>

      <AnimatePresence>
        {props.floatingLabel && (
          <motion.text
            key={props.floatingLabel}
            x={props.cx}
            y={props.cy - radius - FLOATING_LABEL_Y_OFFSET}
            textAnchor="middle"
            fill={props.labelTone === "negative" ? "#ef4444" : "#fbbf24"}
            fontSize={FLOATING_LABEL_FONT_SIZE}
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
        fill="#1f2937"
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
            fill="#1f2937"
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
            fill="#1f2937"
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
          <text
            x={row.x - SLOT_LABEL_X_OFFSET}
            y={row.y + SLOT_LABEL_Y_OFFSET}
            fontSize={7}
            fill="#9ca3af"
            textAnchor="end"
            fontFamily="monospace"
          >
            {row.level}
          </text>
          {Array.from({ length: row.total }, (_, index) => {
            const filled = index < row.filled
            const justLost = props.slotJustSpent && index === row.filled
            return (
              <motion.circle
                key={index}
                cx={row.x + SLOT_DOT_X_OFFSET + index * SLOT_DOT_SPACING}
                cy={row.y + SLOT_DOT_Y_OFFSET}
                r={SLOT_DOT_RADIUS}
                fill={filled ? "#a78bfa" : "#374151"}
                animate={justLost ? { fill: ["#a78bfa", "#ef4444", "#374151"] } : {}}
                transition={{ duration: 0.4 }}
              />
            )
          })}
        </g>
      ))}

      {props.deathSaves &&
        (() => {
          const deathSaves = props.deathSaves
          return (
            <g>
              {Array.from({ length: DEATH_SAVE_COUNT }, (_, index) => (
                <circle
                  key={`s${index}`}
                  cx={deathSaves.x + DEATH_SAVE_FIRST_X_OFFSET + index * DEATH_SAVE_SPACING}
                  cy={deathSaves.y + DEATH_SAVE_Y_OFFSET}
                  r={DEATH_SAVE_RADIUS}
                  fill={index < deathSaves.successes ? "#22c55e" : "#374151"}
                  stroke="#22c55e"
                  strokeWidth={0.5}
                />
              ))}
              {Array.from({ length: DEATH_SAVE_COUNT }, (_, index) => (
                <circle
                  key={`f${index}`}
                  cx={deathSaves.x + DEATH_SAVE_SECOND_X_OFFSET + index * DEATH_SAVE_SPACING}
                  cy={deathSaves.y + DEATH_SAVE_Y_OFFSET}
                  r={DEATH_SAVE_RADIUS}
                  fill={index < deathSaves.failures ? "#ef4444" : "#374151"}
                  stroke="#ef4444"
                  strokeWidth={0.5}
                />
              ))}
            </g>
          )
        })()}
    </motion.g>
  )
}
