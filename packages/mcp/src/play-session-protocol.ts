import { Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import { battleToolNames } from "./battle-tool-input.ts";
import {
  decodeGuestAccessGrant,
  type PlaySessionCaller,
  type PlaySessionTenureProjection,
} from "./play-session-access.ts";
import type { CharacterToolName } from "./character-tool-input.ts";
import { characterToolNames } from "./character-tool-input.ts";
import type { DiceToolName } from "./dice-tool-input.ts";
import {
  decodePlaySessionId,
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionAccessFailure,
  type PlaySessionId,
  type PlaySessionRegistry,
} from "./play-session.ts";
import { mcpSessionSummary } from "./session-snapshot-output.ts";
import type { McpSessionSnapshot } from "./session-store.ts";
import {
  errorContent,
  jsonContent,
  jsonContentPayload,
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
import { playSessionAccessFailureContent } from "./play-session-management-protocol.ts";
import {
  GUEST_ONLY_REQUEST_IDENTITY,
  guestPlaySessionGuidance,
  guestSaveAvailability,
  type PlaySessionRequestIdentity,
} from "./play-session-request-identity.ts";

export {
  unresolvedInputsFrom,
  type UnresolvedInputGroup,
} from "./play-session-operation-projection.ts";
export { nextOperationsFrom } from "./play-session-next-operations.ts";
export {
  handleDeleteSavedPlaySession,
  handleListSavedPlaySessions,
  handleSavePlaySession,
} from "./play-session-management-protocol.ts";

export type PlaySessionProtocolResult = ReturnType<typeof jsonContent> & {
  readonly structuredContent: unknown;
  readonly isError?: true;
  readonly _meta?: Readonly<Record<string, unknown>>;
};

export {
  GUEST_ONLY_REQUEST_IDENTITY,
  type PlaySessionRequestIdentity,
} from "./play-session-request-identity.ts";

export function handleCreatePlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity = GUEST_ONLY_REQUEST_IDENTITY,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  const invalidArgs = noArgumentsError(args, playSessionToolNames.create, true);
  if (invalidArgs !== null) return invalidArgs;
  const created = registry.create(
    identity.tag === "authenticated"
      ? { tag: "authenticated", principalId: identity.principalId }
      : { tag: "anonymous" },
  );
  if (Either.isLeft(created)) {
    return errorContent("Unable to create a Play Session.", {
      code: "PLAY_SESSION_CREATION_FAILED",
      ...(created.left.reason === "guestCapacityExceeded" ||
      created.left.reason === "savedSessionQuotaExceeded"
        ? { reason: created.left.reason }
        : {}),
    });
  }
  return availableEnvelope({
    playSessionId: created.right.playSessionId,
    operationName: playSessionToolNames.create,
    operationResult: {
      tag: "playSessionCreated",
      playSessionId: created.right.playSessionId,
      access: created.right.access,
      ...(created.right.tenure.tag === "guest"
        ? { guidance: guestPlaySessionGuidance(identity) }
        : {}),
    },
    projection: created.right.projection,
    tenure: created.right.tenure,
    identity,
  });
}

export async function handleReadPlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity = GUEST_ONLY_REQUEST_IDENTITY,
): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  const routed = decodePlaySessionRoutedArgs(
    args,
    playSessionToolNames.read,
    identity,
  );
  if (Either.isLeft(routed)) return routed.left;
  const invalidArgs = noArgumentsError(
    routed.right.operationArgs,
    playSessionToolNames.read,
  );
  if (invalidArgs !== null) return invalidArgs;

  const result = await registry.run(
    routed.right.playSessionId,
    routed.right.caller,
    (root) => ({
      projection: root.sessionStore.snapshot(),
      hasAvailableCharacterSession: Array.from(
        root.sessionStore.characters.entries(),
      ).some(([, session]) => session.tag !== "inBattle"),
    }),
  );
  if (Either.isLeft(result)) {
    return result.left.tag === "playSessionUnavailable"
      ? unavailableEnvelope(
          routed.right.playSessionId,
          playSessionToolNames.read,
        )
      : playSessionAccessFailureContent(result.left);
  }
  return availableEnvelope({
    playSessionId: routed.right.playSessionId,
    operationName: playSessionToolNames.read,
    operationResult: {
      tag: "playSessionResumed",
      playSessionId: routed.right.playSessionId,
    },
    projection: result.right.value.projection,
    hasAvailableCharacterSession:
      result.right.value.hasAvailableCharacterSession,
    tenure: result.right.tenure,
    identity,
  });
}

export async function handlePlaySessionOperation(input: {
  readonly registry: PlaySessionRegistry<PlaySessionAccessFailure>;
  readonly operationName: CharacterToolName | BattleToolName | DiceToolName;
  readonly recordOperation: boolean;
  readonly args: unknown;
  readonly identity?: PlaySessionRequestIdentity;
  readonly handle: (
    root: McpPlaySessionRoot,
    args: unknown,
  ) => unknown | Promise<unknown>;
}): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  const routed = decodePlaySessionRoutedArgs(
    input.args,
    input.operationName,
    input.identity ?? GUEST_ONLY_REQUEST_IDENTITY,
  );
  if (Either.isLeft(routed)) return routed.left;

  const result = await input.registry.run(
    routed.right.playSessionId,
    routed.right.caller,
    async (root) => ({
      operationContent: await input.handle(root, routed.right.operationArgs),
      projection: root.sessionStore.snapshot(),
      hasAvailableCharacterSession: Array.from(
        root.sessionStore.characters.entries(),
      ).some(([, session]) => session.tag !== "inBattle"),
    }),
    {
      command: {
        name: input.operationName,
        args: routed.right.operationArgs,
      },
      retain: (operation) =>
        input.recordOperation &&
        isToolContent(operation.operationContent) &&
        operation.operationContent.isError !== true,
      succeeded: (operation) =>
        isToolContent(operation.operationContent) &&
        operation.operationContent.isError !== true,
    },
  );
  if (Either.isLeft(result)) {
    return result.left.tag === "playSessionUnavailable"
      ? unavailableEnvelope(routed.right.playSessionId, input.operationName)
      : playSessionAccessFailureContent(result.left);
  }

  const operationContent = result.right.value.operationContent;
  if (!isToolContent(operationContent)) {
    return errorContent("MCP operation returned invalid tool content.", {
      code: "INVALID_OPERATION_CONTENT",
      operationName: input.operationName,
    });
  }
  return availableEnvelope({
    playSessionId: routed.right.playSessionId,
    operationName: input.operationName,
    operationResult:
      "structuredContent" in operationContent
        ? operationContent.structuredContent
        : jsonContentPayload(operationContent),
    projection: result.right.value.projection,
    hasAvailableCharacterSession:
      result.right.value.hasAvailableCharacterSession,
    isError: operationContent.isError === true,
    tenure: result.right.tenure,
    identity: input.identity ?? GUEST_ONLY_REQUEST_IDENTITY,
  });
}

type RoutedArgs = {
  readonly playSessionId: PlaySessionId;
  readonly caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>;
  readonly operationArgs: Readonly<Record<string, unknown>>;
};

function noArgumentsError(
  args: unknown,
  operationName: PlaySessionOperationName,
  acceptUndefined = false,
): ReturnType<typeof errorContent> | null {
  if (
    (acceptUndefined && args === undefined) ||
    (isJsonObject(args) && Object.keys(args).length === 0)
  ) {
    return null;
  }
  return errorContent(`${operationName} expects valid arguments.`, {
    code: "INVALID_ARGUMENTS",
    message: "Expected an object with no additional properties.",
  });
}

function decodePlaySessionRoutedArgs(
  args: unknown,
  operationName: PlaySessionOperationName,
  identity: PlaySessionRequestIdentity,
): Either.Either<RoutedArgs, ReturnType<typeof errorContent>> {
  if (!isJsonObject(args)) {
    return Either.left(
      errorContent(`${operationName} expects valid arguments.`, {
        code: "INVALID_ARGUMENTS",
        message: "Expected an object containing playSessionId.",
      }),
    );
  }
  const decodedId = decodePlaySessionId(args.playSessionId);
  if (Either.isLeft(decodedId)) {
    return Either.left(
      errorContent(`${operationName} expects valid arguments.`, {
        code: "INVALID_ARGUMENTS",
        message: decodedId.left,
      }),
    );
  }
  const caller = callerFrom(identity, args.guestAccessGrant, operationName);
  if (Either.isLeft(caller)) return Either.left(caller.left);
  const operationArgs = Object.fromEntries(
    Object.entries(args).filter(
      ([key]) => key !== "playSessionId" && key !== "guestAccessGrant",
    ),
  );
  return Either.right({
    playSessionId: decodedId.right,
    caller: caller.right,
    operationArgs,
  });
}

function callerFrom(
  identity: PlaySessionRequestIdentity,
  guestAccessGrant: unknown,
  operationName: PlaySessionOperationName,
): Either.Either<
  Exclude<PlaySessionCaller, { tag: "anonymous" }>,
  ReturnType<typeof errorContent>
> {
  if (identity.tag === "authenticated") {
    return Either.right({
      tag: "authenticated",
      principalId: identity.principalId,
    });
  }
  const decodedGrant = decodeGuestAccessGrant(guestAccessGrant);
  return Either.mapLeft(decodedGrant, (message) =>
    errorContent(`${operationName} expects Guest Play Session access.`, {
      code: "INVALID_GUEST_ACCESS",
      message,
    }),
  ).pipe(
    Either.map((decodedGuestAccessGrant) => ({
      tag: "guest" as const,
      guestAccessGrant: decodedGuestAccessGrant,
    })),
  );
}

function availableEnvelope(input: {
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
  const unresolvedInputsResult = unresolvedInputsForEnvelope(input, projection);
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

function unresolvedInputsForEnvelope(
  input: {
    readonly operationName: PlaySessionOperationName;
    readonly operationResult: unknown;
    readonly isError?: boolean;
  },
  projection: McpSessionSummary,
): Either.Either<readonly UnresolvedInputGroup[], OperationProjectionIssue> {
  if (projection.pendingBattleHoles !== null) {
    return Either.right([
      {
        sourcePath: "$.projection.pendingBattleHoles",
        inputs: projection.pendingBattleHoles,
      },
    ]);
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

function unavailableEnvelope(
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

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolContent(value: unknown): value is {
  readonly content: readonly [{ readonly text: string }];
  readonly structuredContent?: unknown;
  readonly isError?: boolean;
} {
  if (!isJsonObject(value) || !Array.isArray(value.content)) return false;
  const first = value.content[0];
  return isJsonObject(first) && typeof first.text === "string";
}
