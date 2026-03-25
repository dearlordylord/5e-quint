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
    c.exhaustion,
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
    c.exhaustion,
    ev.amount,
    ev.damageType,
    ev.immunities,
    pR(c, ev.resistances),
    ev.vulnerabilities
  )
}

export const dsR = (c: DndContext, e: DndEvent) =>
  resolveDeathSave(asDeathSave(e).d20Roll, c.deathSaves.successes, c.deathSaves.failures)
