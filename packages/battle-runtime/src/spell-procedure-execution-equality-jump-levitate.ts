import type {
  JumpMovementReplacementSpellProcedureExecution,
  LevitatedCreatureSpellProcedureExecution,
} from "./character-execution.ts";
import {
  sameDcSource,
  sameExpiration,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameActiveEffectSource,
  sameSpellTargeting,
} from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameJumpMovementReplacementExecution(
  left: JumpMovementReplacementSpellProcedureExecution,
  right: JumpMovementReplacementSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.movementCostFeet ===
      right.activeEffect.movementCostFeet &&
    left.activeEffect.maxJumpDistanceFeet ===
      right.activeEffect.maxJumpDistanceFeet &&
    left.activeEffect.usedThisTurn === right.activeEffect.usedThisTurn &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameLevitatedCreatureExecution(
  left: LevitatedCreatureSpellProcedureExecution,
  right: LevitatedCreatureSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.maxInitialRiseFeet === right.maxInitialRiseFeet &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.maxAltitudeChangeFeet ===
      right.activeEffect.maxAltitudeChangeFeet &&
    left.activeEffect.rangeFeet === right.activeEffect.rangeFeet &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}
