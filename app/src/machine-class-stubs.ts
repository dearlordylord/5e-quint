// Stub class state initializers and no-op lifecycle actions.
// Prep for parallel worktree integration — each agent will extract
// its class into a dedicated machine-xxx.ts file.

import { assign } from "xstate"

import type { DndMachineInput } from "#/machine-types.ts"
import type { ClassStubContext } from "#/machine-types-class-stubs.ts"

/** Initial stub state for all 7 pending classes (all zero/false). */
export function initialClassStubs(i: DndMachineInput): ClassStubContext {
  return {
    paladinLevel: i.paladinLevel ?? 0,
    layOnHandsPool: 0,
    layOnHandsMax: 0,
    paladinChannelDivinityCharges: 0,
    paladinChannelDivinityMax: 0,
    clericLevel: i.clericLevel ?? 0,
    clericChannelDivinityCharges: 0,
    clericChannelDivinityMax: 0,
    druidLevel: i.druidLevel ?? 0,
    wildShapeCharges: 0,
    wildShapeMax: 0,
    inWildShape: false,
    sorcererLevel: i.sorcererLevel ?? 0,
    sorceryPoints: 0,
    sorceryPointsMax: 0,
    warlockLevel: i.warlockLevel ?? 0,
    mysticArcanumUsed: new Set<number>(),
    magicalCunningUsed: false,
    wizardLevel: i.wizardLevel ?? 0,
    arcaneRecoveryUsed: false
  }
}

/** No-op lifecycle actions for all 7 stub classes. */
export const stubLifecycleActions = {
  paladinStartTurn: assign(() => ({})),
  paladinShortRest: assign(() => ({})),
  paladinLongRest: assign(() => ({})),
  clericStartTurn: assign(() => ({})),
  clericShortRest: assign(() => ({})),
  clericLongRest: assign(() => ({})),
  druidStartTurn: assign(() => ({})),
  druidShortRest: assign(() => ({})),
  druidLongRest: assign(() => ({})),
  sorcererStartTurn: assign(() => ({})),
  sorcererShortRest: assign(() => ({})),
  sorcererLongRest: assign(() => ({})),
  warlockStartTurn: assign(() => ({})),
  warlockShortRest: assign(() => ({})),
  warlockLongRest: assign(() => ({})),
  wizardStartTurn: assign(() => ({})),
  wizardShortRest: assign(() => ({})),
  wizardLongRest: assign(() => ({}))
} as const
