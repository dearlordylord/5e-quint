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
  const server = new Server(
    { name: "dnd-surface-runtime", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: definitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(root, request.params.name, request.params.arguments),
  );

  return { root, server };
}
