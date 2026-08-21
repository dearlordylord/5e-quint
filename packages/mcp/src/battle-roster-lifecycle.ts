import {
  addBattleRuntimeCombatant,
  battleStateInitIssueMessage,
  removeBattleRuntimeCombatants,
  type BattleCreatureState,
  type BattleRuntimeSession,
  type CombatantId,
} from "@dnd/battle-runtime";
import { settleCharacterSheetFromBattle } from "@dnd/character-battle-runtime";
import { Either, Match } from "effect";

import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleLifecycleToolInput } from "./battle-lifecycle-tool-input.ts";
import {
  battlePresentationProjection,
  battleSnapshotPresentationIssueContent,
  type ActiveBattlePresentationProjection,
} from "./battle-tool-payloads.ts";
import { BattleLifecycleOutputSchema } from "./battle-tool-output.ts";
import { projectBattleCombatant } from "./start-battle-tool.ts";
import type { CharacterSession } from "./session-store.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";

export const BATTLE_LIFECYCLE_RECOVERY = {
  tag: "battleAndCharacterSessionsUnchanged",
  guidance:
    "No Battle or Character Session was committed; correct the reported conflict and retry battle_lifecycle.",
} as const;

export function battleLifecycleError(
  message: string,
  details: Record<string, unknown>,
) {
  return errorContent(message, {
    ...details,
    recovery: BATTLE_LIFECYCLE_RECOVERY,
  });
}

export function handleActiveBattleRosterOperation(
  root: McpPlaySessionRoot,
  activeBattle: BattleRuntimeSession,
  operation: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "addCombatant" | "removeCombatant" }
  >,
) {
  if (root.sessionStore.pendingBattleFills !== null) {
    return battleLifecycleError(
      "Cannot change the roster with pending battle fills.",
      {
        code: "BATTLE_FILLS_PENDING",
        pendingSubject: root.sessionStore.pendingBattleFills.subject,
      },
    );
  }

  return Match.value(operation).pipe(
    Match.when({ kind: "addCombatant" }, (matched) =>
      addCombatant(root, activeBattle, matched.combatant),
    ),
    Match.when({ kind: "removeCombatant" }, (matched) =>
      removeCombatant(root, activeBattle, matched.combatantId),
    ),
    Match.exhaustive,
  );
}

function addCombatant(
  root: McpPlaySessionRoot,
  activeBattle: BattleRuntimeSession,
  combatant: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "addCombatant" }
  >["combatant"],
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
    return battleLifecycleError("Battle combatant admission failed.", {
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
    expectedBattleId: activeBattle.state.battleId,
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
    return battleLifecycleError(
      "Battle combatant is not in the current battle.",
      {
        code: "BATTLE_COMBATANT_NOT_FOUND",
        combatantId,
      },
    );
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
    return battleLifecycleError("Battle combatant removal failed.", {
      code: "BATTLE_COMBATANT_REMOVAL_FAILED",
      combatantId,
      message: battleStateInitIssueMessage(nextBattle.left),
    });
  }

  const removedCombatantIds = [...activeBattle.state.combatants.keys()].filter(
    (id) => !nextBattle.right.state.combatants.has(id),
  );
  const nonEmptyRemovedCombatantIds = nonEmptyCombatantIds(removedCombatantIds);
  if (nonEmptyRemovedCombatantIds === undefined) {
    return battleLifecycleError(
      "Battle combatant removal produced no roster change.",
      {
        code: "BATTLE_COMBATANT_REMOVAL_EMPTY",
        combatantId,
      },
    );
  }

  const presentation = battlePresentationForCommit(nextBattle.right);
  if (Either.isLeft(presentation)) return presentation.left;

  return commitBattleLifecycleTransition({
    root,
    expectedBattleId: activeBattle.state.battleId,
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
      battleLifecycleError("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: combatant.combatantId,
        characterId,
      }),
    );
  }
  if (session.tag !== "inBattle") {
    return Either.left(
      battleLifecycleError("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId,
      }),
    );
  }
  if (session.battleId !== activeBattle.state.battleId) {
    return Either.left(
      battleLifecycleError(
        "Battle character session belongs to another battle.",
        {
          code: "CHARACTER_SESSION_BATTLE_OWNERSHIP_CONFLICT",
          characterId,
          expectedBattleId: activeBattle.state.battleId,
          actualBattleId: session.battleId,
        },
      ),
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
      battleLifecycleError("Battle character session settlement failed.", {
        code: "CHARACTER_SESSION_SETTLEMENT_INVALID",
        characterId,
        message: settledSession.left.message,
      }),
    );
  }
  return Either.right([settledSession.right]);
}

function battlePresentationForCommit(
  nextBattle: BattleRuntimeSession,
): Either.Either<
  ActiveBattlePresentationProjection,
  ReturnType<typeof battleSnapshotPresentationIssueContent>
> {
  return Either.mapLeft(
    battlePresentationProjection(nextBattle),
    battleSnapshotPresentationIssueContent,
  );
}

function commitBattleLifecycleTransition(input: {
  readonly root: McpPlaySessionRoot;
  readonly expectedBattleId: BattleRuntimeSession["state"]["battleId"];
  readonly nextBattle: BattleRuntimeSession;
  readonly nextCharacterSessions: readonly CharacterSession[];
  readonly result:
    | {
        readonly tag: "combatantAdded";
        readonly combatantId: CombatantId;
      }
    | {
        readonly tag: "combatantRemoved";
        readonly combatantId: CombatantId;
        readonly removedCombatantIds: readonly [CombatantId, ...CombatantId[]];
      };
  readonly presentation: ActiveBattlePresentationProjection;
}) {
  const transition = input.root.sessionStore.storeActiveBattleRosterTransition({
    expectedBattleId: input.expectedBattleId,
    nextBattle: input.nextBattle,
    characterSessions: input.nextCharacterSessions,
  });
  if (Either.isLeft(transition)) {
    if (transition.left.tag === "battleStateCharacterSessionRegistryConflict") {
      return battleLifecycleError("Battle lifecycle commit failed.", {
        code: "CHARACTER_SESSION_COMMIT_INVALID",
        message: `Character Session registry rejected the Battle lifecycle commit: ${transition.left.registryIssue.tag}.`,
        registryIssue: transition.left.registryIssue,
        affectedCharacterIds: transition.left.affectedCharacterIds,
      });
    }
    return battleLifecycleError("Battle lifecycle commit failed.", {
      code: "BATTLE_STATE_TRANSITION_INVALID",
      transition: transition.left,
    });
  }

  input.root.sessionStore.pendingBattleFills = null;
  publishAdminProjectionBestEffort(input.root);

  const state = input.root.sessionStore.battleState;
  if (state.tag !== "activeBattle") {
    return battleLifecycleError(
      "Battle lifecycle commit produced invalid state.",
      { code: "BATTLE_LIFECYCLE_STATE_INVALID" },
    );
  }
  const battleState = battleStateSnapshot(state);
  const session = input.root.sessionStore.snapshot();
  return schemaJsonContent(BattleLifecycleOutputSchema, {
    battleState,
    result: input.result,
    snapshot: input.presentation.snapshot,
    availableActs: input.presentation.availableActs,
    admittedSpellPresentations: input.presentation.admittedSpellPresentations,
    presentedInterruptChoices: input.presentation.presentedInterruptChoices,
    session: { ...session, battleState },
  });
}

function nonEmptyCombatantIds(
  ids: readonly CombatantId[],
): readonly [CombatantId, ...CombatantId[]] | undefined {
  const first = ids[0];
  return first === undefined ? undefined : [first, ...ids.slice(1)];
}

function lifecycleFailureFromToolError(failure: ToolError) {
  const payload = jsonContentPayload(failure);
  if (!isJsonObject(payload)) {
    return battleLifecycleError("Battle lifecycle operation failed.", {
      code: "BATTLE_LIFECYCLE_FAILED",
    });
  }
  const details = isJsonObject(payload.details) ? payload.details : {};
  return battleLifecycleError(
    typeof payload.error === "string"
      ? payload.error
      : "Battle lifecycle operation failed.",
    details,
  );
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
