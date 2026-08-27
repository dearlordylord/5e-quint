import { Either } from "effect";

import { battleToolNames } from "./battle-tool-input.ts";
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
  type OperationProjectionIssue,
  type UnresolvedInputGroup,
} from "./play-session-operation-projection.ts";
import { nextOperationsFrom } from "./play-session-next-operations.ts";
import {
  guestSaveAvailability,
  type PlaySessionRequestIdentity,
} from "./play-session-request-identity.ts";
import { characterToolNames } from "./character-tool-input.ts";

export type PlaySessionProtocolResult = ReturnType<typeof jsonContent> & {
  readonly structuredContent: unknown;
  readonly isError?: true;
  readonly _meta?: Readonly<Record<string, unknown>>;
};

export function availablePlaySessionEnvelope(input: {
  readonly playSessionId: PlaySessionId;
  readonly operationName: PlaySessionOperationName;
  readonly operationResult: unknown;
  readonly projection: McpSessionSnapshot;
  readonly tenure: PlaySessionTenureProjection;
  readonly identity: PlaySessionRequestIdentity;
  readonly hasAvailableCharacterSession?: boolean;
  /** Runtime-owned battle output used to recover continuation inputs on read. */
  readonly battleOperationResult?: unknown;
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
  readonly battleOperationResult?: unknown;
  readonly isError?: boolean;
}): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  if (input.battleOperationResult !== undefined) {
    return unresolvedInputsFrom(
      battleToolNames.readBattleState,
      input.battleOperationResult,
    );
  }
  if (input.isError === true) return Either.right([]);
  return unresolvedInputsFrom(input.operationName, input.operationResult);
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
