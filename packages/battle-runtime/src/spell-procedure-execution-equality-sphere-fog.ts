import type {
  FlamingSphereSpellProcedureExecution,
  FogCloudObscurementSpellProcedureExecution,
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

export function sameFlamingSphereExecution(
  left: FlamingSphereSpellProcedureExecution,
  right: FlamingSphereSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    sameSpellDamageFacts(left.damage, right.damage) &&
    left.durationTicks === right.durationTicks &&
    left.ramMaxMoveFeet === right.ramMaxMoveFeet &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameFogCloudObscurementExecution(
  left: FogCloudObscurementSpellProcedureExecution,
  right: FogCloudObscurementSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}
