import {
  expendChannelDivinity,
  layOnHandsPoolMax,
  paladinChannelDivinityMax,
  restoreChannelDivinityShort
} from "#/features/class-paladin.ts"
import { standardExtraAttacks, updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { expendSlot } from "#/machine-spells.ts"
import type { DndContext, PaladinClassState } from "#/machine-types.ts"
import { hp } from "#/types.ts"

export { standardExtraAttacks as paladinExtraAttacks }

function p(c: DndContext) {
  return c.classStates.paladin!
}

// -- Actions --

/** Lay on Hands: heal amount from pool, costs Bonus Action.
 * SRD: "As a Bonus Action, you can touch a creature ... and draw power from the pool" */
export function layOnHandsUpdate(c: DndContext, amount: number): Partial<DndContext> {
  const ps = p(c)
  if (isIncapacitated(c) || c.bonusActionUsed || ps.layOnHandsPool < amount || amount <= 0) return {}
  const healedAmount = Math.min(amount, c.maxHp - c.hp)
  return {
    bonusActionUsed: true,
    hp: hp(c.hp + healedAmount),
    ...updateClass(c, "paladin", { layOnHandsPool: ps.layOnHandsPool - amount })
  }
}

/** Paladin Channel Divinity: decrement charge. */
export function paladinChannelDivinityUpdate(c: DndContext): Partial<DndContext> {
  const ps = p(c)
  if (isIncapacitated(c) || ps.level < 3 || ps.paladinChannelDivinityCharges <= 0) return {}
  return updateClass(c, "paladin", {
    paladinChannelDivinityCharges: expendChannelDivinity(ps.paladinChannelDivinityCharges)
  })
}

export function divineSmiteUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  const ps = p(c)
  if (isIncapacitated(c) || ps.level < 2 || c.bonusActionUsed) return {}
  const newSlots = expendSlot(c.slotsCurrent, slotLevel)
  if (newSlots === c.slotsCurrent) return {}
  return { bonusActionUsed: true, slotsCurrent: newSlots }
}

export function divineSmiteFreeUpdate(c: DndContext): Partial<DndContext> {
  const ps = p(c)
  if (isIncapacitated(c) || ps.level < 2 || c.bonusActionUsed || ps.smiteFreeUsed) return {}
  return { bonusActionUsed: true, ...updateClass(c, "paladin", { smiteFreeUsed: true }) }
}

// -- Lifecycle --

export function paladinStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const ps = c.classStates.paladin
  if (!ps || ps.level === 0) return {}
  return {}
}

/** SRD: "You regain one of its expended uses when you finish a Short Rest" */
export function paladinShortRestUpdate(c: DndContext): Partial<DndContext> {
  const ps = c.classStates.paladin
  if (!ps || ps.level === 0) return {}
  return updateClass(c, "paladin", {
    paladinChannelDivinityCharges: restoreChannelDivinityShort(
      ps.paladinChannelDivinityCharges,
      ps.paladinChannelDivinityMax
    )
  })
}

/** SRD: Long Rest restores full LoH pool and all CD uses. */
export function paladinLongRestUpdate(c: DndContext): Partial<DndContext> {
  const ps = c.classStates.paladin
  if (!ps || ps.level === 0) return {}
  return updateClass(c, "paladin", {
    layOnHandsPool: ps.layOnHandsMax,
    paladinChannelDivinityCharges: ps.paladinChannelDivinityMax,
    smiteFreeUsed: false
  })
}

// -- Init --

export function initialPaladinState(paladinLevel: number): PaladinClassState {
  const lohMax = layOnHandsPoolMax(paladinLevel)
  const cdMax = paladinChannelDivinityMax(paladinLevel)
  return {
    level: paladinLevel,
    layOnHandsPool: lohMax,
    layOnHandsMax: lohMax,
    paladinChannelDivinityCharges: cdMax,
    paladinChannelDivinityMax: cdMax,
    smiteFreeUsed: false
  }
}
