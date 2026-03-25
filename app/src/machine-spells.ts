import { effectiveMaxHp } from "#/machine-helpers.ts"
import type { CasterType, SpellSlots } from "#/types.ts"
import { EMPTY_SLOTS, SPELL_SLOT_LEVELS } from "#/types.ts"

const HALVE_DIVISOR = 2
const CONCENTRATION_DC_MIN = 10
const THIRD_CASTER_DIVISOR = 3

/** Concentration save DC. Matches Quint pConcentrationDC. */
export function concentrationDC(damageTaken: number): number {
  return Math.max(CONCENTRATION_DC_MIN, Math.floor(damageTaken / HALVE_DIVISOR))
}

/** Expend a spell slot at the given level (1-9). Returns new slotsCurrent. */
export function expendSlot(slotsCurrent: SpellSlots, level: number): SpellSlots {
  const idx = level - 1
  if (idx < 0 || idx >= slotsCurrent.length || slotsCurrent[idx] <= 0) return slotsCurrent
  return slotsCurrent.map((v, i) => (i === idx ? v - 1 : v))
}

/** Multiclass spell slot table. Matches Quint pSlotsPerLevel. */
export function slotsPerLevel(casterLevel: number, spellLevel: number): number {
  /* eslint-disable no-magic-numbers */
  if (spellLevel === 1) return casterLevel >= 3 ? 4 : casterLevel === 2 ? 3 : casterLevel === 1 ? 2 : 0
  if (spellLevel === 2) return casterLevel >= 4 ? 3 : casterLevel === 3 ? 2 : 0
  if (spellLevel === 3) return casterLevel >= 6 ? 3 : casterLevel === 5 ? 2 : 0
  if (spellLevel === 4) return casterLevel >= 9 ? 3 : casterLevel === 8 ? 2 : casterLevel === 7 ? 1 : 0
  if (spellLevel === 5) return casterLevel >= 18 ? 3 : casterLevel >= 10 ? 2 : casterLevel === 9 ? 1 : 0
  if (spellLevel === 6) return casterLevel >= 19 ? 2 : casterLevel >= 11 ? 1 : 0
  if (spellLevel === 7) return casterLevel >= 20 ? 2 : casterLevel >= 13 ? 1 : 0
  if (spellLevel === 8) return casterLevel >= 15 ? 1 : 0
  if (spellLevel === 9) return casterLevel >= 17 ? 1 : 0
  /* eslint-enable no-magic-numbers */
  return 0
}

/** Calculate multiclass spell slots from class levels. */
export function calculateMulticlassSlots(
  classLevels: ReadonlyArray<{ readonly type: CasterType; readonly level: number }>
): SpellSlots {
  const casterLevel = classLevels.reduce((sum, cl) => {
    if (cl.type === "full") return sum + cl.level
    if (cl.type === "half") return sum + Math.floor(cl.level / HALVE_DIVISOR)
    return sum + Math.floor(cl.level / THIRD_CASTER_DIVISOR)
  }, 0)
  if (casterLevel === 0) return EMPTY_SLOTS
  return Array.from({ length: SPELL_SLOT_LEVELS }, (_, i) => slotsPerLevel(casterLevel, i + 1))
}

/** Hit dice recovery on long rest: max(1, floor(total/2)). */
export function hitDiceRecovery(totalHitDice: number, currentRemaining: number): number {
  const recovery = Math.max(1, Math.floor(totalHitDice / HALVE_DIVISOR))
  return Math.min(recovery, totalHitDice - currentRemaining)
}

/** Compute short rest results: spend hit dice, restore pact slots. */
export function computeShortRest(
  currentHp: number,
  maxHp: number,
  exhaustion: number,
  hitDiceRemaining: number,
  pactSlotsMax: number,
  conMod: number,
  hdRolls: ReadonlyArray<number>
): { readonly newHp: number; readonly newHitDice: number; readonly newPactSlots: number } {
  const effMax = effectiveMaxHp(exhaustion, maxHp)
  const cap = Math.min(hitDiceRemaining, hdRolls.length)
  let curHp = currentHp
  for (let i = 0; i < cap; i++) {
    curHp = Math.min(curHp + Math.max(0, hdRolls[i] + conMod), effMax)
  }
  return { newHitDice: hitDiceRemaining - cap, newHp: curHp, newPactSlots: pactSlotsMax }
}

/** Compute long rest results. */
export function computeLongRest(
  currentHp: number,
  maxHp: number,
  exhaustion: number,
  hitDiceRemaining: number,
  slotsMax: SpellSlots,
  pactSlotsMax: number,
  totalHitDice: number,
  hasEaten: boolean
): {
  readonly newExhaustion: number
  readonly newHp: number
  readonly newHitDice: number
  readonly newSlots: SpellSlots
  readonly newPactSlots: number
} | null {
  if (currentHp < 1) return null
  const newExhaustion = hasEaten ? Math.max(0, exhaustion - 1) : exhaustion
  const effMax = effectiveMaxHp(newExhaustion, maxHp)
  const recovery = hitDiceRecovery(totalHitDice, hitDiceRemaining)
  return {
    newExhaustion,
    newHitDice: hitDiceRemaining + recovery,
    newHp: effMax,
    newPactSlots: pactSlotsMax,
    newSlots: slotsMax
  }
}
