import type {
  ActionType,
  Condition,
  D20Roll,
  DamageType,
  DeathSaves,
  ExhaustionLevel,
  HealAmount,
  HP,
  IncapSource,
  MovementFeet,
  TempHP
} from "#/types.ts"

// --- Context ---

export interface DndContext {
  readonly hp: HP
  readonly maxHp: HP
  readonly tempHp: TempHP
  readonly deathSaves: DeathSaves
  readonly exhaustion: ExhaustionLevel
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
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
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly movementRemaining: MovementFeet
  readonly effectiveSpeed: MovementFeet
  readonly actionUsed: boolean
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
  readonly surprised: boolean
}

// --- Events ---

export type DndEvent =
  | {
      readonly type: "TAKE_DAMAGE"
      readonly amount: number
      readonly damageType: DamageType
      readonly resistances: ReadonlySet<DamageType>
      readonly vulnerabilities: ReadonlySet<DamageType>
      readonly immunities: ReadonlySet<DamageType>
      readonly isCritical: boolean
    }
  | { readonly type: "HEAL"; readonly amount: HealAmount }
  | { readonly type: "GRANT_TEMP_HP"; readonly amount: TempHP; readonly keepOld: boolean }
  | { readonly type: "DEATH_SAVE"; readonly d20Roll: D20Roll }
  | { readonly type: "STABILIZE" }
  | { readonly type: "KNOCK_OUT" }
  | { readonly type: "APPLY_CONDITION"; readonly condition: Condition }
  | { readonly type: "REMOVE_CONDITION"; readonly condition: Condition }
  | { readonly type: "ADD_EXHAUSTION"; readonly levels: number }
  | { readonly type: "REDUCE_EXHAUSTION"; readonly levels: number }
  | {
      readonly type: "START_TURN"
      readonly baseSpeed: number
      readonly armorPenalty: number
      readonly extraAttacks: number
      readonly isSurprised: boolean
      readonly callerSpeedModifier: number
      readonly isGrappling: boolean
      readonly grappledTargetTwoSizesSmaller: boolean
    }
  | { readonly type: "USE_ACTION"; readonly actionType: ActionType }
  | { readonly type: "USE_BONUS_ACTION" }
  | { readonly type: "USE_REACTION" }
  | { readonly type: "USE_MOVEMENT"; readonly feet: number; readonly movementCost: number }
  | { readonly type: "USE_EXTRA_ATTACK" }
  | { readonly type: "STAND_FROM_PRONE" }
  | { readonly type: "DROP_PRONE" }
  | { readonly type: "END_SURPRISE_TURN" }
  | { readonly type: "MARK_BONUS_ACTION_SPELL" }
  | { readonly type: "MARK_NON_CANTRIP_ACTION_SPELL" }

// --- Event extractors ---

type TakeDamageEvent = Extract<DndEvent, { readonly type: "TAKE_DAMAGE" }>
type HealEvent = Extract<DndEvent, { readonly type: "HEAL" }>
type GrantTempHpEvent = Extract<DndEvent, { readonly type: "GRANT_TEMP_HP" }>
type DeathSaveEvent = Extract<DndEvent, { readonly type: "DEATH_SAVE" }>
type ConditionEvent = Extract<DndEvent, { readonly type: "APPLY_CONDITION" | "REMOVE_CONDITION" }>
type ExhaustionEvent = Extract<DndEvent, { readonly type: "ADD_EXHAUSTION" | "REDUCE_EXHAUSTION" }>
type StartTurnEvent = Extract<DndEvent, { readonly type: "START_TURN" }>
type UseActionEvent = Extract<DndEvent, { readonly type: "USE_ACTION" }>
type UseMovementEvent = Extract<DndEvent, { readonly type: "USE_MOVEMENT" }>

export function asTakeDamage(event: DndEvent): TakeDamageEvent {
  return event as TakeDamageEvent
}
export function asHeal(event: DndEvent): HealEvent {
  return event as HealEvent
}
export function asGrantTempHp(event: DndEvent): GrantTempHpEvent {
  return event as GrantTempHpEvent
}
export function asDeathSave(event: DndEvent): DeathSaveEvent {
  return event as DeathSaveEvent
}
export function asCondition(event: DndEvent): ConditionEvent {
  return event as ConditionEvent
}
export function asExhaustion(event: DndEvent): ExhaustionEvent {
  return event as ExhaustionEvent
}
export function asStartTurn(event: DndEvent): StartTurnEvent {
  return event as StartTurnEvent
}
export function asUseAction(event: DndEvent): UseActionEvent {
  return event as UseActionEvent
}
export function asUseMovement(event: DndEvent): UseMovementEvent {
  return event as UseMovementEvent
}

// --- Initial context constants ---

export const INITIAL_CONDITIONS = {
  blinded: false,
  charmed: false,
  deafened: false,
  frightened: false,
  grappled: false,
  invisible: false,
  paralyzed: false,
  petrified: false,
  poisoned: false,
  prone: false,
  restrained: false,
  stunned: false,
  unconscious: false
} as const

export const INITIAL_TURN_STATE = {
  actionUsed: false,
  attackActionUsed: false,
  bonusActionSpellCast: false,
  bonusActionUsed: false,
  disengaged: false,
  dodging: false,
  extraAttacksRemaining: 0,
  freeInteractionUsed: false,
  nonCantripActionSpellCast: false,
  readiedAction: false,
  reactionAvailable: true,
  surprised: false
} as const
