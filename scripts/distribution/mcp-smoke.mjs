import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "distribution-smoke", version: "1.0.0" });
const transport = new StdioClientTransport({
  command: "./node_modules/.bin/dnd-mcp",
  args: [],
  stderr: "inherit",
});
const deadline = setTimeout(() => {
  void transport.close().finally(() => process.exit(1));
}, 60_000);
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert(tools.length > 0);
  assert(tools.some((tool) => tool.name === "create_play_session"));
  const session = await client.callTool({
    name: "create_play_session",
    arguments: {},
  });
  assert.notEqual(session.isError, true);
  assert(session.structuredContent);
} finally {
  clearTimeout(deadline);
  await client.close();
}
