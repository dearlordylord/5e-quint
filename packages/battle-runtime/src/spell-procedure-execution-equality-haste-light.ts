import type {
  HastePositiveSpellProcedureExecution,
  HeldLightSpellProcedureExecution,
} from "./character-execution.ts";
import {
  sameSpellDamageFacts,
  sameSpellTargeting,
  sameActionRestriction,
  sameActiveEffectSource,
} from "./spell-mechanical-equality.ts";
import { sameExpiration } from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameHastePositiveExecution(
  left: HastePositiveSpellProcedureExecution,
  right: HastePositiveSpellProcedureExecution,
): boolean {
  const leftEffects = left.activeEffects;
  const rightEffects = right.activeEffects;

  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    left.targeting.kind === right.targeting.kind &&
    left.targeting.minTargets === right.targeting.minTargets &&
    left.targeting.maxTargets === right.targeting.maxTargets &&
    left.targeting.requiredTargetDisposition ===
      right.targeting.requiredTargetDisposition &&
    leftEffects.speedRatio.kind === rightEffects.speedRatio.kind &&
    sameActiveEffectSource(leftEffects.speedRatio, rightEffects.speedRatio) &&
    leftEffects.speedRatio.numerator === rightEffects.speedRatio.numerator &&
    leftEffects.speedRatio.denominator ===
      rightEffects.speedRatio.denominator &&
    sameExpiration(
      leftEffects.speedRatio.expiresAt,
      rightEffects.speedRatio.expiresAt,
    ) &&
    leftEffects.armorClassBonus.kind === rightEffects.armorClassBonus.kind &&
    sameActiveEffectSource(
      leftEffects.armorClassBonus,
      rightEffects.armorClassBonus,
    ) &&
    leftEffects.armorClassBonus.bonus === rightEffects.armorClassBonus.bonus &&
    leftEffects.armorClassBonus.negatesRepeatedDamageAllocation ===
      rightEffects.armorClassBonus.negatesRepeatedDamageAllocation &&
    sameExpiration(
      leftEffects.armorClassBonus.expiresAt,
      rightEffects.armorClassBonus.expiresAt,
    ) &&
    leftEffects.dexteritySavingThrowAdvantage.kind ===
      rightEffects.dexteritySavingThrowAdvantage.kind &&
    sameActiveEffectSource(
      leftEffects.dexteritySavingThrowAdvantage,
      rightEffects.dexteritySavingThrowAdvantage,
    ) &&
    leftEffects.dexteritySavingThrowAdvantage.ability ===
      rightEffects.dexteritySavingThrowAdvantage.ability &&
    leftEffects.dexteritySavingThrowAdvantage.mode ===
      rightEffects.dexteritySavingThrowAdvantage.mode &&
    sameExpiration(
      leftEffects.dexteritySavingThrowAdvantage.expiresAt,
      rightEffects.dexteritySavingThrowAdvantage.expiresAt,
    ) &&
    leftEffects.grantedActionResource.kind ===
      rightEffects.grantedActionResource.kind &&
    sameActiveEffectSource(
      leftEffects.grantedActionResource,
      rightEffects.grantedActionResource,
    ) &&
    sameActionRestriction(
      leftEffects.grantedActionResource.restriction,
      rightEffects.grantedActionResource.restriction,
    ) &&
    sameExpiration(
      leftEffects.grantedActionResource.expiresAt,
      rightEffects.grantedActionResource.expiresAt,
    ) &&
    leftEffects.spellEndTargetState.kind ===
      rightEffects.spellEndTargetState.kind &&
    sameActiveEffectSource(
      leftEffects.spellEndTargetState,
      rightEffects.spellEndTargetState,
    ) &&
    leftEffects.spellEndTargetState.condition ===
      rightEffects.spellEndTargetState.condition &&
    sameExpiration(
      leftEffects.spellEndTargetState.expiresAt,
      rightEffects.spellEndTargetState.expiresAt,
    )
  );
}

export function sameHeldLightExecution(
  left: HeldLightSpellProcedureExecution,
  right: HeldLightSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.light.brightRadiusFeet === right.light.brightRadiusFeet &&
    left.light.dimAdditionalFeet === right.light.dimAdditionalFeet &&
    left.hurl.attackBonus === right.hurl.attackBonus &&
    left.hurl.attackKind === right.hurl.attackKind &&
    sameSpellDamageFacts(left.hurl.damage, right.hurl.damage) &&
    left.hurl.rangeFeet === right.hurl.rangeFeet &&
    sameSpellTargeting(left.hurl.targeting, right.hurl.targeting) &&
    sameExpiration(left.expiresAt, right.expiresAt)
  );
}
