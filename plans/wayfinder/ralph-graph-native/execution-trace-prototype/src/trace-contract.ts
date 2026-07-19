export type RunId = `run:${string}`;
export type ScenarioId = `scenario:${string}`;
export type TaskId = `github-issue:${number}` | `task:${string}`;
export type AttemptId = `attempt:${string}`;
export type WorktreeId = `worktree:${string}`;
export type OccurrenceId = `occurrence:${string}`;
export type ActorInvocationId = `actor:${string}`;
export type AgentSessionId = `session:${string}`;
export type EvidenceId = `evidence:${string}`;
export type ObservationId = `observation:${string}`;
export type OperationId = `operation:${string}`;
export type TrackerRevision = `tracker-revision:${string}`;
export type IntegrationId = `integration:${string}`;
export type IntegrationTargetId = `integration-target:${string}`;

declare const traceCursorBrand: unique symbol;
declare const journalPositionBrand: unique symbol;
declare const observedAtBrand: unique symbol;
export type TraceCursor = number & { readonly [traceCursorBrand]: true };
export type JournalPosition = number & {
  readonly [journalPositionBrand]: true;
};
export type ObservedAt = string & { readonly [observedAtBrand]: true };

export const TASK_LIFECYCLES = ["open", "closed"] as const;
export type TaskLifecycle = (typeof TASK_LIFECYCLES)[number];

export type TaskAssignment =
  | { readonly tag: "Unassigned" }
  | { readonly tag: "Assigned"; readonly owner: string };

export interface TaskFact {
  readonly id: TaskId;
  readonly title: string;
  readonly lifecycle: TaskLifecycle;
  readonly parentTaskId: TaskId | null;
  readonly prerequisiteIds: ReadonlyArray<TaskId>;
  readonly assignment: TaskAssignment;
  readonly labels: ReadonlyArray<string>;
}

export interface TaskDagRevision {
  readonly revision: TrackerRevision;
  readonly tasks: ReadonlyArray<TaskFact>;
}

export const ACTOR_ROLES = [
  "implementer",
  "task-reviewer",
  "integration-agent",
  "integration-reviewer",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];

export const OBSERVATION_CAPABILITIES = [
  "opaque",
  "snapshot",
  "streaming",
] as const;
export type ObservationCapability = (typeof OBSERVATION_CAPABILITIES)[number];

export type AgentSessionBinding =
  | {
      readonly tag: "InitialSession";
      readonly sessionId: AgentSessionId;
    }
  | {
      readonly tag: "ResumedSession";
      readonly sessionId: AgentSessionId;
      readonly previousInvocationId: ActorInvocationId;
    }
  | {
      readonly tag: "ReplacementSession";
      readonly sessionId: AgentSessionId;
      readonly supersededSessionId: AgentSessionId;
    };

export type ActorIdentity<Role extends ActorRole = ActorRole> = {
  readonly invocationId: ActorInvocationId;
  readonly role: Role;
  readonly observationCapability: ObservationCapability;
  readonly sessionBinding: AgentSessionBinding;
};

export interface TaskAttemptNode {
  readonly tag: "TaskAttempt";
  readonly taskId: TaskId;
  readonly attemptId: AttemptId;
  readonly worktreeId: WorktreeId;
}

export interface IntegrationNode {
  readonly tag: "IntegrationLifecycle";
  readonly taskId: TaskId;
  readonly integrationId: IntegrationId;
  readonly targetId: IntegrationTargetId;
}

export type WorkflowNode = TaskAttemptNode | IntegrationNode;

const sameWorkflowNode = (left: WorkflowNode, right: WorkflowNode): boolean =>
  left.tag === "TaskAttempt" && right.tag === "TaskAttempt"
    ? left.taskId === right.taskId &&
      left.attemptId === right.attemptId &&
      left.worktreeId === right.worktreeId
    : left.tag === "IntegrationLifecycle" &&
      right.tag === "IntegrationLifecycle" &&
      left.taskId === right.taskId &&
      left.integrationId === right.integrationId &&
      left.targetId === right.targetId;

export const ACTOR_STAGES = [
  "implementation",
  "fresh-task-review",
  "integration",
  "fresh-integration-review",
] as const;
export type ActorStage = (typeof ACTOR_STAGES)[number];

export const CAUSAL_RELATIONS = [
  "task-prerequisite",
  "workflow-handback",
  "workflow-progression",
  "resource-serialization",
  "authority-acknowledgement",
] as const;
export type CausalRelation = (typeof CAUSAL_RELATIONS)[number];

export interface CausalPredecessor {
  readonly occurrenceId: OccurrenceId;
  readonly relation: CausalRelation;
}

export interface AuthorityObservationRef {
  readonly observationId: ObservationId;
  readonly trackerRevision: TrackerRevision;
}

export type ActorCompletion =
  | { readonly tag: "NoActorCompleted" }
  | {
      readonly tag: "ActorCompleted";
      readonly actorInvocationId: ActorInvocationId;
    };

export const DECISION_REASONS = [
  "frontier-eligible",
  "fresh-review-required",
  "review-findings-returned",
  "implementation-required-after-findings",
  "accepted-result-queued",
  "integration-target-lease-acquired",
  "integration-review-accepted",
  "tracker-completion-confirmed",
  "resource-capacity-available",
] as const;
export type DecisionReason = (typeof DECISION_REASONS)[number];

export type WorkflowOperation =
  | {
      readonly tag: "ActorInvocationStarted";
      readonly node: TaskAttemptNode;
      readonly stage: "implementation";
      readonly actor: ActorIdentity<"implementer">;
    }
  | {
      readonly tag: "ActorInvocationStarted";
      readonly node: TaskAttemptNode;
      readonly stage: "fresh-task-review";
      readonly actor: ActorIdentity<"task-reviewer">;
    }
  | {
      readonly tag: "ActorInvocationStarted";
      readonly node: IntegrationNode;
      readonly stage: "integration";
      readonly actor: ActorIdentity<"integration-agent">;
    }
  | {
      readonly tag: "ActorInvocationStarted";
      readonly node: IntegrationNode;
      readonly stage: "fresh-integration-review";
      readonly actor: ActorIdentity<"integration-reviewer">;
    }
  | {
      readonly tag: "TaskReviewVerdictReturned";
      readonly node: TaskAttemptNode;
      readonly actorInvocationId: ActorInvocationId;
      readonly verdict: "findings";
    }
  | {
      readonly tag: "TaskReviewVerdictReturned";
      readonly node: TaskAttemptNode;
      readonly actorInvocationId: ActorInvocationId;
      readonly verdict: "accept";
    }
  | {
      readonly tag: "IntegrationReviewVerdictReturned";
      readonly node: IntegrationNode;
      readonly actorInvocationId: ActorInvocationId;
      readonly verdict: "findings";
    }
  | {
      readonly tag: "IntegrationReviewVerdictReturned";
      readonly node: IntegrationNode;
      readonly actorInvocationId: ActorInvocationId;
      readonly verdict: "accept";
    }
  | {
      readonly tag: "AcceptedResultQueued";
      readonly node: TaskAttemptNode;
    }
  | {
      readonly tag: "TrackerCompletionAcknowledged";
      readonly node: IntegrationNode;
    };

interface OperationOccurrenceFacts {
  readonly id: OccurrenceId;
  readonly operationId: OperationId;
  readonly predecessors: ReadonlyArray<CausalPredecessor>;
  readonly evidenceIds: ReadonlyArray<EvidenceId>;
  readonly authorityObservations: readonly [
    AuthorityObservationRef,
    ...ReadonlyArray<AuthorityObservationRef>,
  ];
  readonly actorCompletion: ActorCompletion;
}

type OccurrenceFor<
  Operation extends WorkflowOperation,
  Reason extends DecisionReason,
> = OperationOccurrenceFacts & {
  readonly operation: Operation;
  readonly decisionReason: Reason;
};

export type OperationOccurrence =
  | OccurrenceFor<
      Extract<WorkflowOperation, { readonly stage: "implementation" }>,
      | "frontier-eligible"
      | "implementation-required-after-findings"
      | "resource-capacity-available"
    >
  | OccurrenceFor<
      Extract<WorkflowOperation, { readonly stage: "fresh-task-review" }>,
      "fresh-review-required"
    >
  | OccurrenceFor<
      Extract<WorkflowOperation, { readonly stage: "integration" }>,
      "integration-target-lease-acquired"
    >
  | OccurrenceFor<
      Extract<
        WorkflowOperation,
        { readonly stage: "fresh-integration-review" }
      >,
      "fresh-review-required"
    >
  | OccurrenceFor<
      Extract<WorkflowOperation, { readonly verdict: "findings" }>,
      "review-findings-returned"
    >
  | OccurrenceFor<
      Extract<
        WorkflowOperation,
        {
          readonly tag: "TaskReviewVerdictReturned";
          readonly verdict: "accept";
        }
      >,
      "accepted-result-queued"
    >
  | OccurrenceFor<
      Extract<
        WorkflowOperation,
        {
          readonly tag: "IntegrationReviewVerdictReturned";
          readonly verdict: "accept";
        }
      >,
      "integration-review-accepted"
    >
  | OccurrenceFor<
      Extract<WorkflowOperation, { readonly tag: "AcceptedResultQueued" }>,
      "accepted-result-queued"
    >
  | OccurrenceFor<
      Extract<
        WorkflowOperation,
        { readonly tag: "TrackerCompletionAcknowledged" }
      >,
      "tracker-completion-confirmed"
    >;

export type TrackerRevisionObserved = {
  readonly tag: "TrackerRevisionObserved";
  readonly cursor: number;
  readonly observedAt: string;
  readonly observationId: ObservationId;
  readonly taskDag: TaskDagRevision;
};

export type SemanticTraceItem =
  | TrackerRevisionObserved
  | {
      readonly tag: "OperationOccurred";
      readonly cursor: number;
      readonly observedAt: string;
      readonly journalPosition: number;
      readonly occurrence: OperationOccurrence;
    }
  | {
      readonly tag: "ActorOutputObserved";
      readonly cursor: number;
      readonly observedAt: string;
      readonly observationId: ObservationId;
      readonly actorInvocationId: ActorInvocationId;
      readonly channel: "status" | "assistant" | "tool";
      readonly summary: string;
      readonly evidenceId: EvidenceId;
    }
  | {
      readonly tag: "ActorObservationGap";
      readonly cursor: number;
      readonly observedAt: string;
      readonly observationId: ObservationId;
      readonly actorInvocationId: ActorInvocationId;
      readonly reason: "stream-disconnected" | "history-unavailable";
      readonly afterEvidenceId: EvidenceId;
    };

type TraceItems = readonly [
  TrackerRevisionObserved,
  ...ReadonlyArray<SemanticTraceItem>,
];

export type TraceRun =
  | {
      readonly schemaVersion: 1;
      readonly mode: "observed";
      readonly runId: RunId;
      readonly items: TraceItems;
    }
  | {
      readonly schemaVersion: 1;
      readonly mode: "simulation";
      readonly scenarioId: ScenarioId;
      readonly basis:
        | {
            readonly tag: "LiveTrackerSnapshot";
            readonly rootTaskId: TaskId;
            readonly capturedAt: string;
          }
        | { readonly tag: "SyntheticStress" };
      readonly items: TraceItems;
    };

declare const validatedTraceRun: unique symbol;

type ValidatedTraceItem<Item extends SemanticTraceItem = SemanticTraceItem> =
  Item extends SemanticTraceItem
    ? Omit<Item, "cursor" | "observedAt" | "journalPosition"> & {
        readonly cursor: TraceCursor;
        readonly observedAt: ObservedAt;
      } & (Item extends { readonly tag: "OperationOccurred" }
          ? { readonly journalPosition: JournalPosition }
          : object)
    : never;

type ValidatedTraceItems = readonly [
  ValidatedTraceItem<TrackerRevisionObserved>,
  ...ReadonlyArray<ValidatedTraceItem>,
];

type ValidatedRun<Run extends TraceRun = TraceRun> = Run extends TraceRun
  ? Omit<Run, "items"> & { readonly items: ValidatedTraceItems }
  : never;

export type ValidatedTraceRun = ValidatedRun & {
  readonly [validatedTraceRun]: true;
};

export type TraceValidationIssue =
  | { readonly tag: "DuplicateTask"; readonly taskId: TaskId }
  | { readonly tag: "DuplicatePrerequisite"; readonly taskId: TaskId }
  | { readonly tag: "DanglingTaskParent"; readonly taskId: TaskId }
  | { readonly tag: "DanglingPrerequisite"; readonly taskId: TaskId }
  | { readonly tag: "TaskDependencyCycle"; readonly taskId: TaskId }
  | { readonly tag: "InvalidCursor"; readonly cursor: number }
  | { readonly tag: "NonIncreasingCursor"; readonly cursor: number }
  | { readonly tag: "InvalidObservedAt"; readonly observedAt: string }
  | {
      readonly tag: "InvalidJournalPosition";
      readonly journalPosition: number;
    }
  | {
      readonly tag: "NonIncreasingJournalPosition";
      readonly journalPosition: number;
    }
  | {
      readonly tag: "DuplicateObservation";
      readonly observationId: ObservationId;
    }
  | { readonly tag: "DuplicateOccurrence"; readonly occurrenceId: OccurrenceId }
  | { readonly tag: "DuplicateOperation"; readonly operationId: OperationId }
  | {
      readonly tag: "DuplicateActorInvocation";
      readonly actorInvocationId: ActorInvocationId;
    }
  | { readonly tag: "UnknownOperationTask"; readonly taskId: TaskId }
  | {
      readonly tag: "DanglingCausalPredecessor";
      readonly occurrenceId: OccurrenceId;
    }
  | {
      readonly tag: "DanglingAuthorityObservation";
      readonly observationId: ObservationId;
    }
  | {
      readonly tag: "AuthorityRevisionMismatch";
      readonly observationId: ObservationId;
    }
  | {
      readonly tag: "UnknownActor";
      readonly actorInvocationId: ActorInvocationId;
    }
  | {
      readonly tag: "InvalidActorCompletion";
      readonly actorInvocationId: ActorInvocationId | null;
    }
  | {
      readonly tag: "ActorAlreadyCompleted";
      readonly actorInvocationId: ActorInvocationId;
    }
  | {
      readonly tag: "InvalidSessionLineage";
      readonly actorInvocationId: ActorInvocationId;
    };

export type TraceValidationResult =
  | { readonly tag: "ValidTrace"; readonly trace: ValidatedTraceRun }
  | {
      readonly tag: "InvalidTrace";
      readonly issues: readonly [
        TraceValidationIssue,
        ...ReadonlyArray<TraceValidationIssue>,
      ];
    };

const taskDagIssues = (
  revision: TaskDagRevision,
): ReadonlyArray<TraceValidationIssue> => {
  const issues: Array<TraceValidationIssue> = [];
  const taskIds = new Set<TaskId>();
  for (const task of revision.tasks) {
    if (taskIds.has(task.id))
      issues.push({ tag: "DuplicateTask", taskId: task.id });
    taskIds.add(task.id);
  }
  for (const task of revision.tasks) {
    if (task.parentTaskId !== null && !taskIds.has(task.parentTaskId)) {
      issues.push({ tag: "DanglingTaskParent", taskId: task.id });
    }
    const prerequisiteIds = new Set<TaskId>();
    for (const prerequisiteId of task.prerequisiteIds) {
      if (prerequisiteIds.has(prerequisiteId)) {
        issues.push({ tag: "DuplicatePrerequisite", taskId: task.id });
      }
      prerequisiteIds.add(prerequisiteId);
      if (!taskIds.has(prerequisiteId)) {
        issues.push({ tag: "DanglingPrerequisite", taskId: task.id });
      }
    }
  }
  const byId = new Map(revision.tasks.map((task) => [task.id, task]));
  const visiting = new Set<TaskId>();
  const visited = new Set<TaskId>();
  const visit = (taskId: TaskId): void => {
    if (visiting.has(taskId)) {
      issues.push({ tag: "TaskDependencyCycle", taskId });
      return;
    }
    if (visited.has(taskId)) return;
    visiting.add(taskId);
    for (const prerequisiteId of byId.get(taskId)?.prerequisiteIds ?? []) {
      if (byId.has(prerequisiteId)) visit(prerequisiteId);
    }
    visiting.delete(taskId);
    visited.add(taskId);
  };
  for (const taskId of taskIds) visit(taskId);
  return issues;
};

export const validateTraceRun = (trace: TraceRun): TraceValidationResult => {
  const issues: Array<TraceValidationIssue> = [];
  const observations = new Map<ObservationId, TrackerRevision>();
  const occurrences = new Set<OccurrenceId>();
  const operations = new Set<OperationId>();
  type ActorRecord = {
    readonly actor: ActorIdentity;
    readonly node: WorkflowNode;
    readonly completed: boolean;
  };
  const actors = new Map<ActorInvocationId, ActorRecord>();
  const seenSessionIds = new Set<AgentSessionId>();
  const latestActorBySession = new Map<AgentSessionId, ActorRecord>();
  let authoritativeTaskIds = new Set<TaskId>();
  let previousCursor = -1;
  let previousJournalPosition = 0;

  for (const item of trace.items) {
    if (!Number.isSafeInteger(item.cursor) || item.cursor < 0) {
      issues.push({ tag: "InvalidCursor", cursor: item.cursor });
    }
    if (item.cursor <= previousCursor) {
      issues.push({ tag: "NonIncreasingCursor", cursor: item.cursor });
    }
    previousCursor = item.cursor;
    if (item.observedAt.trim().length === 0) {
      issues.push({ tag: "InvalidObservedAt", observedAt: item.observedAt });
    }
    if (item.tag === "TrackerRevisionObserved") {
      if (observations.has(item.observationId)) {
        issues.push({
          tag: "DuplicateObservation",
          observationId: item.observationId,
        });
      }
      observations.set(item.observationId, item.taskDag.revision);
      authoritativeTaskIds = new Set(item.taskDag.tasks.map((task) => task.id));
      issues.push(...taskDagIssues(item.taskDag));
      continue;
    }
    if (item.tag === "OperationOccurred") {
      if (
        !Number.isSafeInteger(item.journalPosition) ||
        item.journalPosition <= 0
      ) {
        issues.push({
          tag: "InvalidJournalPosition",
          journalPosition: item.journalPosition,
        });
      } else if (item.journalPosition <= previousJournalPosition) {
        issues.push({
          tag: "NonIncreasingJournalPosition",
          journalPosition: item.journalPosition,
        });
      }
      previousJournalPosition = item.journalPosition;
      const occurrence = item.occurrence;
      if (occurrences.has(occurrence.id)) {
        issues.push({
          tag: "DuplicateOccurrence",
          occurrenceId: occurrence.id,
        });
      }
      if (operations.has(occurrence.operationId)) {
        issues.push({
          tag: "DuplicateOperation",
          operationId: occurrence.operationId,
        });
      }
      if (!authoritativeTaskIds.has(occurrence.operation.node.taskId)) {
        issues.push({
          tag: "UnknownOperationTask",
          taskId: occurrence.operation.node.taskId,
        });
      }
      for (const predecessor of occurrence.predecessors) {
        if (!occurrences.has(predecessor.occurrenceId)) {
          issues.push({
            tag: "DanglingCausalPredecessor",
            occurrenceId: predecessor.occurrenceId,
          });
        }
      }
      for (const reference of occurrence.authorityObservations) {
        const revision = observations.get(reference.observationId);
        if (revision === undefined) {
          issues.push({
            tag: "DanglingAuthorityObservation",
            observationId: reference.observationId,
          });
        } else if (revision !== reference.trackerRevision) {
          issues.push({
            tag: "AuthorityRevisionMismatch",
            observationId: reference.observationId,
          });
        }
      }
      if (
        occurrence.actorCompletion.tag === "ActorCompleted" &&
        !actors.has(occurrence.actorCompletion.actorInvocationId)
      ) {
        issues.push({
          tag: "UnknownActor",
          actorInvocationId: occurrence.actorCompletion.actorInvocationId,
        });
      }
      const completedActor =
        occurrence.actorCompletion.tag === "ActorCompleted"
          ? actors.get(occurrence.actorCompletion.actorInvocationId)
          : undefined;
      const operation = occurrence.operation;
      const expectedCompletionRole =
        operation.tag === "TaskReviewVerdictReturned"
          ? "task-reviewer"
          : operation.tag === "IntegrationReviewVerdictReturned"
            ? "integration-reviewer"
            : operation.tag === "ActorInvocationStarted" &&
                operation.stage === "fresh-task-review"
              ? "implementer"
              : operation.tag === "ActorInvocationStarted" &&
                  operation.stage === "fresh-integration-review"
                ? "integration-agent"
                : null;
      const completionMatchesOperation =
        expectedCompletionRole === null
          ? occurrence.actorCompletion.tag === "NoActorCompleted"
          : completedActor !== undefined &&
            completedActor.actor.role === expectedCompletionRole &&
            sameWorkflowNode(completedActor.node, operation.node) &&
            ((operation.tag !== "TaskReviewVerdictReturned" &&
              operation.tag !== "IntegrationReviewVerdictReturned") ||
              operation.actorInvocationId ===
                occurrence.actorCompletion.actorInvocationId);
      if (!completionMatchesOperation) {
        issues.push({
          tag: "InvalidActorCompletion",
          actorInvocationId:
            occurrence.actorCompletion.tag === "ActorCompleted"
              ? occurrence.actorCompletion.actorInvocationId
              : null,
        });
      }
      if (completedActor?.completed === true) {
        issues.push({
          tag: "ActorAlreadyCompleted",
          actorInvocationId: completedActor.actor.invocationId,
        });
      } else if (completionMatchesOperation && completedActor !== undefined) {
        const completedRecord: ActorRecord = {
          ...completedActor,
          completed: true,
        };
        actors.set(completedActor.actor.invocationId, completedRecord);
        if (
          latestActorBySession.get(
            completedActor.actor.sessionBinding.sessionId,
          )?.actor.invocationId === completedActor.actor.invocationId
        ) {
          latestActorBySession.set(
            completedActor.actor.sessionBinding.sessionId,
            completedRecord,
          );
        }
      }
      if (occurrence.operation.tag === "ActorInvocationStarted") {
        const startedActor = occurrence.operation.actor;
        if (actors.has(startedActor.invocationId)) {
          issues.push({
            tag: "DuplicateActorInvocation",
            actorInvocationId: startedActor.invocationId,
          });
        }
        const binding = startedActor.sessionBinding;
        const prior =
          binding.tag === "ResumedSession"
            ? actors.get(binding.previousInvocationId)
            : binding.tag === "ReplacementSession"
              ? latestActorBySession.get(binding.supersededSessionId)
              : undefined;
        const sessionIsFresh = !seenSessionIds.has(binding.sessionId);
        const lineageMatches =
          (binding.tag === "InitialSession" && sessionIsFresh) ||
          (prior !== undefined &&
            prior.completed &&
            prior.actor.role === startedActor.role &&
            (binding.tag !== "ResumedSession" ||
              latestActorBySession.get(binding.sessionId)?.actor
                .invocationId === binding.previousInvocationId) &&
            (startedActor.role === "integration-agent" ||
            startedActor.role === "integration-reviewer"
              ? prior.node.tag === "IntegrationLifecycle" &&
                occurrence.operation.node.tag === "IntegrationLifecycle" &&
                prior.node.targetId === occurrence.operation.node.targetId
              : sameWorkflowNode(prior.node, occurrence.operation.node)) &&
            (prior.actor.sessionBinding.sessionId !== binding.sessionId) ===
              (binding.tag === "ReplacementSession") &&
            (binding.tag === "ResumedSession" || sessionIsFresh));
        if (!lineageMatches) {
          issues.push({
            tag: "InvalidSessionLineage",
            actorInvocationId: startedActor.invocationId,
          });
        }
        actors.set(startedActor.invocationId, {
          actor: startedActor,
          node: occurrence.operation.node,
          completed: false,
        });
        seenSessionIds.add(binding.sessionId);
        latestActorBySession.set(binding.sessionId, {
          actor: startedActor,
          node: occurrence.operation.node,
          completed: false,
        });
      } else if (
        (occurrence.operation.tag === "TaskReviewVerdictReturned" ||
          occurrence.operation.tag === "IntegrationReviewVerdictReturned") &&
        !actors.has(occurrence.operation.actorInvocationId)
      ) {
        issues.push({
          tag: "UnknownActor",
          actorInvocationId: occurrence.operation.actorInvocationId,
        });
      }
      occurrences.add(occurrence.id);
      operations.add(occurrence.operationId);
      continue;
    }
    if (!actors.has(item.actorInvocationId)) {
      issues.push({
        tag: "UnknownActor",
        actorInvocationId: item.actorInvocationId,
      });
    }
  }

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return { tag: "InvalidTrace", issues: [firstIssue, ...remainingIssues] };
  }
  // This is the sole cast into the private validated type: every primitive,
  // identity, graph, actor, lineage, and ordering invariant was checked above.
  return { tag: "ValidTrace", trace: trace as ValidatedTraceRun };
};

export const assertValidTraceRun = (trace: TraceRun): ValidatedTraceRun => {
  const result = validateTraceRun(trace);
  if (result.tag === "ValidTrace") return result.trace;
  throw new Error(
    `Invalid internal trace fixture: ${JSON.stringify(result.issues)}`,
  );
};

export const SESSION_CONTINUATION_CHOICES = [
  "resume-bound-session",
  "start-fresh-session",
] as const;
export type SessionContinuationChoice =
  (typeof SESSION_CONTINUATION_CHOICES)[number];
