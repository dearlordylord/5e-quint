import {
  battleStateInitIssueMessage,
  startBattleWithInitialInitiativeSetup,
} from "@dnd/battle-runtime";
import { Either } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { initialInitiativeSetupStartPayload } from "./battle-tool-payloads.ts";
import type { StartBattleToolInput } from "./start-battle-tool-input.ts";
import type { StartableBattleCombatants } from "./start-battle-tool.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

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
  if (Either.isLeft(setup)) {
    return errorContent("Battle session start failed.", {
      code: "BATTLE_START_FAILED",
      message: battleStateInitIssueMessage(setup.left),
    });
  }

  const inBattleSessions = combatants.characterSessions.map(
    ({ session }) =>
      ({
        tag: "inBattle",
        sheet: session,
        battleId: input.battleId,
      }) as const,
  );
  const committed = root.sessionStore.characters.setAll(inBattleSessions);
  if (Either.isLeft(committed)) {
    return errorContent("Battle character session admission commit failed.", {
      code: "CHARACTER_SESSION_COMMIT_INVALID",
      battleId: input.battleId,
      message: `Character Session registry rejected battle admission: ${committed.left.tag}.`,
      registryIssue: committed.left,
      affectedCharacterIds: inBattleSessions.map(
        (session) => session.sheet.characterId,
      ),
      recovery: {
        tag: "characterSessionsUnchanged",
        guidance:
          "No Character Session was committed; correct the session conflict and retry start_battle.",
      },
    });
  }

  root.sessionStore.battleState = {
    tag: "initialInitiativeSetup",
    setup: setup.right,
  };
  root.sessionStore.pendingBattleFills = null;
  publishAdminProjectionBestEffort(root);
  return schemaJsonContent(
    StartBattleOutputSchema,
    initialInitiativeSetupStartPayload(root),
  );
}
