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
export type TrackerRevision = `tracker-revision:${string}`;
export type IntegrationId = `integration:${string}`;

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
}

export type WorkflowNode = TaskAttemptNode | IntegrationNode;

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
  "resource-serialization",
  "authority-acknowledgement",
] as const;
export type CausalRelation = (typeof CAUSAL_RELATIONS)[number];

export interface CausalPredecessor {
  readonly occurrenceId: OccurrenceId;
  readonly relation: CausalRelation;
}

export const DECISION_REASONS = [
  "frontier-eligible",
  "fresh-review-required",
  "review-findings-returned",
  "implementation-required-after-findings",
  "accepted-result-queued",
  "integration-target-lease-acquired",
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
      readonly tag: "AcceptedResultQueued";
      readonly node: TaskAttemptNode;
    }
  | {
      readonly tag: "TrackerCompletionAcknowledged";
      readonly node: IntegrationNode;
    };

interface OperationOccurrenceFacts {
  readonly id: OccurrenceId;
  readonly predecessors: ReadonlyArray<CausalPredecessor>;
  readonly evidenceIds: ReadonlyArray<EvidenceId>;
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
      Extract<WorkflowOperation, { readonly verdict: "accept" }>,
      "accepted-result-queued"
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

export const SESSION_CONTINUATION_CHOICES = [
  "resume-bound-session",
  "start-fresh-session",
] as const;
export type SessionContinuationChoice =
  (typeof SESSION_CONTINUATION_CHOICES)[number];
