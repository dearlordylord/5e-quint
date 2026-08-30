import { Result } from "effect";

import type {
  McpBattleState,
  McpBattleStateTransitionIssue,
} from "./session-store-types.ts";

export function invalidBattleStateTransition(
  from: McpBattleState["tag"],
  to: McpBattleState["tag"],
): Result.Result<
  never,
  Extract<
    McpBattleStateTransitionIssue,
    { readonly tag: "invalidBattleStateTransition" }
  >
> {
  return Result.fail({
    tag: "invalidBattleStateTransition",
    from,
    to,
  });
}
