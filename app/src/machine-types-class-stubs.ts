// Stub class state fields for DndContext (prep for parallel integration).
// Each worktree agent will move its class fields to a dedicated types file.

export interface ClassStubContext {
  readonly paladinLevel: number
  readonly layOnHandsPool: number
  readonly layOnHandsMax: number
  readonly paladinChannelDivinityCharges: number
  readonly paladinChannelDivinityMax: number
  readonly rogueLevel: number
  readonly sneakAttackUsedThisTurn: boolean
  readonly steadyAimUsedThisTurn: boolean
  readonly druidLevel: number
  readonly wildShapeCharges: number
  readonly wildShapeMax: number
  readonly inWildShape: boolean
  readonly sorcererLevel: number
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly warlockLevel: number
  readonly mysticArcanumUsed: ReadonlySet<number>
  readonly magicalCunningUsed: boolean
  readonly wizardLevel: number
  readonly arcaneRecoveryUsed: boolean
}

export interface ClassStubInput {
  readonly paladinLevel?: number
  readonly rogueLevel?: number
  readonly druidLevel?: number
  readonly sorcererLevel?: number
  readonly warlockLevel?: number
  readonly wizardLevel?: number
}
