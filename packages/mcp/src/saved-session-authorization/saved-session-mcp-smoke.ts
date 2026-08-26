import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import { Either } from "effect";

import { requireJsonSchema } from "../../test-support/json-schema.ts";
import { decodePlaySessionId, type PlaySessionId } from "../play-session.ts";
import {
  playSessionToolDefinitions,
  playSessionToolNames,
  type PlaySessionToolName,
} from "../play-session-tool-contract.ts";

export async function verifySavedSessionMcp(input: {
  readonly accessToken: string;
  readonly endpoint: URL;
  readonly isolatedAccessToken: string;
}): Promise<{
  readonly authenticatedMcpConnection: true;
  readonly guestSessionSaved: true;
  readonly isolatedPrincipalDenied: true;
  readonly savedSessionListed: true;
  readonly savedSessionDeleted: true;
}> {
  const guestClient = new Client({
    name: "dnd-saved-session-guest",
    version: "0.1.0",
  });
  const authenticatedClient = new Client({
    name: "dnd-saved-session-owner",
    version: "0.1.0",
  });
  const isolatedClient = new Client({
    name: "dnd-saved-session-isolated-vault",
    version: "0.1.0",
  });
  try {
    const guestSession = await createGuestSession(guestClient, input.endpoint);
    await guestClient.close();
    await connectAuthenticatedClient(
      authenticatedClient,
      input.endpoint,
      input.accessToken,
    );
    await saveGuestSession(
      authenticatedClient,
      guestSession.playSessionId,
      guestSession.guestAccessGrant,
    );
    await verifyOwnerList(authenticatedClient, guestSession.playSessionId);
    await connectAuthenticatedClient(
      isolatedClient,
      input.endpoint,
      input.isolatedAccessToken,
    );
    await verifyIsolatedPrincipal(isolatedClient, guestSession.playSessionId);
    await deleteOwnerSession(authenticatedClient, guestSession.playSessionId);
    return {
      authenticatedMcpConnection: true,
      guestSessionSaved: true,
      isolatedPrincipalDenied: true,
      savedSessionListed: true,
      savedSessionDeleted: true,
    };
  } finally {
    await guestClient.close();
    await authenticatedClient.close();
    await isolatedClient.close();
  }
}

async function createGuestSession(
  client: Client,
  endpoint: URL,
): Promise<{
  readonly playSessionId: PlaySessionId;
  readonly guestAccessGrant: string;
}> {
  const transport = new StreamableHTTPClientTransport(endpoint);
  await client.connect(transport as Transport);
  const created = await client.callTool({
    name: "create_play_session",
    arguments: {},
  });
  const creation = jsonObject(created.structuredContent, "creation response");
  const operation = jsonObject(creation.operation, "creation operation");
  const result = jsonObject(operation.result, "creation result");
  const access = jsonObject(result.access, "guest access");
  return {
    playSessionId: canonicalPlaySessionId(creation),
    guestAccessGrant: stringField(access, "guestAccessGrant"),
  };
}

async function connectAuthenticatedClient(
  client: Client,
  endpoint: URL,
  accessToken: string,
): Promise<void> {
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: {
      headers: { authorization: `Bearer ${accessToken}` },
    },
  });
  await client.connect(transport as Transport);
}

async function saveGuestSession(
  client: Client,
  playSessionId: PlaySessionId,
  guestAccessGrant: string,
): Promise<void> {
  const saved = await client.callTool({
    name: "save_play_session",
    arguments: { playSessionId, guestAccessGrant },
  });
  const result = validateCanonicalToolResult(
    playSessionToolNames.save,
    saved.structuredContent,
  );
  if (
    saved.isError === true ||
    canonicalPlaySessionId(result) !== playSessionId
  ) {
    throw new Error("Authenticated save failed.");
  }
}

async function verifyOwnerList(
  client: Client,
  playSessionId: PlaySessionId,
): Promise<void> {
  const listed = await client.callTool({
    name: "list_saved_play_sessions",
    arguments: {},
  });
  const result = validateCanonicalToolResult(
    playSessionToolNames.listSaved,
    listed.structuredContent,
  );
  if (
    listed.isError === true ||
    !listedPlaySessionIds(result).includes(playSessionId)
  ) {
    throw new Error("Authenticated list omitted the saved Play Session.");
  }
}

async function verifyIsolatedPrincipal(
  client: Client,
  playSessionId: PlaySessionId,
): Promise<void> {
  const listed = await client.callTool({
    name: "list_saved_play_sessions",
    arguments: {},
  });
  const result = validateCanonicalToolResult(
    playSessionToolNames.listSaved,
    listed.structuredContent,
  );
  if (
    listed.isError === true ||
    listedPlaySessionIds(result).includes(playSessionId)
  ) {
    throw new Error("An isolated principal could list another vault.");
  }
  const deleted = await client.callTool({
    name: "delete_saved_play_session",
    arguments: { playSessionId },
  });
  if (deleted.isError !== true) {
    throw new Error("An isolated principal could delete another vault.");
  }
}

async function deleteOwnerSession(
  client: Client,
  playSessionId: PlaySessionId,
): Promise<void> {
  const deleted = await client.callTool({
    name: "delete_saved_play_session",
    arguments: { playSessionId },
  });
  const result = validateCanonicalToolResult(
    playSessionToolNames.deleteSaved,
    deleted.structuredContent,
  );
  if (
    deleted.isError === true ||
    canonicalPlaySessionId(result) !== playSessionId
  ) {
    throw new Error("Authenticated delete failed.");
  }
}

function validateCanonicalToolResult(
  toolName: PlaySessionToolName,
  value: unknown,
): Readonly<Record<string, unknown>> {
  const definition = playSessionToolDefinitions.find(
    (candidate) => candidate.name === toolName,
  );
  if (definition === undefined) {
    throw new Error(`Missing canonical tool definition for ${toolName}.`);
  }
  const validator = new AjvJsonSchemaValidator().getValidator(
    requireJsonSchema(definition.outputSchema, `${toolName} outputSchema`),
  );
  const validation = validator(value);
  if (!validation.valid) {
    throw new Error(`${toolName} returned a noncanonical result.`);
  }
  return jsonObject(value, `${toolName} result`);
}

function canonicalPlaySessionId(
  value: Readonly<Record<string, unknown>>,
): PlaySessionId {
  const decoded = decodePlaySessionId(value.playSessionId);
  if (Either.isLeft(decoded)) {
    throw new Error("Canonical tool result omitted its Play Session id.");
  }
  return decoded.right;
}

function listedPlaySessionIds(
  value: Readonly<Record<string, unknown>>,
): ReadonlyArray<PlaySessionId> {
  if (!Array.isArray(value.sessions)) {
    throw new Error("Canonical saved-session list omitted its sessions.");
  }
  return value.sessions.map((session) =>
    canonicalPlaySessionId(jsonObject(session, "saved-session summary")),
  );
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
  if (typeof entry !== "string") {
    throw new Error(`Expected ${field} to be a string.`);
  }
  return entry;
}
