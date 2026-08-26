import { Either } from "effect";

import {
  disabledAdminMirrorPublication,
  type AdminMirrorPublication,
} from "./admin-mirror.ts";
import type { McpApplicationServices } from "./composition-root.ts";
import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionAccessFailure,
  type PlaySessionCommandRetention,
  type PlaySessionCreation,
  type PlaySessionCreationFailure,
  type PlaySessionId,
  type PlaySessionIdFactory,
  type PlaySessionRunResult,
  type PlaySessionRegistry,
} from "./play-session.ts";
import {
  DEFAULT_MAX_GUEST_PLAY_SESSIONS,
  DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION,
  DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE,
  currentEpochMilliseconds,
  playSessionIsExpired,
  projectPlaySessionTenure,
  type EpochMilliseconds,
  type GuestAccessGrant,
  type GuestAccessGrantFactory,
  type PlaySessionCaller,
  type PlaySessionTenureProjection,
  type PrincipalId,
} from "./play-session-access.ts";
import {
  RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
  type PlaySessionRandomSeed,
  type PlaySessionRepository,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";
import {
  accessFailure,
  admitRequest,
  callerAuthorizes,
  concurrentWriteFailure,
  creationFailure,
  deleteSavedRecord,
  generatedPlaySessionRandomSeed,
  initialTenure,
  publishCurrentProjection,
  rootFromRecord,
  savedTenure,
} from "./recoverable-play-session-support.ts";

export { openSqlitePlaySessionRepository } from "./sqlite-play-session-repository.ts";
export type {
  PlaySessionRepository,
  PlaySessionRepositoryIssue,
} from "./play-session-repository.ts";
export { decodePlaySessionRandomSeed } from "./play-session-repository.ts";

const MAX_PLAY_SESSION_ID_ATTEMPTS = 16;
const MAX_CONCURRENT_COMMIT_ATTEMPTS = 16;

type RecoverableRegistryInput = {
  readonly applicationServices: McpApplicationServices;
  readonly repository: PlaySessionRepository;
  readonly playSessionIdFactory: PlaySessionIdFactory;
  readonly guestAccessGrantFactory?: GuestAccessGrantFactory;
  readonly randomSeedFactory?: () => PlaySessionRandomSeed;
  readonly now?: () => EpochMilliseconds;
  readonly maximumGuestSessions?: number;
  readonly maximumRetainedCommandsPerSession?: number;
  readonly maximumRequestsPerMinute?: number;
};

type RecoverableRegistryRuntime = {
  readonly input: RecoverableRegistryInput;
  readonly replayServices: McpApplicationServices;
  readonly now: () => EpochMilliseconds;
  readonly maximumGuestSessions: number;
  readonly maximumRetainedCommandsPerSession: number;
  readonly maximumRequestsPerMinute: number;
  readonly operationTails: Map<PlaySessionId, Promise<void>>;
  readonly publications: Map<PlaySessionId, AdminMirrorPublication>;
};

type CreationAttempt =
  | { readonly tag: "collision" }
  | { readonly tag: "failure"; readonly failure: PlaySessionCreationFailure }
  | { readonly tag: "created"; readonly creation: PlaySessionCreation };

type CreationTenure = ReturnType<typeof initialTenure>;

type RunLoadAttempt =
  | { readonly tag: "retry" }
  | { readonly tag: "failure"; readonly failure: PlaySessionAccessFailure }
  | {
      readonly tag: "ready";
      readonly record: RecoverablePlaySessionRecord;
    };

type RunAttemptContext<A> = {
  readonly runtime: RecoverableRegistryRuntime;
  readonly playSessionId: PlaySessionId;
  readonly caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>;
  readonly operation: (root: McpPlaySessionRoot) => A | Promise<A>;
  readonly commandRetention?: PlaySessionCommandRetention<A>;
  requestRateAdmitted: boolean;
};

type RunAttemptResult<A> =
  | { readonly tag: "retry" }
  | {
      readonly tag: "result";
      readonly result: Either.Either<
        PlaySessionRunResult<A>,
        PlaySessionAccessFailure
      >;
    };

function runtimeFrom(
  input: RecoverableRegistryInput,
): RecoverableRegistryRuntime {
  return {
    input,
    replayServices: {
      ...input.applicationServices,
      createAdminMirrorPublication: disabledAdminMirrorPublication,
    },
    now: input.now ?? currentEpochMilliseconds,
    maximumGuestSessions:
      input.maximumGuestSessions ?? DEFAULT_MAX_GUEST_PLAY_SESSIONS,
    maximumRetainedCommandsPerSession:
      input.maximumRetainedCommandsPerSession ??
      DEFAULT_MAX_RETAINED_COMMANDS_PER_PLAY_SESSION,
    maximumRequestsPerMinute:
      input.maximumRequestsPerMinute ??
      DEFAULT_PLAY_SESSION_REQUESTS_PER_MINUTE,
    operationTails: new Map(),
    publications: new Map(),
  };
}

function pruneCreationPressure(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
  creationTime: EpochMilliseconds,
): Either.Either<void, PlaySessionCreationFailure> {
  const prunedExpired = runtime.input.repository.pruneExpired(creationTime);
  if (Either.isLeft(prunedExpired)) {
    return Either.left(creationFailure(prunedExpired.left));
  }
  if (caller.tag !== "anonymous") return Either.right(undefined);
  const pruned = runtime.input.repository.pruneGuestPressure(
    creationTime,
    runtime.maximumGuestSessions - 1,
  );
  return Either.isLeft(pruned)
    ? Either.left(creationFailure(pruned.left))
    : Either.right(undefined);
}

function createAttempt(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
  creationTime: EpochMilliseconds,
): CreationAttempt {
  const playSessionId = runtime.input.playSessionIdFactory();
  const randomSeed =
    runtime.input.randomSeedFactory?.() ?? generatedPlaySessionRandomSeed();
  const creationTenure = initialTenure(
    caller,
    creationTime,
    runtime.input.guestAccessGrantFactory,
  );
  const record: RecoverablePlaySessionRecord = {
    playSessionId,
    formatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
    randomSeed,
    revision: 0,
    operations: [],
    tenure: creationTenure.tenure,
  };
  const created = runtime.input.repository.create(record, {
    maximumGuestSessions: runtime.maximumGuestSessions,
    maximumSavedSessionsPerPrincipal:
      DEFAULT_MAX_SAVED_PLAY_SESSIONS_PER_PRINCIPAL,
  });
  if (Either.isLeft(created)) {
    return { tag: "failure", failure: creationFailure(created.left) };
  }
  if (created.right.tag === "playSessionIdCollision") {
    return { tag: "collision" };
  }
  if (created.right.tag === "playSessionLimitExceeded") {
    return { tag: "failure", failure: creationLimitFailure(caller) };
  }
  return creationFromRecord(runtime, record, creationTenure);
}

function creationLimitFailure(
  caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
): PlaySessionCreationFailure {
  return {
    tag: "playSessionCreationFailed",
    reason:
      caller.tag === "anonymous"
        ? "guestCapacityExceeded"
        : "savedSessionQuotaExceeded",
    message: "The Play Session creation limit has been reached.",
  };
}

function creationFromRecord(
  runtime: RecoverableRegistryRuntime,
  record: RecoverablePlaySessionRecord,
  creationTenure: CreationTenure,
): CreationAttempt {
  const root = rootFromRecord(runtime.replayServices, record);
  if (Either.isLeft(root)) {
    return { tag: "failure", failure: creationFailure(root.left) };
  }
  const base = {
    playSessionId: record.playSessionId,
    projection: root.right.sessionStore.snapshot(),
  };
  const creation: PlaySessionCreation =
    creationTenure.tag === "saved"
      ? {
          ...base,
          tenure: projectPlaySessionTenure(creationTenure.tenure),
          access: { tag: "authenticated" },
        }
      : {
          ...base,
          tenure: projectPlaySessionTenure(creationTenure.tenure),
          access: {
            tag: "guest",
            guestAccessGrant: creationTenure.guestAccessGrant,
          },
        };
  return { tag: "created", creation };
}

function createUniqueSession(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
  creationTime: EpochMilliseconds,
): Either.Either<PlaySessionCreation, PlaySessionCreationFailure> {
  for (let attempt = 0; attempt < MAX_PLAY_SESSION_ID_ATTEMPTS; attempt += 1) {
    const created = createAttempt(runtime, caller, creationTime);
    if (created.tag === "collision") continue;
    if (created.tag === "failure") return Either.left(created.failure);
    return Either.right(created.creation);
  }
  return Either.left({
    tag: "playSessionCreationFailed",
    reason: "playSessionIdCollision",
    message: `Unable to allocate a unique Play Session handle after ${MAX_PLAY_SESSION_ID_ATTEMPTS} attempts.`,
  });
}

function createRecoverableSession(
  runtime: RecoverableRegistryRuntime,
  caller: Extract<PlaySessionCaller, { tag: "anonymous" | "authenticated" }>,
): Either.Either<PlaySessionCreation, PlaySessionCreationFailure> {
  const creationTime = runtime.now();
  const pressure = pruneCreationPressure(runtime, caller, creationTime);
  if (Either.isLeft(pressure)) return Either.left(pressure.left);
  return createUniqueSession(runtime, caller, creationTime);
}

function loadRunRecord<A>(context: RunAttemptContext<A>): RunLoadAttempt {
  const loaded = context.runtime.input.repository.load(context.playSessionId);
  if (Either.isLeft(loaded)) {
    return { tag: "failure", failure: accessFailure(loaded.left) };
  }
  if (loaded.right.tag === "absent") {
    return { tag: "failure", failure: PLAY_SESSION_UNAVAILABLE };
  }
  const record = loaded.right.record;
  if (playSessionIsExpired(record.tenure, context.runtime.now())) {
    const deleted = context.runtime.input.repository.delete(
      context.playSessionId,
      record.revision,
    );
    if (Either.isLeft(deleted)) {
      return { tag: "failure", failure: accessFailure(deleted.left) };
    }
    return deleted.right
      ? { tag: "failure", failure: PLAY_SESSION_UNAVAILABLE }
      : { tag: "retry" };
  }
  return callerAuthorizes(context.caller, record.tenure)
    ? { tag: "ready", record }
    : { tag: "failure", failure: PLAY_SESSION_UNAVAILABLE };
}

function admitRunRequest<A>(
  context: RunAttemptContext<A>,
  record: RecoverablePlaySessionRecord,
): PlaySessionAccessFailure | undefined {
  if (context.requestRateAdmitted) return undefined;
  const admitted = admitRequest(
    context.runtime.input.repository,
    record.tenure,
    context.runtime.now(),
    context.runtime.maximumRequestsPerMinute,
  );
  if (Either.isLeft(admitted)) return admitted.left;
  context.requestRateAdmitted = true;
  return undefined;
}

async function commitRunOperation<A>(
  context: RunAttemptContext<A>,
  record: RecoverablePlaySessionRecord,
  root: McpPlaySessionRoot,
): Promise<RunAttemptResult<A>> {
  const operationResult = await context.operation(root);
  const succeeded =
    context.commandRetention?.succeeded?.(operationResult) ?? true;
  if (!succeeded) {
    return nonRetainedRunResult(operationResult, record);
  }
  const retainCommand =
    context.commandRetention?.retain(operationResult) ?? false;
  const retentionFailure = retainedCommandLimitFailure(
    context,
    record,
    retainCommand,
  );
  if (retentionFailure !== undefined) {
    return { tag: "result", result: Either.left(retentionFailure) };
  }
  return commitSucceededRun(
    context,
    record,
    root,
    operationResult,
    retainCommand,
  );
}

function nonRetainedRunResult<A>(
  operationResult: A,
  record: RecoverablePlaySessionRecord,
): RunAttemptResult<A> {
  return {
    tag: "result",
    result: Either.right({
      value: operationResult,
      tenure: projectPlaySessionTenure(record.tenure),
    }),
  };
}

function retainedCommandLimitFailure<A>(
  context: RunAttemptContext<A>,
  record: RecoverablePlaySessionRecord,
  retainCommand: boolean,
): PlaySessionAccessFailure | undefined {
  if (
    !retainCommand ||
    record.operations.length < context.runtime.maximumRetainedCommandsPerSession
  ) {
    return undefined;
  }
  return {
    tag: "playSessionLimitFailure",
    reason: "retainedCommandQuotaExceeded",
    message: "This Play Session has reached its retained operation limit.",
  };
}

function commitSucceededRun<A>(
  context: RunAttemptContext<A>,
  record: RecoverablePlaySessionRecord,
  root: McpPlaySessionRoot,
  operationResult: A,
  retainCommand: boolean,
): RunAttemptResult<A> {
  const tenure = {
    ...record.tenure,
    lastActivityAtMs: context.runtime.now(),
  };
  const committed = context.runtime.input.repository.commit(record, {
    tenure,
    ...(retainCommand && context.commandRetention !== undefined
      ? { operation: context.commandRetention.command }
      : {}),
  });
  if (Either.isLeft(committed)) {
    return {
      tag: "result",
      result: Either.left(accessFailure(committed.left)),
    };
  }
  if (committed.right.tag === "revisionConflict") return { tag: "retry" };
  publishCurrentProjection(
    context.runtime.input.applicationServices,
    context.runtime.publications,
    context.playSessionId,
    root,
  );
  return {
    tag: "result",
    result: Either.right({
      value: operationResult,
      tenure: projectPlaySessionTenure(tenure),
    }),
  };
}

async function runAttempt<A>(
  context: RunAttemptContext<A>,
): Promise<RunAttemptResult<A>> {
  const loaded = loadRunRecord(context);
  if (loaded.tag === "retry") return loaded;
  if (loaded.tag === "failure") {
    return { tag: "result", result: Either.left(loaded.failure) };
  }
  const rateFailure = admitRunRequest(context, loaded.record);
  if (rateFailure !== undefined) {
    return { tag: "result", result: Either.left(rateFailure) };
  }
  const reconstructed = rootFromRecord(
    context.runtime.replayServices,
    loaded.record,
  );
  if (Either.isLeft(reconstructed)) {
    return {
      tag: "result",
      result: Either.left(accessFailure(reconstructed.left)),
    };
  }
  return commitRunOperation(context, loaded.record, reconstructed.right);
}

async function runRecoverableOperation<A>(
  context: RunAttemptContext<A>,
): Promise<Either.Either<PlaySessionRunResult<A>, PlaySessionAccessFailure>> {
  for (
    let attempt = 0;
    attempt < MAX_CONCURRENT_COMMIT_ATTEMPTS;
    attempt += 1
  ) {
    const result = await runAttempt(context);
    if (result.tag === "retry") continue;
    return result.result;
  }
  return Either.left(concurrentWriteFailure());
}

type SaveAttemptResult =
  | { readonly tag: "retry" }
  | {
      readonly tag: "result";
      readonly result: Either.Either<
        PlaySessionTenureProjection,
        PlaySessionAccessFailure
      >;
    };

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

async function saveRecoverableSession(
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
    if (result.tag === "retry") continue;
    return result.result;
  }
  return Either.left(concurrentWriteFailure());
}

export function createRecoverablePlaySessionRegistry(
  input: RecoverableRegistryInput,
): PlaySessionRegistry<PlaySessionAccessFailure> {
  const runtime = runtimeFrom(input);

  return {
    create(caller) {
      return createRecoverableSession(runtime, caller);
    },
    async run<A>(
      playSessionId: PlaySessionId,
      caller: Exclude<PlaySessionCaller, { tag: "anonymous" }>,
      operation: (root: McpPlaySessionRoot) => A | Promise<A>,
      commandRetention?: PlaySessionCommandRetention<A>,
    ) {
      const context: RunAttemptContext<A> = {
        runtime,
        playSessionId,
        caller,
        operation,
        ...(commandRetention === undefined ? {} : { commandRetention }),
        requestRateAdmitted: false,
      };
      const prior =
        runtime.operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() => runRecoverableOperation(context));
      runtime.operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
    async save(playSessionId, guestAccessGrant, principalId) {
      const prior =
        runtime.operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() =>
        saveRecoverableSession(
          runtime,
          playSessionId,
          guestAccessGrant,
          principalId,
        ),
      );
      runtime.operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
    listSaved(principalId) {
      const admitted = admitRequest(
        runtime.input.repository,
        savedTenure(principalId, runtime.now()),
        runtime.now(),
        runtime.maximumRequestsPerMinute,
      );
      if (Either.isLeft(admitted)) return Either.left(admitted.left);
      const prunedExpired = runtime.input.repository.pruneExpired(
        runtime.now(),
      );
      if (Either.isLeft(prunedExpired)) {
        return Either.left(accessFailure(prunedExpired.left));
      }
      const listed = runtime.input.repository.listSaved(principalId);
      if (Either.isLeft(listed)) {
        return Either.left(accessFailure(listed.left));
      }
      return Either.right(
        listed.right.flatMap((record) => {
          if (
            record.tenure.tag !== "saved" ||
            playSessionIsExpired(record.tenure, runtime.now())
          ) {
            return [];
          }
          const tenure = projectPlaySessionTenure(record.tenure);
          return tenure.tag === "saved"
            ? [{ playSessionId: record.playSessionId, tenure }]
            : [];
        }),
      );
    },
    async deleteSaved(playSessionId, principalId) {
      const prior =
        runtime.operationTails.get(playSessionId) ?? Promise.resolve();
      const result = prior.then(() => {
        const admitted = admitRequest(
          runtime.input.repository,
          savedTenure(principalId, runtime.now()),
          runtime.now(),
          runtime.maximumRequestsPerMinute,
        );
        if (Either.isLeft(admitted)) return Either.left(admitted.left);
        const prunedExpired = runtime.input.repository.pruneExpired(
          runtime.now(),
        );
        if (Either.isLeft(prunedExpired)) {
          return Either.left(accessFailure(prunedExpired.left));
        }
        return deleteSavedRecord(
          runtime.input.repository,
          playSessionId,
          principalId,
        );
      });
      runtime.operationTails.set(
        playSessionId,
        result.then(
          () => undefined,
          () => undefined,
        ),
      );
      return result;
    },
  };
}
