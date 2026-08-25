import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { Either } from "effect";

import { verifyCompleteNewcomerJourney } from "../test-support/mcp-acceptance-scenarios.ts";

const endpoint = stagingEndpoint(process.env.DND_MCP_STAGING_URL);
if (Either.isLeft(endpoint)) {
  process.stderr.write(`${endpoint.left}\n`);
  process.exitCode = 1;
} else {
  const client = new Client({
    name: "dnd-staging-newcomer-smoke",
    version: "0.1.0",
  });
  try {
    const transport = new StreamableHTTPClientTransport(endpoint.right);
    // The SDK class implements Transport; this cast only bridges its
    // exact-optional sessionId declaration to the interface declaration.
    await client.connect(transport as Transport);
    const journey = await verifyCompleteNewcomerJourney(client);
    process.stdout.write(
      `Staging newcomer journey passed: ${JSON.stringify(journey)}\n`,
    );
  } finally {
    await client.close();
  }
}

function stagingEndpoint(
  input: string | undefined,
): Either.Either<URL, string> {
  if (input === undefined || !URL.canParse(input)) {
    return Either.left(
      "DND_MCP_STAGING_URL must be the deployed HTTPS /mcp endpoint.",
    );
  }
  const endpoint = new URL(input);
  if (endpoint.protocol !== "https:" || endpoint.pathname !== "/mcp") {
    return Either.left(
      "DND_MCP_STAGING_URL must use HTTPS and have the exact /mcp path.",
    );
  }
  return Either.right(endpoint);
}
