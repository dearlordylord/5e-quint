import { Either } from "effect";

import type {
  McpBattleState,
  McpBattleStateTransitionIssue,
} from "./session-store-types.ts";
import type { McpBattleRosterTransitionIssue } from "./battle-roster-session-types.ts";

export function invalidBattleStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Either.Either<never, McpBattleStateTransitionIssue> {
  return Either.left({
    tag: "invalidBattleStateTransition",
    from,
    to,
  });
}

export function invalidBattleRosterStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Either.Either<
  never,
  Extract<
    McpBattleRosterTransitionIssue,
    { readonly tag: "invalidBattleStateTransition" }
  >
> {
  return Either.left({ tag: "invalidBattleStateTransition", from, to });
}
