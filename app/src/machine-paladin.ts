import {
  expendChannelDivinity,
  layOnHandsPoolMax,
  paladinChannelDivinityMax,
  restoreChannelDivinityShort
} from "#/features/class-paladin.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"
import { hp } from "#/types.ts"

// -- Actions --

/** Lay on Hands: heal amount from pool, costs Bonus Action.
 * SRD: "As a Bonus Action, you can touch a creature ... and draw power from the pool" */
export function layOnHandsUpdate(c: DndContext, amount: number): Partial<DndContext> {
  if (isIncapacitated(c) || c.bonusActionUsed || c.layOnHandsPool < amount || amount <= 0) return {}
  const healedAmount = Math.min(amount, c.maxHp - c.hp)
  return {
    bonusActionUsed: true,
    hp: hp(c.hp + healedAmount),
    layOnHandsPool: c.layOnHandsPool - amount
  }
}

/** Paladin Channel Divinity: decrement charge. */
export function paladinChannelDivinityUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.paladinLevel < 3 || c.paladinChannelDivinityCharges <= 0) return {}
  return { paladinChannelDivinityCharges: expendChannelDivinity(c.paladinChannelDivinityCharges) }
}

// -- Lifecycle --

export function paladinStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.paladinLevel === 0) return {}
  return {}
}

/** SRD: "You regain one of its expended uses when you finish a Short Rest" */
export function paladinShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.paladinLevel === 0) return {}
  return {
    paladinChannelDivinityCharges: restoreChannelDivinityShort(
      c.paladinChannelDivinityCharges,
      c.paladinChannelDivinityMax
    )
  }
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

export function initialPaladinState(paladinLevel: number) {
  const lohMax = layOnHandsPoolMax(paladinLevel)
  const cdMax = paladinChannelDivinityMax(paladinLevel)
  return {
    paladinLevel,
    layOnHandsPool: lohMax,
    layOnHandsMax: lohMax,
    paladinChannelDivinityCharges: cdMax,
    paladinChannelDivinityMax: cdMax
  }
}
