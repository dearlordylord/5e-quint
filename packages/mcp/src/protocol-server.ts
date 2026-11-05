import { buildAdvertisedToolDefinitions } from "./protocol-tool-definitions.ts";
import { handleChatGptStatefulToolRequest } from "./chatgpt/protocol-tool-handler.ts";
import type { McpToolSurface } from "./mcp-tool-surface.ts";
import { chatGptExecutionToolDefinitions } from "./chatgpt/tool-surface.ts";
import { isChatGptStatefulToolName } from "./chatgpt/protocol-operation.ts";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { Match } from "effect";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
  executeStatefulToolCall,
  handleApplicationToolCall,
  toolDefinitions,
  type McpApplicationServices,
} from "./server.ts";
import { adminMirrorSessionId } from "./admin-mirror-contract.ts";
import { errorContent } from "./tool-content.ts";
import type { DiceSeed } from "./dice-sampling-service.ts";
import {
  handleCreatePlaySession,
  handleDeleteSavedPlaySession,
  handleListSavedPlaySessions,
  handlePlaySessionOperation,
  handleReadPlaySession,
  createLocalPlaySessionRequestIdentity,
  type PlaySessionRequestIdentity,
} from "./play-session-protocol.ts";
import {
  isPlaySessionToolName,
  isStatefulPlaySessionToolName,
  playSessionToolNames,
  type PlaySessionToolName,
} from "./play-session-tool-contract.ts";
import {
  createPlaySessionRegistry,
  generatedPlaySessionId,
  type PlaySessionAccessFailure,
  type PlaySessionIdFactory,
  type PlaySessionRegistry,
  type PlaySessionUnavailable,
} from "./play-session.ts";
import {
  createRecoverablePlaySessionRegistry,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";
import type { EpochMilliseconds } from "./play-session-access.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import type { CharacterToolName } from "./character-tool-input.ts";
import type { DiceToolName } from "./dice-tool-input.ts";
import type { ProtocolToolDefinition } from "./tool-definition-contract.ts";

export {
  buildAdvertisedToolDefinitions,
  buildReviewToolDefinitions,
  buildCanonicalToolDefinitions,
  buildCanonicalCodecToolDefinitions,
} from "./protocol-tool-definitions.ts";

export type {
  McpToolAnnotations,
  ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

type CommonMcpProtocolServerOptions = {
  readonly toolSurface?: McpToolSurface;
  readonly playSessionIdFactory?: PlaySessionIdFactory;
  readonly playSessionNow?: () => EpochMilliseconds;
  readonly requestIdentity?: PlaySessionRequestIdentity;
};

type ProcessLifetimeMcpProtocolServerOptions =
  CommonMcpProtocolServerOptions & {
    readonly playSessionDiceSeedFactory?: () => DiceSeed;
    readonly playSessionRepository?: undefined;
  };

type RecoverableMcpProtocolServerOptions = CommonMcpProtocolServerOptions & {
  readonly playSessionDiceSeedFactory?: never;
  readonly playSessionRepository: PlaySessionRepository;
  readonly requestIdentity: Exclude<
    PlaySessionRequestIdentity,
    { tag: "localProcess" }
  >;
};

export type McpProtocolServerOptions =
  | ProcessLifetimeMcpProtocolServerOptions
  | RecoverableMcpProtocolServerOptions;

type McpProtocolServerHost<AccessFailure extends PlaySessionAccessFailure> = {
  readonly applicationServices: McpApplicationServices;
  readonly playSessions: PlaySessionRegistry<AccessFailure>;
  readonly server: Server;
};

export function createDndMcpProtocolServer(
  applicationServices?: McpApplicationServices,
  definitions?: readonly ProtocolToolDefinition[],
  options?: ProcessLifetimeMcpProtocolServerOptions,
): McpProtocolServerHost<PlaySessionUnavailable>;
export function createDndMcpProtocolServer(
  applicationServices: McpApplicationServices | undefined,
  definitions: readonly ProtocolToolDefinition[] | undefined,
  options: RecoverableMcpProtocolServerOptions,
): McpProtocolServerHost<PlaySessionAccessFailure>;
export function createDndMcpProtocolServer(
  applicationServices: McpApplicationServices = createMcpApplicationServices(),
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  options: McpProtocolServerOptions = {},
): McpProtocolServerHost<PlaySessionAccessFailure> {
  const requestIdentity =
    options.requestIdentity ?? createLocalPlaySessionRequestIdentity();
  const toolSurface = options.toolSurface ?? "regular";
  const protocolDefinitions = buildAdvertisedToolDefinitions(
    toolSurface === "chatgpt" ? chatGptExecutionToolDefinitions : definitions,
    requestIdentity.tag === "localProcess" ? "localProcess" : "hosted",
    toolSurface,
  );
  return createProtocolServerHost({
    applicationServices,
    protocolDefinitions,
    options,
    requestIdentity,
    toolSurface,
  });
}

export type HostedMcpProtocolHostFactory = (
  identity: RecoverableMcpProtocolServerOptions["requestIdentity"],
) => McpProtocolServerHost<PlaySessionAccessFailure>;

export function createHostedMcpProtocolHostFactory({
  applicationServices,
  playSessionRepository,
  toolSurface,
}: {
  readonly applicationServices: McpApplicationServices;
  readonly playSessionRepository: PlaySessionRepository;
  readonly toolSurface: McpToolSurface;
}): HostedMcpProtocolHostFactory {
  // This owned wire snapshot excludes canonical schema symbols. Canonical
  // conversion continues to use the original definitions in its own owner.
  const protocolDefinitions = structuredClone(
    buildAdvertisedToolDefinitions(
      toolSurface === "chatgpt"
        ? chatGptExecutionToolDefinitions
        : toolDefinitions,
      "hosted",
      toolSurface,
    ),
  );
  freezeAdvertisedMetadata(protocolDefinitions);
  return (requestIdentity) =>
    createProtocolServerHost({
      applicationServices,
      protocolDefinitions,
      options: {
        playSessionRepository,
        requestIdentity,
      },
      requestIdentity,
      toolSurface,
    });
}

function freezeAdvertisedMetadata(value: object): void {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (
      typeof child === "object" &&
      child !== null &&
      !Object.isFrozen(child)
    ) {
      freezeAdvertisedMetadata(child);
    }
  }
}

function createProtocolServerHost({
  applicationServices,
  protocolDefinitions,
  options,
  requestIdentity,
  toolSurface,
}: {
  readonly applicationServices: McpApplicationServices;
  readonly protocolDefinitions: readonly ProtocolToolDefinition[];
  readonly options: McpProtocolServerOptions;
  readonly requestIdentity: PlaySessionRequestIdentity;
  readonly toolSurface: McpToolSurface;
}): McpProtocolServerHost<PlaySessionAccessFailure> {
  const advertisedToolNames = new Set(
    protocolDefinitions.map((definition) => definition.name),
  );
  const protocolDefinitionByName = new Map(
    protocolDefinitions.map((definition) => [definition.name, definition]),
  );
  const playSessions = playSessionRegistry(applicationServices, options);
  const selectionInstructions = Match.value(toolSurface).pipe(
    Match.when(
      "chatgpt",
      () =>
        "Copy returned readyCalls arguments when present; otherwise use the current choice or tableFactsRequired arguments and requested facts. Add playSessionId. An Act uses actKey; a Reaction uses its interruptDecision fill. Construct ordinary inputs from the current request's fillSchema.",
    ),
    Match.when(
      "regular",
      () =>
        "Copy the complete current subject, including its damage selection, and answer the current typed hole.",
    ),
    Match.exhaustive,
  );
  const server = new Server(
    { name: "dnd-surface-runtime", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions: `Use Oracle for mechanics and saved state. Create or select a Play Session and pass playSessionId to stateful calls. ${selectionInstructions} Finish pending inputs before another Act. Preserve returned dice faces in order; reroll only under an applicable rule. After rejected or stale Battle calls, read_battle_state; do not automatically retry or decline. Report only checkpoint outcomes and label table-supplied geometry separately. Call describe_mcp_workflow for invocation, Reaction-roll, cancellation, and restoration details.`,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: protocolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, (request) =>
    handleCallToolRequest({
      request,
      advertisedToolNames,
      protocolDefinitionByName,
      playSessions,
      requestIdentity,
      applicationServices,
      toolSurface,
    }),
  );
  return { applicationServices, playSessions, server };
}

type HandleCallToolRequestInput = {
  readonly toolSurface: McpToolSurface;
  readonly request: CallToolRequest;
  readonly advertisedToolNames: ReadonlySet<string>;
  readonly protocolDefinitionByName: ReadonlyMap<
    string,
    ProtocolToolDefinition
  >;
  readonly playSessions: PlaySessionRegistry<PlaySessionAccessFailure>;
  readonly requestIdentity: PlaySessionRequestIdentity;
  readonly applicationServices: McpApplicationServices;
};

async function handleCallToolRequest(input: HandleCallToolRequestInput) {
  const { request } = input;
  const name = request.params.name;
  if (!input.advertisedToolNames.has(name)) {
    return errorContent(`Tool is not advertised by this MCP server: ${name}`);
  }
  if (isPlaySessionToolName(name)) {
    return handlePlaySessionToolRequest(input, name);
  }
  if (input.toolSurface === "chatgpt" && isChatGptStatefulToolName(name)) {
    return handleChatGptStatefulToolRequest({
      name,
      args: request.params.arguments,
      protocolDefinitionByName: input.protocolDefinitionByName,
      playSessions: input.playSessions,
      requestIdentity: input.requestIdentity,
    });
  }
  if (isStatefulPlaySessionToolName(name)) {
    return handleStatefulToolRequest(input, name);
  }
  return handleApplicationToolCall(
    input.applicationServices,
    name,
    request.params.arguments,
    input.toolSurface,
  );
}

function handlePlaySessionToolRequest(
  input: HandleCallToolRequestInput,
  name: PlaySessionToolName,
) {
  const args = input.request.params.arguments;
  return Match.value(name).pipe(
    Match.when(playSessionToolNames.create, () =>
      handleCreatePlaySession(
        input.playSessions,
        args,
        input.requestIdentity,
        input.toolSurface,
      ),
    ),
    Match.when(playSessionToolNames.read, () =>
      handleReadPlaySession(
        input.playSessions,
        args,
        input.requestIdentity,
        input.toolSurface,
      ),
    ),
    Match.when(playSessionToolNames.listSaved, () =>
      handleListSavedPlaySessions(
        input.playSessions,
        args,
        input.requestIdentity,
      ),
    ),
    Match.when(playSessionToolNames.deleteSaved, () =>
      handleDeleteSavedPlaySession(
        input.playSessions,
        args,
        input.requestIdentity,
      ),
    ),
    Match.exhaustive,
  );
}

function handleStatefulToolRequest(
  input: HandleCallToolRequestInput,
  name: BattleToolName | CharacterToolName | DiceToolName,
) {
  const definition = input.protocolDefinitionByName.get(name);
  if (definition === undefined) {
    return errorContent(`Tool is not advertised by this MCP server: ${name}`);
  }
  return handlePlaySessionOperation({
    registry: input.playSessions,
    operationName: name,
    recordOperation: definition.annotations.readOnlyHint !== true,
    args: input.request.params.arguments,
    identity: input.requestIdentity,
    handle: (root, args) => executeStatefulToolCall(root, name, args),
  });
}

function playSessionRegistry(
  applicationServices: McpApplicationServices,
  options: McpProtocolServerOptions,
): PlaySessionRegistry<PlaySessionAccessFailure> {
  if (options.playSessionRepository !== undefined) {
    return createRecoverablePlaySessionRegistry({
      applicationServices,
      repository: options.playSessionRepository,
      playSessionIdFactory:
        options.playSessionIdFactory ?? generatedPlaySessionId,
      ...(options.playSessionNow === undefined
        ? {}
        : { now: options.playSessionNow }),
    });
  }
  return createPlaySessionRegistry({
    createRoot: (playSessionId) => {
      const diceSeed = options.playSessionDiceSeedFactory?.();
      return diceSeed === undefined
        ? createMcpPlaySessionRoot(
            applicationServices,
            adminMirrorSessionId(playSessionId),
          )
        : createMcpPlaySessionRoot(
            applicationServices,
            adminMirrorSessionId(playSessionId),
            diceSeed,
          );
    },
    ...(options.playSessionIdFactory === undefined
      ? {}
      : { playSessionIdFactory: options.playSessionIdFactory }),
    ...(options.playSessionNow === undefined
      ? {}
      : { now: options.playSessionNow }),
  });
}
