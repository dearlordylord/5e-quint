import { Result } from "effect";

import {
  decodePlaySessionId,
  type PlaySessionAccessFailure,
  type PlaySessionRegistry,
} from "./play-session.ts";
import {
  playSessionToolNames,
  type PlaySessionOperationName,
} from "./play-session-tool-contract.ts";
import type {
  PlaySessionProtocolResult,
  PlaySessionRequestIdentity,
} from "./play-session-protocol.ts";
import {
  errorContent,
  jsonContent,
  jsonSerializablePayload,
} from "./tool-content.ts";

export function handleListSavedPlaySessions(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  if (identity.tag !== "authenticated") return authenticationRequired(identity);
  if (!isJsonObject(args) || Object.keys(args).length !== 0) {
    return invalidArguments(playSessionToolNames.listSaved);
  }
  const listed = registry.listSaved(identity.principalId);
  if (Result.isFailure(listed))
    return playSessionAccessFailureContent(listed.failure);
  return simpleProtocolResult({
    tag: "savedPlaySessionsListed",
    sessions: listed.success,
  });
}

export async function handleDeleteSavedPlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  if (identity.tag !== "authenticated") return authenticationRequired(identity);
  if (!isJsonObject(args) || Object.keys(args).length !== 1) {
    return invalidArguments(playSessionToolNames.deleteSaved);
  }
  const playSessionId = decodePlaySessionId(args.playSessionId);
  if (Result.isFailure(playSessionId)) {
    return invalidArguments(playSessionToolNames.deleteSaved);
  }
  const deleted = await registry.deleteSaved(
    playSessionId.success,
    identity.principalId,
  );
  if (Result.isFailure(deleted))
    return playSessionAccessFailureContent(deleted.failure);
  return simpleProtocolResult({
    tag: deleted.success.tag,
    playSessionId: playSessionId.success,
  });
}

export function authenticationRequired(
  identity: Exclude<PlaySessionRequestIdentity, { tag: "authenticated" }>,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  const result = errorContent(
    "Authentication is required to manage saved Play Sessions.",
    { code: "AUTHENTICATION_REQUIRED" },
  );
  if (
    identity.tag === "localProcess" ||
    identity.authentication.tag === "unavailable"
  ) {
    return result;
  }
  return {
    ...result,
    _meta: {
      "mcp/www_authenticate": [
        `Bearer resource_metadata="${identity.authentication.resourceMetadataUrl}", error="insufficient_scope", error_description="Sign in to use Play Sessions"`,
      ],
    },
  };
}

export function playSessionAccessFailureContent(
  failure: PlaySessionAccessFailure,
): ReturnType<typeof errorContent> {
  if (failure.tag === "playSessionUnavailable") {
    return errorContent("Play Session is unavailable.", {
      code: "PLAY_SESSION_UNAVAILABLE",
    });
  }
  if (failure.tag === "playSessionLimitFailure") {
    return errorContent(failure.message, {
      code: "PLAY_SESSION_LIMIT_EXCEEDED",
      reason: failure.reason,
      ...(failure.reason === "requestRateExceeded"
        ? { retryAfterSeconds: failure.retryAfterSeconds }
        : {}),
    });
  }
  return errorContent("Play Session storage is unavailable.", {
    code: "PLAY_SESSION_STORAGE_FAILURE",
    reason: failure.reason,
  });
}

function invalidArguments(
  operationName: PlaySessionOperationName,
): ReturnType<typeof errorContent> {
  return errorContent(`${operationName} expects valid arguments.`, {
    code: "INVALID_ARGUMENTS",
  });
}

function simpleProtocolResult(payload: unknown): PlaySessionProtocolResult {
  const serializable = jsonSerializablePayload(payload);
  return {
    ...jsonContent(serializable),
    structuredContent: serializable,
  };
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
