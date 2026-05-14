import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";

const MCP_CWD = fileURLToPath(new URL("..", import.meta.url));
const MCP_TSX_CLI = fileURLToPath(
  new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url),
);

export type DevMcpClient = {
  readonly client: Client;
  readonly transport: StdioClientTransport;
};

export const makeDevMcpClient = Effect.acquireRelease(
  Effect.tryPromise({
    try: async () => {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [MCP_TSX_CLI, "src/index.ts"],
        cwd: MCP_CWD,
        stderr: "inherit",
      });
      const client = new Client({
        name: "local-mcp-dev-client",
        version: "0.1.0",
      });
      await client.connect(transport);
      return { client, transport } satisfies DevMcpClient;
    },
    catch: (error) =>
      new Error(`Failed to connect MCP stdio client: ${String(error)}`),
  }),
  ({ transport }) =>
    Effect.tryPromise({
      try: () => transport.close(),
      catch: (error) =>
        new Error(`Failed to close MCP stdio transport: ${String(error)}`),
    }).pipe(Effect.orDie),
);

export function runDevScript(effect: Effect.Effect<void, unknown, never>) {
  void Effect.runPromiseExit(effect).then((exit) => {
    process.exit(exit._tag === "Success" ? 0 : 1);
  });
}
