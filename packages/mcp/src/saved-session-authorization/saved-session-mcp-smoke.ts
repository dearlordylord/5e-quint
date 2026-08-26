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
    const guestTransport = new StreamableHTTPClientTransport(input.endpoint);
    // The SDK class implements Transport; this bridges its exact-optional
    // sessionId declaration to the interface declaration.
    await guestClient.connect(guestTransport as Transport);
    const created = await guestClient.callTool({
      name: "create_play_session",
      arguments: {},
    });
    const creation = jsonObject(created.structuredContent, "creation response");
    const operation = jsonObject(creation.operation, "creation operation");
    const result = jsonObject(operation.result, "creation result");
    const access = jsonObject(result.access, "guest access");
    const decodedPlaySessionId = decodePlaySessionId(creation.playSessionId);
    if (Either.isLeft(decodedPlaySessionId)) {
      throw new Error("Creation response omitted its Play Session id.");
    }
    const playSessionId = decodedPlaySessionId.right;
    const guestAccessGrant = stringField(access, "guestAccessGrant");
    await guestClient.close();

    const authenticatedTransport = new StreamableHTTPClientTransport(
      input.endpoint,
      {
        requestInit: {
          headers: { authorization: `Bearer ${input.accessToken}` },
        },
      },
    );
    // The SDK class implements Transport; this bridges its exact-optional
    // sessionId declaration to the interface declaration.
    await authenticatedClient.connect(authenticatedTransport as Transport);
    const saved = await authenticatedClient.callTool({
      name: "save_play_session",
      arguments: { playSessionId, guestAccessGrant },
    });
    const savedResult = validateCanonicalToolResult(
      playSessionToolNames.save,
      saved.structuredContent,
    );
    if (
      saved.isError === true ||
      canonicalPlaySessionId(savedResult) !== playSessionId
    ) {
      throw new Error("Authenticated save failed.");
    }
    const listed = await authenticatedClient.callTool({
      name: "list_saved_play_sessions",
      arguments: {},
    });
    const listedResult = validateCanonicalToolResult(
      playSessionToolNames.listSaved,
      listed.structuredContent,
    );
    if (
      listed.isError === true ||
      !listedPlaySessionIds(listedResult).includes(playSessionId)
    ) {
      throw new Error("Authenticated list omitted the saved Play Session.");
    }
    const isolatedTransport = new StreamableHTTPClientTransport(
      input.endpoint,
      {
        requestInit: {
          headers: {
            authorization: `Bearer ${input.isolatedAccessToken}`,
          },
        },
      },
    );
    await isolatedClient.connect(isolatedTransport as Transport);
    const isolatedList = await isolatedClient.callTool({
      name: "list_saved_play_sessions",
      arguments: {},
    });
    const isolatedListResult = validateCanonicalToolResult(
      playSessionToolNames.listSaved,
      isolatedList.structuredContent,
    );
    if (
      isolatedList.isError === true ||
      listedPlaySessionIds(isolatedListResult).includes(playSessionId)
    ) {
      throw new Error("An isolated principal could list another vault.");
    }
    const isolatedDelete = await isolatedClient.callTool({
      name: "delete_saved_play_session",
      arguments: { playSessionId },
    });
    if (isolatedDelete.isError !== true) {
      throw new Error("An isolated principal could delete another vault.");
    }
    const deleted = await authenticatedClient.callTool({
      name: "delete_saved_play_session",
      arguments: { playSessionId },
    });
    const deletedResult = validateCanonicalToolResult(
      playSessionToolNames.deleteSaved,
      deleted.structuredContent,
    );
    if (
      deleted.isError === true ||
      canonicalPlaySessionId(deletedResult) !== playSessionId
    ) {
      throw new Error("Authenticated delete failed.");
    }
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
