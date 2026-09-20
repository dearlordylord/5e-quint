import { Result } from "effect";

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
  if (Result.isFailure(battle)) {
    return {
      error: "Battle presentation context is incomplete.",
      details: {
        code: "BATTLE_PRESENTATION_INCOMPLETE",
        issues: battle.failure,
        operationResult,
      },
    };
  }
  if (isJsonObject(operationResult) && isJsonObject(operationResult.details)) {
    return {
      ...operationResult,
      details: {
        ...operationResult.details,
        battleEnvelope: battle.success.envelope,
      },
    };
  }
  return {
    result: operationResult,
    battleEnvelope: battle.success.envelope,
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
  readonly hasAvailableCharacterSession?: boolean;
  readonly isError?: boolean;
}): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  const projection = mcpSessionSummary(input.projection);
  const unresolvedInputsResult = unresolvedInputsForEnvelope(input);
  if (Result.isFailure(unresolvedInputsResult)) {
    return errorContent("MCP operation output projection failed.", {
      code: "INVALID_OPERATION_OUTPUT",
      operationName: input.operationName,
      projectionIssue: unresolvedInputsResult.failure,
    });
  }
  const unresolvedInputs = unresolvedInputsResult.success;
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
    tenure: input.tenure,
    unresolvedInputs,
    nextOperations,
    restoration: { tag: "retained" },
  });
  return {
    ...jsonContent(payload),
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
}): Result.Result<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  const battleEnvelope = embeddedBattleEnvelope(input.operationResult);
  if (battleEnvelope !== undefined) {
    return unresolvedInputsFromBattleEnvelope(
      battleEnvelope.value,
      battleEnvelope.path,
    );
  }
  if (input.isError === true) return Result.succeed([]);
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

function nextOperationsForEnvelope(
  input: {
    readonly operationName: PlaySessionOperationName;
    readonly hasAvailableCharacterSession?: boolean;
  },
  projection: McpSessionSummary,
  unresolvedInputs: readonly UnresolvedInputGroup[],
): readonly PlaySessionNextOperationName[] {
  return nextOperationsFrom(
    input.operationName,
    projection,
    unresolvedInputs,
    input.hasAvailableCharacterSession === true,
  );
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
