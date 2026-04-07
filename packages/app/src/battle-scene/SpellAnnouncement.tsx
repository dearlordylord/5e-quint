import type { LayoutState } from "@dnd/core/battle-scene/layout.ts"
import { AnimatePresence, motion } from "motion/react"

type Props = {
  announcement: LayoutState["spellAnnouncement"]
  viewBox: LayoutState["viewBox"]
}

export function SpellAnnouncement({ announcement, viewBox }: Props) {
  return (
    <AnimatePresence>
      {announcement && (
        <motion.text
          key={announcement.spellName + announcement.casterId}
          x={viewBox.width / 2}
          y={viewBox.height / 2 - 40}
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
