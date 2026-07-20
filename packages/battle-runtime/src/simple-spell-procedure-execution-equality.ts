import type {
  SeeInvisibleObserverSightSpellProcedureExecution,
  SelfTeleportSpellProcedureExecution,
  ShieldReactionSpellProcedureExecution,
  SleepTargetAdmissionSpellProcedureExecution,
  ThaumaturgyBoomingVoiceSpellProcedureExecution,
} from "./character-execution.ts";
import {
  sameDcSource,
  sameExpiration,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import { sameSpellTargeting } from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameSelfTeleportExecution(
  left: SelfTeleportSpellProcedureExecution,
  right: SelfTeleportSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.maxDistanceFeet === right.maxDistanceFeet
  );
}

export function sameSeeInvisibleObserverSightExecution(
  left: SeeInvisibleObserverSightSpellProcedureExecution,
  right: SeeInvisibleObserverSightSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameThaumaturgyBoomingVoiceExecution(
  left: ThaumaturgyBoomingVoiceSpellProcedureExecution,
  right: ThaumaturgyBoomingVoiceSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.rangeFeet === right.rangeFeet &&
    left.activeEffect.kind === right.activeEffect.kind &&
    left.activeEffect.sourceCombatantId ===
      right.activeEffect.sourceCombatantId &&
    sameExpiration(left.activeEffect.expiresAt, right.activeEffect.expiresAt)
  );
}

export function sameShieldReactionExecution(
  left: ShieldReactionSpellProcedureExecution,
  right: ShieldReactionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.armorClassBonus === right.armorClassBonus &&
    left.negatesRepeatedDamageAllocation ===
      right.negatesRepeatedDamageAllocation
  );
}

export function sameSleepTargetAdmissionExecution(
  left: SleepTargetAdmissionSpellProcedureExecution,
  right: SleepTargetAdmissionSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}
