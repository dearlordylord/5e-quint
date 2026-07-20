import type {
  AttackBurstSaveDamageSpellProcedureExecution,
  BlurAttackRollDefenseSpellProcedureExecution,
} from "./character-execution.ts";
import {
  sameDcSource,
  sameExpiration,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
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

export function sameAttackBurstSaveDamageExecution(
  left: AttackBurstSaveDamageSpellProcedureExecution,
  right: AttackBurstSaveDamageSpellProcedureExecution,
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
    left.burst.ability === right.burst.ability &&
    sameDcSource(left.burst.dc, right.burst.dc) &&
    sameSpellTargeting(left.burst.targeting, right.burst.targeting) &&
    sameSpellDamageFacts(left.burst.damage, right.burst.damage) &&
    left.burst.successDamage === right.burst.successDamage
  );
}

export function sameBlurAttackRollDefenseExecution(
  left: BlurAttackRollDefenseSpellProcedureExecution,
  right: BlurAttackRollDefenseSpellProcedureExecution,
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
