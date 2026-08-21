import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  createMcpCompositionRoot,
  createPlaySessionCompositionRoot,
  handleToolCall,
  toolDefinitions,
  type McpCompositionRoot,
} from "./server.ts";
import { adminMirrorSessionId } from "./admin-mirror-contract.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";
import {
  handleCreatePlaySession,
  handlePlaySessionOperation,
  handleReadPlaySession,
} from "./play-session-protocol.ts";
import {
  isPlaySessionToolName,
  playSessionToolDefinitions,
  statefulPlaySessionToolDefinition,
} from "./play-session-tool-contract.ts";
import { createPlaySessionRegistry } from "./play-session.ts";
import { isBattleToolName } from "./battle-tools.ts";
import { isCharacterToolName } from "./character-tools.ts";
import type { BattleToolName } from "./battle-tool-input.ts";
import type { CharacterToolName } from "./character-tool-input.ts";

type ProtocolToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpObjectInputSchema;
  readonly outputSchema?: McpOutputSchema;
};

export function createDndMcpProtocolServer(
  applicationRoot: McpCompositionRoot = createMcpCompositionRoot(),
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
) {
  const protocolDefinitions = [
    ...playSessionToolDefinitions,
    ...definitions.map((definition) =>
      isStatefulToolName(definition.name)
        ? statefulPlaySessionToolDefinition(definition, definition.name)
        : definition,
    ),
  ];
  const advertisedToolNames = new Set(
    protocolDefinitions.map((definition) => definition.name),
  );
  const playSessions = createPlaySessionRegistry({
    createRoot: (playSessionId) =>
      createPlaySessionCompositionRoot(
        applicationRoot,
        adminMirrorSessionId(playSessionId),
      ),
  });
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    if (!advertisedToolNames.has(name)) {
      return errorContent(`Tool is not advertised by this MCP server: ${name}`);
    }
    if (isPlaySessionToolName(name)) {
      return name === "create_play_session"
        ? handleCreatePlaySession(playSessions, request.params.arguments)
        : handleReadPlaySession(playSessions, request.params.arguments);
    }
    if (isStatefulToolName(name)) {
      return handlePlaySessionOperation({
        registry: playSessions,
        operationName: name,
        args: request.params.arguments,
        handle: (root, args) => handleToolCall(root, name, args),
      });
    }
    return handleToolCall(applicationRoot, name, request.params.arguments);
  });

  return { root: applicationRoot, playSessions, server };
}

function isStatefulToolName(
  name: string,
): name is BattleToolName | CharacterToolName {
  return isCharacterToolName(name) || isBattleToolName(name);
}
