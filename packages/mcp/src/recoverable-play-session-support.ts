import { Result } from "effect";

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
  type GuestAccessGrantFactory,
  type PlaySessionCaller,
  type PrincipalId,
  type StoredPlaySessionTenure,
} from "./play-session-access.ts";
import {
  type PlaySessionDiceReplay,
  type PlaySessionRepository,
  type PlaySessionRepositoryIssue,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import {
  DICE_RANDOM_SOURCE,
  generatedDiceSeed,
} from "./dice-sampling-service.ts";
import { handleToolCall } from "./server.ts";

export function rootFromRecord(
  applicationServices: McpApplicationServices,
  record: RecoverablePlaySessionRecord,
): Result.Result<McpPlaySessionRoot, PlaySessionRepositoryIssue> {
  const root = createMcpPlaySessionRoot(
    applicationServices,
    adminMirrorSessionId(record.playSessionId),
    record.diceReplay.seed,
  );
  for (const operation of record.operations) {
    const replayed = handleToolCall(root, operation.name, operation.args);
    if ("isError" in replayed && replayed.isError === true) {
      return Result.fail({
        tag: "playSessionRepositoryIssue",
        reason: "invalidStoredRecord",
        message: `Stored Play Session operation ${operation.name} no longer reconstructs successfully.`,
      });
    }
  }
  return Result.succeed(root);
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

export function generatedPlaySessionDiceReplay(): PlaySessionDiceReplay {
  return {
    seed: generatedDiceSeed(),
    randomSource: DICE_RANDOM_SOURCE,
  };
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
): Result.Result<void, PlaySessionAccessFailure> {
  const accessKeyDigest = playSessionRateLimitKeyDigest(tenure);
  const admitted = repository.admitRequest(
    accessKeyDigest,
    nowMs,
    maximumRequestsPerWindow,
  );
  if (Result.isFailure(admitted)) {
    return Result.fail(accessFailure(admitted.failure));
  }
  if (admitted.success.tag === "rateExceeded") {
    return Result.fail({
      tag: "playSessionLimitFailure",
      reason: "requestRateExceeded",
      message: "Too many Play Session requests. Retry after the stated delay.",
      retryAfterSeconds: admitted.success.retryAfterSeconds,
    });
  }
  return Result.succeed(undefined);
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
): Result.Result<
  { readonly tag: "playSessionDeleted" },
  PlaySessionAccessFailure
> {
  const loaded = repository.load(playSessionId);
  if (Result.isFailure(loaded))
    return Result.fail(accessFailure(loaded.failure));
  if (
    loaded.success.tag === "absent" ||
    loaded.success.record.tenure.tag !== "saved" ||
    loaded.success.record.tenure.principalId !== principalId
  ) {
    return Result.fail(PLAY_SESSION_UNAVAILABLE);
  }
  const deleted = repository.delete(
    playSessionId,
    loaded.success.record.revision,
  );
  if (Result.isFailure(deleted))
    return Result.fail(accessFailure(deleted.failure));
  return deleted.success
    ? Result.succeed({ tag: "playSessionDeleted" })
    : Result.fail(concurrentWriteFailure());
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
  guestAccessGrantFactory: GuestAccessGrantFactory = generatedGuestAccessGrant,
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
  const guestAccessGrant = guestAccessGrantFactory();
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
