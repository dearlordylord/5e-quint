import { startBattleWithInitialInitiativeSetup } from "@dnd/battle-runtime";
import { composeBattleCompanionRoster } from "@dnd/character-battle-runtime";
import { Result, Match } from "effect";

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
  battleCompanionRosterIssuePayload,
  battleRosterIssuePayload,
} from "./battle-start-failure.ts";

export function startInitialInitiativeSetup(
  root: McpPlaySessionRoot,
  input: StartBattleToolInput,
  combatants: StartableBattleCombatants,
) {
  const rosterIssues = Match.value(combatants.composition).pipe(
    Match.when({ tag: "admitted" }, () => []),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      issues.flatMap((issue) => battleRosterIssuePayload(issue)),
    ),
    Match.exhaustive,
  );
  const companionValidation = composeBattleCompanionRoster({
    session: undefined,
    owners: combatants.characterSessions.map(
      ({ index, character, session }) => ({
        index,
        characterId: character.characterId,
        combatantId: character.combatantId,
        sheet: session,
      }),
    ),
    requests: input.companionAdmissions,
    unitLibrary: root.unitLibrary,
    initialCombatantOrder: combatants.initialCombatantOrder,
    statBlockCatalog: root.statBlockCatalog,
  });
  const companionIssues = Match.value(companionValidation).pipe(
    Match.when({ tag: "admitted" }, () => []),
    Match.when({ tag: "rejected" }, ({ issues }) => issues),
    Match.when({ tag: "dependentUnavailable" }, ({ issues }) => issues),
    Match.exhaustive,
  );
  if (input.companionAdmissions.length > 0) {
    return errorContent(
      "Initial Initiative setup does not support companion admissions.",
      {
        code: "INITIAL_INITIATIVE_SETUP_COMPANIONS_UNSUPPORTED",
        issues: [
          ...rosterIssues,
          ...companionIssues.flatMap(battleCompanionRosterIssuePayload),
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

  const admissions = Match.value(combatants.composition).pipe(
    Match.when({ tag: "admitted" }, ({ admissions }) => admissions),
    Match.when({ tag: "rejected" }, ({ admissions }) => admissions),
    Match.exhaustive,
  );
  if (admissions.length === 0) {
    return battleStartIssuesContent(rosterIssues);
  }

  const setup = startBattleWithInitialInitiativeSetup({
    battleId: input.battleId,
    combatants: admissions.map(({ combatant }) => combatant),
    ownerPathForCombatant: (combatant) =>
      combatants.ownerPaths.get(combatant.combatantId) ?? [
        "battleInitialization",
        "global",
      ],
  });
  if (Result.isFailure(setup)) {
    return battleStartIssuesContent([
      ...rosterIssues,
      ...battleRuntimeIssuePayload(setup.failure),
    ]);
  }
  if (combatants.composition.tag === "rejected") {
    return battleStartIssuesContent(rosterIssues);
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
