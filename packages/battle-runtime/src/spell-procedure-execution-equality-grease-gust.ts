import type {
  GreaseGroundHazardSpellProcedureExecution,
  GustOfWindLineSpellProcedureExecution,
} from "./character-execution.ts";
import { sameDcSource } from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import { sameSpellTargeting } from "./spell-mechanical-equality.ts";
import {
  sameSpellAccess,
  sameSpellResource,
  sameSpellRuleExecutionFacts,
} from "./spell-procedure-execution-equality.ts";

export function sameGreaseGroundHazardExecution(
  left: GreaseGroundHazardSpellProcedureExecution,
  right: GreaseGroundHazardSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}

export function sameGustOfWindLineExecution(
  left: GustOfWindLineSpellProcedureExecution,
  right: GustOfWindLineSpellProcedureExecution,
): boolean {
  return (
    sameSpellRuleExecutionFacts(left.spellRuleFacts, right.spellRuleFacts) &&
    sameSpellAccess(left.access, right.access) &&
    sameSpellResource(left.resource, right.resource) &&
    left.ability === right.ability &&
    sameDcSource(left.dc, right.dc) &&
    left.durationTicks === right.durationTicks &&
    left.rangeFeet === right.rangeFeet &&
    left.pushDistanceFeet === right.pushDistanceFeet &&
    left.movementCost.multiplier === right.movementCost.multiplier &&
    left.movementCost.appliesTo === right.movementCost.appliesTo &&
    sameSpellTargeting(left.targeting, right.targeting)
  );
}
