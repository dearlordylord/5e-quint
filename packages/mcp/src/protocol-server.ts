import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  createMcpCompositionRoot,
  handleToolCall,
  toolDefinitions,
  type McpCompositionRoot,
} from "./server.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "./schema-codec.ts";
import { errorContent } from "./tool-content.ts";

type ProtocolToolDefinition = {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: McpObjectInputSchema;
  readonly outputSchema?: McpOutputSchema;
};

export function createDndMcpProtocolServer(
  root: McpCompositionRoot = createMcpCompositionRoot(),
  definitions: readonly ProtocolToolDefinition[] = toolDefinitions,
) {
  const advertisedToolNames = new Set(
    definitions.map((definition) => definition.name),
  );
  const server = new Server(
    { name: "dnd-surface-runtime", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: definitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    return advertisedToolNames.has(name)
      ? handleToolCall(root, name, request.params.arguments)
      : errorContent(`Tool is not advertised by this MCP server: ${name}`);
  });

  return { root, server };
}
