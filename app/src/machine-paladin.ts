import { assert } from "#/assert.ts"
import {
  expendChannelDivinity,
  layOnHandsPoolMax,
  paladinChannelDivinityMax,
  restoreChannelDivinityShort
} from "#/features/class-paladin.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { expendSlot } from "#/machine-spells.ts"
import type { DndContext, PaladinClassState } from "#/machine-types.ts"
import type { ClassLevel, SpellSlotLevel } from "#/types.ts"
import { hp, resourceCount } from "#/types.ts"

export { standardExtraAttacks as paladinExtraAttacks } from "#/machine-helpers.ts"

function p(c: DndContext) {
  return c.classStates.paladin!
}

// -- Actions --

/** Lay on Hands: heal amount from pool, costs Bonus Action.
 * SRD: "As a Bonus Action, you can touch a creature ... and draw power from the pool" */
export function layOnHandsUpdate(c: DndContext, amount: number): Partial<DndContext> {
  const ps = p(c)
  assert(
    !isIncapacitated(c) && !c.bonusActionUsed && ps.layOnHandsPool > 0,
    "guard: canLayOnHands should have prevented this"
  )
  if (ps.layOnHandsPool < amount || amount <= 0) return {}
  const healedAmount = Math.min(amount, c.maxHp - c.hp)
  return {
    bonusActionUsed: true,
    hp: hp(c.hp + healedAmount),
    ...updateClass(c, "paladin", { layOnHandsPool: resourceCount(ps.layOnHandsPool - amount) })
  }
}

/** Paladin Channel Divinity: decrement charge. */
export function paladinChannelDivinityUpdate(c: DndContext): Partial<DndContext> {
  const ps = p(c)
  assert(
    !isIncapacitated(c) && ps.level >= 3 && ps.paladinChannelDivinityCharges > 0,
    "guard: canPaladinCD should have prevented this"
  )
  return updateClass(c, "paladin", {
    paladinChannelDivinityCharges: resourceCount(expendChannelDivinity(ps.paladinChannelDivinityCharges))
  })
}

export function divineSmiteUpdate(c: DndContext, slotLevel: SpellSlotLevel): Partial<DndContext> {
  const ps = p(c)
  assert(!isIncapacitated(c) && ps.level >= 2 && !c.bonusActionUsed, "guard: canDivineSmite should have prevented this")
  const newSlots = expendSlot(c.slotsCurrent, slotLevel)
  if (newSlots === c.slotsCurrent) return {}
  return { bonusActionUsed: true, slotsCurrent: newSlots }
}

export function divineSmiteFreeUpdate(c: DndContext): Partial<DndContext> {
  const ps = p(c)
  assert(
    !isIncapacitated(c) && ps.level >= 2 && !c.bonusActionUsed && !ps.smiteFreeUsed,
    "guard: canDivineSmiteFree should have prevented this"
  )
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
    paladinChannelDivinityCharges: resourceCount(
      restoreChannelDivinityShort(ps.paladinChannelDivinityCharges, ps.paladinChannelDivinityMax)
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

export function initialPaladinState(paladinLevel: ClassLevel): PaladinClassState {
  const lohMax = resourceCount(layOnHandsPoolMax(paladinLevel))
  const cdMax = resourceCount(paladinChannelDivinityMax(paladinLevel))
  return {
    level: paladinLevel,
    layOnHandsPool: lohMax,
    layOnHandsMax: lohMax,
    paladinChannelDivinityCharges: cdMax,
    paladinChannelDivinityMax: cdMax,
    smiteFreeUsed: false
  }
}
