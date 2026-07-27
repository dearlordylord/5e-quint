import type { SpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
import { sameDomainValue } from "./domain-value-equality.ts";

export function sameSpellProcedureExecution(
  left: SpellProcedureExecution,
  right: SpellProcedureExecution,
): boolean {
  return sameDomainValue(left, right);
}
