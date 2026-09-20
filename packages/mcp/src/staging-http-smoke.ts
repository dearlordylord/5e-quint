import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Result } from "effect";

const endpoint = stagingEndpoint(process.env.DND_MCP_STAGING_URL);
if (Result.isFailure(endpoint)) {
  process.stderr.write(`${endpoint.failure}\n`);
  process.exitCode = 1;
} else {
  const client = new Client({
    name: "dnd-staging-anonymous-boundary-smoke",
    version: "0.1.0",
  });
  try {
    const transport = new StreamableHTTPClientTransport(endpoint.success);
    // The SDK class implements Transport; this cast only bridges its
    // exact-optional sessionId declaration to the interface declaration.
    await client.connect(transport as Transport);
    const catalog = await client.callTool({
      name: "list_catalog_units",
      arguments: {},
    });
    if (catalog.isError === true) {
      throw new Error("Anonymous catalog discovery failed.");
    }
    const created = await client.callTool({
      name: "create_play_session",
      arguments: {},
    });
    const challenge = created._meta?.["mcp/www_authenticate"];
    if (
      created.isError !== true ||
      !JSON.stringify(created.content).includes("AUTHENTICATION_REQUIRED") ||
      !Array.isArray(challenge) ||
      challenge.length === 0
    ) {
      throw new Error("Hosted anonymous stateful access did not fail closed.");
    }
    process.stdout.write(
      `Staging anonymous boundary passed: ${JSON.stringify({ catalogDiscovery: true, statefulAuthenticationRequired: true })}\n`,
    );
  } finally {
    await client.close();
  }
}

function stagingEndpoint(
  input: string | undefined,
): Result.Result<URL, string> {
  if (input === undefined || !URL.canParse(input)) {
    return Result.fail(
      "DND_MCP_STAGING_URL must be the deployed HTTPS /mcp endpoint.",
    );
  }
  const endpoint = new URL(input);
  if (endpoint.protocol !== "https:" || endpoint.pathname !== "/mcp") {
    return Result.fail(
      "DND_MCP_STAGING_URL must use HTTPS and have the exact /mcp path.",
    );
  }
  return Result.succeed(endpoint);
}
