import { Either, Match } from "effect";

import {
  DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  playSessionIsExpired,
  projectPlaySessionTenure,
  type GuestAccessGrant,
  type PlaySessionTenureProjection,
  type PrincipalId,
} from "./play-session-access.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionId,
  type PlaySessionAccessFailure,
} from "./play-session.ts";
import type { RecoverablePlaySessionRecord } from "./play-session-repository.ts";
import {
  accessFailure,
  admitRequest,
  callerAuthorizes,
  concurrentWriteFailure,
  savedTenure,
} from "./recoverable-play-session-support.ts";
import {
  MAX_CONCURRENT_COMMIT_ATTEMPTS,
  type RecoverableRegistryRuntime,
  type SaveAttemptResult,
} from "./recoverable-play-session-runtime.ts";

export async function saveRecoverableSession(
  runtime: RecoverableRegistryRuntime,
  playSessionId: PlaySessionId,
  guestAccessGrant: GuestAccessGrant,
  principalId: PrincipalId,
): Promise<
  Either.Either<PlaySessionTenureProjection, PlaySessionAccessFailure>
> {
  const prunedExpired = runtime.input.repository.pruneExpired(runtime.now());
  if (Either.isLeft(prunedExpired)) {
    return Either.left(accessFailure(prunedExpired.left));
  }
  const principalTenure = savedTenure(principalId, runtime.now());
  const admitted = admitRequest(
    runtime.input.repository,
    principalTenure,
    runtime.now(),
    runtime.maximumRequestsPerMinute,
  );
  if (Either.isLeft(admitted)) return Either.left(admitted.left);
  for (
    let attempt = 0;
    attempt < MAX_CONCURRENT_COMMIT_ATTEMPTS;
    attempt += 1
  ) {
    const loaded = loadSaveRecord(runtime, playSessionId, guestAccessGrant);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    const result = commitSaveAttempt(runtime, principalId, loaded.right);
    const decision = Match.value(result).pipe(
      Match.when({ tag: "retry" }, () => ({ tag: "retry" as const })),
      Match.when({ tag: "result" }, ({ result: value }) => ({
        tag: "complete" as const,
        value,
      })),
      Match.exhaustive,
    );
    if (decision.tag === "retry") continue;
    return decision.value;
  }
  return Either.left(concurrentWriteFailure());
}

function loadSaveRecord(
  runtime: RecoverableRegistryRuntime,
  playSessionId: PlaySessionId,
  guestAccessGrant: GuestAccessGrant,
): Either.Either<RecoverablePlaySessionRecord, PlaySessionAccessFailure> {
  const loaded = runtime.input.repository.load(playSessionId);
  if (Either.isLeft(loaded)) return Either.left(accessFailure(loaded.left));
  if (loaded.right.tag === "absent") {
    return Either.left(PLAY_SESSION_UNAVAILABLE);
  }
  const record = loaded.right.record;
  const caller = { tag: "guest" as const, guestAccessGrant };
  if (
    playSessionIsExpired(record.tenure, runtime.now()) ||
    !callerAuthorizes(caller, record.tenure)
  ) {
    return Either.left(PLAY_SESSION_UNAVAILABLE);
  }
  return Either.right(record);
}

function commitSaveAttempt(
  runtime: RecoverableRegistryRuntime,
  principalId: PrincipalId,
  record: RecoverablePlaySessionRecord,
): SaveAttemptResult {
  const tenure = savedTenure(principalId, runtime.now());
  const committed = runtime.input.repository.save(
    record,
    tenure,
    DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  );
  if (Either.isLeft(committed)) {
    return {
      tag: "result",
      result: Either.left(accessFailure(committed.left)),
    };
  }
  if (committed.right.tag === "savedSessionQuotaExceeded") {
    return {
      tag: "result",
      result: Either.left({
        tag: "playSessionLimitFailure",
        reason: "savedSessionQuotaExceeded",
        message: "This account has reached its saved Play Session limit.",
      }),
    };
  }
  if (committed.right.tag === "revisionConflict") return { tag: "retry" };
  return {
    tag: "result",
    result: Either.right(projectPlaySessionTenure(tenure)),
  };
}
