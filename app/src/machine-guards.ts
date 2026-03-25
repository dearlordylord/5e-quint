import { dmgR, dsR, fallR } from "#/machine-damage.ts"
import { addDeathFailures, MAX_EXHAUSTION, spendHalfSpeed, type TakeDamageResult } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { computeShortRest } from "#/machine-spells.ts"
import { asShortRest, asSpendHitDie, asTakeDamage, type DndContext, type DndEvent } from "#/machine-types.ts"

type GuardArg = { context: DndContext; event: DndEvent }

const isInstantDeath = (r: TakeDamageResult) => r.dmgThrough > 0 && r.newHp === 0 && r.overflow >= r.effMax
const isDropToZero = (r: TakeDamageResult) => r.dmgThrough > 0 && r.newHp === 0 && r.overflow < r.effMax
const isInstantDeathFromDying = (r: TakeDamageResult) => r.dmgThrough > 0 && r.dmgThrough >= r.effMax

export const guards = {
  instantDeathFromAlive: ({ context: c, event: e }: GuardArg) => isInstantDeath(dmgR(c, e)),
  dropsToZeroHp: ({ context: c, event: e }: GuardArg) => isDropToZero(dmgR(c, e)),
  noDamageThrough: ({ context: c, event: e }: GuardArg) => dmgR(c, e).dmgThrough === 0,
  instantDeathFromDying: ({ context: c, event: e }: GuardArg) => isInstantDeathFromDying(dmgR(c, e)),
  deathFromDamageFailures: ({ context: c, event: e }: GuardArg) => {
    const r = dmgR(c, e)
    if (r.dmgThrough === 0) return false
    return addDeathFailures(c.deathSaves.failures, asTakeDamage(e).isCritical).isDead
  },
  deathSaveRegainsConsciousness: ({ context: c, event: e }: GuardArg) => dsR(c, e).regainsConsciousness,
  deathSaveStabilizes: ({ context: c, event: e }: GuardArg) => dsR(c, e).isStabilized,
  deathSaveDies: ({ context: c, event: e }: GuardArg) => dsR(c, e).isDead,
  fallInstantDeath: ({ context: c, event: e }: GuardArg) => isInstantDeath(fallR(c, e)),
  fallDropsToZero: ({ context: c, event: e }: GuardArg) => isDropToZero(fallR(c, e)),
  fallInstantDeathFromDying: ({ context: c, event: e }: GuardArg) => isInstantDeathFromDying(fallR(c, e)),
  fallNoDamage: ({ context: c, event: e }: GuardArg) => fallR(c, e).effAmount === 0,
  deathFromFallFailures: ({ context: c, event: e }: GuardArg) => {
    const r = fallR(c, e)
    if (r.dmgThrough === 0) return false
    return addDeathFailures(c.deathSaves.failures, false).isDead
  },
  canSuffocate: ({ context: c }: GuardArg) => c.hp > 0,
  shortRestHeals: ({ context: c, event: e }: GuardArg) => {
    if (c.inCombat) return false
    const ev = asShortRest(e)
    const r = computeShortRest(c.hp, c.maxHp, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
    return c.hp === 0 && r.newHp > 0
  },
  longRestHeals: ({ context: c }: GuardArg) => !c.inCombat && c.hp >= 1,
  hitDieHeals: ({ context: c, event: e }: GuardArg) => {
    if (c.hitDiceRemaining <= 0) return false
    const ev = asSpendHitDie(e)
    return c.hp === 0 && Math.max(0, ev.dieRoll + ev.conMod) > 0
  },
  exhaustionDeath: ({ context: c }: GuardArg) => c.exhaustion >= MAX_EXHAUSTION,
  canStandFromProne: ({ context: c }: GuardArg) =>
    !isIncapacitated(c) && c.effectiveSpeed > 0 && spendHalfSpeed(c.movementRemaining, c.effectiveSpeed).success,
  shouldBreakConcentration: ({ context: c }: GuardArg) => c.concentrationSpellId === "",
  canExpendSlot: ({ context: c }: GuardArg) => c.hp > 0 && !isIncapacitated(c),
  contextDead: ({ context: c }: GuardArg) => c.dead,
  hpZeroUnconscious: ({ context: c }: GuardArg) => c.hp === 0 && c.unconscious,
  isOutOfCombat: ({ context: c }: GuardArg) => !c.inCombat,
  regainedConsciousness: ({ context: c }: GuardArg) => c.hp > 0 && !c.dead,
  canConcentrate: ({ context: c }: GuardArg) => !c.dead && !isIncapacitated(c)
}
