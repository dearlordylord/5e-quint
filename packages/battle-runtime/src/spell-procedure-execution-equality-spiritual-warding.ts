import type {
  SpiritualWeaponRepeatAttackSpellProcedureExecution,
  WardingBondSpellProcedureExecution,
} from "./character-execution.ts";
import { sameExpiration } from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import { sameActiveEffectSource } from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameSpiritualWeaponRepeatAttackExecution(
  left: SpiritualWeaponRepeatAttackSpellProcedureExecution,
  right: SpiritualWeaponRepeatAttackSpellProcedureExecution,
): boolean {
  return (
    left.activeEffectRef === right.activeEffectRef &&
    left.activeEffectSourceProcedureRef ===
      right.activeEffectSourceProcedureRef
  );
}

export function sameWardingBondExecution(
  left: WardingBondSpellProcedureExecution,
  right: WardingBondSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    left.connectionRangeFeet === right.connectionRangeFeet &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}
