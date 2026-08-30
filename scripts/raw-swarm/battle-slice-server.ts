import { NodeRuntime } from "@effect/platform-node";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Runtime } from "effect";

import { createMcpApplicationServices } from "../../packages/mcp/src/composition-root.ts";
import { createDndMcpProtocolServer } from "../../packages/mcp/src/protocol-server.ts";
import { dndMcpStdioProgram } from "../../packages/mcp/src/stdio-server.ts";
import { battleSliceToolDefinitions } from "./battle-slice-tools.ts";

const { server } = createDndMcpProtocolServer(
  createMcpApplicationServices(),
  battleSliceToolDefinitions,
);
const program = dndMcpStdioProgram(server, new StdioServerTransport());

const drainStandardOutputTeardown: Runtime.Teardown = (exit, onExit) => {
  process.stdout.write("", () => Runtime.defaultTeardown(exit, onExit));
};

NodeRuntime.runMain(program, {
  disableErrorReporting: true,
  teardown: drainStandardOutputTeardown,
});
