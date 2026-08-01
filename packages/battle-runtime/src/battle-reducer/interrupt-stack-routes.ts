import type {
  AdmittedBattleResolutionInput,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import { currentInterruptCheckpoint } from "./battle-snapshot.ts";
import {
  battleReducerRouteHoles,
  discoverBattleActsRoute,
} from "./reducer-route-builders.ts";
import type { BattleReducerRouteEvent } from "./reducer-route-protocol.ts";
import { reactionSpellRouteSubjectForInterruptFrame } from "./reaction-spell-routes.ts";

export function interruptStackResumeDiscoveryRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvent | undefined {
  if (result.tag !== "needsHoles") {
    return undefined;
  }
  const holes = battleReducerRouteHoles(result.holes);
  const discoversInterruptDecision = holes.includes("interruptDecision");
  const discoversReplayContinuationHole =
    input.state.interruptStack.at(-1)?.kind === "replayContinuation" &&
    holes.includes("rolledDice");
  if (!discoversInterruptDecision && !discoversReplayContinuationHole) {
    return undefined;
  }

  const frame = currentInterruptCheckpoint(result.state);
  const reactionSpellSubject =
    discoversInterruptDecision && frame !== null
      ? reactionSpellRouteSubjectForInterruptFrame(result.state, frame)
      : undefined;
  return discoverBattleActsRoute(
    reactionSpellSubject ?? "interruptStackResume",
    holes,
    "battleInterruptStack",
  );
}
