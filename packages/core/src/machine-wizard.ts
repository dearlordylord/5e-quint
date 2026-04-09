import { assert } from "#/assert.ts"
import { arcaneRecoveryMaxLevels, canArcaneRecoverSlot, hasOverchannel } from "#/features/class-wizard.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, WizardClassState } from "#/machine-types.ts"
import type { ClassLevel, SpellSlotLevel } from "#/types.ts"

function w(c: DndContext) {
  return c.classStates.wizard!
}

// -- Action Updates --

export function arcaneRecoveryUpdate(c: DndContext, slotLevel: SpellSlotLevel): Partial<DndContext> {
  const ws = w(c)
  assert(ws.level >= 1 && !ws.arcaneRecoveryUsed, "guard: canArcaneRecovery should have prevented this")
  const flagUpdate = updateClass(c, "wizard", { arcaneRecoveryUsed: true })
  // SRD: slot level <= 5 AND slot level <= budget (half wizard level, round up)
  // AND slot must be expended (current < max).
  const budget = arcaneRecoveryMaxLevels(ws.level)
  if (!canArcaneRecoverSlot(slotLevel) || slotLevel > budget) return flagUpdate
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] >= c.slotsMax[idx]) return flagUpdate
  currentSlots[idx] = currentSlots[idx] + 1
  return {
    slotsCurrent: currentSlots,
    ...flagUpdate
  }
}

export function overchannelUpdate(c: DndContext): Partial<DndContext> {
  const ws = w(c)
  assert(
    c.pendingResolution?.kind === "overchannel" && !isIncapacitated(c) && hasOverchannel(ws.level),
    "guard: canOverchannel should have prevented this"
  )
  return updateClass(c, "wizard", { overchannelUsesThisLR: ws.overchannelUsesThisLR + 1 })
}

// -- Lifecycle --

export function wizardStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const ws = c.classStates.wizard
  if (!ws || ws.level === 0) return {}
  return {}
}

export function wizardShortRestUpdate(c: DndContext): Partial<DndContext> {
  const ws = c.classStates.wizard
  if (!ws || ws.level === 0) return {}
  return {}
}

export function wizardLongRestUpdate(c: DndContext): Partial<DndContext> {
  const ws = c.classStates.wizard
  if (!ws || ws.level === 0) return {}
  return updateClass(c, "wizard", { arcaneRecoveryUsed: false, overchannelUsesThisLR: 0 })
}

// -- Init --

export function initialWizardState(wizardLevel: ClassLevel): WizardClassState {
  return {
    level: wizardLevel,
    arcaneRecoveryUsed: false,
    overchannelUsesThisLR: 0
  }
}
