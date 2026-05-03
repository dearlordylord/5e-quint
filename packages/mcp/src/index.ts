import { Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createDndMcpProtocolServer } from "./protocol-server.ts";

const { server } = createDndMcpProtocolServer();

const program = Effect.gen(function* () {
  const transport = new StdioServerTransport();
  yield* Effect.promise(() => server.connect(transport));
  yield* Effect.never;
});

NodeRuntime.runMain(
  program.pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        console.error("MCP server crashed", cause.toString());
      }),
    ),
  ),
  { disablePrettyLogger: true, disableErrorReporting: true },
);
