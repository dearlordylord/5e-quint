// KERNEL-COVERAGE: runtime-owner BATTLE.REACTION.OFFER_DECLINE_RESUME

import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { combatantCanTakeReactions } from "./creature-state-execution.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";

export function resolveReportReadyTriggerCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "reportReadyTrigger";
      }
    >
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reporting a Ready trigger accepts no fills.",
    );
  }
  const readiedActor = input.state.combatants.get(input.subject.readiedActorId);
  if (
    !input.state.readiedResponses.has(input.subject.readiedActorId) ||
    readiedActor === undefined ||
    !combatantCanTakeReactions(readiedActor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The declared Ready response is no longer available.",
    );
  }
  return (
    maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "reportedReadyTrigger",
        readiedActorId: input.subject.readiedActorId,
        resumeSubjectResolutionPhase: input.state.subjectResolutionPhase,
        continuation: { kind: "resolved", subject: input.subject },
      },
      undefined,
    ) ?? resolvedResult(input.state)
  );
}
