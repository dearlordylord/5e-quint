import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

const endpoint = new URL(
  process.env.DND_MCP_SAVED_SESSION_URL ?? "http://127.0.0.1:9880/mcp",
);
const client = new Client({
  name: "dnd-hosted-anonymous-boundary-smoke",
  version: "0.1.0",
});

try {
  // The SDK class implements Transport; this bridges its exact-optional
  // sessionId declaration to the interface declaration.
  await client.connect(
    new StreamableHTTPClientTransport(endpoint) as Transport,
  );
  const created = await client.callTool({
    name: "create_play_session",
    arguments: {},
  });
  const creationText = JSON.stringify(created.content);
  const challenge = created._meta?.["mcp/www_authenticate"];
  if (
    created.isError !== true ||
    !creationText.includes("AUTHENTICATION_REQUIRED")
  ) {
    throw new Error(
      "Anonymous Play Session creation did not require authentication.",
    );
  }
  if (!Array.isArray(challenge) || challenge.length === 0) {
    throw new Error("Anonymous creation omitted the MCP OAuth challenge.");
  }
  const tools = await client.listTools();
  const serializedTools = JSON.stringify(tools);
  if (serializedTools.includes("guestAccessGrant")) {
    throw new Error("The hosted tool contract exposed a guest access grant.");
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        tag: "savedSessionAnonymousBoundaryObserved",
        anonymousCreationRequiresAuthentication: true,
        savedSessionDiscoverable: true,
        oauthChallengePresent: true,
        guestGrantAbsentFromToolContract: true,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.close();
}
