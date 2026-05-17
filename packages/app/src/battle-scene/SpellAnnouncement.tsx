import { AnimatePresence, motion } from "motion/react"

import type { LayoutState } from "./battle-scene-layout.ts"

type Props = {
  readonly announcement: LayoutState["spellAnnouncement"]
  readonly viewBox: LayoutState["viewBox"]
}

const SPELL_TEXT_CENTER = 2
const SPELL_TEXT_Y_OFFSET = 40

export function SpellAnnouncement({ announcement, viewBox }: Props) {
  return (
    <AnimatePresence>
      {announcement && (
        <motion.text
          key={announcement.spellName + announcement.casterId}
          x={viewBox.width / SPELL_TEXT_CENTER}
          y={viewBox.height / SPELL_TEXT_CENTER - SPELL_TEXT_Y_OFFSET}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#f9fafb"
          fontSize={32}
          fontWeight="bold"
          style={{ textShadow: "0 0 12px rgba(167,139,250,0.8)" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
        >
          {announcement.spellName}
        </motion.text>
      )}
    </AnimatePresence>
  )
}
