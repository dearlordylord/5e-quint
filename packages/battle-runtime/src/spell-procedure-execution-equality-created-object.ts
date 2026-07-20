import type {
  SpellCreatedHeldObjectAttackSpellProcedureExecution,
  SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  SpellCreatedHeldObjectSpellProcedureExecution,
} from "./character-execution.ts";
import { sameExpiration } from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameActiveEffectSource,
  sameSpellDamageFacts,
  sameSpellTargeting,
} from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

type SpellCreatedHeldObjectMechanicalEffect =
  SpellCreatedHeldObjectSpellProcedureExecution["activeEffect"];

export function sameSpellCreatedHeldObjectMechanicalEffect(
  left: SpellCreatedHeldObjectMechanicalEffect,
  right: SpellCreatedHeldObjectMechanicalEffect,
): boolean {
  return (
    left.kind === right.kind &&
    left.objectState.kind === right.objectState.kind &&
    left.light.brightRadiusFeet === right.light.brightRadiusFeet &&
    left.light.dimAdditionalFeet === right.light.dimAdditionalFeet &&
    left.attack.attackKind === right.attack.attackKind &&
    left.attack.attackBonus === right.attack.attackBonus &&
    sameSpellDamageFacts(left.attack.damage, right.attack.damage) &&
    sameActiveEffectSource(left, right) &&
    sameExpiration(left.expiresAt, right.expiresAt)
  );
}

export function sameSpellCreatedHeldObjectExecution(
  left: SpellCreatedHeldObjectSpellProcedureExecution,
  right: SpellCreatedHeldObjectSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    sameSpellCreatedHeldObjectMechanicalEffect(
      left.activeEffect,
      right.activeEffect,
    )
  );
}

export function sameSpellCreatedHeldObjectAttackExecution(
  left: SpellCreatedHeldObjectAttackSpellProcedureExecution,
  right: SpellCreatedHeldObjectAttackSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.attackBonus === right.attackBonus &&
    left.attackKind === right.attackKind &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.sourceEffectRef === right.sourceEffectRef &&
    left.sourceHeldObjectProcedureRef === right.sourceHeldObjectProcedureRef
  );
}

export function sameSpellCreatedHeldObjectReEvokeExecution(
  left: SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  right: SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.sourceEffectRef === right.sourceEffectRef &&
    left.sourceHeldObjectProcedureRef === right.sourceHeldObjectProcedureRef
  );
}
