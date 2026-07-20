import type {
  HeldLightHurlSpellProcedureExecution,
  HideousLaughterSpellProcedureExecution,
} from "./character-execution.ts";
import { sameDcSource } from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameSpellDamageFacts,
  sameSpellTargeting,
} from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameHeldLightHurlExecution(
  left: HeldLightHurlSpellProcedureExecution,
  right: HeldLightHurlSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.sourceEffectRef === right.sourceEffectRef &&
    left.sourceHeldLightProcedureRef === right.sourceHeldLightProcedureRef &&
    left.attackBonus === right.attackBonus &&
    left.attackKind === right.attackKind &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameHideousLaughterExecution(
  left: HideousLaughterSpellProcedureExecution,
  right: HideousLaughterSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.actionCost === right.actionCost &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}
