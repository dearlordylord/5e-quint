// Event extractor functions — extracted from machine-types.ts for max-lines.

import type { DndEvent } from "#/machine-types.ts"

type TakeDamageEvent = Extract<DndEvent, { readonly type: "TAKE_DAMAGE" }>
type HealEvent = Extract<DndEvent, { readonly type: "HEAL" }>
type GrantTempHpEvent = Extract<DndEvent, { readonly type: "GRANT_TEMP_HP" }>
type DeathSaveEvent = Extract<DndEvent, { readonly type: "DEATH_SAVE" }>
type ApplyConditionEvent = Extract<DndEvent, { readonly type: "APPLY_CONDITION" }>
type ConditionEvent = Extract<DndEvent, { readonly type: "APPLY_CONDITION" | "REMOVE_CONDITION" }>
type AddExhaustionEvent = Extract<DndEvent, { readonly type: "ADD_EXHAUSTION" }>
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
type SpendHitDieEvent = Extract<DndEvent, { readonly type: "SPEND_HIT_DIE" }>
type ShoveEvent = Extract<DndEvent, { readonly type: "SHOVE" }>
type ApplyFallEvent = Extract<DndEvent, { readonly type: "APPLY_FALL" }>
type UseSecondWindEvent = Extract<DndEvent, { readonly type: "USE_SECOND_WIND" }>
type UseTacticalMindEvent = Extract<DndEvent, { readonly type: "USE_TACTICAL_MIND" }>
type UseBonusMovementEvent = Extract<DndEvent, { readonly type: "USE_BONUS_MOVEMENT" }>
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
export function asApplyCondition(event: DndEvent): ApplyConditionEvent {
  return event as ApplyConditionEvent
}
export function asCondition(event: DndEvent): ConditionEvent {
  return event as ConditionEvent
}
export function asAddExhaustion(event: DndEvent): AddExhaustionEvent {
  return event as AddExhaustionEvent
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
export function asSpendHitDie(event: DndEvent): SpendHitDieEvent {
  return event as SpendHitDieEvent
}
export function asApplyFall(event: DndEvent): ApplyFallEvent {
  return event as ApplyFallEvent
}
export function asUseSecondWind(event: DndEvent): UseSecondWindEvent {
  return event as UseSecondWindEvent
}
export function asUseTacticalMind(event: DndEvent): UseTacticalMindEvent {
  return event as UseTacticalMindEvent
}
export function asUseBonusMovement(event: DndEvent): UseBonusMovementEvent {
  return event as UseBonusMovementEvent
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
