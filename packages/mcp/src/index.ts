import { Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createDndMcpProtocolServer } from "./protocol-server.ts";

const { server } = createDndMcpProtocolServer();

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
