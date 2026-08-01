import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
} from "./reducer-route-protocol.ts";
import { nonEmptyRouteEvents } from "./reducer-route-builders.ts";

type BattleReducerRouteCandidate =
  | {
      readonly kind: "terminal";
      readonly evaluate: () => BattleReducerRouteEvents | undefined;
    }
  | {
      readonly kind: "composable";
      readonly evaluate: () => BattleReducerRouteEvents | undefined;
    };

export function terminalRouteCandidate(
  evaluate: () => BattleReducerRouteEvents | undefined,
): BattleReducerRouteCandidate {
  return { kind: "terminal", evaluate };
}

export function composableRouteCandidate(
  evaluate: () => BattleReducerRouteEvents | undefined,
): BattleReducerRouteCandidate {
  return { kind: "composable", evaluate };
}

/**
 * Evaluate route owners in declared priority order. Composable owners
 * accumulate route events; the first applicable terminal owner closes the
 * composition. Later candidates are never evaluated after a terminal match.
 */
export function composeReducerRouteCandidates(
  candidates: readonly BattleReducerRouteCandidate[],
): BattleReducerRouteEvents | undefined {
  const accumulated: BattleReducerRouteEvent[] = [];
  for (const candidate of candidates) {
    const events = candidate.evaluate();
    if (events === undefined) continue;
    if (candidate.kind === "terminal") {
      return nonEmptyRouteEvents([...accumulated, ...events]);
    }
    accumulated.push(...events);
  }
  return nonEmptyRouteEvents(accumulated);
}

export function appendTerminalRouteEvents(
  route: BattleReducerRouteEvents | undefined,
  terminalAppend: BattleReducerRouteEvents | undefined,
): BattleReducerRouteEvents | undefined {
  if (route === undefined) return terminalAppend;
  if (terminalAppend === undefined) return route;
  return nonEmptyRouteEvents([...route, ...terminalAppend]);
}
