import { NodeRuntime } from "@effect/platform-node";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createDndMcpProtocolServer } from "./protocol-server.ts";
import { dndMcpStdioProgram } from "./stdio-server.ts";

const { server } = createDndMcpProtocolServer();
const program = dndMcpStdioProgram(server, new StdioServerTransport());

NodeRuntime.runMain(program, {
  disableErrorReporting: true,
});
