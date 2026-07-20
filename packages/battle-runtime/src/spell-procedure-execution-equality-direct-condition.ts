import type {
  DirectConditionRemovalSpellProcedureExecution,
  DirectConditionSpellProcedureExecution,
} from "./character-execution.ts";
import { samePrimitiveSet } from "./mechanical-equality.ts";
import { sameExpiration } from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameActiveEffectSource,
  sameSpellTargeting,
} from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameDirectConditionExecution(
  left: DirectConditionSpellProcedureExecution,
  right: DirectConditionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.condition === right.activeEffect.condition &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameDirectConditionRemovalExecution(
  left: DirectConditionRemovalSpellProcedureExecution,
  right: DirectConditionRemovalSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    samePrimitiveSet(left.conditionChoices, right.conditionChoices)
  );
}
