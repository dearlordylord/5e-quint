import {
  battlePresentedCheckpointFrontierEnvelope,
  type BattleRuntimeSession,
  type CombatantId,
} from "@dnd/battle-runtime";
import { Result, Match } from "effect";
import type { BattleLifecycleToolInput } from "./battle-lifecycle-tool-input.ts";
import { battlePresentationIssueContent } from "./battle-tool-payloads.ts";
import { BattleLifecycleOutputSchema } from "./battle-tool-output.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  type ActiveBattleRosterTransitionPreview,
  type McpBattleRosterOperation,
  type McpBattleRosterTransitionIssue,
} from "./session-store.ts";
import { projectBattleCombatant } from "./start-battle-tool.ts";
import { schemaJsonContent, type ToolError } from "./schema-codec.ts";
import { battleStateSnapshot } from "./battle-state-snapshot.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";
import { publishAdminProjectionBestEffort } from "./admin-mirror.ts";

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
  operation: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "addCombatant" | "removeCombatant" }
  >,
) {
  return Match.value(operation).pipe(
    Match.when({ kind: "addCombatant" }, (matched) =>
      addCombatant(root, matched.combatant),
    ),
    Match.when({ kind: "removeCombatant" }, (matched) =>
      removeCombatant(root, matched.combatantId),
    ),
    Match.exhaustive,
  );
}

function addCombatant(
  root: McpPlaySessionRoot,
  combatant: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "addCombatant" }
  >["combatant"],
) {
  const projection = projectBattleCombatant({
    root,
    combatant,
    ownerPath: ["operation", "combatant"],
  });
  if (Result.isFailure(projection)) {
    return lifecycleFailureFromToolError(projection.failure);
  }

  const operation: Extract<
    McpBattleRosterOperation,
    { readonly kind: "addCharacter" | "addStatBlock" }
  > =
    projection.success.kind === "characterSheet"
      ? { kind: "addCharacter", combatant: projection.success.combatant }
      : { kind: "addStatBlock", combatant: projection.success.combatant };
  const planned = root.sessionStore.planActiveBattleRosterTransition(operation);
  if (Result.isFailure(planned))
    return rosterTransitionFailure(planned.failure);

  return commitBattleLifecycleTransition({
    root,
    transition: planned.success,
    result: {
      tag: "combatantAdded",
      combatantId: combatant.combatantId,
    },
  });
}

function removeCombatant(
  root: McpPlaySessionRoot,
  combatantId: Extract<
    BattleLifecycleToolInput["operation"],
    { readonly kind: "removeCombatant" }
  >["combatantId"],
) {
  const planned = root.sessionStore.planActiveBattleRosterTransition({
    kind: "remove",
    combatantId,
  });
  if (Result.isFailure(planned))
    return rosterTransitionFailure(planned.failure);

  return commitBattleLifecycleTransition({
    root,
    transition: planned.success,
    result: {
      tag: "combatantRemoved",
      combatantId,
      removedCombatantIds: planned.success.removedCombatantIds,
    },
  });
}

function commitBattleLifecycleTransition(input: {
  readonly root: McpPlaySessionRoot;
  readonly transition: ActiveBattleRosterTransitionPreview;
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
}) {
  const presentation = battlePresentationForCommit(
    input.transition.prospectiveBattle,
  );
  if (Result.isFailure(presentation)) return presentation.failure;

  const committed = input.root.sessionStore.commitActiveBattleRosterTransition(
    input.transition.plan,
  );
  if (Result.isFailure(committed))
    return rosterTransitionFailure(committed.failure);

  input.root.sessionStore.pendingBattleFills = null;
  publishAdminProjectionBestEffort(input.root);

  const battleState = battleStateSnapshot({
    tag: "activeBattle",
    session: committed.success,
  });
  return schemaJsonContent(BattleLifecycleOutputSchema, {
    result: input.result,
    envelope: presentation.success,
    session: { ...input.root.sessionStore.snapshot(), battleState },
  });
}

function battlePresentationForCommit(nextBattle: BattleRuntimeSession) {
  return Result.mapError(
    battlePresentedCheckpointFrontierEnvelope(nextBattle),
    battlePresentationIssueContent,
  );
}

function rosterTransitionFailure(issue: McpBattleRosterTransitionIssue) {
  return Match.value(issue).pipe(
    Match.when({ tag: "battleRosterPendingBattleFills" }, (matched) =>
      battleLifecycleError(
        "Cannot change the roster with pending battle fills.",
        {
          code: "BATTLE_FILLS_PENDING",
          pendingSubject: matched.pendingSubject,
        },
      ),
    ),
    Match.when({ tag: "battleRosterCombatantAdmissionFailed" }, (matched) =>
      battleLifecycleError("Battle combatant admission failed.", {
        code: "BATTLE_COMBATANT_ADMISSION_FAILED",
        combatantId: matched.combatantId,
        ownerPath: matched.ownerPath,
        message: matched.message,
      }),
    ),
    Match.when({ tag: "battleRosterCombatantRemovalFailed" }, (matched) =>
      battleLifecycleError("Battle combatant removal failed.", {
        code: "BATTLE_COMBATANT_REMOVAL_FAILED",
        combatantId: matched.combatantId,
        message: matched.message,
      }),
    ),
    Match.when({ tag: "battleRosterCombatantNotFound" }, (matched) =>
      battleLifecycleError("Battle combatant is not in the current battle.", {
        code: "BATTLE_COMBATANT_NOT_FOUND",
        combatantId: matched.combatantId,
      }),
    ),
    Match.when({ tag: "battleRosterRemovalEmpty" }, (matched) =>
      battleLifecycleError(
        "Battle combatant removal produced no roster change.",
        {
          code: "BATTLE_COMBATANT_REMOVAL_EMPTY",
          combatantId: matched.combatantId,
        },
      ),
    ),
    Match.when({ tag: "battleRosterCharacterSessionMissing" }, (matched) =>
      battleLifecycleError("Battle character has no matching session record.", {
        code: "UNKNOWN_BATTLE_CHARACTER_SESSION",
        combatantId: matched.combatantId,
        characterId: matched.characterId,
      }),
    ),
    Match.when({ tag: "battleRosterCharacterSessionNotInBattle" }, (matched) =>
      battleLifecycleError("Battle character session is not in battle.", {
        code: "CHARACTER_SESSION_NOT_IN_BATTLE",
        characterId: matched.characterId,
      }),
    ),
    Match.when(
      { tag: "battleRosterCharacterBattleOwnershipConflict" },
      (matched) =>
        battleLifecycleError(
          "Battle character session belongs to another battle.",
          {
            code: "CHARACTER_SESSION_BATTLE_OWNERSHIP_CONFLICT",
            characterId: matched.characterId,
            expectedBattleId: matched.expectedBattleId,
            actualBattleId: matched.actualBattleId,
          },
        ),
    ),
    Match.when({ tag: "battleRosterCharacterAlreadyInBattle" }, (matched) =>
      battleLifecycleError("Character is already assigned to a battle.", {
        code: "CHARACTER_ALREADY_IN_BATTLE",
        characterId: matched.characterId,
        battleId: matched.battleId,
      }),
    ),
    Match.when({ tag: "battleRosterSettlementInvalid" }, (matched) =>
      battleLifecycleError("Battle character session settlement failed.", {
        code: "CHARACTER_SESSION_SETTLEMENT_INVALID",
        characterId: matched.characterId,
        message: matched.message,
      }),
    ),
    Match.when({ tag: "battleRosterUnknownPlan" }, () =>
      battleLifecycleError("Battle lifecycle commit failed.", {
        code: "BATTLE_STATE_TRANSITION_INVALID",
        transition: { tag: "unknownRosterPlan" },
      }),
    ),
    Match.when({ tag: "battleRosterPlanBattleChanged" }, (matched) =>
      battleLifecycleError("Battle lifecycle commit failed.", {
        code: "BATTLE_STATE_TRANSITION_INVALID",
        transition: matched,
      }),
    ),
    Match.when({ tag: "battleRosterPlanCharacterChanged" }, (matched) =>
      battleLifecycleError("Battle lifecycle commit failed.", {
        code: "CHARACTER_SESSION_COMMIT_INVALID",
        transition: matched,
      }),
    ),
    Match.when({ tag: "battleRosterPlanFillsChanged" }, (matched) =>
      battleLifecycleError("Battle lifecycle commit failed.", {
        code: "BATTLE_STATE_TRANSITION_INVALID",
        transition: matched,
      }),
    ),
    Match.when({ tag: "invalidBattleStateTransition" }, (matched) =>
      battleLifecycleError("Battle state transition failed.", {
        code: "BATTLE_STATE_TRANSITION_INVALID",
        transition: matched,
      }),
    ),
    Match.when(
      { tag: "battleStateCharacterSessionRegistryConflict" },
      (matched) =>
        battleLifecycleError("Battle lifecycle commit failed.", {
          code: "CHARACTER_SESSION_COMMIT_INVALID",
          transition: matched,
        }),
    ),
    Match.exhaustive,
  );
}

function lifecycleFailureFromToolError(failure: ToolError) {
  const payload = jsonContentPayload(failure);
  if (!isJsonObject(payload)) {
    return battleLifecycleError("Battle lifecycle operation failed.", {
      code: "BATTLE_LIFECYCLE_FAILED",
    });
  }
  const details = isJsonObject(payload.details) ? payload.details : {};
  const issues = Array.isArray(details.issues) ? details.issues : [];
  const singleIssue =
    issues.length === 1 && isJsonObject(issues[0]) ? issues[0] : undefined;
  return battleLifecycleError(
    typeof payload.error === "string"
      ? payload.error
      : "Battle lifecycle operation failed.",
    singleIssue ?? details,
  );
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
