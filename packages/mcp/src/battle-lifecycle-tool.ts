import {
  addBattleRuntimeCombatant,
  battleStateInitIssueMessage,
  removeBattleRuntimeCombatants,
  type BattleCreatureState,
  type CombatantId,
  type BattleRuntimeSession,
} from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import { Either, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  battlePresentationProjection,
  battleSnapshotPresentationIssueContent,
} from "./battle-tool-payloads.ts";
import { BattleLifecycleOutputSchema } from "./battle-tool-output.ts";
import type { ApplyBattleLifecycleOperationToolInput } from "./battle-lifecycle-tool-input.ts";
import { projectBattleCombatant } from "./start-battle-tool.ts";
import type { CharacterSession } from "./session-store.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";

const BATTLE_LIFECYCLE_RECOVERY = {
  tag: "battleAndCharacterSessionsUnchanged",
  guidance:
    "No Battle or Character Session was committed; correct the reported conflict and retry apply_battle_lifecycle_operation.",
} as const;

export function handleApplyBattleLifecycleOperationToolCall(
  root: McpPlaySessionRoot,
  input: ApplyBattleLifecycleOperationToolInput,
) {
  const activeBattle = activeBattleForLifecycle(root);
  if (Either.isLeft(activeBattle)) return activeBattle.left;

  return Match.value(input.operation).pipe(
    Match.when({ kind: "addCombatant" }, (operation) =>
      addCombatant(root, activeBattle.right, operation.combatant),
    ),
    Match.when({ kind: "removeCombatant" }, (operation) =>
      removeCombatant(root, activeBattle.right, operation.combatantId),
    ),
    Match.exhaustive,
  );
}

function addCombatant(
  root: McpPlaySessionRoot,
  activeBattle: BattleRuntimeSession,
  combatant: Parameters<typeof projectBattleCombatant>[0]["combatant"],
) {
  const projection = projectBattleCombatant({ root, combatant });
  if (Either.isLeft(projection)) {
    return lifecycleFailureFromToolError(projection.left);
  }

  const nextBattle = addBattleRuntimeCombatant({
    session: activeBattle,
    combatant: projection.right.creatureInit,
  });
  if (Either.isLeft(nextBattle)) {
    return lifecycleError("Battle combatant admission failed.", {
      code: "BATTLE_COMBATANT_ADMISSION_FAILED",
      combatantId: combatant.combatantId,
      message: battleStateInitIssueMessage(nextBattle.left),
    });
  }

  const nextCharacterSessions =
    projection.right.tag === "characterSession"
      ? [
          {
            tag: "inBattle" as const,
            sheet: projection.right.characterSession.session,
            battleId: activeBattle.state.battleId,
          },
        ]
      : [];
  const presentation = battlePresentationForCommit(nextBattle.right);
  if (Either.isLeft(presentation)) return presentation.left;

  return commitBattleLifecycleTransition({
    root,
    nextBattle: nextBattle.right,
    nextCharacterSessions,
    result: {
      tag: "combatantAdded",
      combatantId: combatant.combatantId,
    },
    presentation: presentation.right,
  });
}

function removeCombatant(
  root: McpPlaySessionRoot,
  activeBattle: BattleRuntimeSession,
  combatantId: CombatantId,
) {
  const combatant = activeBattle.state.combatants.get(combatantId);
  if (combatant === undefined) {
    return lifecycleError("Battle combatant is not in the current battle.", {
      code: "BATTLE_COMBATANT_NOT_FOUND",
      combatantId,
    });
  }

  const settledCharacterSessions = settleRemovedCharacterSession(
    root,
    activeBattle,
    combatant,
  );
  if (Either.isLeft(settledCharacterSessions)) {
    return settledCharacterSessions.left;
  }

  const nextBattle = removeBattleRuntimeCombatants({
    session: activeBattle,
    combatantIds: [combatantId],
  });
  if (Either.isLeft(nextBattle)) {
    return lifecycleError("Battle combatant removal failed.", {
      code: "BATTLE_COMBATANT_REMOVAL_FAILED",
      combatantId,
      message: battleStateInitIssueMessage(nextBattle.left),
    });
  }

  const removedCombatantIds = [...activeBattle.state.combatants.keys()].filter(
    (id) => !nextBattle.right.state.combatants.has(id),
  );
  if (removedCombatantIds.length === 0) {
    return lifecycleError(
      "Battle combatant removal produced no roster change.",
      {
        code: "BATTLE_COMBATANT_REMOVAL_EMPTY",
        combatantId,
      },
    );
  }

  const presentation = battlePresentationForCommit(nextBattle.right);
  if (Either.isLeft(presentation)) return presentation.left;

  const nonEmptyRemovedCombatantIds: [CombatantId, ...CombatantId[]] = [
    removedCombatantIds[0]!,
    ...removedCombatantIds.slice(1),
  ];

  return commitBattleLifecycleTransition({
    root,
    nextBattle: nextBattle.right,
    nextCharacterSessions: settledCharacterSessions.right,
    result: {
      tag: "combatantRemoved",
      combatantId,
      removedCombatantIds: nonEmptyRemovedCombatantIds,
    },
    presentation: presentation.right,
  });
}

function settleRemovedCharacterSession(
  root: McpPlaySessionRoot,
  activeBattle: BattleRuntimeSession,
  combatant: BattleCreatureState,
): Either.Either<readonly CharacterSession[], ToolError> {
  if (combatant.origin.kind !== "character") return Either.right([]);

  const characterId = combatant.origin.characterId;
  const session = root.sessionStore.characters.get(characterId);
  if (session === undefined) {
    return Either.left(
      lifecycleError("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: combatant.combatantId,
        characterId,
      }),
    );
  }
  if (session.tag !== "inBattle") {
    return Either.left(
      lifecycleError("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId,
      }),
    );
  }
  if (session.battleId !== activeBattle.state.battleId) {
    return Either.left(
      lifecycleError("Battle character session belongs to another battle.", {
        code: "CHARACTER_SESSION_BATTLE_OWNERSHIP_CONFLICT",
        characterId,
        expectedBattleId: activeBattle.state.battleId,
        actualBattleId: session.battleId,
      }),
    );
  }

  const settledSession = settleCharacterSheetFromBattle({
    combatant,
    state: activeBattle.state,
    context: activeBattle.context,
    sheet: session.sheet,
    unitLibrary: root.unitLibrary,
    statBlockCatalog: root.statBlockCatalog,
  });
  if (Either.isLeft(settledSession)) {
    return Either.left(
      lifecycleError("Battle character session settlement failed.", {
        code: "CHARACTER_SESSION_SETTLEMENT_INVALID",
        characterId,
        message: settledSession.left.message,
      }),
    );
  }
  return Either.right([settledSession.right]);
}

function battlePresentationForCommit(nextBattle: BattleRuntimeSession) {
  return Either.mapLeft(
    battlePresentationProjection(nextBattle),
    battleSnapshotPresentationIssueContent,
  );
}

function commitBattleLifecycleTransition(input: {
  readonly root: McpPlaySessionRoot;
  readonly nextBattle: BattleRuntimeSession;
  readonly nextCharacterSessions: readonly CharacterSession[];
  readonly result:
    | {
        readonly tag: "combatantAdded";
        readonly combatantId: string;
      }
    | {
        readonly tag: "combatantRemoved";
        readonly combatantId: string;
        readonly removedCombatantIds: readonly [string, ...string[]];
      };
  readonly presentation: import("./battle-tool-payloads.ts").ActiveBattlePresentationProjection;
}) {
  const committed = input.root.sessionStore.characters.setAll(
    input.nextCharacterSessions,
  );
  if (Either.isLeft(committed)) {
    const registryIssue = committed.left;
    return lifecycleError("Battle lifecycle commit failed.", {
      code: "CHARACTER_SESSION_COMMIT_INVALID",
      message: `Character Session registry rejected the Battle lifecycle commit: ${registryIssue.tag}.`,
      registryIssue,
      affectedCharacterIds: input.nextCharacterSessions.map(characterSessionId),
    });
  }

  input.root.sessionStore.battleSession = input.nextBattle;
  input.root.sessionStore.pendingBattleFills = null;
  publishAdminProjectionBestEffort(input.root);

  return schemaJsonContent(BattleLifecycleOutputSchema, {
    result: input.result,
    snapshot: input.presentation.snapshot,
    availableActs: input.presentation.availableActs,
    admittedSpellPresentations: input.presentation.admittedSpellPresentations,
    presentedInterruptChoices: input.presentation.presentedInterruptChoices,
    session: input.root.sessionStore.snapshot(),
  });
}

function activeBattleForLifecycle(
  root: McpPlaySessionRoot,
): Either.Either<BattleRuntimeSession, ToolError> {
  const session = root.sessionStore.battleSession;
  if (session === null) {
    return Either.left(
      lifecycleError("No battle session has been started.", {
        code: "NO_BATTLE_SESSION",
      }),
    );
  }
  const pendingFills = root.sessionStore.pendingBattleFills;
  return pendingFills === null
    ? Either.right(session)
    : Either.left(
        lifecycleError("Cannot change the roster with pending battle fills.", {
          code: "BATTLE_FILLS_PENDING",
          pendingSubject: pendingFills.subject,
        }),
      );
}

function lifecycleError(message: string, details: Record<string, unknown>) {
  return errorContent(message, {
    ...details,
    recovery: BATTLE_LIFECYCLE_RECOVERY,
  });
}

function lifecycleFailureFromToolError(failure: ToolError) {
  const payload = jsonContentPayload(failure);
  if (!isJsonObject(payload)) {
    return lifecycleError("Battle lifecycle operation failed.", {
      code: "BATTLE_LIFECYCLE_FAILED",
    });
  }
  const details = isJsonObject(payload.details) ? payload.details : {};
  return lifecycleError(
    typeof payload.error === "string"
      ? payload.error
      : "Battle lifecycle operation failed.",
    details,
  );
}

function characterSessionId(session: CharacterSession): string {
  return session.tag === "inBattle"
    ? String(session.sheet.characterId)
    : String(session.characterId);
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
