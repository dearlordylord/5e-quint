import type {
  ActionType,
  ActiveEffect,
  Condition,
  D20Roll,
  DamageType,
  DeathSaves,
  ExhaustionLevel,
  ExpiryPhase,
  HealAmount,
  HP,
  IncapSource,
  MovementFeet,
  ShoveChoice,
  Size,
  SpellSlots,
  TempHP
} from "#/types.ts"

// --- Machine input ---

export interface DndMachineInput {
  readonly maxHp: number
  readonly hitDiceRemaining?: number
  readonly effectiveSpeed?: number
  readonly movementRemaining?: number
  readonly extraAttacksRemaining?: number
}

// --- Context ---

export interface DndContext {
  readonly hp: HP
  readonly maxHp: HP
  readonly tempHp: TempHP
  readonly deathSaves: DeathSaves
  readonly stable: boolean
  readonly dead: boolean // bridge: endTurn (turnTrack) signals death to damageTrack via always guard
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
  readonly slotsMax: SpellSlots
  readonly slotsCurrent: SpellSlots
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
  readonly hitDiceRemaining: number
  readonly activeEffects: ReadonlyArray<ActiveEffect>
}

// --- Events ---

export interface EndTurnSave {
  readonly spellId: string
  readonly saveSucceeded: boolean
  readonly conditionsToRemove: ReadonlyArray<Condition>
}

export interface EndTurnDamage {
  readonly spellId: string
  readonly damage: number
  readonly damageType: DamageType
  readonly conSaveSucceeded: boolean
}

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
      readonly callerSpeedModifier: number
      readonly isGrappling: boolean
      readonly grappledTargetTwoSizesSmaller: boolean
    }
  | {
      readonly type: "END_TURN"
      readonly endOfTurnSaves: ReadonlyArray<EndTurnSave>
      readonly endOfTurnDamage: ReadonlyArray<EndTurnDamage>
    }
  | { readonly type: "USE_ACTION"; readonly actionType: ActionType }
  | { readonly type: "USE_BONUS_ACTION" }
  | { readonly type: "USE_REACTION" }
  | { readonly type: "USE_MOVEMENT"; readonly feet: number; readonly movementCost: number }
  | { readonly type: "USE_EXTRA_ATTACK" }
  | { readonly type: "STAND_FROM_PRONE" }
  | { readonly type: "DROP_PRONE" }
  | { readonly type: "MARK_BONUS_ACTION_SPELL" }
  | { readonly type: "MARK_NON_CANTRIP_ACTION_SPELL" }
  | {
      readonly type: "GRAPPLE"
      readonly attackerSize: Size
      readonly targetSize: Size
      readonly targetSaveFailed: boolean
      readonly attackerHasFreeHand: boolean
    }
  | { readonly type: "RELEASE_GRAPPLE" }
  | { readonly type: "ESCAPE_GRAPPLE"; readonly escapeSucceeded: boolean }
  | {
      readonly type: "SHOVE"
      readonly attackerSize: Size
      readonly targetSize: Size
      readonly targetSaveFailed: boolean
      readonly choice: ShoveChoice
    }
  | { readonly type: "EXPEND_SLOT"; readonly level: number }
  | { readonly type: "EXPEND_PACT_SLOT" }
  | {
      readonly type: "START_CONCENTRATION"
      readonly spellId: string
      readonly durationTurns: number
      readonly expiresAt: ExpiryPhase
    }
  | {
      readonly type: "ADD_EFFECT"
      readonly spellId: string
      readonly durationTurns: number
      readonly expiresAt: ExpiryPhase
    }
  | { readonly type: "REMOVE_EFFECT"; readonly spellId: string }
  | { readonly type: "BREAK_CONCENTRATION" }
  | { readonly type: "CONCENTRATION_CHECK"; readonly conSaveSucceeded: boolean }
  | { readonly type: "SHORT_REST"; readonly conMod: number; readonly hdRolls: ReadonlyArray<number> }
  | { readonly type: "LONG_REST"; readonly totalHitDice: number }
  | { readonly type: "SPEND_HIT_DIE"; readonly conMod: number; readonly dieRoll: number }
  | {
      readonly type: "APPLY_FALL"
      readonly damageRoll: number
      readonly resistances: ReadonlySet<DamageType>
      readonly vulnerabilities: ReadonlySet<DamageType>
      readonly immunities: ReadonlySet<DamageType>
    }
  | { readonly type: "SUFFOCATE" }
  | { readonly type: "APPLY_STARVATION" }
  | { readonly type: "APPLY_DEHYDRATION"; readonly halfWater: boolean; readonly conSaveSucceeded: boolean }

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
type GrappleEvent = Extract<DndEvent, { readonly type: "GRAPPLE" }>
type EscapeGrappleEvent = Extract<DndEvent, { readonly type: "ESCAPE_GRAPPLE" }>
type ExpendSlotEvent = Extract<DndEvent, { readonly type: "EXPEND_SLOT" }>
type StartConcentrationEvent = Extract<DndEvent, { readonly type: "START_CONCENTRATION" }>
type ConcentrationCheckEvent = Extract<DndEvent, { readonly type: "CONCENTRATION_CHECK" }>
type ShortRestEvent = Extract<DndEvent, { readonly type: "SHORT_REST" }>
type LongRestEvent = Extract<DndEvent, { readonly type: "LONG_REST" }>
type SpendHitDieEvent = Extract<DndEvent, { readonly type: "SPEND_HIT_DIE" }>
type ShoveEvent = Extract<DndEvent, { readonly type: "SHOVE" }>
type ApplyFallEvent = Extract<DndEvent, { readonly type: "APPLY_FALL" }>
type ApplyDehydrationEvent = Extract<DndEvent, { readonly type: "APPLY_DEHYDRATION" }>
type EndTurnEvent = Extract<DndEvent, { readonly type: "END_TURN" }>
type AddEffectEvent = Extract<DndEvent, { readonly type: "ADD_EFFECT" }>
type RemoveEffectEvent = Extract<DndEvent, { readonly type: "REMOVE_EFFECT" }>

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
export function asGrapple(event: DndEvent): GrappleEvent {
  return event as GrappleEvent
}
export function asEscapeGrapple(event: DndEvent): EscapeGrappleEvent {
  return event as EscapeGrappleEvent
}
export function asShove(event: DndEvent): ShoveEvent {
  return event as ShoveEvent
}
export function asExpendSlot(event: DndEvent): ExpendSlotEvent {
  return event as ExpendSlotEvent
}
export function asStartConcentration(event: DndEvent): StartConcentrationEvent {
  return event as StartConcentrationEvent
}
export function asConcentrationCheck(event: DndEvent): ConcentrationCheckEvent {
  return event as ConcentrationCheckEvent
}
export function asShortRest(event: DndEvent): ShortRestEvent {
  return event as ShortRestEvent
}
export function asLongRest(event: DndEvent): LongRestEvent {
  return event as LongRestEvent
}
export function asSpendHitDie(event: DndEvent): SpendHitDieEvent {
  return event as SpendHitDieEvent
}
export function asApplyFall(event: DndEvent): ApplyFallEvent {
  return event as ApplyFallEvent
}
export function asApplyDehydration(event: DndEvent): ApplyDehydrationEvent {
  return event as ApplyDehydrationEvent
}
export function asEndTurn(event: DndEvent): EndTurnEvent {
  return event as EndTurnEvent
}
export function asAddEffect(event: DndEvent): AddEffectEvent {
  return event as AddEffectEvent
}
export function asRemoveEffect(event: DndEvent): RemoveEffectEvent {
  return event as RemoveEffectEvent
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
  reactionAvailable: true
} as const
