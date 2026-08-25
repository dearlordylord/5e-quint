import { randomBytes } from "node:crypto";

import { Either, Random } from "effect";

import {
  publishAdminProjectionBestEffort,
  type AdminMirrorPublication,
} from "./admin-mirror.ts";
import { adminMirrorSessionId } from "./admin-mirror-contract.ts";
import {
  createMcpPlaySessionRoot,
  type McpApplicationServices,
  type McpPlaySessionRoot,
} from "./composition-root.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionAccessFailure,
  type PlaySessionCreationFailure,
  type PlaySessionId,
} from "./play-session.ts";
import {
  generatedGuestAccessGrant,
  guestAccessGrantDigest,
  guestAccessGrantMatchesDigest,
  playSessionRateLimitKeyDigest,
  type EpochMilliseconds,
  type PlaySessionCaller,
  type PrincipalId,
  type StoredPlaySessionTenure,
} from "./play-session-access.ts";
import {
  decodePlaySessionRandomSeed,
  type PlaySessionRandomSeed,
  type PlaySessionRepository,
  type PlaySessionRepositoryIssue,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import { handleToolCall } from "./server.ts";

export function rootFromRecord(
  applicationServices: McpApplicationServices,
  record: RecoverablePlaySessionRecord,
): Either.Either<McpPlaySessionRoot, PlaySessionRepositoryIssue> {
  const root = createMcpPlaySessionRoot(
    applicationServices,
    adminMirrorSessionId(record.playSessionId),
    Random.make(record.randomSeed),
  );
  for (const operation of record.operations) {
    const replayed = handleToolCall(root, operation.name, operation.args);
    if ("isError" in replayed && replayed.isError === true) {
      return Either.left({
        tag: "playSessionRepositoryIssue",
        reason: "invalidStoredRecord",
        message: `Stored Play Session operation ${operation.name} no longer reconstructs successfully.`,
      });
    }
  }
  return Either.right(root);
}

export function publishCurrentProjection(
  applicationServices: McpApplicationServices,
  publications: Map<PlaySessionId, AdminMirrorPublication>,
  playSessionId: PlaySessionId,
  root: McpPlaySessionRoot,
): void {
  const publication =
    publications.get(playSessionId) ??
    applicationServices.createAdminMirrorPublication(
      adminMirrorSessionId(playSessionId),
    );
  publications.set(playSessionId, publication);
  publishAdminProjectionBestEffort({
    ...root,
    adminMirrorPublication: publication,
  });
}

export function generatedPlaySessionRandomSeed(): PlaySessionRandomSeed {
  const decoded = decodePlaySessionRandomSeed(randomBytes(32).toString("hex"));
  if (Either.isLeft(decoded)) {
    throw new Error("Generated Play Session random seed was invalid.");
  }
  return decoded.right;
}

export function creationFailure(
  issue: PlaySessionRepositoryIssue,
): PlaySessionCreationFailure {
  return {
    tag: "playSessionCreationFailed",
    reason: "storageUnavailable",
    message: issue.message,
  };
}

export function accessFailure(
  issue: PlaySessionRepositoryIssue,
): PlaySessionAccessFailure {
  return {
    tag: "playSessionStorageFailure",
    reason: issue.reason,
    message: issue.message,
  };
}

export function admitRequest(
  repository: PlaySessionRepository,
  tenure: StoredPlaySessionTenure,
  nowMs: EpochMilliseconds,
  maximumRequestsPerWindow: number,
): Either.Either<void, PlaySessionAccessFailure> {
  const accessKeyDigest = playSessionRateLimitKeyDigest(tenure);
  const admitted = repository.admitRequest(
    accessKeyDigest,
    nowMs,
    maximumRequestsPerWindow,
  );
  if (Either.isLeft(admitted)) {
    return Either.left(accessFailure(admitted.left));
  }
  if (admitted.right.tag === "rateExceeded") {
    return Either.left({
      tag: "playSessionLimitFailure",
      reason: "requestRateExceeded",
      message: "Too many Play Session requests. Retry after the stated delay.",
      retryAfterSeconds: admitted.right.retryAfterSeconds,
    });
  }
  return Either.right(undefined);
}

export function concurrentWriteFailure(): PlaySessionAccessFailure {
  return {
    tag: "playSessionStorageFailure",
    reason: "concurrentWriteConflict",
    message:
      "The Play Session changed repeatedly while committing the operation.",
  };
}

export function deleteSavedRecord(
  repository: PlaySessionRepository,
  playSessionId: PlaySessionId,
  principalId: PrincipalId,
): Either.Either<
  { readonly tag: "playSessionDeleted" },
  PlaySessionAccessFailure
> {
  const loaded = repository.load(playSessionId);
  if (Either.isLeft(loaded)) return Either.left(accessFailure(loaded.left));
  if (
    loaded.right.tag === "absent" ||
    loaded.right.record.tenure.tag !== "saved" ||
    loaded.right.record.tenure.principalId !== principalId
  ) {
    return Either.left(PLAY_SESSION_UNAVAILABLE);
  }
  const deleted = repository.delete(
    playSessionId,
    loaded.right.record.revision,
  );
  if (Either.isLeft(deleted)) return Either.left(accessFailure(deleted.left));
  return deleted.right
    ? Either.right({ tag: "playSessionDeleted" })
    : Either.left(concurrentWriteFailure());
}

export function savedTenure(
  principalId: PrincipalId,
  lastActivityAtMs: EpochMilliseconds,
): Extract<StoredPlaySessionTenure, { tag: "saved" }> {
  return { tag: "saved", principalId, lastActivityAtMs };
}

export function callerAuthorizes(
  caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>,
  tenure: StoredPlaySessionTenure,
): boolean {
  return caller.tag === "guest"
    ? tenure.tag === "guest" &&
        guestAccessGrantMatchesDigest(
          caller.guestAccessGrant,
          tenure.guestAccessGrantDigest,
        )
    : tenure.tag === "saved" && caller.principalId === tenure.principalId;
}

export function initialTenure(
  caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
  nowMs: EpochMilliseconds,
):
  | {
      readonly tag: "guest";
      readonly guestAccessGrant: ReturnType<typeof generatedGuestAccessGrant>;
      readonly tenure: Extract<StoredPlaySessionTenure, { tag: "guest" }>;
    }
  | {
      readonly tag: "saved";
      readonly tenure: Extract<StoredPlaySessionTenure, { tag: "saved" }>;
    } {
  if (caller.tag === "authenticated") {
    return {
      tag: "saved",
      tenure: {
        tag: "saved",
        principalId: caller.principalId,
        lastActivityAtMs: nowMs,
      },
    };
  }
  const guestAccessGrant = generatedGuestAccessGrant();
  return {
    tag: "guest",
    guestAccessGrant,
    tenure: {
      tag: "guest",
      guestAccessGrantDigest: guestAccessGrantDigest(guestAccessGrant),
      lastActivityAtMs: nowMs,
    },
  };
}
