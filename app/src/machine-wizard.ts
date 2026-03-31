import { canArcaneRecoverSlot } from "#/features/class-wizard.ts"
import type { DndContext } from "#/machine-types.ts"

// -- Action Updates --

export function arcaneRecoveryUpdate(c: DndContext, slotLevel: number): Partial<DndContext> {
  if (c.wizardLevel < 1 || c.arcaneRecoveryUsed) return {}
  if (!canArcaneRecoverSlot(slotLevel)) return {}
  const currentSlots = [...c.slotsCurrent]
  const idx = slotLevel - 1
  if (idx >= currentSlots.length || currentSlots[idx] >= c.slotsMax[idx]) return {}
  currentSlots[idx] = currentSlots[idx] + 1
  return {
    slotsCurrent: currentSlots,
    arcaneRecoveryUsed: true
  }
}

// -- Lifecycle --

export function wizardStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.wizardLevel === 0) return {}
  return {}
}

export function wizardShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.wizardLevel === 0) return {}
  return {}
}

export function wizardLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.wizardLevel === 0) return {}
  return { arcaneRecoveryUsed: false }
}

// -- Init --

export function initialWizardState(wizardLevel: number) {
  return {
    wizardLevel,
    arcaneRecoveryUsed: false
  }
}
