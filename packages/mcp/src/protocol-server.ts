import { canonicalToolDefinitionForSurface } from "./chatgpt/canonical-output-schema.ts";
import { handleChatGptStatefulToolRequest } from "./chatgpt/protocol-tool-handler.ts";
import type { McpToolSurface } from "./mcp-tool-surface.ts";
import {
  chatGptExecutionToolDefinitions,
  shareToolDefinitionsForSurface,
} from "./chatgpt/tool-surface.ts";
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
  playSessionToolDefinitions,
  playSessionToolDefinitionForSurface,
  playSessionToolNames,
  statefulPlaySessionToolDefinition,
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
import { projectModelOutputJsonSchema } from "./model-output-json-schema.ts";
import { isMcpModelOutputSchema } from "./schema-codec.ts";
import type { ProtocolToolDefinition } from "./tool-definition-contract.ts";
import {
  NO_AUTH_SECURITY_SCHEMES,
  SAVED_PLAY_SESSION_SECURITY_SCHEMES,
} from "./tool-definition-contract.ts";

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

export function buildAdvertisedToolDefinitions(
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  playSessionTransport: "hosted" | "localProcess" = "hosted",
  toolSurface: McpToolSurface = "regular",
): readonly ProtocolToolDefinition[] {
  const advertised = applyTransportSecurity(
    [
      ...playSessionDefinitionsForTransport(playSessionTransport, toolSurface),
      ...definitions.map((definition) => {
        const advertisedDefinition =
          definition.outputSchema === undefined
            ? definition
            : {
                ...definition,
                outputSchema: {
                  ...(isMcpModelOutputSchema(definition.outputSchema)
                    ? definition.outputSchema
                    : projectModelOutputJsonSchema(definition.outputSchema)),
                  type: "object",
                },
              };
        const name = advertisedDefinition.name;
        const statefulName = statefulToolNameForSurface(name, toolSurface);
        return statefulName === undefined
          ? advertisedDefinition
          : statefulPlaySessionToolDefinition(
              advertisedDefinition,
              statefulName,
              toolSurface,
            );
      }),
    ],
    playSessionTransport,
  );
  return shareToolDefinitionsForSurface(advertised, toolSurface);
}

export function buildCanonicalToolDefinitions(
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  playSessionTransport: "hosted" | "localProcess" = "hosted",
  toolSurface: McpToolSurface = "regular",
): readonly ProtocolToolDefinition[] {
  return applyTransportSecurity(
    [
      ...playSessionDefinitionsForTransport(playSessionTransport, toolSurface),
      ...definitions.map((definition) => {
        const canonicalDefinition = canonicalToolDefinitionForSurface(
          definition,
          toolSurface,
        );
        const statefulName = statefulToolNameForSurface(
          canonicalDefinition.name,
          toolSurface,
        );
        return statefulName === undefined
          ? canonicalDefinition
          : statefulPlaySessionToolDefinition(
              canonicalDefinition,
              statefulName,
              toolSurface,
            );
      }),
    ],
    playSessionTransport,
  );
}

export function buildCanonicalCodecToolDefinitions(
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
  playSessionTransport: "hosted" | "localProcess" = "hosted",
  toolSurface: McpToolSurface = "regular",
): readonly ProtocolToolDefinition[] {
  return applyTransportSecurity(
    [
      ...playSessionDefinitionsForTransport(
        playSessionTransport,
        toolSurface,
      ).map((definition) =>
        canonicalToolDefinitionForSurface(definition, toolSurface),
      ),
      ...definitions.map((definition) =>
        canonicalToolDefinitionForSurface(definition, toolSurface),
      ),
    ],
    playSessionTransport,
  );
}

function statefulToolNameForSurface(name: string, surface: McpToolSurface) {
  return isStatefulPlaySessionToolName(name)
    ? name
    : surface === "chatgpt" && isChatGptStatefulToolName(name)
      ? name
      : undefined;
}
function playSessionDefinitionsForTransport(
  transport: "hosted" | "localProcess",
  surface: McpToolSurface,
): readonly ProtocolToolDefinition[] {
  return playSessionToolDefinitions
    .filter(
      (definition: ProtocolToolDefinition) =>
        transport === "hosted" ||
        !definition.securitySchemes?.some((scheme) => scheme.type === "oauth2"),
    )
    .map((definition) =>
      playSessionToolDefinitionForSurface(definition, surface),
    );
}

function applyTransportSecurity(
  definitions: readonly ProtocolToolDefinition[],
  playSessionTransport: "hosted" | "localProcess",
): readonly ProtocolToolDefinition[] {
  return definitions.map((definition) => {
    const source: ProtocolToolDefinition = definition;
    const securitySchemes =
      source.securitySchemes ??
      (isPlaySessionToolName(source.name) ||
      isStatefulPlaySessionToolName(source.name)
        ? playSessionTransport === "hosted"
          ? SAVED_PLAY_SESSION_SECURITY_SCHEMES
          : NO_AUTH_SECURITY_SCHEMES
        : NO_AUTH_SECURITY_SCHEMES);
    return {
      ...source,
      securitySchemes,
      _meta: { ...source._meta, securitySchemes },
    };
  });
}

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
  const advertisedToolNames = new Set(
    protocolDefinitions.map((definition) => definition.name),
  );
  const protocolDefinitionByName = new Map(
    protocolDefinitions.map((definition) => [definition.name, definition]),
  );
  const playSessions = playSessionRegistry(applicationServices, options);
  const server = new Server(
    { name: "dnd-surface-runtime", version: "0.1.0" },
    {
      capabilities: { tools: {} },
      instructions:
        "Create or retain a Play Session handle and pass it to every stateful operation. Copy current identifiers, subjects, holes, and options from results; do not invent executable mechanics. After stale-state failures, rediscover from the returned projection. If a Play Session is unavailable, create a new one and follow its restoration guidance.",
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
