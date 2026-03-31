import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { hp } from "#/types.ts"

// -- P1: Guards --

function canLayOnHands(c: DndContext, amount: number): boolean {
  return c.layOnHandsPool >= amount && amount > 0
}

function canPaladinChannelDivinity(c: DndContext): boolean {
  return c.paladinLevel >= 3 && c.paladinChannelDivinityCharges > 0
}

// -- P2: Actions --

/** Lay on Hands: heal amount from pool, costs Bonus Action.
 * SRD: "As a Bonus Action, you can touch a creature ... and draw power from the pool" */
export function layOnHandsUpdate(c: DndContext, amount: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.bonusActionUsed || !canLayOnHands(c, amount)) return {}
  const effMax = c.maxHp // effectiveMaxHp uses exhaustion halving but LoH heals via pHeal which caps at maxHp
  const healedAmount = Math.min(amount, effMax - c.hp)
  return {
    bonusActionUsed: true,
    hp: hp(c.hp + healedAmount),
    layOnHandsPool: c.layOnHandsPool - amount
  }
}

/** Paladin Channel Divinity: decrement charge.
 * SRD: "You can use this class's Channel Divinity twice." */
export function paladinChannelDivinityUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || !canPaladinChannelDivinity(c)) return {}
  return { paladinChannelDivinityCharges: c.paladinChannelDivinityCharges - 1 }
}

// -- Lifecycle --

export function paladinStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.paladinLevel === 0) return {}
  return {}
}

/** SRD: "You regain one of its expended uses when you finish a Short Rest" */
export function paladinShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.paladinLevel === 0) return {}
  const newCharges = Math.min(c.paladinChannelDivinityCharges + 1, c.paladinChannelDivinityMax)
  return { paladinChannelDivinityCharges: newCharges }
}

/** SRD: Long Rest restores full LoH pool and all CD uses. */
export function paladinLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.paladinLevel === 0) return {}
  return {
    layOnHandsPool: c.layOnHandsMax,
    paladinChannelDivinityCharges: c.paladinChannelDivinityMax
  }
}

// -- Init --

/** SRD: CD uses: 2 at L3, 3 at L11. LoH pool: level * 5 at L1+. */
export function initialPaladinState(paladinLevel: number) {
  const lohMax = paladinLevel >= 1 ? paladinLevel * 5 : 0
  const cdMax = paladinLevel >= 11 ? 3 : paladinLevel >= 3 ? 2 : 0
  return {
    paladinLevel,
    layOnHandsPool: lohMax,
    layOnHandsMax: lohMax,
    paladinChannelDivinityCharges: cdMax,
    paladinChannelDivinityMax: cdMax
  }
}
