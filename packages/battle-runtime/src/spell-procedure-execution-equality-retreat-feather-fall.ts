import type {
  ExpeditiousRetreatDashSpellProcedureExecution,
  FeatherFallMitigationSpellProcedureExecution,
} from "./character-execution.ts";
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

export function sameExpeditiousRetreatDashExecution(
  left: ExpeditiousRetreatDashSpellProcedureExecution,
  right: ExpeditiousRetreatDashSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameFeatherFallMitigationExecution(
  left: FeatherFallMitigationSpellProcedureExecution,
  right: FeatherFallMitigationSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}
