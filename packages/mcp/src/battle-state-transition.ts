import { Either } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { McpBattleStateTransitionIssue } from "./session-store.ts";
import { errorContent } from "./tool-content.ts";

export function completeBattleStateTransition<A>(input: {
  readonly root: McpPlaySessionRoot;
  readonly transition: Either.Either<void, McpBattleStateTransitionIssue>;
  readonly output: () => A;
}): A | ReturnType<typeof errorContent> {
  if (Either.isLeft(input.transition)) {
    return errorContent("Battle state transition failed.", {
      code: "BATTLE_STATE_TRANSITION_INVALID",
      transition: input.transition.left,
    });
  }
  input.root.sessionStore.pendingBattleFills = null;
  publishAdminProjectionBestEffort(input.root);
  return input.output();
}
