import { Either } from "effect";

import type {
  McpBattleState,
  McpBattleStateTransitionIssue,
} from "./session-store-types.ts";

export function invalidBattleStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Either.Either<
  never,
  Extract<
    McpBattleStateTransitionIssue,
    { readonly tag: "invalidBattleStateTransition" }
  >
> {
  return Either.left({
    tag: "invalidBattleStateTransition",
    from,
    to,
  });
}
