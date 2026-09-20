import { Result } from "effect";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import { type PlaySessionCaller } from "./play-session-access.ts";
import {
  characterToolNames,
  type CharacterToolName,
} from "./character-tool-input.ts";
import {
  decodeDiceToolCall,
  diceToolNames,
  type DiceToolName,
} from "./dice-tool-input.ts";
import {
  decodePlaySessionId,
  type PlaySessionAccessFailure,
  type PlaySessionCommand,
  type PlaySessionId,
  type PlaySessionRegistry,
} from "./play-session.ts";
import { errorContent, jsonContentPayload } from "./tool-content.ts";
import {
  playSessionToolNames,
  type PlaySessionOperationName,
} from "./play-session-tool-contract.ts";
import {
  authenticationRequired,
  playSessionAccessFailureContent,
} from "./play-session-management-protocol.ts";
import type { PlaySessionRequestIdentity } from "./play-session-request-identity.ts";
import {
  availablePlaySessionEnvelope,
  recoverableOperationResult,
  unavailablePlaySessionEnvelope,
} from "./play-session-envelope.ts";
import { createdCharacterDraftId } from "./play-session-command.ts";
import {
  battleSessionPayload,
  battlePresentationIssueContent,
} from "./battle-tool-payloads.ts";

export {
  unresolvedInputsFrom,
  type UnresolvedInputGroup,
} from "./play-session-operation-projection.ts";
export { nextOperationsFrom } from "./play-session-next-operations.ts";
export {
  handleDeleteSavedPlaySession,
  handleListSavedPlaySessions,
} from "./play-session-management-protocol.ts";

export type { PlaySessionProtocolResult } from "./play-session-envelope.ts";
import type { PlaySessionProtocolResult } from "./play-session-envelope.ts";

export {
  createLocalPlaySessionRequestIdentity,
  type PlaySessionRequestIdentity,
} from "./play-session-request-identity.ts";

export function handleCreatePlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  if (identity.tag === "hostedAnonymous") {
    return authenticationRequired(identity);
  }
  const invalidArgs = noArgumentsError(args, playSessionToolNames.create, true);
  if (invalidArgs !== null) return invalidArgs;
  const created = registry.create(
    identity.tag === "authenticated"
      ? { tag: "authenticated", principalId: identity.principalId }
      : { tag: "localProcess" },
  );
  if (Result.isFailure(created)) {
    return errorContent("Unable to create a Play Session.", {
      code: "PLAY_SESSION_CREATION_FAILED",
      ...(created.failure.reason === "savedSessionQuotaExceeded"
        ? { reason: created.failure.reason }
        : {}),
    });
  }
  return availablePlaySessionEnvelope({
    playSessionId: created.success.playSessionId,
    operationName: playSessionToolNames.create,
    operationResult: {
      tag: "playSessionCreated",
      playSessionId: created.success.playSessionId,
    },
    projection: created.success.projection,
    tenure: created.success.tenure,
  });
}

export async function handleReadPlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  const routed = decodePlaySessionRoutedArgs(
    args,
    playSessionToolNames.read,
    identity,
  );
  if (Result.isFailure(routed)) return routed.failure;
  const invalidArgs = noArgumentsError(
    routed.success.operationArgs,
    playSessionToolNames.read,
  );
  if (invalidArgs !== null) return invalidArgs;

  const result = await registry.run(
    routed.success.playSessionId,
    routed.success.caller,
    (root) => {
      const battleEnvelope = readBattleEnvelopeForRoot(root);
      if (Result.isFailure(battleEnvelope)) {
        const operationContent = battlePresentationIssueContent(
          battleEnvelope.failure,
        );
        return {
          operationResult: jsonContentPayload(operationContent),
          isError: true as const,
          projection: root.sessionStore.snapshot(),
          hasAvailableCharacterSession: Array.from(
            root.sessionStore.characters.entries(),
          ).some(([, session]) => session.tag !== "inBattle"),
        };
      }
      return {
        operationResult: {
          tag: "playSessionResumed" as const,
          playSessionId: routed.success.playSessionId,
          battleEnvelope: battleEnvelope.success,
        },
        isError: false as const,
        projection: root.sessionStore.snapshot(),
        hasAvailableCharacterSession: Array.from(
          root.sessionStore.characters.entries(),
        ).some(([, session]) => session.tag !== "inBattle"),
      };
    },
  );
  if (Result.isFailure(result)) {
    return result.failure.tag === "playSessionUnavailable"
      ? unavailablePlaySessionEnvelope(
          routed.success.playSessionId,
          playSessionToolNames.read,
        )
      : playSessionAccessFailureContent(result.failure);
  }
  return availablePlaySessionEnvelope({
    playSessionId: routed.success.playSessionId,
    operationName: playSessionToolNames.read,
    operationResult: result.success.value.operationResult,
    projection: result.success.value.projection,
    hasAvailableCharacterSession:
      result.success.value.hasAvailableCharacterSession,
    isError: result.success.value.isError,
    tenure: result.success.tenure,
  });
}

export async function handlePlaySessionOperation(input: {
  readonly registry: PlaySessionRegistry<PlaySessionAccessFailure>;
  readonly operationName: CharacterToolName | BattleToolName | DiceToolName;
  readonly recordOperation: boolean;
  readonly args: unknown;
  readonly identity: PlaySessionRequestIdentity;
  readonly handle: (
    root: McpPlaySessionRoot,
    args: unknown,
  ) =>
    | {
        readonly content: unknown;
        readonly commandRetention: "retain" | "skip";
      }
    | Promise<{
        readonly content: unknown;
        readonly commandRetention: "retain" | "skip";
      }>;
}): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  const routed = decodePlaySessionRoutedArgs(
    input.args,
    input.operationName,
    input.identity,
  );
  if (Result.isFailure(routed)) return routed.failure;

  const result = await input.registry.run(
    routed.success.playSessionId,
    routed.success.caller,
    async (root) => {
      const execution = await input.handle(root, routed.success.operationArgs);
      const operationContent = execution.content;
      const operationResult = isToolContent(operationContent)
        ? "structuredContent" in operationContent
          ? operationContent.structuredContent
          : jsonContentPayload(operationContent)
        : undefined;
      return {
        operationContent,
        commandRetention: execution.commandRetention,
        operationResult: recoverableOperationResult(
          root,
          operationResult,
          isToolContent(operationContent) && operationContent.isError === true,
        ),
        projection: root.sessionStore.snapshot(),
        hasAvailableCharacterSession: Array.from(
          root.sessionStore.characters.entries(),
        ).some(([, session]) => session.tag !== "inBattle"),
      };
    },
    {
      commandFor: (operation) =>
        retainedPlaySessionCommand(
          input.operationName,
          routed.success.operationArgs,
          operation.operationContent,
        ),
      retain: (operation) =>
        input.recordOperation &&
        operation.commandRetention === "retain" &&
        isToolContent(operation.operationContent) &&
        operation.operationContent.isError !== true,
      succeeded: (operation) =>
        isToolContent(operation.operationContent) &&
        operation.operationContent.isError !== true,
    },
  );
  if (Result.isFailure(result)) {
    return result.failure.tag === "playSessionUnavailable"
      ? unavailablePlaySessionEnvelope(
          routed.success.playSessionId,
          input.operationName,
        )
      : playSessionAccessFailureContent(result.failure);
  }

  const operationContent = result.success.value.operationContent;
  if (!isToolContent(operationContent)) {
    return errorContent("MCP operation returned invalid tool content.", {
      code: "INVALID_OPERATION_CONTENT",
      operationName: input.operationName,
    });
  }
  return availablePlaySessionEnvelope({
    playSessionId: routed.success.playSessionId,
    operationName: input.operationName,
    operationResult: result.success.value.operationResult,
    projection: result.success.value.projection,
    hasAvailableCharacterSession:
      result.success.value.hasAvailableCharacterSession,
    isError: operationContent.isError === true,
    tenure: result.success.tenure,
  });
}

function readBattleEnvelopeForRoot(root: McpPlaySessionRoot) {
  const battleState = root.sessionStore.battleState;
  if (battleState.tag !== "activeBattle") return Result.succeed(null);
  return Result.map(
    battleSessionPayload(root, battleState.session),
    (payload) => payload.envelope,
  );
}

function retainedPlaySessionCommand(
  operationName: CharacterToolName | BattleToolName | DiceToolName,
  args: Readonly<Record<string, unknown>>,
  operationContent: unknown,
): PlaySessionCommand {
  if (operationName === characterToolNames.createCharacterDraft) {
    const draftId = createdCharacterDraftId(operationContent);
    return { name: operationName, args: { ...args, draftId } };
  }
  if (operationName === diceToolNames.rollDice) {
    const decoded = decodeDiceToolCall({ name: operationName, args });
    if (Result.isFailure(decoded)) {
      throw new Error(
        "A retained successful dice operation no longer decodes as its command.",
      );
    }
    return { name: operationName, args: decoded.success.args };
  }
  return { name: operationName, args };
}

type RoutedArgs = {
  readonly playSessionId: PlaySessionId;
  readonly caller: PlaySessionCaller;
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
): Result.Result<
  RoutedArgs,
  PlaySessionProtocolResult | ReturnType<typeof errorContent>
> {
  if (!isJsonObject(args)) {
    return Result.fail(
      errorContent(`${operationName} expects valid arguments.`, {
        code: "INVALID_ARGUMENTS",
        message: "Expected an object containing playSessionId.",
      }),
    );
  }
  const decodedId = decodePlaySessionId(args.playSessionId);
  if (Result.isFailure(decodedId)) {
    return Result.fail(
      errorContent(`${operationName} expects valid arguments.`, {
        code: "INVALID_ARGUMENTS",
        message: decodedId.failure,
      }),
    );
  }
  const caller = callerFrom(identity);
  if (Result.isFailure(caller)) return Result.fail(caller.failure);
  const operationArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== "playSessionId"),
  );
  return Result.succeed({
    playSessionId: decodedId.success,
    caller: caller.success,
    operationArgs,
  });
}

function callerFrom(
  identity: PlaySessionRequestIdentity,
): Result.Result<
  PlaySessionCaller,
  PlaySessionProtocolResult | ReturnType<typeof errorContent>
> {
  if (identity.tag === "authenticated") {
    return Result.succeed({
      tag: "authenticated",
      principalId: identity.principalId,
    });
  }
  if (identity.tag === "hostedAnonymous") {
    return Result.fail(authenticationRequired(identity));
  }
  return Result.succeed({ tag: "localProcess" });
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
