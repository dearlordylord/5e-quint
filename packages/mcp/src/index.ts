import { Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createDemoHost, toolDefinitions } from "./server.ts";
import { createSessionRouter } from "./session-router.ts";

const router = createSessionRouter(createDemoHost());

const server = new Server(
  { name: "dnd-available-actions", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  router.handleToolCall(request.params.name, request.params.arguments),
);

const program = Effect.gen(function* () {
  const transport = new StdioServerTransport();
  yield* Effect.promise(() => server.connect(transport));
  yield* Effect.log("dnd-available-actions MCP server started on stdio");
  yield* Effect.never;
});

NodeRuntime.runMain(
  program.pipe(
    Effect.catchAllCause((cause) =>
      Effect.logError("MCP server crashed", cause),
    ),
  ),
);
