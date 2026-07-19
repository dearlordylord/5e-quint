import {
  TRACKER_SNAPSHOT_CAPTURED_AT,
  trackerTaskDagSnapshot,
} from "./tracker-task-dag-snapshot.generated.ts";
import type {
  ActorIdentity,
  ActorInvocationId,
  ActorRole,
  AgentSessionBinding,
  AgentSessionId,
  AttemptId,
  CausalPredecessor,
  EvidenceId,
  IntegrationNode,
  OperationId,
  ObservationCapability,
  ObservationId,
  OccurrenceId,
  OperationOccurrence,
  SemanticTraceItem,
  SessionContinuationChoice,
  TaskAttemptNode,
  TaskDagRevision,
  TaskFact,
  TaskId,
  TrackerRevision,
  ValidatedTraceRun,
  WorktreeId,
} from "./trace-contract.ts";
import { assertValidTraceRun } from "./trace-contract.ts";

const task = (name: string): TaskId => `task:${name}`;
const issueTask = (number: number): TaskId => `github-issue:${number}`;
const attempt = (name: string): AttemptId => `attempt:${name}`;
const worktree = (name: string): WorktreeId => `worktree:${name}`;
const actorId = (name: string): ActorInvocationId => `actor:${name}`;
const session = (name: string): AgentSessionId => `session:${name}`;
const evidence = (name: string): EvidenceId => `evidence:${name}`;
const observation = (name: string): ObservationId => `observation:${name}`;
const occurrenceId = (name: string): OccurrenceId => `occurrence:${name}`;
const operationId = (name: string): OperationId => `operation:${name}`;

export const TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID: TaskId = task(
  "simulated-structural-follow-up",
);

const actor = <Role extends ActorRole>(
  name: string,
  role: Role,
  observationCapability: ObservationCapability,
  sessionBinding: AgentSessionBinding,
): ActorIdentity<Role> => ({
  invocationId: actorId(name),
  role,
  observationCapability,
  sessionBinding,
});

const taskAttempt = (issueNumber: number): TaskAttemptNode => ({
  tag: "TaskAttempt",
  taskId: issueTask(issueNumber),
  attemptId: attempt(`gh-${issueNumber}-1`),
  worktreeId: worktree(`gh-${issueNumber}-1`),
});

const integrationNode = (issueNumber: number): IntegrationNode => ({
  tag: "IntegrationLifecycle",
  taskId: issueTask(issueNumber),
  integrationId: `integration:gh-${issueNumber}-main`,
  targetId: "integration-target:main",
});

const authorityObservationAt = (
  cursor: number,
  occurrenceName: string,
): {
  readonly observationId: ObservationId;
  readonly trackerRevision: TrackerRevision;
} =>
  occurrenceName.startsWith("stress-")
    ? {
        observationId: observation("stress-tracker-88"),
        trackerRevision: "tracker-revision:88",
      }
    : cursor >= 26
      ? {
          observationId: observation("simulation-after-gh-170"),
          trackerRevision: "tracker-revision:simulation-after-gh-170",
        }
      : cursor >= 21
        ? {
            observationId: observation("simulation-after-gh-46"),
            trackerRevision: "tracker-revision:simulation-after-gh-46",
          }
        : {
            observationId: observation("github-issue-12-tree"),
            trackerRevision: trackerTaskDagSnapshot.revision,
          };

const occurrenceFacts = (
  cursor: number,
  name: string,
  completedActorInvocationId?: ActorInvocationId,
) => ({
  id: occurrenceId(name),
  operationId: operationId(name),
  evidenceIds: [evidence(name)] as const,
  authorityObservations: [authorityObservationAt(cursor, name)] as const,
  actorCompletion:
    completedActorInvocationId === undefined
      ? ({ tag: "NoActorCompleted" } as const)
      : ({
          tag: "ActorCompleted",
          actorInvocationId: completedActorInvocationId,
        } as const),
});

const occurred = (
  cursor: number,
  journalPosition: number,
  observedAt: string,
  occurrence: OperationOccurrence,
): SemanticTraceItem => ({
  tag: "OperationOccurred",
  cursor,
  observedAt,
  journalPosition,
  occurrence,
});

interface InvocationOccurrenceInput {
  readonly cursor: number;
  readonly journalPosition: number;
  readonly observedAt: string;
  readonly name: string;
  readonly predecessors: ReadonlyArray<CausalPredecessor>;
  readonly completesActorInvocationId?: ActorInvocationId;
}

type InvocationWorkflowInput = InvocationOccurrenceInput &
  (
    | {
        readonly node: TaskAttemptNode;
        readonly stage: "implementation";
        readonly actor: ActorIdentity<"implementer">;
        readonly decisionReason:
          | "frontier-eligible"
          | "implementation-required-after-findings"
          | "resource-capacity-available";
      }
    | {
        readonly node: TaskAttemptNode;
        readonly stage: "fresh-task-review";
        readonly actor: ActorIdentity<"task-reviewer">;
        readonly decisionReason: "fresh-review-required";
      }
    | {
        readonly node: IntegrationNode;
        readonly stage: "integration";
        readonly actor: ActorIdentity<"integration-agent">;
        readonly decisionReason: "integration-target-lease-acquired";
      }
    | {
        readonly node: IntegrationNode;
        readonly stage: "fresh-integration-review";
        readonly actor: ActorIdentity<"integration-reviewer">;
        readonly decisionReason: "fresh-review-required";
      }
  );

const invocationOccurrence = (
  input: InvocationWorkflowInput,
): OperationOccurrence => {
  const facts = {
    ...occurrenceFacts(
      input.cursor,
      input.name,
      input.completesActorInvocationId,
    ),
    predecessors: input.predecessors,
  };
  if (input.stage === "implementation") {
    return {
      ...facts,
      operation: {
        tag: "ActorInvocationStarted",
        node: input.node,
        stage: input.stage,
        actor: input.actor,
      },
      decisionReason: input.decisionReason,
    };
  }
  if (input.stage === "fresh-task-review") {
    return {
      ...facts,
      operation: {
        tag: "ActorInvocationStarted",
        node: input.node,
        stage: input.stage,
        actor: input.actor,
      },
      decisionReason: input.decisionReason,
    };
  }
  if (input.stage === "integration") {
    return {
      ...facts,
      operation: {
        tag: "ActorInvocationStarted",
        node: input.node,
        stage: input.stage,
        actor: input.actor,
      },
      decisionReason: input.decisionReason,
    };
  }
  return {
    ...facts,
    operation: {
      tag: "ActorInvocationStarted",
      node: input.node,
      stage: input.stage,
      actor: input.actor,
    },
    decisionReason: input.decisionReason,
  };
};

const invocationOccurred = (
  input: InvocationWorkflowInput,
): SemanticTraceItem =>
  occurred(
    input.cursor,
    input.journalPosition,
    input.observedAt,
    invocationOccurrence(input),
  );

const reviewVerdictOccurred = (
  cursor: number,
  journalPosition: number,
  observedAt: string,
  name: string,
  node: TaskAttemptNode,
  reviewer: ActorIdentity<"task-reviewer">,
  verdict: "findings" | "accept",
  predecessor: OccurrenceId,
): SemanticTraceItem => {
  const predecessors: ReadonlyArray<CausalPredecessor> = [
    { occurrenceId: predecessor, relation: "workflow-progression" },
  ];
  const facts = {
    ...occurrenceFacts(cursor, name, reviewer.invocationId),
    predecessors,
  };
  return verdict === "findings"
    ? occurred(cursor, journalPosition, observedAt, {
        ...facts,
        operation: {
          tag: "TaskReviewVerdictReturned",
          node,
          actorInvocationId: reviewer.invocationId,
          verdict,
        },
        decisionReason: "review-findings-returned",
      })
    : occurred(cursor, journalPosition, observedAt, {
        ...facts,
        operation: {
          tag: "TaskReviewVerdictReturned",
          node,
          actorInvocationId: reviewer.invocationId,
          verdict,
        },
        decisionReason: "accepted-result-queued",
      });
};

const acceptedResultOccurred = (
  cursor: number,
  journalPosition: number,
  observedAt: string,
  issueNumber: number,
  node: TaskAttemptNode,
  predecessor: OccurrenceId,
): SemanticTraceItem =>
  occurred(cursor, journalPosition, observedAt, {
    ...occurrenceFacts(cursor, `gh-${issueNumber}-accepted-result-queued`),
    operation: { tag: "AcceptedResultQueued", node },
    predecessors: [
      { occurrenceId: predecessor, relation: "workflow-progression" },
    ],
    decisionReason: "accepted-result-queued",
  });

const integrationReviewVerdictOccurred = (
  cursor: number,
  journalPosition: number,
  observedAt: string,
  name: string,
  node: IntegrationNode,
  reviewer: ActorIdentity<"integration-reviewer">,
  predecessor: OccurrenceId,
): SemanticTraceItem =>
  occurred(cursor, journalPosition, observedAt, {
    ...occurrenceFacts(cursor, name, reviewer.invocationId),
    operation: {
      tag: "IntegrationReviewVerdictReturned",
      node,
      actorInvocationId: reviewer.invocationId,
      verdict: "accept",
    },
    predecessors: [
      { occurrenceId: predecessor, relation: "workflow-progression" },
    ],
    decisionReason: "integration-review-accepted",
  });

const completionOccurred = (
  cursor: number,
  journalPosition: number,
  observedAt: string,
  issueNumber: number,
  node: IntegrationNode,
  predecessor: OccurrenceId,
): SemanticTraceItem =>
  occurred(cursor, journalPosition, observedAt, {
    ...occurrenceFacts(cursor, `gh-${issueNumber}-completion-acknowledged`),
    operation: { tag: "TrackerCompletionAcknowledged", node },
    predecessors: [
      { occurrenceId: predecessor, relation: "authority-acknowledgement" },
    ],
    decisionReason: "tracker-completion-confirmed",
  });

const trackerRevisionObserved = (
  cursor: number,
  observedAt: string,
  name: string,
  taskDag: TaskDagRevision,
): SemanticTraceItem & { readonly tag: "TrackerRevisionObserved" } => ({
  tag: "TrackerRevisionObserved",
  cursor,
  observedAt,
  observationId: observation(name),
  taskDag,
});

const closeTasks = (
  taskDag: TaskDagRevision,
  closedTaskIds: ReadonlySet<TaskId>,
  revisionName: string,
): TaskDagRevision => ({
  revision: `tracker-revision:${revisionName}`,
  tasks: taskDag.tasks.map((taskFact) =>
    closedTaskIds.has(taskFact.id)
      ? { ...taskFact, lifecycle: "closed" }
      : taskFact,
  ),
});

export const makeTrackerDagRun = (
  continuationChoice: SessionContinuationChoice,
): ValidatedTraceRun => {
  const gh170 = taskAttempt(170);
  const gh46 = taskAttempt(46);
  const gh99 = taskAttempt(99);
  const gh170Integration = integrationNode(170);
  const gh46Integration = integrationNode(46);
  const gh99Integration = integrationNode(99);

  const gh170ImplementerSession = session("gh-170-implementer");
  const gh170Implementer1 = actor(
    "gh-170-implementer-round-1",
    "implementer",
    "streaming",
    { tag: "InitialSession", sessionId: gh170ImplementerSession },
  );
  const gh170Implementer2 = actor(
    "gh-170-implementer-round-2",
    "implementer",
    "streaming",
    continuationChoice === "resume-bound-session"
      ? {
          tag: "ResumedSession",
          sessionId: gh170ImplementerSession,
          previousInvocationId: gh170Implementer1.invocationId,
        }
      : {
          tag: "ReplacementSession",
          sessionId: session("gh-170-implementer-replacement"),
          supersededSessionId: gh170ImplementerSession,
        },
  );
  const gh170Reviewer1 = actor(
    "gh-170-reviewer-round-1",
    "task-reviewer",
    "streaming",
    { tag: "InitialSession", sessionId: session("gh-170-reviewer-round-1") },
  );
  const gh170Reviewer2 = actor(
    "gh-170-reviewer-round-2",
    "task-reviewer",
    "streaming",
    { tag: "InitialSession", sessionId: session("gh-170-reviewer-round-2") },
  );
  const gh46Implementer = actor(
    "gh-46-implementer",
    "implementer",
    "streaming",
    { tag: "InitialSession", sessionId: session("gh-46-implementer") },
  );
  const gh46Reviewer = actor("gh-46-reviewer", "task-reviewer", "snapshot", {
    tag: "InitialSession",
    sessionId: session("gh-46-reviewer"),
  });
  const gh99Implementer = actor(
    "gh-99-implementer",
    "implementer",
    "streaming",
    { tag: "InitialSession", sessionId: session("gh-99-implementer") },
  );
  const gh99Reviewer = actor("gh-99-reviewer", "task-reviewer", "snapshot", {
    tag: "InitialSession",
    sessionId: session("gh-99-reviewer"),
  });
  const gh46Integrator = actor(
    "gh-46-integrator",
    "integration-agent",
    "streaming",
    { tag: "InitialSession", sessionId: session("integration-main") },
  );
  const gh170Integrator = actor(
    "gh-170-integrator",
    "integration-agent",
    "streaming",
    {
      tag: "ResumedSession",
      sessionId: session("integration-main"),
      previousInvocationId: gh46Integrator.invocationId,
    },
  );
  const gh99Integrator = actor(
    "gh-99-integrator",
    "integration-agent",
    "streaming",
    {
      tag: "ResumedSession",
      sessionId: session("integration-main"),
      previousInvocationId: gh170Integrator.invocationId,
    },
  );
  const gh46IntegrationReviewer = actor(
    "gh-46-integration-reviewer",
    "integration-reviewer",
    "streaming",
    {
      tag: "InitialSession",
      sessionId: session("gh-46-integration-reviewer"),
    },
  );
  const gh170IntegrationReviewer = actor(
    "gh-170-integration-reviewer",
    "integration-reviewer",
    "streaming",
    {
      tag: "InitialSession",
      sessionId: session("gh-170-integration-reviewer"),
    },
  );
  const gh99IntegrationReviewer = actor(
    "gh-99-integration-reviewer",
    "integration-reviewer",
    "streaming",
    {
      tag: "InitialSession",
      sessionId: session("gh-99-integration-reviewer"),
    },
  );

  const afterGh46Completion = closeTasks(
    trackerTaskDagSnapshot,
    new Set([issueTask(46)]),
    "simulation-after-gh-46",
  );
  const structuralFollowUp: TaskFact = {
    id: TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID,
    title: "Simulated structural follow-up",
    lifecycle: "open",
    parentTaskId: issueTask(12),
    prerequisiteIds: [issueTask(46)],
    assignment: { tag: "Unassigned" },
    labels: ["simulation"],
  };
  const afterGh46: TaskDagRevision = {
    ...afterGh46Completion,
    tasks: [...afterGh46Completion.tasks, structuralFollowUp],
  };
  const afterGh170 = closeTasks(
    afterGh46,
    new Set([issueTask(170)]),
    "simulation-after-gh-170",
  );
  const afterGh99 = closeTasks(
    afterGh170,
    new Set([issueTask(99)]),
    "simulation-after-gh-99",
  );

  return assertValidTraceRun({
    schemaVersion: 1,
    mode: "simulation",
    scenarioId: "scenario:parallel-tracker-task-workflows",
    basis: {
      tag: "LiveTrackerSnapshot",
      rootTaskId: issueTask(12),
      capturedAt: TRACKER_SNAPSHOT_CAPTURED_AT,
    },
    items: [
      trackerRevisionObserved(
        0,
        "21:01:25",
        "github-issue-12-tree",
        trackerTaskDagSnapshot,
      ),
      invocationOccurred({
        cursor: 1,
        journalPosition: 1,
        observedAt: "21:02:00",
        name: "gh-170-implementation-round-1",
        node: gh170,
        stage: "implementation",
        actor: gh170Implementer1,
        predecessors: [],
        decisionReason: "frontier-eligible",
      }),
      invocationOccurred({
        cursor: 2,
        journalPosition: 2,
        observedAt: "21:02:01",
        name: "gh-46-implementation",
        node: gh46,
        stage: "implementation",
        actor: gh46Implementer,
        predecessors: [],
        decisionReason: "resource-capacity-available",
      }),
      invocationOccurred({
        cursor: 3,
        journalPosition: 3,
        observedAt: "21:08:00",
        name: "gh-46-review",
        node: gh46,
        stage: "fresh-task-review",
        actor: gh46Reviewer,
        completesActorInvocationId: gh46Implementer.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-46-implementation"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      invocationOccurred({
        cursor: 4,
        journalPosition: 4,
        observedAt: "21:10:00",
        name: "gh-170-review-round-1",
        node: gh170,
        stage: "fresh-task-review",
        actor: gh170Reviewer1,
        completesActorInvocationId: gh170Implementer1.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-170-implementation-round-1"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      reviewVerdictOccurred(
        5,
        5,
        "21:11:00",
        "gh-46-accept",
        gh46,
        gh46Reviewer,
        "accept",
        occurrenceId("gh-46-review"),
      ),
      acceptedResultOccurred(
        6,
        6,
        "21:11:01",
        46,
        gh46,
        occurrenceId("gh-46-accept"),
      ),
      invocationOccurred({
        cursor: 7,
        journalPosition: 7,
        observedAt: "21:11:02",
        name: "gh-99-implementation",
        node: gh99,
        stage: "implementation",
        actor: gh99Implementer,
        predecessors: [],
        decisionReason: "resource-capacity-available",
      }),
      reviewVerdictOccurred(
        8,
        8,
        "21:14:00",
        "gh-170-findings-round-1",
        gh170,
        gh170Reviewer1,
        "findings",
        occurrenceId("gh-170-review-round-1"),
      ),
      invocationOccurred({
        cursor: 9,
        journalPosition: 9,
        observedAt: "21:14:01",
        name: "gh-170-implementation-round-2",
        node: gh170,
        stage: "implementation",
        actor: gh170Implementer2,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-170-findings-round-1"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "implementation-required-after-findings",
      }),
      invocationOccurred({
        cursor: 10,
        journalPosition: 10,
        observedAt: "21:14:02",
        name: "gh-46-integration",
        node: gh46Integration,
        stage: "integration",
        actor: gh46Integrator,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-46-accepted-result-queued"),
            relation: "workflow-progression",
          },
        ],
        decisionReason: "integration-target-lease-acquired",
      }),
      invocationOccurred({
        cursor: 11,
        journalPosition: 11,
        observedAt: "21:18:00",
        name: "gh-99-review",
        node: gh99,
        stage: "fresh-task-review",
        actor: gh99Reviewer,
        completesActorInvocationId: gh99Implementer.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-99-implementation"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      invocationOccurred({
        cursor: 12,
        journalPosition: 12,
        observedAt: "21:20:00",
        name: "gh-170-review-round-2",
        node: gh170,
        stage: "fresh-task-review",
        actor: gh170Reviewer2,
        completesActorInvocationId: gh170Implementer2.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-170-implementation-round-2"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      reviewVerdictOccurred(
        13,
        13,
        "21:21:00",
        "gh-99-accept",
        gh99,
        gh99Reviewer,
        "accept",
        occurrenceId("gh-99-review"),
      ),
      acceptedResultOccurred(
        14,
        14,
        "21:21:01",
        99,
        gh99,
        occurrenceId("gh-99-accept"),
      ),
      reviewVerdictOccurred(
        15,
        15,
        "21:24:00",
        "gh-170-accept-round-2",
        gh170,
        gh170Reviewer2,
        "accept",
        occurrenceId("gh-170-review-round-2"),
      ),
      acceptedResultOccurred(
        16,
        16,
        "21:24:01",
        170,
        gh170,
        occurrenceId("gh-170-accept-round-2"),
      ),
      invocationOccurred({
        cursor: 17,
        journalPosition: 17,
        observedAt: "21:24:30",
        name: "gh-46-integration-review",
        node: gh46Integration,
        stage: "fresh-integration-review",
        actor: gh46IntegrationReviewer,
        completesActorInvocationId: gh46Integrator.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-46-integration"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      integrationReviewVerdictOccurred(
        18,
        18,
        "21:24:45",
        "gh-46-integration-accept",
        gh46Integration,
        gh46IntegrationReviewer,
        occurrenceId("gh-46-integration-review"),
      ),
      completionOccurred(
        19,
        19,
        "21:25:00",
        46,
        gh46Integration,
        occurrenceId("gh-46-integration-accept"),
      ),
      trackerRevisionObserved(
        20,
        "21:25:01",
        "simulation-after-gh-46",
        afterGh46,
      ),
      invocationOccurred({
        cursor: 21,
        journalPosition: 20,
        observedAt: "21:25:02",
        name: "gh-170-integration",
        node: gh170Integration,
        stage: "integration",
        actor: gh170Integrator,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-170-accepted-result-queued"),
            relation: "workflow-progression",
          },
          {
            occurrenceId: occurrenceId("gh-46-completion-acknowledged"),
            relation: "resource-serialization",
          },
        ],
        decisionReason: "integration-target-lease-acquired",
      }),
      invocationOccurred({
        cursor: 22,
        journalPosition: 21,
        observedAt: "21:28:30",
        name: "gh-170-integration-review",
        node: gh170Integration,
        stage: "fresh-integration-review",
        actor: gh170IntegrationReviewer,
        completesActorInvocationId: gh170Integrator.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-170-integration"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      integrationReviewVerdictOccurred(
        23,
        22,
        "21:28:45",
        "gh-170-integration-accept",
        gh170Integration,
        gh170IntegrationReviewer,
        occurrenceId("gh-170-integration-review"),
      ),
      completionOccurred(
        24,
        23,
        "21:29:00",
        170,
        gh170Integration,
        occurrenceId("gh-170-integration-accept"),
      ),
      trackerRevisionObserved(
        25,
        "21:29:01",
        "simulation-after-gh-170",
        afterGh170,
      ),
      invocationOccurred({
        cursor: 26,
        journalPosition: 24,
        observedAt: "21:29:02",
        name: "gh-99-integration",
        node: gh99Integration,
        stage: "integration",
        actor: gh99Integrator,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-99-accepted-result-queued"),
            relation: "workflow-progression",
          },
          {
            occurrenceId: occurrenceId("gh-170-completion-acknowledged"),
            relation: "resource-serialization",
          },
        ],
        decisionReason: "integration-target-lease-acquired",
      }),
      invocationOccurred({
        cursor: 27,
        journalPosition: 25,
        observedAt: "21:32:30",
        name: "gh-99-integration-review",
        node: gh99Integration,
        stage: "fresh-integration-review",
        actor: gh99IntegrationReviewer,
        completesActorInvocationId: gh99Integrator.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId("gh-99-integration"),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
      integrationReviewVerdictOccurred(
        28,
        26,
        "21:32:45",
        "gh-99-integration-accept",
        gh99Integration,
        gh99IntegrationReviewer,
        occurrenceId("gh-99-integration-review"),
      ),
      completionOccurred(
        29,
        27,
        "21:33:00",
        99,
        gh99Integration,
        occurrenceId("gh-99-integration-accept"),
      ),
      trackerRevisionObserved(
        30,
        "21:33:01",
        "simulation-after-gh-99",
        afterGh99,
      ),
    ],
  });
};

export const trackerDagFixturePresentation = {
  focusTaskId: issueTask(170),
  scenarioTaskIds: [
    issueTask(170),
    issueTask(46),
    issueTask(99),
    TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID,
  ],
  demonstrationCursor: (run: ValidatedTraceRun): number =>
    run.items.find(
      (item) =>
        item.tag === "OperationOccurred" &&
        item.occurrence.operation.tag === "AcceptedResultQueued" &&
        item.occurrence.operation.node.taskId === issueTask(99),
    )?.cursor ?? Math.max(...run.items.map((item) => item.cursor)),
} as const;

const makeLargeRun = (): ValidatedTraceRun => {
  const taskCount = 60;
  const tasks: ReadonlyArray<TaskFact> = Array.from(
    { length: taskCount },
    (_, index) => {
      const id = task(`stress-${String(index + 1).padStart(2, "0")}`);
      const prerequisiteIds =
        index === 0
          ? []
          : index < 4
            ? [task(`stress-${String(index).padStart(2, "0")}`)]
            : [
                task(`stress-${String(index).padStart(2, "0")}`),
                task(`stress-${String(index - 2).padStart(2, "0")}`),
              ];
      return {
        id,
        title: `Stress task ${String(index + 1).padStart(2, "0")}`,
        lifecycle: index < 18 ? "closed" : "open",
        parentTaskId: null,
        prerequisiteIds,
        assignment: { tag: "Unassigned" },
        labels: [],
      };
    },
  );
  const initial = trackerRevisionObserved(0, "14:00:00", "stress-tracker-88", {
    revision: "tracker-revision:88",
    tasks,
  });
  const remainder: Array<SemanticTraceItem> = [];

  for (let index = 0; index < taskCount; index += 1) {
    const ordinal = String(index + 1).padStart(2, "0");
    const node: TaskAttemptNode = {
      tag: "TaskAttempt",
      taskId: task(`stress-${ordinal}`),
      attemptId: attempt(`stress-${ordinal}-1`),
      worktreeId: worktree(`stress-${ordinal}-1`),
    };
    const implementer = actor(
      `stress-${ordinal}-implementer`,
      "implementer",
      index % 3 === 0 ? "streaming" : index % 3 === 1 ? "snapshot" : "opaque",
      {
        tag: "InitialSession",
        sessionId: session(`stress-${ordinal}-implementer`),
      },
    );
    const reviewer = actor(
      `stress-${ordinal}-reviewer`,
      "task-reviewer",
      index % 2 === 0 ? "snapshot" : "streaming",
      {
        tag: "InitialSession",
        sessionId: session(`stress-${ordinal}-reviewer`),
      },
    );
    const implementName = `stress-${ordinal}-implement`;
    remainder.push(
      invocationOccurred({
        cursor: remainder.length + 1,
        journalPosition: index * 2 + 1,
        observedAt: `14:${String(Math.floor(index / 2)).padStart(2, "0")}:10`,
        name: implementName,
        node,
        stage: "implementation",
        actor: implementer,
        predecessors: [],
        decisionReason:
          index === 0 ? "frontier-eligible" : "resource-capacity-available",
      }),
    );
    remainder.push(
      invocationOccurred({
        cursor: remainder.length + 1,
        journalPosition: index * 2 + 2,
        observedAt: `14:${String(Math.floor(index / 2)).padStart(2, "0")}:40`,
        name: `stress-${ordinal}-review`,
        node,
        stage: "fresh-task-review",
        actor: reviewer,
        completesActorInvocationId: implementer.invocationId,
        predecessors: [
          {
            occurrenceId: occurrenceId(implementName),
            relation: "workflow-handback",
          },
        ],
        decisionReason: "fresh-review-required",
      }),
    );
  }

  return assertValidTraceRun({
    schemaVersion: 1,
    mode: "simulation",
    scenarioId: "scenario:large-legibility-stress",
    basis: { tag: "SyntheticStress" },
    items: [initial, ...remainder],
  });
};

export const largeRun = makeLargeRun();
