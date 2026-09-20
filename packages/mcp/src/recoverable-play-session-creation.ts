import { Result, Match } from "effect";

import {
  RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import {
  type PlaySessionCreation,
  type PlaySessionCreationFailure,
} from "./play-session.ts";
import {
  DEFAULT_MAX_GUEST_PLAY_SESSIONS,
  DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  type EpochMilliseconds,
  type PlaySessionCaller,
} from "./play-session-access.ts";
import {
  creationFailure,
  generatedPlaySessionDiceReplay,
  rootFromRecord,
  savedTenure,
} from "./recoverable-play-session-support.ts";
import {
  MAX_PLAY_SESSION_ID_ATTEMPTS,
  type CreationAttempt,
  type RecoverableRegistryRuntime,
} from "./recoverable-play-session-runtime.ts";
import { projectPlaySessionTenure } from "./play-session-access.ts";

export function createRecoverableSession(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "authenticated" }>,
): Result.Result<PlaySessionCreation, PlaySessionCreationFailure> {
  const creationTime = runtime.now();
  const pressure = pruneCreationPressure(runtime, creationTime);
  if (Result.isFailure(pressure)) return Result.fail(pressure.failure);
  return createUniqueSession(runtime, caller, creationTime);
}

function pruneCreationPressure(
  runtime: RecoverableRegistryRuntime,
  creationTime: EpochMilliseconds,
): Result.Result<void, PlaySessionCreationFailure> {
  const prunedExpired = runtime.input.repository.pruneExpired(creationTime);
  if (Result.isFailure(prunedExpired)) {
    return Result.fail(creationFailure(prunedExpired.failure));
  }
  return Result.succeed(undefined);
}

function createAttempt(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "authenticated" }>,
  creationTime: EpochMilliseconds,
): CreationAttempt {
  const playSessionId = runtime.input.playSessionIdFactory();
  const diceReplay =
    runtime.input.diceReplayFactory?.() ?? generatedPlaySessionDiceReplay();
  const creationTenure = savedTenure(caller.principalId, creationTime);
  const record: RecoverablePlaySessionRecord = {
    playSessionId,
    formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
    diceReplay,
    revision: 0,
    operations: [],
    tenure: creationTenure,
  };
  const created = runtime.input.repository.create(record, {
    maximumGuestSessions: DEFAULT_MAX_GUEST_PLAY_SESSIONS,
    maximumSavedSessionsPerPrincipal:
      DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  });
  if (Result.isFailure(created)) {
    return { tag: "failure", failure: creationFailure(created.failure) };
  }
  return Match.value(created.success).pipe(
    Match.when({ tag: "playSessionIdCollision" }, () => ({
      tag: "collision" as const,
    })),
    Match.when({ tag: "playSessionLimitExceeded" }, () => ({
      tag: "failure" as const,
      failure: creationLimitFailure(),
    })),
    Match.when({ tag: "created" }, () =>
      creationFromRecord(runtime, record, creationTenure),
    ),
    Match.exhaustive,
  );
}

function creationLimitFailure(): PlaySessionCreationFailure {
  return {
    tag: "playSessionCreationFailed",
    reason: "savedSessionQuotaExceeded",
    message: "The Play Session creation limit has been reached.",
  };
}

function creationFromRecord(
  runtime: RecoverableRegistryRuntime,
  record: RecoverablePlaySessionRecord,
  creationTenure: ReturnType<typeof savedTenure>,
): CreationAttempt {
  const root = rootFromRecord(runtime.replayServices, record);
  if (Result.isFailure(root)) {
    return { tag: "failure", failure: creationFailure(root.failure) };
  }
  const base = {
    playSessionId: record.playSessionId,
    projection: root.success.sessionStore.snapshot(),
  };
  const creation: PlaySessionCreation = {
    ...base,
    tenure: projectPlaySessionTenure(creationTenure),
    access: { tag: "authenticated" },
  };
  return { tag: "created", creation };
}

function createUniqueSession(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "authenticated" }>,
  creationTime: EpochMilliseconds,
): Result.Result<PlaySessionCreation, PlaySessionCreationFailure> {
  for (let attempt = 0; attempt < MAX_PLAY_SESSION_ID_ATTEMPTS; attempt += 1) {
    const created = createAttempt(runtime, caller, creationTime);
    const decision = Match.value(created).pipe(
      Match.when({ tag: "collision" }, () => ({ tag: "retry" as const })),
      Match.when({ tag: "failure" }, ({ failure }) => ({
        tag: "failure" as const,
        failure,
      })),
      Match.when({ tag: "created" }, ({ creation }) => ({
        tag: "success" as const,
        creation,
      })),
      Match.exhaustive,
    );
    if (decision.tag === "retry") continue;
    return decision.tag === "failure"
      ? Result.fail(decision.failure)
      : Result.succeed(decision.creation);
  }
  return Result.fail({
    tag: "playSessionCreationFailed",
    reason: "playSessionIdCollision",
    message: `Unable to allocate a unique Play Session handle after ${MAX_PLAY_SESSION_ID_ATTEMPTS} attempts.`,
  });
}
