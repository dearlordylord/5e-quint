import type {
  CounterspellSpellProcedureExecution,
  CreatureSizeDecreaseSpellProcedureExecution,
  CreatureSizeIncreaseSpellProcedureExecution,
  CreatureTypeProtectionSpellProcedureExecution,
} from "./character-execution.ts";
import { Match } from "effect";
import { samePrimitiveSet } from "./mechanical-equality.ts";
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

export function sameCounterspellExecution(
  left: CounterspellSpellProcedureExecution,
  right: CounterspellSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    samePrimitiveSet(left.triggerComponents, right.triggerComponents) &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameCreatureSizeDecreaseExecution(
  left: CreatureSizeDecreaseSpellProcedureExecution,
  right: CreatureSizeDecreaseSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.direction === right.activeEffect.direction &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameCreatureSizeIncreaseExecution(
  left: CreatureSizeIncreaseSpellProcedureExecution,
  right: CreatureSizeIncreaseSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.direction === right.activeEffect.direction &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

function sameCreatureTypeProtectionTargeting(
  left: CreatureTypeProtectionSpellProcedureExecution["targeting"],
  right: CreatureTypeProtectionSpellProcedureExecution["targeting"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      self: () => right.kind === "self",
      targetList: (value) =>
        right.kind === "targetList" &&
        value.minTargets === right.minTargets &&
        value.maxTargets === right.maxTargets,
    }),
  );
}

export function sameCreatureTypeProtectionExecution(
  left: CreatureTypeProtectionSpellProcedureExecution,
  right: CreatureTypeProtectionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    sameCreatureTypeProtectionTargeting(left.targeting, right.targeting) &&
    left.activeEffect.kind === right.activeEffect.kind &&
    sameActiveEffectSource(left.activeEffect, right.activeEffect) &&
    left.activeEffect.attackRollMode === right.activeEffect.attackRollMode &&
    samePrimitiveSet(
      left.activeEffect.protectedAgainstCreatureTypes,
      right.activeEffect.protectedAgainstCreatureTypes,
    ) &&
    samePrimitiveSet(
      left.activeEffect.preventedConditions,
      right.activeEffect.preventedConditions,
    ) &&
    left.activeEffect.preventsPossession ===
      right.activeEffect.preventsPossession &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}
