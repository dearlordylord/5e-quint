import { canArcaneRecoverSlot, hasOverchannel } from "#/features/class-wizard.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext, WizardClassState } from "#/machine-types.ts"

function w(c: DndContext) {
  return c.classStates.wizard!
}

// -- Action Updates --

export function arcaneRecoveryUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  const ws = w(c)
  if (ws.level < 1 || ws.arcaneRecoveryUsed) return {}
  if (!canArcaneRecoverSlot(slotLevel)) return {}
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] >= c.slotsMax[idx]) return {}
  currentSlots[idx] = currentSlots[idx] + 1
  return {
    slotsCurrent: currentSlots,
    ...updateClass(c, "wizard", { arcaneRecoveryUsed: true })
  }
}

export function overchannelUpdate(c: DndContext): Partial<DndContext> {
  const ws = w(c)
  if (isIncapacitated(c) || !hasOverchannel(ws.level)) return {}
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

export function initialWizardState(wizardLevel: number): WizardClassState {
  return {
    level: wizardLevel,
    arcaneRecoveryUsed: false,
    overchannelUsesThisLR: 0
  }
}
