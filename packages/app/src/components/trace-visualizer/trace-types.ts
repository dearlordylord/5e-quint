import type { DndEvent } from "@dnd/core/machine-types.ts"

export interface NormalizedState {
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly deathSavesSuccesses: number
  readonly deathSavesFailures: number
  readonly stable: boolean
  readonly dead: boolean
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
  readonly exhaustion: number
  readonly frightened: boolean
  readonly grappled: boolean
  readonly invisible: boolean
  readonly paralyzed: boolean
  readonly petrified: boolean
  readonly poisoned: boolean
  readonly prone: boolean
  readonly restrained: boolean
  readonly stunned: boolean
  readonly unconscious: boolean
  readonly incapacitatedSources: ReadonlyArray<string>
  readonly hitPointDiceRemaining: number | Record<string, number>
  readonly activeEffects: ReadonlyArray<{
    spellId: string
    boundaryCrossingsRemaining: number
    expiresAt: string
  }>
  readonly movementRemaining: number
  readonly effectiveSpeed: number
  readonly actionsRemaining: number
  readonly attackActionUsed: boolean
  readonly bonusActionUsed: boolean
  readonly reactionAvailable: boolean
  readonly freeInteractionUsed: boolean
  readonly extraAttacksRemaining: number
  readonly disengaged: boolean
  readonly dodging: boolean
  readonly readiedAction: boolean
  readonly bonusActionSpellCast: boolean
  readonly nonCantripActionSpellCast: boolean
  readonly bonusMovementRemaining: number
  readonly bonusMovementOAFree: boolean
  readonly turnPhase: string
  readonly slotsMax: ReadonlyArray<number>
  readonly slotsCurrent: ReadonlyArray<number>
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: number
  readonly indomitableMax: number
  readonly heroicInspiration: boolean
  readonly fighterLevel: number
}

export interface TraceStep {
  readonly quintAction: string
  readonly xstateEvent: string
  readonly description: string
  readonly quintState: NormalizedState
  readonly xstateState: NormalizedState
}

export interface TraceEventDef {
  readonly quintAction: string
  readonly xstateEvent: string
  readonly description: string
  readonly events: ReadonlyArray<DndEvent>
  readonly expectedQuintState: NormalizedState
}
