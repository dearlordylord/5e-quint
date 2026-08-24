import { Either } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import { battleToolNames, type BattleToolName } from "./battle-tool-input.ts";
import {
  characterToolNames,
  type CharacterToolName,
} from "./character-tool-input.ts";
import { contentToolNames } from "./content-tools.ts";
import type { DiceToolName } from "./dice-tool-input.ts";
import {
  decodePlaySessionId,
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionId,
  type PlaySessionRegistry,
} from "./play-session.ts";
import {
  mcpSessionSummary,
  type McpSessionSummary,
} from "./session-snapshot-output.ts";
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
import {
  unresolvedInputsFrom,
  type UnresolvedInputGroup,
} from "./play-session-operation-projection.ts";

export {
  unresolvedInputsFrom,
  type UnresolvedInputGroup,
} from "./play-session-operation-projection.ts";

export type PlaySessionProtocolResult = ReturnType<typeof jsonContent> & {
  readonly structuredContent: unknown;
  readonly isError?: true;
};

export function handleCreatePlaySession(
  registry: PlaySessionRegistry,
  args: unknown,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  const invalidArgs = noArgumentsError(args, playSessionToolNames.create, true);
  if (invalidArgs !== null) return invalidArgs;
  const created = registry.create();
  if (Either.isLeft(created)) {
    return errorContent("Unable to create a Play Session.", {
      code: "PLAY_SESSION_CREATION_FAILED",
      message: created.left.message,
    });
  }
  return availableEnvelope({
    playSessionId: created.right.playSessionId,
    operationName: playSessionToolNames.create,
    operationResult: {
      tag: "playSessionCreated",
      playSessionId: created.right.playSessionId,
    },
    projection: created.right.projection,
  });
}

export async function handleReadPlaySession(
  registry: PlaySessionRegistry,
  args: unknown,
): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  const routed = decodePlaySessionRoutedArgs(args, playSessionToolNames.read);
  if (Either.isLeft(routed)) return routed.left;
  const invalidArgs = noArgumentsError(
    routed.right.operationArgs,
    playSessionToolNames.read,
  );
  if (invalidArgs !== null) return invalidArgs;

  const result = await registry.run(routed.right.playSessionId, (root) => ({
    projection: root.sessionStore.snapshot(),
    hasAvailableCharacterSession: Array.from(
      root.sessionStore.characters.entries(),
    ).some(([, session]) => session.tag !== "inBattle"),
  }));
  return Either.isLeft(result)
    ? unavailableEnvelope(routed.right.playSessionId, playSessionToolNames.read)
    : availableEnvelope({
        playSessionId: routed.right.playSessionId,
        operationName: playSessionToolNames.read,
        operationResult: {
          tag: "playSessionResumed",
          playSessionId: routed.right.playSessionId,
        },
        projection: result.right.projection,
        hasAvailableCharacterSession: result.right.hasAvailableCharacterSession,
      });
}

export async function handlePlaySessionOperation(input: {
  readonly registry: PlaySessionRegistry;
  readonly operationName: CharacterToolName | BattleToolName | DiceToolName;
  readonly args: unknown;
  readonly handle: (
    root: McpPlaySessionRoot,
    args: unknown,
  ) => unknown | Promise<unknown>;
}): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  const routed = decodePlaySessionRoutedArgs(input.args, input.operationName);
  if (Either.isLeft(routed)) return routed.left;

  const result = await input.registry.run(
    routed.right.playSessionId,
    async (root) => ({
      operationContent: await input.handle(root, routed.right.operationArgs),
      projection: root.sessionStore.snapshot(),
      hasAvailableCharacterSession: Array.from(
        root.sessionStore.characters.entries(),
      ).some(([, session]) => session.tag !== "inBattle"),
    }),
  );
  if (Either.isLeft(result)) {
    return unavailableEnvelope(routed.right.playSessionId, input.operationName);
  }

  const operationContent = result.right.operationContent;
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
    projection: result.right.projection,
    hasAvailableCharacterSession: result.right.hasAvailableCharacterSession,
    isError: operationContent.isError === true,
  });
}

type RoutedArgs = {
  readonly playSessionId: PlaySessionId;
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
  const operationArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => key !== "playSessionId"),
  );
  return Either.right({
    playSessionId: decodedId.right,
    operationArgs,
  });
}

function availableEnvelope(input: {
  readonly playSessionId: PlaySessionId;
  readonly operationName: PlaySessionOperationName;
  readonly operationResult: unknown;
  readonly projection: McpSessionSnapshot;
  readonly hasAvailableCharacterSession?: boolean;
  readonly isError?: boolean;
}): PlaySessionProtocolResult {
  const unresolvedInputs = unresolvedInputsFrom(
    input.operationName,
    input.operationResult,
  );
  const payload = jsonSerializablePayload({
    tag: "playSessionAvailable",
    playSessionId: input.playSessionId,
    operation: {
      name: input.operationName,
      result: input.operationResult,
    },
    projection: mcpSessionSummary(input.projection),
    unresolvedInputs,
    nextOperations: nextOperationsFrom(
      input.operationName,
      input.projection,
      unresolvedInputs,
      input.hasAvailableCharacterSession === true,
    ),
    restoration: { tag: "retained" },
  });
  return {
    ...jsonContent(payload),
    structuredContent: payload,
    ...(input.isError === true ? { isError: true as const } : {}),
  };
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

export function nextOperationsFrom(
  operationName: PlaySessionOperationName,
  projection: McpSessionSummary,
  unresolvedInputs: readonly UnresolvedInputGroup[],
  hasAvailableCharacterSession: boolean,
): readonly PlaySessionNextOperationName[] {
  if (projection.battleState.tag === "initialInitiativeSetup") {
    return [battleToolNames.battleLifecycle, battleToolNames.readBattleState];
  }
  if (projection.battleState.tag === "activeBattle") {
    if (operationName === playSessionToolNames.read) {
      return [
        battleToolNames.discoverBattleActs,
        battleToolNames.readBattleState,
        battleToolNames.battleLifecycle,
      ];
    }
    return unresolvedInputs.length > 0
      ? [battleToolNames.fillBattleHole, battleToolNames.readBattleState]
      : [
          battleToolNames.discoverBattleActs,
          battleToolNames.readBattleState,
          battleToolNames.battleLifecycle,
          battleToolNames.endBattle,
        ];
  }
  if (projection.draftIds.length > 0) {
    if (operationName === playSessionToolNames.read) {
      return [characterToolNames.discoverCreationHoles];
    }
    return unresolvedInputs.length > 0
      ? [
          characterToolNames.fillCreationHoles,
          characterToolNames.discoverCreationHoles,
        ]
      : [
          characterToolNames.finalizeCharacter,
          characterToolNames.discoverCreationHoles,
        ];
  }
  if (projection.characterIds.length > 0) {
    return [
      characterToolNames.listCharacters,
      characterToolNames.inspectCharacterSession,
      characterToolNames.queryCharacterSession,
      battleToolNames.startBattle,
      ...(hasAvailableCharacterSession
        ? [characterToolNames.applyCharacterSessionOperation]
        : []),
      characterToolNames.createCharacterDraft,
    ];
  }
  return [
    characterToolNames.createCharacterDraft,
    contentToolNames.listCatalogUnits,
    contentToolNames.listStatBlocks,
  ];
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
