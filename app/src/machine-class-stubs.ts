// Stub class state initializers for classes not yet extracted.
// Each worktree agent will extract its class into a dedicated machine-xxx.ts file.

import type { DndMachineInput } from "#/machine-types.ts"
import type { ClassStubContext } from "#/machine-types-class-stubs.ts"

/** Initial stub state for remaining 3 stub classes (all zero/false). */
export function initialClassStubs(i: DndMachineInput): ClassStubContext {
  return {
    druidLevel: i.druidLevel ?? 0,
    wildShapeCharges: 0,
    wildShapeMax: 0,
    inWildShape: false,
    sorcererLevel: i.sorcererLevel ?? 0,
    sorceryPoints: 0,
    sorceryPointsMax: 0,
    warlockLevel: i.warlockLevel ?? 0,
    mysticArcanumUsed: new Set<number>(),
    magicalCunningUsed: false
  }
}
