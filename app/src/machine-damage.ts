import { ALL_DAMAGE_TYPES, computeFallResult, computeTakeDamage, resolveDeathSave } from "#/machine-helpers.ts"
import { asApplyFall, asDeathSave, asTakeDamage, type DndContext, type DndEvent } from "#/machine-types.ts"
import type { DamageType } from "#/types.ts"

const pR = (c: DndContext, r: ReadonlySet<DamageType>) => (c.petrified ? ALL_DAMAGE_TYPES : r)

export const fallR = (c: DndContext, e: DndEvent) => {
  const ev = asApplyFall(e)
  return computeFallResult(
    ev.damageRoll,
    c.hp,
    c.maxHp,
    c.tempHp,
    ev.immunities,
    pR(c, ev.resistances),
    ev.vulnerabilities
  )
}

export const dmgR = (c: DndContext, e: DndEvent) => {
  const ev = asTakeDamage(e)
  return computeTakeDamage(
    c.hp,
    c.maxHp,
    c.tempHp,
    ev.amount,
    ev.damageType,
    ev.immunities,
    pR(c, ev.resistances),
    ev.vulnerabilities
  )
}

export const dsR = (c: DndContext, e: DndEvent) => {
  const ev = asDeathSave(e)
  // Defy Death (Champion L18): advantage on death saves, rolls 18-20 count as 20
  let roll = ev.d20Roll
  if (c.fighterLevel >= 18 && ev.d20Roll2 != null) {
    roll = Math.max(roll, ev.d20Roll2)
  }
  if (c.fighterLevel >= 18 && roll >= 18) {
    roll = 20
  }
  return resolveDeathSave(roll, c.deathSaves.successes, c.deathSaves.failures)
}
