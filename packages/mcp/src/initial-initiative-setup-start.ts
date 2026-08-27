import { startBattleWithInitialInitiativeSetup } from "@dnd/battle-runtime";
import { Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { StartBattleOutputSchema } from "./battle-tool-output.ts";
import { initialInitiativeSetupStartPayload } from "./battle-tool-payloads.ts";
import type { StartBattleToolInput } from "./start-battle-tool-input.ts";
import type { StartableBattleCombatants } from "./start-battle-tool.ts";
import { schemaJsonContent } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import { completeBattleStateTransition } from "./battle-state-transition.ts";
import {
  battleRuntimeIssuePayload,
  battleStartIssuesContent,
  battleRosterIssuePayload,
} from "./battle-start-failure.ts";

export function startInitialInitiativeSetup(
  root: McpPlaySessionRoot,
  input: StartBattleToolInput,
  combatants: StartableBattleCombatants,
) {
  const rosterIssues = combatants.issues.flatMap((issue) =>
    battleRosterIssuePayload(issue),
  );
  if (input.companionAdmissions.length > 0) {
    return errorContent(
      "Initial Initiative setup does not support companion admissions.",
      {
        code: "INITIAL_INITIATIVE_SETUP_COMPANIONS_UNSUPPORTED",
        issues: [
          ...rosterIssues,
          ...input.companionAdmissions.map((admission, index) => ({
            kind: "companionAdmissionUnsupported",
            ownerPath: ["companionAdmissions", index],
            code: "INITIAL_INITIATIVE_SETUP_COMPANIONS_UNSUPPORTED",
            ownerCharacterId: admission.ownerCharacterId,
            ...(admission.companionCombatantId === undefined
              ? {}
              : { companionCombatantId: admission.companionCombatantId }),
            reason: "initialSetupDoesNotAdmitCompanions",
          })),
        ],
      },
    );
  }

  if (combatants.creatureInits.length === 0) {
    return battleStartIssuesContent(rosterIssues);
  }

  const setup = startBattleWithInitialInitiativeSetup({
    battleId: input.battleId,
    combatants: combatants.creatureInits,
    ownerPathForCombatant: (combatant) =>
      combatants.ownerPaths.get(combatant.combatantId) ?? [
        "battleInitialization",
      ],
  });
  if (Either.isLeft(setup)) {
    return battleStartIssuesContent([
      ...rosterIssues,
      ...battleRuntimeIssuePayload(setup.left),
    ]);
  }
  if (combatants.issues.length > 0) {
    return battleStartIssuesContent(rosterIssues);
  }

  return completeBattleStateTransition({
    root,
    transition: root.sessionStore.commitBattleStart({
      nextBattleState: {
        tag: "initialInitiativeSetup",
        setup: setup.right,
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
