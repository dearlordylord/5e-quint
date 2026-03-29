import { removeAe } from "#/machine-endturn.ts"
import { computeAddExhaustion, exhUpdate, MAX_EXHAUSTION } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"

/** Concentration break fields — clears spell ID and removes associated active effect. */
export const concBreakFields = (c: DndContext) =>
  c.concentrationSpellId !== ""
    ? { concentrationSpellId: "", activeEffects: removeAe(c.activeEffects, c.concentrationSpellId) }
    : {}

/** Concentration break only if not incapacitated (incap already broke it). */
export const concBreak = (c: DndContext) => (!isIncapacitated(c) ? concBreakFields(c) : {})

/** Add exhaustion levels with automatic concentration break on death (exhaustion 6). */
export const exhaustionWithConcBreak = (c: DndContext, levels: number, exhaustionImmune = false) => {
  const r = computeAddExhaustion(c.exhaustion, levels, c.hp, c.maxHp, exhaustionImmune)
  const died = r.newExhaustion >= MAX_EXHAUSTION && c.exhaustion < MAX_EXHAUSTION
  return { ...exhUpdate(r), ...(died ? concBreakFields(c) : {}) }
}
