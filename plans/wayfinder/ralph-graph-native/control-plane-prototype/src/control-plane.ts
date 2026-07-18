import { Effect, Option, Result, Schema, Semaphore } from "effect";
import {
  type ClaimOwner,
  compareTaskIds,
  TaskDagSnapshot,
  TaskId,
  type ProjectionResult,
  projectTrackerSnapshot,
} from "./task-dag.js";

export const AttemptId = Schema.NonEmptyString.pipe(Schema.brand("AttemptId"));
export type AttemptId = typeof AttemptId.Type;

export const GitSha = Schema.NonEmptyString.pipe(Schema.brand("GitSha"));
export type GitSha = typeof GitSha.Type;

export const WorktreeId = Schema.NonEmptyString.pipe(
  Schema.brand("WorktreeId"),
);
export type WorktreeId = typeof WorktreeId.Type;

export const WorktreePath = Schema.NonEmptyString.pipe(
  Schema.brand("WorktreePath"),
);
export type WorktreePath = typeof WorktreePath.Type;

export const AgentSessionId = Schema.NonEmptyString.pipe(
  Schema.brand("AgentSessionId"),
);
export type AgentSessionId = typeof AgentSessionId.Type;

export const EvidenceRef = Schema.NonEmptyString.pipe(
  Schema.brand("EvidenceRef"),
);
export type EvidenceRef = typeof EvidenceRef.Type;

export const RetryDueAtEpochMs = Schema.Number.check(
  Schema.isFinite(),
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
).pipe(Schema.brand("RetryDueAtEpochMs"));
export type RetryDueAtEpochMs = typeof RetryDueAtEpochMs.Type;

export const JournalEvent = Schema.TaggedUnion({
  AttemptPlanned: {
    taskId: TaskId,
    attemptId: AttemptId,
    attemptBaseSha: GitSha,
  },
  AgentSessionBound: {
    taskId: TaskId,
    attemptId: AttemptId,
    agentSessionId: AgentSessionId,
  },
  RetryScheduled: { taskId: TaskId, dueAtEpochMs: RetryDueAtEpochMs },
  AcceptedResultQueued: {
    taskId: TaskId,
    resultSha: GitSha,
    claimBaseSha: GitSha,
    evidenceRef: EvidenceRef,
  },
  IntegrationCompleted: { taskId: TaskId, acceptedHeadSha: GitSha },
  TaskQuarantined: { taskId: TaskId, evidenceRef: EvidenceRef },
});
export type JournalEvent = typeof JournalEvent.Type;

export interface JournalPort {
  readonly append: (event: JournalEvent) => Effect.Effect<void, JournalFailure>;
  readonly recover: () => Effect.Effect<
    ReadonlyArray<JournalEvent>,
    JournalFailure
  >;
}

export class JournalFailure extends Schema.TaggedErrorClass<JournalFailure>()(
  "JournalFailure",
  { operation: Schema.NonEmptyString, detail: Schema.String },
) {}

export interface OpenedAttempt {
  readonly taskId: TaskId;
  readonly attemptId: AttemptId;
  readonly attemptBaseSha: GitSha;
}

export interface AgentBoundAttempt extends OpenedAttempt {
  readonly agentSessionId: AgentSessionId;
}

export type AttemptOutcome =
  | {
      readonly _tag: "Accepted";
      readonly resultSha: GitSha;
      readonly claimBaseSha: GitSha;
      readonly evidenceRef: EvidenceRef;
    }
  | {
      readonly _tag: "ReviewCapExhausted";
      readonly evidenceRef: EvidenceRef;
    };

export type ExecutionOutcome = AttemptOutcome & { readonly taskId: TaskId };

export interface ExecutionPort {
  /** Computes identifiers and bases without creating or mutating a worktree. */
  readonly planAttempt: (
    taskId: TaskId,
  ) => Effect.Effect<OpenedAttempt, ExecutionFailure>;
  /** Idempotently creates or discovers the worktree and exact resumable agent session. */
  readonly bindAgentSession: (
    attempt: OpenedAttempt,
  ) => Effect.Effect<AgentSessionId, ExecutionFailure>;
  /** Runs or resumes only an already identified durable agent session. */
  readonly runAttempt: (
    attempt: AgentBoundAttempt,
  ) => Effect.Effect<AttemptOutcome, ExecutionFailure>;
  readonly discoverExecutions: () => Effect.Effect<
    ReadonlyArray<DiscoveredExecution>,
    ExecutionFailure
  >;
}

export class ExecutionFailure extends Schema.TaggedErrorClass<ExecutionFailure>()(
  "ExecutionFailure",
  { operation: Schema.NonEmptyString, detail: Schema.String },
) {}

export interface IntegrationPort {
  readonly integrate: (
    result: Extract<ExecutionOutcome, { readonly _tag: "Accepted" }>,
  ) => Effect.Effect<GitSha, IntegrationFailure>;
}

export class IntegrationFailure extends Schema.TaggedErrorClass<IntegrationFailure>()(
  "IntegrationFailure",
  { operation: Schema.NonEmptyString, detail: Schema.String },
) {}

export interface TrackerTransitionPort {
  readonly quarantine: (
    taskId: TaskId,
    evidenceRef: EvidenceRef,
  ) => Effect.Effect<void, TrackerTransitionFailure>;
}

export class TrackerTransitionFailure extends Schema.TaggedErrorClass<TrackerTransitionFailure>()(
  "TrackerTransitionFailure",
  { operation: Schema.NonEmptyString, detail: Schema.String },
) {}

export class TrackerReadFailure extends Schema.TaggedErrorClass<TrackerReadFailure>()(
  "TrackerReadFailure",
  { operation: Schema.NonEmptyString, detail: Schema.String },
) {}

interface DiscoveredExecutionBase {
  readonly taskId: TaskId;
  readonly attemptId: AttemptId;
  readonly worktreeId: WorktreeId;
  readonly path: WorktreePath;
}

export type DiscoveredExecution =
  | (DiscoveredExecutionBase & { readonly _tag: "WorktreeProvisioned" })
  | (DiscoveredExecutionBase & {
      readonly _tag: "AgentResumable";
      readonly agentSessionId: AgentSessionId;
    });

export interface DiscoveredIntegration {
  readonly taskId: TaskId;
  readonly resultSha: GitSha;
}

export interface DiscoveredClaim {
  readonly taskId: TaskId;
  readonly claimBaseSha: GitSha;
}

export interface RecoveryPorts {
  readonly tracker: {
    readonly readSnapshot: () => Effect.Effect<unknown, TrackerReadFailure>;
  };
  readonly execution: Pick<ExecutionPort, "discoverExecutions">;
  readonly git: {
    readonly discoverClaims: () => Effect.Effect<
      ReadonlyArray<DiscoveredClaim>,
      IntegrationFailure
    >;
    readonly discoverIntegrations: () => Effect.Effect<
      ReadonlyArray<DiscoveredIntegration>,
      IntegrationFailure
    >;
  };
  readonly journal: JournalPort;
}

export interface CoordinatorPorts {
  readonly execution: ExecutionPort;
  readonly integration: IntegrationPort;
  readonly journal: JournalPort;
  readonly tracker: TrackerTransitionPort;
}

const EXECUTION_CONCURRENCY = 2;

export const makeCoordinator = Effect.fn("Ralph.makeCoordinator")(function* (
  ports: CoordinatorPorts,
) {
  const integrationGate = yield* Semaphore.make(1);

  const executeOne = Effect.fn("Ralph.executeOne")(function* (taskId: TaskId) {
    const attempt = yield* ports.execution.planAttempt(taskId);
    yield* ports.journal.append({
      _tag: "AttemptPlanned",
      taskId,
      attemptId: attempt.attemptId,
      attemptBaseSha: attempt.attemptBaseSha,
    });

    const agentSessionId = yield* ports.execution.bindAgentSession(attempt);
    const boundAttempt: AgentBoundAttempt = { ...attempt, agentSessionId };
    yield* ports.journal.append({
      _tag: "AgentSessionBound",
      taskId,
      attemptId: boundAttempt.attemptId,
      agentSessionId: boundAttempt.agentSessionId,
    });

    const attemptOutcome = yield* ports.execution.runAttempt(boundAttempt);
    const outcome: ExecutionOutcome = { ...attemptOutcome, taskId };
    if (outcome._tag === "ReviewCapExhausted") {
      yield* ports.journal.append({
        _tag: "TaskQuarantined",
        taskId,
        evidenceRef: outcome.evidenceRef,
      });
      yield* ports.tracker.quarantine(taskId, outcome.evidenceRef);
      return outcome;
    }

    yield* ports.journal.append({
      _tag: "AcceptedResultQueued",
      taskId,
      resultSha: outcome.resultSha,
      claimBaseSha: outcome.claimBaseSha,
      evidenceRef: outcome.evidenceRef,
    });
    const acceptedHeadSha = yield* integrationGate.withPermit(
      ports.integration.integrate(outcome),
    );
    yield* ports.journal.append({
      _tag: "IntegrationCompleted",
      taskId,
      acceptedHeadSha,
    });
    return outcome;
  });

  const executeFrontier = Effect.fn("Ralph.executeFrontier")(function* (
    snapshot: TaskDagSnapshot,
  ) {
    return yield* Effect.forEach(snapshot.runnableFrontier(), executeOne, {
      concurrency: EXECUTION_CONCURRENCY,
    });
  });

  return { executeFrontier } as const;
});

interface RecoveredAttemptBase {
  readonly taskId: TaskId;
  readonly attemptId: AttemptId;
  readonly attemptBaseSha: GitSha;
}

export type RecoveredAttempt =
  | (RecoveredAttemptBase & { readonly _tag: "Planned" })
  | (RecoveredAttemptBase & {
      readonly _tag: "WorktreeProvisioned";
      readonly worktreeId: WorktreeId;
      readonly path: WorktreePath;
    })
  | (RecoveredAttemptBase & {
      readonly _tag: "AgentResumable";
      readonly worktreeId: WorktreeId;
      readonly path: WorktreePath;
      readonly agentSessionId: AgentSessionId;
    });

export interface RecoveredRetryTimer {
  readonly taskId: TaskId;
  readonly dueAtEpochMs: RetryDueAtEpochMs;
}

export interface QueuedIntegration {
  readonly taskId: TaskId;
  readonly resultSha: GitSha;
  readonly claimBaseSha: GitSha;
  readonly evidenceRef: EvidenceRef;
}

export interface PendingQuarantine {
  readonly taskId: TaskId;
  readonly evidenceRef: EvidenceRef;
}

export interface RecoveredControlState {
  readonly snapshot: TaskDagSnapshot;
  readonly claims: ReadonlyArray<DiscoveredClaim>;
  readonly attempts: ReadonlyArray<RecoveredAttempt>;
  readonly unmatchedExecutions: ReadonlyArray<DiscoveredExecution>;
  readonly retryTimers: ReadonlyArray<RecoveredRetryTimer>;
  readonly integrationQueue: ReadonlyArray<QueuedIntegration>;
  readonly pendingQuarantines: ReadonlyArray<PendingQuarantine>;
}

export type RecoveryIssue =
  | {
      readonly _tag: "ProjectionFailed";
      readonly result: Extract<ProjectionResult, { readonly _tag: "Invalid" }>;
    }
  | { readonly _tag: "UnknownJournalTask"; readonly taskId: TaskId }
  | { readonly _tag: "UnknownExecutionTask"; readonly taskId: TaskId }
  | { readonly _tag: "DuplicateExecution"; readonly taskId: TaskId }
  | { readonly _tag: "OrphanSessionBinding"; readonly taskId: TaskId }
  | { readonly _tag: "OverlappingAttempt"; readonly taskId: TaskId }
  | { readonly _tag: "SessionBindingContradiction"; readonly taskId: TaskId }
  | {
      readonly _tag: "AttemptIdentityContradiction";
      readonly taskId: TaskId;
      readonly plannedAttemptId: AttemptId;
      readonly discoveredAttemptId: AttemptId;
    }
  | { readonly _tag: "MissingBoundExecution"; readonly taskId: TaskId }
  | {
      readonly _tag: "SessionIdentityContradiction";
      readonly taskId: TaskId;
      readonly journalSessionId: AgentSessionId;
      readonly discoveredSessionId: AgentSessionId;
    }
  | { readonly _tag: "UnknownClaimTask"; readonly taskId: TaskId }
  | { readonly _tag: "DuplicateClaim"; readonly taskId: TaskId }
  | { readonly _tag: "MissingClaimBase"; readonly taskId: TaskId }
  | { readonly _tag: "ClaimLifecycleContradiction"; readonly taskId: TaskId }
  | {
      readonly _tag: "QuarantineLifecycleContradiction";
      readonly taskId: TaskId;
    }
  | {
      readonly _tag: "IntegrationContradiction";
      readonly taskId: TaskId;
      readonly queuedResultSha: GitSha;
      readonly integratedResultSha: GitSha;
    };

export type RecoveryResult =
  | {
      readonly _tag: "RecoveryFailed";
      readonly issues: ReadonlyArray<RecoveryIssue>;
    }
  | { readonly _tag: "Recovered"; readonly state: RecoveredControlState };

const sortByTaskId = <A extends { readonly taskId: TaskId }>(
  values: Iterable<A>,
): ReadonlyArray<A> =>
  [...values].sort((left, right) => compareTaskIds(left.taskId, right.taskId));

export const recoverControlState = (
  snapshot: TaskDagSnapshot,
  journal: ReadonlyArray<JournalEvent>,
  discoveredExecutions: ReadonlyArray<DiscoveredExecution>,
  discoveredClaims: ReadonlyArray<DiscoveredClaim>,
  discoveredIntegrations: ReadonlyArray<DiscoveredIntegration>,
): RecoveryResult => {
  const issues: Array<RecoveryIssue> = [];
  const events: Array<JournalEvent> = [];

  for (const event of journal) {
    if (Option.isNone(snapshot.taskLifecycle(event.taskId))) {
      issues.push({
        _tag: "UnknownJournalTask",
        taskId: event.taskId,
      });
    } else {
      events.push(event);
    }
  }

  const executionsByTask = new Map<TaskId, DiscoveredExecution>();
  for (const execution of discoveredExecutions) {
    if (Option.isNone(snapshot.taskLifecycle(execution.taskId))) {
      issues.push({ _tag: "UnknownExecutionTask", taskId: execution.taskId });
    } else if (executionsByTask.has(execution.taskId)) {
      issues.push({ _tag: "DuplicateExecution", taskId: execution.taskId });
    } else {
      executionsByTask.set(execution.taskId, execution);
    }
  }

  const trackerClaims = new Map<TaskId, ClaimOwner>();
  for (const taskId of snapshot.topologicalOrder()) {
    const lifecycle = snapshot.taskLifecycle(taskId);
    if (Option.isSome(lifecycle) && lifecycle.value._tag === "Claimed") {
      trackerClaims.set(taskId, lifecycle.value.owner);
    }
  }
  const claimBases = new Map<TaskId, GitSha>();
  for (const claim of discoveredClaims) {
    const lifecycle = snapshot.taskLifecycle(claim.taskId);
    if (Option.isNone(lifecycle)) {
      issues.push({ _tag: "UnknownClaimTask", taskId: claim.taskId });
    } else if (lifecycle.value._tag !== "Claimed") {
      issues.push({
        _tag: "ClaimLifecycleContradiction",
        taskId: claim.taskId,
      });
    } else if (claimBases.has(claim.taskId)) {
      issues.push({ _tag: "DuplicateClaim", taskId: claim.taskId });
    } else {
      claimBases.set(claim.taskId, claim.claimBaseSha);
    }
  }
  for (const taskId of trackerClaims.keys()) {
    if (!claimBases.has(taskId)) {
      issues.push({ _tag: "MissingClaimBase", taskId });
    }
  }

  const claims: Array<DiscoveredClaim> = [];
  for (const taskId of trackerClaims.keys()) {
    const claimBaseSha = claimBases.get(taskId);
    if (claimBaseSha !== undefined) claims.push({ taskId, claimBaseSha });
  }

  const plannedAttempts = new Map<TaskId, RecoveredAttemptBase>();
  const boundSessions = new Map<TaskId, AgentSessionId>();
  const retryTimers = new Map<TaskId, RecoveredRetryTimer>();
  const integrationQueue = new Map<TaskId, QueuedIntegration>();
  const quarantines = new Map<TaskId, PendingQuarantine>();
  for (const event of events) {
    if (event._tag === "AttemptPlanned") {
      const active = plannedAttempts.get(event.taskId);
      if (
        active !== undefined &&
        (active.attemptId !== event.attemptId ||
          active.attemptBaseSha !== event.attemptBaseSha)
      ) {
        issues.push({ _tag: "OverlappingAttempt", taskId: event.taskId });
        continue;
      }
      plannedAttempts.set(event.taskId, {
        taskId: event.taskId,
        attemptId: event.attemptId,
        attemptBaseSha: event.attemptBaseSha,
      });
      boundSessions.delete(event.taskId);
      retryTimers.delete(event.taskId);
    } else if (event._tag === "AgentSessionBound") {
      const planned = plannedAttempts.get(event.taskId);
      if (planned === undefined || planned.attemptId !== event.attemptId) {
        issues.push({ _tag: "OrphanSessionBinding", taskId: event.taskId });
      } else {
        const boundSession = boundSessions.get(event.taskId);
        if (
          boundSession !== undefined &&
          boundSession !== event.agentSessionId
        ) {
          issues.push({
            _tag: "SessionBindingContradiction",
            taskId: event.taskId,
          });
        } else {
          boundSessions.set(event.taskId, event.agentSessionId);
        }
      }
    } else if (event._tag === "RetryScheduled") {
      plannedAttempts.delete(event.taskId);
      boundSessions.delete(event.taskId);
      retryTimers.set(event.taskId, {
        taskId: event.taskId,
        dueAtEpochMs: event.dueAtEpochMs,
      });
    } else if (event._tag === "AcceptedResultQueued") {
      plannedAttempts.delete(event.taskId);
      boundSessions.delete(event.taskId);
      retryTimers.delete(event.taskId);
      integrationQueue.set(event.taskId, {
        taskId: event.taskId,
        resultSha: event.resultSha,
        claimBaseSha: event.claimBaseSha,
        evidenceRef: event.evidenceRef,
      });
    } else if (event._tag === "IntegrationCompleted") {
      plannedAttempts.delete(event.taskId);
      boundSessions.delete(event.taskId);
      integrationQueue.delete(event.taskId);
    } else if (event._tag === "TaskQuarantined") {
      plannedAttempts.delete(event.taskId);
      boundSessions.delete(event.taskId);
      retryTimers.delete(event.taskId);
      integrationQueue.delete(event.taskId);
      quarantines.set(event.taskId, {
        taskId: event.taskId,
        evidenceRef: event.evidenceRef,
      });
    }
  }

  const attempts: Array<RecoveredAttempt> = [];
  const matchedExecutionTaskIds = new Set<TaskId>();
  for (const planned of plannedAttempts.values()) {
    const execution = executionsByTask.get(planned.taskId);
    const journalSessionId = boundSessions.get(planned.taskId);
    if (execution === undefined) {
      if (journalSessionId === undefined) {
        attempts.push({ _tag: "Planned", ...planned });
      } else {
        issues.push({ _tag: "MissingBoundExecution", taskId: planned.taskId });
      }
      continue;
    }
    if (execution.attemptId !== planned.attemptId) {
      issues.push({
        _tag: "AttemptIdentityContradiction",
        taskId: planned.taskId,
        plannedAttemptId: planned.attemptId,
        discoveredAttemptId: execution.attemptId,
      });
      continue;
    }
    matchedExecutionTaskIds.add(planned.taskId);
    if (execution._tag === "WorktreeProvisioned") {
      if (journalSessionId === undefined) {
        attempts.push({
          _tag: "WorktreeProvisioned",
          ...planned,
          worktreeId: execution.worktreeId,
          path: execution.path,
        });
      } else {
        issues.push({ _tag: "MissingBoundExecution", taskId: planned.taskId });
      }
      continue;
    }
    if (
      journalSessionId !== undefined &&
      journalSessionId !== execution.agentSessionId
    ) {
      issues.push({
        _tag: "SessionIdentityContradiction",
        taskId: planned.taskId,
        journalSessionId,
        discoveredSessionId: execution.agentSessionId,
      });
      continue;
    }
    attempts.push({
      _tag: "AgentResumable",
      ...planned,
      worktreeId: execution.worktreeId,
      path: execution.path,
      agentSessionId: execution.agentSessionId,
    });
  }
  const unmatchedExecutions = [...executionsByTask.values()].filter(
    (execution) => !matchedExecutionTaskIds.has(execution.taskId),
  );

  const pendingQuarantines: Array<PendingQuarantine> = [];
  for (const quarantine of quarantines.values()) {
    const lifecycle = snapshot.taskLifecycle(quarantine.taskId);
    if (Option.isSome(lifecycle) && lifecycle.value._tag === "Completed") {
      issues.push({
        _tag: "QuarantineLifecycleContradiction",
        taskId: quarantine.taskId,
      });
    } else if (
      Option.isSome(lifecycle) &&
      lifecycle.value._tag !== "Quarantined"
    ) {
      pendingQuarantines.push(quarantine);
    }
  }

  for (const integrated of discoveredIntegrations) {
    const queued = integrationQueue.get(integrated.taskId);
    if (queued === undefined) continue;
    if (queued.resultSha !== integrated.resultSha) {
      issues.push({
        _tag: "IntegrationContradiction",
        taskId: integrated.taskId,
        queuedResultSha: queued.resultSha,
        integratedResultSha: integrated.resultSha,
      });
    } else {
      integrationQueue.delete(integrated.taskId);
    }
  }

  if (issues.length > 0) return { _tag: "RecoveryFailed", issues };

  return {
    _tag: "Recovered",
    state: {
      snapshot,
      claims: sortByTaskId(claims),
      attempts: sortByTaskId(attempts),
      unmatchedExecutions: sortByTaskId(unmatchedExecutions),
      retryTimers: sortByTaskId(retryTimers.values()),
      integrationQueue: sortByTaskId(integrationQueue.values()),
      pendingQuarantines: sortByTaskId(pendingQuarantines),
    },
  };
};

export const recoverFromPorts = Effect.fn("Ralph.recoverFromPorts")(function* (
  ports: RecoveryPorts,
) {
  const [trackerSnapshot, journal, executions, claims, integrations] =
    yield* Effect.all(
      [
        ports.tracker.readSnapshot(),
        ports.journal.recover(),
        ports.execution.discoverExecutions(),
        ports.git.discoverClaims(),
        ports.git.discoverIntegrations(),
      ] as const,
      { concurrency: "unbounded" },
    );
  const projected = projectTrackerSnapshot(trackerSnapshot);
  if (projected._tag === "Invalid") {
    return {
      _tag: "RecoveryFailed",
      issues: [{ _tag: "ProjectionFailed", result: projected }],
    } satisfies RecoveryResult;
  }
  return recoverControlState(
    projected.snapshot,
    journal,
    executions,
    claims,
    integrations,
  );
});

export const decodeAcknowledgedJournalRecords = (
  contents: string,
): Result.Result<ReadonlyArray<JournalEvent>, JournalFailure> => {
  const events: Array<JournalEvent> = [];
  const lines = contents.split("\n");
  if (!contents.endsWith("\n")) {
    // A killed append may leave one partial tail. Only newline-acknowledged records replay.
    lines.pop();
  }
  for (const [index, line] of lines.entries()) {
    if (line.trim().length === 0) continue;
    let input: unknown;
    try {
      input = JSON.parse(line);
    } catch (cause) {
      return Result.fail(
        new JournalFailure({
          operation: "Journal.read",
          detail: `line ${index + 1}: ${String(cause)}`,
        }),
      );
    }
    const decoded = Schema.decodeUnknownResult(JournalEvent)(input);
    if (Result.isFailure(decoded)) {
      return Result.fail(
        new JournalFailure({
          operation: "Journal.read",
          detail: `line ${index + 1}: ${String(decoded.failure)}`,
        }),
      );
    }
    events.push(decoded.success);
  }
  return Result.succeed(events);
};

export const encodeJournalRecord = (event: JournalEvent): string =>
  `${JSON.stringify(Schema.encodeUnknownSync(JournalEvent)(event))}\n`;
