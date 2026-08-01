// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN

import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { breakBattleConcentration } from "./damage-apply.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";

type EndConcentrationSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
>;

export function resolveEndConcentrationCommand(
  input: BattleResolutionInputForSubject<EndConcentrationSubject>,
): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fills.length > 0) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "End Concentration does not accept fills.",
    );
  }
  /* v8 ignore stop */
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined || actor.concentration === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "End Concentration is no longer available.",
    );
  }
  return resolvedResult(
    breakBattleConcentration(input.state, input.subject.actorId),
  );
}
