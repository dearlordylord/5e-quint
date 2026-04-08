import { Effect } from "effect"
import { NodeRuntime } from "@effect/platform-node"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"

import { createDemoActor, handleToolCall, toolDefinitions } from "./server.ts"

const actor = createDemoActor()

const server = new Server(
  { name: "dnd-available-actions", version: "0.1.0" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}))

server.setRequestHandler(CallToolRequestSchema, async (request) =>
  handleToolCall(actor, request.params.name, request.params.arguments),
)

const program = Effect.gen(function* () {
  const transport = new StdioServerTransport()
  yield* Effect.promise(() => server.connect(transport))
  yield* Effect.log("dnd-available-actions MCP server started on stdio")
  yield* Effect.never
})

NodeRuntime.runMain(
  program.pipe(
    Effect.catchAllCause((cause) => Effect.logError("MCP server crashed", cause)),
  ),
)
