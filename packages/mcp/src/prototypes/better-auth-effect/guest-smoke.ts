import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import { verifyCompleteNewcomerJourney } from "../../../test-support/mcp-acceptance-scenarios.ts";

const endpoint = new URL(
  process.env.DND_PROTOTYPE_MCP_URL ?? "http://127.0.0.1:9880/mcp",
);
const client = new Client({
  name: "dnd-better-auth-guest-prototype",
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
  const creation = jsonObject(created.structuredContent, "creation response");
  const operation = jsonObject(creation.operation, "creation operation");
  const result = jsonObject(operation.result, "creation result");
  const access = jsonObject(result.access, "guest access");
  const playSessionId = stringField(creation, "playSessionId");
  const guestAccessGrant = stringField(access, "guestAccessGrant");
  const tenure = jsonObject(creation.tenure, "guest tenure");
  const saveAttempt = await client.callTool({
    name: "save_play_session",
    arguments: { playSessionId, guestAccessGrant },
  });
  const saveText = JSON.stringify(saveAttempt.content);
  const challenge = saveAttempt._meta?.["mcp/www_authenticate"];
  if (
    saveAttempt.isError !== true ||
    !saveText.includes("AUTHENTICATION_REQUIRED")
  ) {
    throw new Error("Anonymous save did not return AUTHENTICATION_REQUIRED.");
  }
  if (!Array.isArray(challenge) || challenge.length === 0) {
    throw new Error("Anonymous save omitted the MCP OAuth challenge.");
  }
  const newcomerJourney = await verifyCompleteNewcomerJourney(client, [
    "delete_saved_play_session",
    "list_saved_play_sessions",
    "save_play_session",
  ]);
  process.stdout.write(
    `${JSON.stringify(
      {
        tag: "betterAuthGuestPrototypeObserved",
        guestCreationWithoutLogin: true,
        guestGrantIssued: guestAccessGrant.length > 0,
        tenure,
        savedSessionDiscoverable: true,
        anonymousSaveRequiresAuthentication: true,
        oauthChallengePresent: true,
        completeCharacterAndBattleJourney: newcomerJourney,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await client.close();
}

function jsonObject(
  value: unknown,
  description: string,
): Readonly<Record<string, unknown>> {
  if (!isJsonObject(value)) {
    throw new Error(`Expected ${description} to be an object.`);
  }
  return value;
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  value: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const entry = value[field];
  if (typeof entry !== "string")
    throw new Error(`Expected ${field} to be a string.`);
  return entry;
}
