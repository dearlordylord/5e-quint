import { Either, Match } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  playSessionIsExpired,
  projectPlaySessionTenure,
} from "./play-session-access.ts";
import {
  PLAY_SESSION_UNAVAILABLE,
  type PlaySessionAccessFailure,
  type PlaySessionCommand,
  type PlaySessionCommandRetention,
  type PlaySessionRunResult,
} from "./play-session.ts";
import type { RecoverablePlaySessionRecord } from "./play-session-repository.ts";
import {
  accessFailure,
  admitRequest,
  callerAuthorizes,
  concurrentWriteFailure,
  publishCurrentProjection,
  rootFromRecord,
} from "./recoverable-play-session-support.ts";
import {
  MAX_CONCURRENT_COMMIT_ATTEMPTS,
  type RunAttemptContext,
  type RunAttemptResult,
  type RunLoadAttempt,
} from "./recoverable-play-session-runtime.ts";

export async function runRecoverableOperation<A>(
  context: RunAttemptContext<A>,
): Promise<Either.Either<PlaySessionRunResult<A>, PlaySessionAccessFailure>> {
  for (
    let attempt = 0;
    attempt < MAX_CONCURRENT_COMMIT_ATTEMPTS;
    attempt += 1
  ) {
    const result = await runAttempt(context);
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

async function runAttempt<A>(
  context: RunAttemptContext<A>,
): Promise<RunAttemptResult<A>> {
  const loaded = loadRunRecord(context);
  return Match.value(loaded).pipe(
    Match.when({ tag: "retry" }, () =>
      Promise.resolve({ tag: "retry" as const }),
    ),
    Match.when({ tag: "failure" }, ({ failure }) =>
      Promise.resolve({
        tag: "result" as const,
        result: Either.left(failure),
      }),
    ),
    Match.when({ tag: "ready" }, ({ record }) =>
      runReadyAttempt(context, record),
    ),
    Match.exhaustive,
  );
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

async function runReadyAttempt<A>(
  context: RunAttemptContext<A>,
  record: RecoverablePlaySessionRecord,
): Promise<RunAttemptResult<A>> {
  const rateFailure = admitRunRequest(context, record);
  if (rateFailure !== undefined) {
    return { tag: "result", result: Either.left(rateFailure) };
  }
  const reconstructed = rootFromRecord(context.runtime.replayServices, record);
  if (Either.isLeft(reconstructed)) {
    return {
      tag: "result",
      result: Either.left(accessFailure(reconstructed.left)),
    };
  }
  return commitRunOperation(context, record, reconstructed.right);
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
  return Match.value(
    commandRetentionDecision(context.commandRetention, operationResult),
  ).pipe(
    Match.when({ tag: "operationFailed" }, () =>
      nonRetainedRunResult(operationResult, record),
    ),
    Match.when({ tag: "succeededWithoutCommand" }, () =>
      commitSucceededRun(context, record, root, operationResult, undefined),
    ),
    Match.when({ tag: "succeededWithCommand" }, ({ command }) => {
      const retentionFailure = retainedCommandLimitFailure(
        context,
        record,
        true,
      );
      return retentionFailure === undefined
        ? commitSucceededRun(context, record, root, operationResult, command)
        : { tag: "result" as const, result: Either.left(retentionFailure) };
    }),
    Match.exhaustive,
  );
}

type CommandRetentionDecision =
  | { readonly tag: "operationFailed" }
  | { readonly tag: "succeededWithoutCommand" }
  | {
      readonly tag: "succeededWithCommand";
      readonly command: PlaySessionCommand;
    };

function commandRetentionDecision<A>(
  retention: PlaySessionCommandRetention<A> | undefined,
  operationResult: A,
): CommandRetentionDecision {
  if (retention === undefined) return { tag: "succeededWithoutCommand" };
  if (retention.succeeded?.(operationResult) === false) {
    return { tag: "operationFailed" };
  }
  return retention.retain(operationResult)
    ? {
        tag: "succeededWithCommand",
        command: retention.commandFor(operationResult),
      }
    : { tag: "succeededWithoutCommand" };
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
  command: PlaySessionCommand | undefined,
): RunAttemptResult<A> {
  const tenure = {
    ...record.tenure,
    lastActivityAtMs: context.runtime.now(),
  };
  const committed = context.runtime.input.repository.commit(record, {
    tenure,
    ...(command === undefined ? {} : { operation: command }),
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
