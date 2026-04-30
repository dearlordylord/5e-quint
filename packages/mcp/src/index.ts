import { Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  createGreenMcpCompositionRoot,
  greenBattleToolDefinitions,
  greenCharacterToolDefinitions,
  handleGreenBattleToolCall,
  handleGreenCharacterToolCall,
  isGreenBattleToolName,
  isGreenCharacterToolName,
} from "./green/index.ts";
import { errorContent } from "./tool-content.ts";

const root = createGreenMcpCompositionRoot();
const toolDefinitions = [
  ...greenCharacterToolDefinitions,
  ...greenBattleToolDefinitions,
];

const server = new Server(
  { name: "dnd-surface-runtime", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(request.params.name, request.params.arguments),
);

function handleToolCall(name: string, args: unknown) {
  if (isGreenCharacterToolName(name)) {
    return handleGreenCharacterToolCall(root, name, args);
  }

  if (isGreenBattleToolName(name)) {
    return handleGreenBattleToolCall(root, name, args);
  }

  return errorContent(`Unknown Surface-runtime MCP tool: ${name}`);
}

const program = Effect.gen(function* () {
  const transport = new StdioServerTransport();
  yield* Effect.promise(() => server.connect(transport));
  yield* Effect.log("dnd-surface-runtime MCP server started on stdio");
  yield* Effect.never;
});

NodeRuntime.runMain(
  program.pipe(
    Effect.catchAllCause((cause) =>
      Effect.logError("MCP server crashed", cause),
    ),
  ),
);
