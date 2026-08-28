import { Either } from "effect";

import { battleToolNames } from "./battle-tool-input.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { PlaySessionTenureProjection } from "./play-session-access.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionId,
} from "./play-session.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import type { McpSessionSnapshot } from "./session-store.ts";
import {
  errorContent,
  jsonContent,
  jsonSerializablePayload,
} from "./tool-content.ts";
import {
  playSessionToolNames,
  type PlaySessionNextOperationName,
  type PlaySessionOperationName,
} from "./play-session-tool-contract.ts";
import type { McpSessionSummary } from "./session-snapshot-output.ts";
import {
  unresolvedInputsFrom,
  unresolvedInputsFromBattleEnvelope,
  type OperationProjectionIssue,
  type UnresolvedInputGroup,
} from "./play-session-operation-projection.ts";
import { nextOperationsFrom } from "./play-session-next-operations.ts";
import {
  guestSaveAvailability,
  type PlaySessionRequestIdentity,
} from "./play-session-request-identity.ts";
import { characterToolNames } from "./character-tool-input.ts";
import { battleSessionPayload } from "./battle-tool-payloads.ts";

export type PlaySessionProtocolResult = ReturnType<typeof jsonContent> & {
  readonly structuredContent: unknown;
  readonly isError?: true;
  readonly _meta?: Readonly<Record<string, unknown>>;
};

export function recoverableOperationResult(
  root: McpPlaySessionRoot,
  operationResult: unknown,
  isError: boolean,
): unknown {
  if (
    root.sessionStore.getPendingBattleTransaction() === null ||
    root.sessionStore.battleState.tag !== "activeBattle"
  ) {
    return operationResult;
  }
  // Battle operations already publish their canonical envelope. Preserve that
  // operation shape; unrelated successful operations need an explicit
  // recovery wrapper so the continuation is visible on the same result.
  if (!isError && hasBattleEnvelope(operationResult)) {
    return operationResult;
  }
  const battle = battleSessionPayload(
    root,
    root.sessionStore.battleState.session,
  );
  if (Either.isLeft(battle)) {
    return {
      error: "Battle presentation context is incomplete.",
      details: {
        code: "BATTLE_PRESENTATION_INCOMPLETE",
        issues: battle.left,
        operationResult,
      },
    };
  }
  if (isJsonObject(operationResult) && isJsonObject(operationResult.details)) {
    return {
      ...operationResult,
      details: {
        ...operationResult.details,
        battleEnvelope: battle.right.envelope,
      },
    };
  }
  return {
    result: operationResult,
    battleEnvelope: battle.right.envelope,
  };
}

function hasBattleEnvelope(value: unknown): boolean {
  if (!isJsonObject(value)) return false;
  return (
    value.envelope !== undefined ||
    value.battleEnvelope !== undefined ||
    (isJsonObject(value.details) && value.details.battleEnvelope !== undefined)
  );
}

export function availablePlaySessionEnvelope(input: {
  readonly playSessionId: PlaySessionId;
  readonly operationName: PlaySessionOperationName;
  readonly operationResult: unknown;
  readonly projection: McpSessionSnapshot;
  readonly tenure: PlaySessionTenureProjection;
  readonly identity: PlaySessionRequestIdentity;
  readonly hasAvailableCharacterSession?: boolean;
  readonly isError?: boolean;
}): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  const projection = mcpSessionSummary(input.projection);
  const unresolvedInputsResult = unresolvedInputsForEnvelope(input);
  if (Either.isLeft(unresolvedInputsResult)) {
    return errorContent("MCP operation output projection failed.", {
      code: "INVALID_OPERATION_OUTPUT",
      operationName: input.operationName,
      projectionIssue: unresolvedInputsResult.left,
    });
  }
  const unresolvedInputs = unresolvedInputsResult.right;
  const nextOperations = nextOperationsForEnvelope(
    input,
    projection,
    unresolvedInputs,
  );
  const payload = jsonSerializablePayload({
    tag: "playSessionAvailable",
    playSessionId: input.playSessionId,
    operation: {
      name: input.operationName,
      result: input.operationResult,
    },
    projection,
    tenure: envelopeTenure(input.tenure, input.identity),
    unresolvedInputs,
    nextOperations,
    restoration: { tag: "retained" },
  });
  return {
    ...jsonContent(redactGuestAccessGrants(payload)),
    structuredContent: payload,
    ...(input.isError === true ? { isError: true as const } : {}),
  };
}

export function unavailablePlaySessionEnvelope(
  playSessionId: PlaySessionId,
  operationName: PlaySessionOperationName,
): PlaySessionProtocolResult {
  const payload = jsonSerializablePayload({
    tag: PLAY_SESSION_UNAVAILABLE.tag,
    playSessionId,
    operation: {
      name: operationName,
      result: PLAY_SESSION_UNAVAILABLE,
    },
    projection: null,
    tenure: null,
    unresolvedInputs: [],
    nextOperations: [playSessionToolNames.create],
    restoration: PLAY_SESSION_UNAVAILABLE.restoration,
  });
  return {
    ...jsonContent(payload),
    structuredContent: payload,
    isError: true,
  };
}

function unresolvedInputsForEnvelope(input: {
  readonly operationName: PlaySessionOperationName;
  readonly operationResult: unknown;
  readonly isError?: boolean;
}): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const battleEnvelope = embeddedBattleEnvelope(input.operationResult);
  if (battleEnvelope !== undefined) {
    return unresolvedInputsFromBattleEnvelope(
      battleEnvelope.value,
      battleEnvelope.path,
    );
  }
  if (input.isError === true) return Either.right([]);
  return unresolvedInputsFrom(input.operationName, input.operationResult);
}

function embeddedBattleEnvelope(
  value: unknown,
): { readonly value: unknown; readonly path: string } | undefined {
  if (!isJsonObject(value)) return undefined;
  if (value.battleEnvelope !== undefined && value.battleEnvelope !== null) {
    return { value: value.battleEnvelope, path: "$.battleEnvelope" };
  }
  return isJsonObject(value.details) &&
    value.details.battleEnvelope !== undefined &&
    value.details.battleEnvelope !== null
    ? {
        value: value.details.battleEnvelope,
        path: "$.details.battleEnvelope",
      }
    : undefined;
}

function envelopeTenure(
  tenure: PlaySessionTenureProjection,
  identity: PlaySessionRequestIdentity,
) {
  if (tenure.tag !== "guest") return tenure;
  return { ...tenure, save: guestSaveAvailability(identity) };
}

function nextOperationsForEnvelope(
  input: {
    readonly operationName: PlaySessionOperationName;
    readonly tenure: PlaySessionTenureProjection;
    readonly identity: PlaySessionRequestIdentity;
    readonly hasAvailableCharacterSession?: boolean;
  },
  projection: McpSessionSummary,
  unresolvedInputs: readonly UnresolvedInputGroup[],
): readonly PlaySessionNextOperationName[] {
  const nextOperations = nextOperationsFrom(
    input.operationName,
    projection,
    unresolvedInputs,
    input.hasAvailableCharacterSession === true,
  );
  if (input.tenure.tag !== "guest") return nextOperations;
  if (guestSaveAvailability(input.identity).tag !== "available") {
    return nextOperations;
  }
  if (
    input.operationName !== characterToolNames.finalizeCharacter &&
    input.operationName !== battleToolNames.endBattle
  ) {
    return nextOperations;
  }
  return [...new Set([...nextOperations, playSessionToolNames.save])];
}

function redactGuestAccessGrants(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactGuestAccessGrants);
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      key === "guestAccessGrant"
        ? "[REDACTED]"
        : redactGuestAccessGrants(nested),
    ]),
  );
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
