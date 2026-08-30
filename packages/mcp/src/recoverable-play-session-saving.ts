import { Result, Match } from "effect";

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
  Result.Result<PlaySessionTenureProjection, PlaySessionAccessFailure>
> {
  const prunedExpired = runtime.input.repository.pruneExpired(runtime.now());
  if (Result.isFailure(prunedExpired)) {
    return Result.fail(accessFailure(prunedExpired.failure));
  }
  const principalTenure = savedTenure(principalId, runtime.now());
  const admitted = admitRequest(
    runtime.input.repository,
    principalTenure,
    runtime.now(),
    runtime.maximumRequestsPerMinute,
  );
  if (Result.isFailure(admitted)) return Result.fail(admitted.failure);
  for (
    let attempt = 0;
    attempt < MAX_CONCURRENT_COMMIT_ATTEMPTS;
    attempt += 1
  ) {
    const loaded = loadSaveRecord(runtime, playSessionId, guestAccessGrant);
    if (Result.isFailure(loaded)) return Result.fail(loaded.failure);
    const result = commitSaveAttempt(runtime, principalId, loaded.success);
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
  return Result.fail(concurrentWriteFailure());
}

function loadSaveRecord(
  runtime: RecoverableRegistryRuntime,
  playSessionId: PlaySessionId,
  guestAccessGrant: GuestAccessGrant,
): Result.Result<RecoverablePlaySessionRecord, PlaySessionAccessFailure> {
  const loaded = runtime.input.repository.load(playSessionId);
  if (Result.isFailure(loaded))
    return Result.fail(accessFailure(loaded.failure));
  if (loaded.success.tag === "absent") {
    return Result.fail(PLAY_SESSION_UNAVAILABLE);
  }
  const record = loaded.success.record;
  const caller = { tag: "guest" as const, guestAccessGrant };
  if (
    playSessionIsExpired(record.tenure, runtime.now()) ||
    !callerAuthorizes(caller, record.tenure)
  ) {
    return Result.fail(PLAY_SESSION_UNAVAILABLE);
  }
  return Result.succeed(record);
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
  if (Result.isFailure(committed)) {
    return {
      tag: "result",
      result: Result.fail(accessFailure(committed.failure)),
    };
  }
  if (committed.success.tag === "savedSessionQuotaExceeded") {
    return {
      tag: "result",
      result: Result.fail({
        tag: "playSessionLimitFailure",
        reason: "savedSessionQuotaExceeded",
        message: "This account has reached its saved Play Session limit.",
      }),
    };
  }
  if (committed.success.tag === "revisionConflict") return { tag: "retry" };
  return {
    tag: "result",
    result: Result.succeed(projectPlaySessionTenure(tenure)),
  };
}
