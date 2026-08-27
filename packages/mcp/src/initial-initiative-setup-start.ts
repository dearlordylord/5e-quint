import {
  battleStateInitIssueMessage,
  startBattleWithInitialInitiativeSetup,
} from "@dnd/battle-runtime";
import { Result } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { initialInitiativeSetupStartPayload } from "./battle-tool-payloads.ts";
import type { StartBattleToolInput } from "./start-battle-tool-input.ts";
import type { StartableBattleCombatants } from "./start-battle-tool.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";

export function startInitialInitiativeSetup(
  root: McpPlaySessionRoot,
  input: StartBattleToolInput,
  combatants: StartableBattleCombatants,
) {
  if (input.companionAdmissions.length > 0) {
    return errorContent(
      "Initial Initiative setup does not support companion admissions.",
      {
        code: "INITIAL_INITIATIVE_SETUP_COMPANIONS_UNSUPPORTED",
      },
    );
  }

  const setup = startBattleWithInitialInitiativeSetup({
    battleId: input.battleId,
    combatants: combatants.creatureInits,
  });
  if (Result.isFailure(setup)) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: battleStateInitIssueMessage(setup.failure),
    });
  }

  return completeBattleStateTransition({
    root,
    transition: root.sessionStore.commitBattleStart({
      nextBattleState: {
        tag: "initialInitiativeSetup",
        setup: setup.success,
      },
      characterSessions: combatants.characterSessions.map(
        ({ session }) => session,
      ),
    }),
    output: () =>
      schemaJsonContent(
        StartBattleOutputSchema,
        initialInitiativeSetupStartPayload(root),
      ),
  });
}
