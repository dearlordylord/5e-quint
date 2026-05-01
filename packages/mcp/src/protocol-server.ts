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

export function createDndMcpProtocolServer(
  root: McpCompositionRoot = createMcpCompositionRoot(),
) {
  const server = new Server(
    { name: "dnd-surface-runtime", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    handleToolCall(root, request.params.name, request.params.arguments),
  );

  return { root, server };
}
