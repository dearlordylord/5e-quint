import { assert } from "#/assert.ts"
import {
  bardicInspirationMaxCharges,
  hasFontOfInspiration,
  hasPeerlessSkill,
  superiorInspirationRestore
} from "#/features/class-bard.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { expendSlot } from "#/machine-spells.ts"
import type { BardClassState, DndContext } from "#/machine-types.ts"
import type { AbilityModifier, ClassLevel, SpellSlotLevel } from "#/types.ts"
import { resourceCount } from "#/types.ts"

function bd(c: DndContext) {
  return c.classStates.bard!
}

// -- Action Updates --

export function useBardicInspirationUpdate(c: DndContext): Partial<DndContext> {
  const bs = bd(c)
  assert(
    !isIncapacitated(c) && bs.level >= 1 && bs.bardicInspirationCharges > 0 && !c.bonusActionUsed,
    "guard: canBardicInspiration should have prevented this"
  )
  return {
    bonusActionUsed: true,
    ...updateClass(c, "bard", { bardicInspirationCharges: resourceCount(bs.bardicInspirationCharges - 1) })
  }
}

export function useCuttingWordsUpdate(c: DndContext): Partial<DndContext> {
  const bs = bd(c)
  assert(
    !isIncapacitated(c) && bs.level >= 3 && bs.bardicInspirationCharges > 0 && c.reactionAvailable,
    "guard: canCuttingWords should have prevented this"
  )
  return {
    reactionAvailable: false,
    ...updateClass(c, "bard", { bardicInspirationCharges: resourceCount(bs.bardicInspirationCharges - 1) })
  }
}

export function useFontSlotRestoreUpdate(c: DndContext, slotLevel: SpellSlotLevel): Partial<DndContext> {
  const bs = bd(c)
  assert(
    !isIncapacitated(c) && hasFontOfInspiration(bs.level) && bs.bardicInspirationCharges < bs.bardicInspirationMax,
    "guard: canFontSlotRestore should have prevented this"
  )
  const newSlots = expendSlot(c.slotsCurrent, slotLevel)
  if (newSlots === c.slotsCurrent) return {} // no slot available at requested level
  return {
    slotsCurrent: newSlots,
    ...updateClass(c, "bard", { bardicInspirationCharges: resourceCount(bs.bardicInspirationCharges + 1) })
  }
}

export function usePeerlessSkillUpdate(c: DndContext, success: boolean): Partial<DndContext> {
  const bs = bd(c)
  assert(
    !isIncapacitated(c) && hasPeerlessSkill(bs.level) && bs.bardicInspirationCharges > 0,
    "guard: canPeerlessSkill should have prevented this"
  )
  // Only spend charge on success
  if (success)
    return updateClass(c, "bard", { bardicInspirationCharges: resourceCount(bs.bardicInspirationCharges - 1) })
  return {}
}

// -- Lifecycle --

export function bardStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const bs = c.classStates.bard
  if (!bs || bs.level === 0) return {}
  // Superior Inspiration L18: restore charges to min 2 on initiative
  const restored = resourceCount(superiorInspirationRestore(bs.level, bs.bardicInspirationCharges))
  if (restored !== bs.bardicInspirationCharges) return updateClass(c, "bard", { bardicInspirationCharges: restored })
  return {}
}

export function bardShortRestUpdate(c: DndContext): Partial<DndContext> {
  const bs = c.classStates.bard
  if (!bs || bs.level === 0) return {}
  // Font of Inspiration L5: full recharge on short rest
  if (hasFontOfInspiration(bs.level))
    return updateClass(c, "bard", { bardicInspirationCharges: bs.bardicInspirationMax })
  return {}
}

export function bardLongRestUpdate(c: DndContext): Partial<DndContext> {
  const bs = c.classStates.bard
  if (!bs || bs.level === 0) return {}
  return updateClass(c, "bard", { bardicInspirationCharges: bs.bardicInspirationMax })
}

// -- Init --

export function initialBardState(bardLevel: ClassLevel, chaMod?: AbilityModifier): BardClassState {
  const cm = chaMod ?? 0
  const maxCharges = resourceCount(bardLevel >= 1 ? bardicInspirationMaxCharges(cm) : 0)
  return {
    level: bardLevel,
    bardicInspirationCharges: maxCharges,
    bardicInspirationMax: maxCharges
  }
}
