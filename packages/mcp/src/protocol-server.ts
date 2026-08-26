import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { Match, Random } from "effect";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
  handleApplicationToolCall,
  handleToolCall,
  toolDefinitions,
  type McpApplicationServices,
} from "./server.ts";
import { adminMirrorSessionId } from "./admin-mirror-contract.ts";
import { errorContent } from "./tool-content.ts";
import {
  handleCreatePlaySession,
  handleDeleteSavedPlaySession,
  handleListSavedPlaySessions,
  handlePlaySessionOperation,
  handleReadPlaySession,
  handleSavePlaySession,
  GUEST_ONLY_REQUEST_IDENTITY,
  type PlaySessionRequestIdentity,
} from "./play-session-protocol.ts";
import {
  isPlaySessionToolName,
  playSessionToolDefinitions,
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
import type {
  EpochMilliseconds,
  GuestAccessGrantFactory,
} from "./play-session-access.ts";
import { isBattleToolName } from "./battle-tools.ts";
import { isCharacterToolName } from "./character-tools.ts";
import { isDiceToolName } from "./dice-tool-input.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import type { CharacterToolName } from "./character-tool-input.ts";
import type { DiceToolName } from "./dice-tool-input.ts";
import { projectModelOutputJsonSchema } from "./model-output-json-schema.ts";
import type { ProtocolToolDefinition } from "./tool-definition-contract.ts";
import {
  NO_AUTH_SECURITY_SCHEMES,
  OPTIONAL_PLAY_SESSION_SECURITY_SCHEMES,
} from "./tool-definition-contract.ts";

export type {
  McpToolAnnotations,
  ProtocolToolDefinition,
} from "./tool-definition-contract.ts";

type CommonMcpProtocolServerOptions = {
  readonly guestAccessGrantFactory?: GuestAccessGrantFactory;
  readonly playSessionIdFactory?: PlaySessionIdFactory;
  readonly playSessionNow?: () => EpochMilliseconds;
  readonly requestIdentity?: PlaySessionRequestIdentity;
};

type ProcessLifetimeMcpProtocolServerOptions =
  CommonMcpProtocolServerOptions & {
    readonly playSessionRandomFactory?: () => Random.Random;
    readonly playSessionRepository?: undefined;
  };

type RecoverableMcpProtocolServerOptions = CommonMcpProtocolServerOptions & {
  readonly playSessionRandomFactory?: never;
  readonly playSessionRepository: PlaySessionRepository;
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
  authenticationAvailable = true,
): readonly ProtocolToolDefinition[] {
  return [
    ...playSessionToolDefinitions.filter((definition) => {
      const protocolDefinition: ProtocolToolDefinition = definition;
      return (
        authenticationAvailable ||
        !protocolDefinition.securitySchemes?.some(
          (scheme) => scheme.type === "oauth2",
        )
      );
    }),
    ...definitions.map((definition) => {
      const advertisedDefinition =
        definition.outputSchema === undefined
          ? definition
          : {
              ...definition,
              outputSchema: {
                ...projectModelOutputJsonSchema(definition.outputSchema),
                type: "object",
              },
            };
      return isStatefulToolName(advertisedDefinition.name)
        ? statefulPlaySessionToolDefinition(
            advertisedDefinition,
            advertisedDefinition.name,
          )
        : advertisedDefinition;
    }),
  ].map((definition) => {
    const source: ProtocolToolDefinition = definition;
    const securitySchemes =
      source.securitySchemes ??
      (isPlaySessionToolName(source.name) || isStatefulToolName(source.name)
        ? authenticationAvailable
          ? OPTIONAL_PLAY_SESSION_SECURITY_SCHEMES
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
  const authenticationAvailable = hasAuthenticationAvailable(options);
  const protocolDefinitions = buildAdvertisedToolDefinitions(
    definitions,
    authenticationAvailable,
  );
  const advertisedToolNames = new Set(
    protocolDefinitions.map((definition) => definition.name),
  );
  const protocolDefinitionByName = new Map(
    protocolDefinitions.map((definition) => [definition.name, definition]),
  );
  const playSessions = playSessionRegistry(applicationServices, options);
  const requestIdentity = requestIdentityFor(options);
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
    }),
  );

  return { applicationServices, playSessions, server };
}

function hasAuthenticationAvailable(
  options: McpProtocolServerOptions,
): boolean {
  const identity = options.requestIdentity;
  return (
    identity?.tag === "authenticated" ||
    (identity?.tag === "anonymous" &&
      identity.savedPlaySessions.tag === "oauth")
  );
}

function requestIdentityFor(
  options: McpProtocolServerOptions,
): PlaySessionRequestIdentity {
  return options.requestIdentity ?? GUEST_ONLY_REQUEST_IDENTITY;
}

type HandleCallToolRequestInput = {
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
  if (isStatefulToolName(name)) {
    return handleStatefulToolRequest(input, name);
  }
  return handleApplicationToolCall(
    input.applicationServices,
    name,
    request.params.arguments,
  );
}

function handlePlaySessionToolRequest(
  input: HandleCallToolRequestInput,
  name: PlaySessionToolName,
) {
  const args = input.request.params.arguments;
  return Match.value(name).pipe(
    Match.when(playSessionToolNames.create, () =>
      handleCreatePlaySession(input.playSessions, args, input.requestIdentity),
    ),
    Match.when(playSessionToolNames.read, () =>
      handleReadPlaySession(input.playSessions, args, input.requestIdentity),
    ),
    Match.when(playSessionToolNames.save, () =>
      handleSavePlaySession(input.playSessions, args, input.requestIdentity),
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
    handle: (root, args) => handleToolCall(root, name, args),
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
      ...(options.guestAccessGrantFactory === undefined
        ? {}
        : { guestAccessGrantFactory: options.guestAccessGrantFactory }),
      ...(options.playSessionNow === undefined
        ? {}
        : { now: options.playSessionNow }),
    });
  }
  return createPlaySessionRegistry({
    createRoot: (playSessionId) => {
      const random = options.playSessionRandomFactory?.();
      return random === undefined
        ? createMcpPlaySessionRoot(
            applicationServices,
            adminMirrorSessionId(playSessionId),
          )
        : createMcpPlaySessionRoot(
            applicationServices,
            adminMirrorSessionId(playSessionId),
            random,
          );
    },
    ...(options.playSessionIdFactory === undefined
      ? {}
      : { playSessionIdFactory: options.playSessionIdFactory }),
    ...(options.guestAccessGrantFactory === undefined
      ? {}
      : { guestAccessGrantFactory: options.guestAccessGrantFactory }),
    ...(options.playSessionNow === undefined
      ? {}
      : { now: options.playSessionNow }),
  });
}

function isStatefulToolName(
  name: string,
): name is BattleToolName | CharacterToolName | DiceToolName {
  return (
    isCharacterToolName(name) || isBattleToolName(name) || isDiceToolName(name)
  );
}
