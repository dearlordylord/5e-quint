import { Either } from "effect";

import { decodeGuestAccessGrant } from "./play-session-access.ts";
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

export async function handleSavePlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  if (identity.tag === "anonymous") return authenticationRequired(identity);
  if (!isJsonObject(args)) {
    return invalidArguments(playSessionToolNames.save);
  }
  const playSessionId = decodePlaySessionId(args.playSessionId);
  const guestAccessGrant = decodeGuestAccessGrant(args.guestAccessGrant);
  if (Either.isLeft(playSessionId) || Either.isLeft(guestAccessGrant)) {
    return invalidArguments(playSessionToolNames.save);
  }
  const saved = await registry.save(
    playSessionId.right,
    guestAccessGrant.right,
    identity.principalId,
  );
  if (Either.isLeft(saved)) return playSessionAccessFailureContent(saved.left);
  return simpleProtocolResult({
    tag: "playSessionSaved",
    playSessionId: playSessionId.right,
    tenure: saved.right,
  });
}

export function handleListSavedPlaySessions(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  if (identity.tag === "anonymous") return authenticationRequired(identity);
  if (!isJsonObject(args) || Object.keys(args).length !== 0) {
    return invalidArguments(playSessionToolNames.listSaved);
  }
  const listed = registry.listSaved(identity.principalId);
  if (Either.isLeft(listed))
    return playSessionAccessFailureContent(listed.left);
  return simpleProtocolResult({
    tag: "savedPlaySessionsListed",
    sessions: listed.right,
  });
}

export async function handleDeleteSavedPlaySession(
  registry: PlaySessionRegistry<PlaySessionAccessFailure>,
  args: unknown,
  identity: PlaySessionRequestIdentity,
): Promise<PlaySessionProtocolResult | ReturnType<typeof errorContent>> {
  if (identity.tag === "anonymous") return authenticationRequired(identity);
  if (!isJsonObject(args) || Object.keys(args).length !== 1) {
    return invalidArguments(playSessionToolNames.deleteSaved);
  }
  const playSessionId = decodePlaySessionId(args.playSessionId);
  if (Either.isLeft(playSessionId)) {
    return invalidArguments(playSessionToolNames.deleteSaved);
  }
  const deleted = await registry.deleteSaved(
    playSessionId.right,
    identity.principalId,
  );
  if (Either.isLeft(deleted))
    return playSessionAccessFailureContent(deleted.left);
  return simpleProtocolResult({
    tag: deleted.right.tag,
    playSessionId: playSessionId.right,
  });
}

function authenticationRequired(
  identity: Extract<PlaySessionRequestIdentity, { tag: "anonymous" }>,
): PlaySessionProtocolResult | ReturnType<typeof errorContent> {
  const result = errorContent(
    "Authentication is required to manage saved Play Sessions.",
    { code: "AUTHENTICATION_REQUIRED" },
  );
  if (identity.savedPlaySessions.tag === "unavailable") return result;
  return {
    ...result,
    _meta: {
      "mcp/www_authenticate": [
        `Bearer resource_metadata="${identity.savedPlaySessions.resourceMetadataUrl}", error="insufficient_scope", error_description="Sign in to manage saved Play Sessions"`,
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
