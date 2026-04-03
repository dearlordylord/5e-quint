import type { ClassName, HitDiceRemaining } from "#/features/class-tables.ts"
import { pactSlotCount, pactSlotLevel } from "#/features/class-warlock.ts"
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

/**
 * Derive initial spell slot state from class levels. Matches Quint pInitSpellSlots.
 * Full casters: Bard, Cleric, Druid, Sorcerer, Wizard.
 * Half casters: Paladin, Ranger.
 * Warlock: pact slots (separate from multiclass table).
 */
export function initSpellSlotsFromLevels(levels: {
  readonly bardLevel: number
  readonly clericLevel: number
  readonly druidLevel: number
  readonly sorcererLevel: number
  readonly wizardLevel: number
  readonly paladinLevel: number
  readonly rangerLevel: number
  readonly warlockLevel: number
}): {
  readonly slotsMax: SpellSlots
  readonly slotsCurrent: SpellSlots
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
} {
  const slots = calculateMulticlassSlots([
    { type: "full", level: levels.bardLevel },
    { type: "full", level: levels.clericLevel },
    { type: "full", level: levels.druidLevel },
    { type: "full", level: levels.sorcererLevel },
    { type: "full", level: levels.wizardLevel },
    { type: "half", level: levels.paladinLevel },
    { type: "half", level: levels.rangerLevel }
  ])
  const pactMax = pactSlotCount(levels.warlockLevel)
  return {
    slotsMax: slots,
    slotsCurrent: slots,
    pactSlotsMax: pactMax,
    pactSlotsCurrent: pactMax,
    pactSlotLevel: pactSlotLevel(levels.warlockLevel)
  }
}

/** Compute short rest results: spend hit dice per class, restore pact slots. */
export function computeShortRest(
  currentHp: number,
  maxHp: number,
  hitDiceRemaining: HitDiceRemaining,
  pactSlotsMax: number,
  conMod: number,
  hdRolls: ReadonlyArray<{ readonly className: ClassName; readonly roll: number }>
): { readonly newHp: number; readonly newHitDice: HitDiceRemaining; readonly newPactSlots: number } {
  const effMax = effectiveMaxHp(maxHp)
  let curHp = currentHp
  const hd = { ...hitDiceRemaining }
  for (const { className, roll } of hdRolls) {
    if (hd[className] <= 0) continue
    hd[className]--
    curHp = Math.min(curHp + Math.max(0, roll + conMod), effMax)
  }
  return { newHitDice: hd, newHp: curHp, newPactSlots: pactSlotsMax }
}

/** Compute long rest results. Hit dice restoration handled by caller (per-class). */
export function computeLongRest(
  currentHp: number,
  maxHp: number,
  exhaustion: number,
  slotsMax: SpellSlots,
  pactSlotsMax: number
): {
  readonly newExhaustion: number
  readonly newHp: number
  readonly newSlots: SpellSlots
  readonly newPactSlots: number
} | null {
  if (currentHp < 1) return null
  const newExhaustion = Math.max(0, exhaustion - 1)
  const effMax = effectiveMaxHp(maxHp)
  return {
    newExhaustion,
    newHp: effMax,
    newPactSlots: pactSlotsMax,
    newSlots: slotsMax
  }
}
