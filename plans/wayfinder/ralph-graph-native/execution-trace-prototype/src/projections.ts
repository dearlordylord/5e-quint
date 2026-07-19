import type {
  ActorIdentity,
  ActorInvocationId,
  ActorRole,
  ActorStage,
  CausalRelation,
  EvidenceId,
  OccurrenceId,
  OperationOccurrence,
  SemanticTraceItem,
  TaskDagRevision,
  TaskId,
  TraceCursor,
  ValidatedTraceRun,
  TrackerRevision,
} from "./trace-contract.ts";

export interface TaskDagRewrite {
  readonly from: TrackerRevision;
  readonly to: TrackerRevision;
  readonly addedTaskIds: ReadonlyArray<TaskId>;
  readonly removedTaskIds: ReadonlyArray<TaskId>;
  readonly changedPrerequisiteTaskIds: ReadonlyArray<TaskId>;
  readonly changedParentTaskIds: ReadonlyArray<TaskId>;
}

export interface ActorStreamEntry {
  readonly tag: "output" | "gap";
  readonly cursor: TraceCursor;
  readonly summary: string;
  readonly evidenceIds: ReadonlyArray<EvidenceId>;
}

export const ACTOR_PHASES = [
  "observed",
  "implementing",
  "reviewing",
  "integrating",
  "completed",
] as const;
export type ActorPhase = (typeof ACTOR_PHASES)[number];

export interface ActorProjection {
  readonly actor: ActorIdentity;
  readonly taskIds: ReadonlyArray<TaskId>;
  readonly phase: ActorPhase;
  readonly stream: ReadonlyArray<ActorStreamEntry>;
}

interface ActorSpanBase {
  readonly taskId: TaskId;
  readonly actor: ActorIdentity;
  readonly stage: ActorStage;
  readonly startCursor: TraceCursor;
}

export type ActorSpan = ActorSpanBase &
  (
    | {
        readonly tag: "ActiveActorSpan";
        readonly throughCursor: TraceCursor;
      }
    | {
        readonly tag: "CompletedActorSpan";
        readonly endCursor: TraceCursor;
      }
  );

export type TaskExecutionProjection = { readonly taskId: TaskId } & (
  | { readonly tag: "implementing" }
  | { readonly tag: "reviewing" }
  | { readonly tag: "findings-returned" }
  | { readonly tag: "accepted-awaiting-queue" }
  | { readonly tag: "queued-for-integration" }
  | { readonly tag: "integrating" }
  | { readonly tag: "reviewing-integration" }
  | { readonly tag: "integration-accepted-awaiting-completion" }
  | { readonly tag: "completion-acknowledged" }
);

export interface RunProjection {
  readonly cursor: TraceCursor;
  readonly taskDag: TaskDagRevision;
  readonly rewrite: TaskDagRewrite | null;
  readonly occurrences: ReadonlyArray<OperationOccurrence>;
  readonly actors: ReadonlyArray<ActorProjection>;
  readonly actorSpans: ReadonlyArray<ActorSpan>;
  readonly taskExecutions: ReadonlyArray<TaskExecutionProjection>;
  readonly selectedItem: ValidatedTraceRun["items"][number];
}

const operationActor = (
  occurrence: OperationOccurrence,
): ActorIdentity | null => {
  const operation = occurrence.operation;
  return operation.tag === "ActorInvocationStarted" ? operation.actor : null;
};

const operationTaskId = (occurrence: OperationOccurrence): TaskId =>
  occurrence.operation.node.taskId;

const phaseAfter = (occurrence: OperationOccurrence): ActorPhase => {
  const operation = occurrence.operation;
  if (
    operation.tag === "TaskReviewVerdictReturned" ||
    operation.tag === "IntegrationReviewVerdictReturned"
  )
    return "completed";
  if (operation.tag !== "ActorInvocationStarted") return "completed";
  if (operation.stage === "implementation") return "implementing";
  if (operation.stage === "integration") return "integrating";
  return "reviewing";
};

const unique = <Value>(values: ReadonlyArray<Value>): ReadonlyArray<Value> => [
  ...new Set(values),
];

type ValidatedTraceItem = ValidatedTraceRun["items"][number];

type TracePrefix = readonly [
  ValidatedTraceItem & { readonly tag: "TrackerRevisionObserved" },
  ...ReadonlyArray<ValidatedTraceItem>,
];

const taskDagAt = (items: TracePrefix): TaskDagRevision => {
  let latest = items[0].taskDag;
  for (const item of items) {
    if (item.tag === "TrackerRevisionObserved") latest = item.taskDag;
  }
  return latest;
};

const sameTaskIds = (
  left: ReadonlyArray<TaskId>,
  right: ReadonlyArray<TaskId>,
): boolean => {
  const leftIds = new Set(left);
  const rightIds = new Set(right);
  return (
    leftIds.size === rightIds.size &&
    [...leftIds].every((taskId) => rightIds.has(taskId))
  );
};

const rewriteAt = (items: TracePrefix): TaskDagRewrite | null => {
  const revisions = items.filter(
    (item) => item.tag === "TrackerRevisionObserved",
  );
  const latest = revisions.at(-1);
  const prior = revisions.at(-2);
  if (latest === undefined || prior === undefined) return null;

  const priorById = new Map(prior.taskDag.tasks.map((task) => [task.id, task]));
  const latestById = new Map(
    latest.taskDag.tasks.map((task) => [task.id, task]),
  );
  const retained = latest.taskDag.tasks.filter((task) =>
    priorById.has(task.id),
  );

  return {
    from: prior.taskDag.revision,
    to: latest.taskDag.revision,
    addedTaskIds: latest.taskDag.tasks
      .filter((task) => !priorById.has(task.id))
      .map((task) => task.id),
    removedTaskIds: prior.taskDag.tasks
      .filter((task) => !latestById.has(task.id))
      .map((task) => task.id),
    changedPrerequisiteTaskIds: retained
      .filter(
        (task) =>
          !sameTaskIds(
            priorById.get(task.id)!.prerequisiteIds,
            task.prerequisiteIds,
          ),
      )
      .map((task) => task.id),
    changedParentTaskIds: retained
      .filter(
        (task) => priorById.get(task.id)!.parentTaskId !== task.parentTaskId,
      )
      .map((task) => task.id),
  };
};

const actorsAt = (
  items: ReadonlyArray<ValidatedTraceItem>,
  occurrences: ReadonlyArray<OperationOccurrence>,
): ReadonlyArray<ActorProjection> => {
  const identities = new Map<ActorInvocationId, ActorIdentity>();
  const completedActors = new Set<ActorInvocationId>();
  for (const occurrence of occurrences) {
    const actor = operationActor(occurrence);
    if (actor !== null) identities.set(actor.invocationId, actor);
    if (occurrence.actorCompletion.tag === "ActorCompleted") {
      completedActors.add(occurrence.actorCompletion.actorInvocationId);
    }
  }
  return [...identities.values()].map((actor) => {
    const actorOccurrences = occurrences.filter(
      (occurrence) =>
        operationActor(occurrence)?.invocationId === actor.invocationId,
    );
    const phase = completedActors.has(actor.invocationId)
      ? "completed"
      : actorOccurrences.length === 0
        ? "observed"
        : phaseAfter(actorOccurrences.at(-1)!);
    const taskIds = unique(actorOccurrences.map(operationTaskId));
    const stream = items.flatMap((item): ReadonlyArray<ActorStreamEntry> => {
      if (
        item.tag === "ActorOutputObserved" &&
        item.actorInvocationId === actor.invocationId
      ) {
        return [
          {
            tag: "output",
            cursor: item.cursor,
            summary: item.summary,
            evidenceIds: [item.evidenceId],
          },
        ];
      }
      if (
        item.tag === "ActorObservationGap" &&
        item.actorInvocationId === actor.invocationId
      ) {
        return [
          {
            tag: "gap",
            cursor: item.cursor,
            summary: `Observation gap: ${item.reason}`,
            evidenceIds: [item.afterEvidenceId],
          },
        ];
      }
      return [];
    });
    return { actor, taskIds, phase, stream };
  });
};

const actorSpansAt = (
  items: ReadonlyArray<ValidatedTraceItem>,
  cursor: TraceCursor,
): ReadonlyArray<ActorSpan> => {
  const operationItems = items.filter(
    (
      item,
    ): item is ValidatedTraceItem & { readonly tag: "OperationOccurred" } =>
      item.tag === "OperationOccurred",
  );

  return operationItems.flatMap((startItem): ReadonlyArray<ActorSpan> => {
    const operation = startItem.occurrence.operation;
    if (operation.tag !== "ActorInvocationStarted") return [];
    const completion = operationItems.find(
      (candidate) =>
        candidate.cursor > startItem.cursor &&
        candidate.occurrence.actorCompletion.tag === "ActorCompleted" &&
        candidate.occurrence.actorCompletion.actorInvocationId ===
          operation.actor.invocationId,
    );
    const base: ActorSpanBase = {
      taskId: operation.node.taskId,
      actor: operation.actor,
      stage: operation.stage,
      startCursor: startItem.cursor,
    };
    return completion === undefined
      ? [{ ...base, tag: "ActiveActorSpan", throughCursor: cursor }]
      : [
          {
            ...base,
            tag: "CompletedActorSpan",
            endCursor: completion.cursor,
          },
        ];
  });
};

const taskExecutionAfter = (
  occurrence: OperationOccurrence,
): TaskExecutionProjection => {
  const operation = occurrence.operation;
  const taskId = operation.node.taskId;
  if (operation.tag === "TaskReviewVerdictReturned") {
    return operation.verdict === "findings"
      ? { taskId, tag: "findings-returned" }
      : { taskId, tag: "accepted-awaiting-queue" };
  }
  if (operation.tag === "IntegrationReviewVerdictReturned") {
    return operation.verdict === "findings"
      ? { taskId, tag: "integrating" }
      : { taskId, tag: "integration-accepted-awaiting-completion" };
  }
  if (operation.tag === "AcceptedResultQueued") {
    return { taskId, tag: "queued-for-integration" };
  }
  if (operation.tag === "TrackerCompletionAcknowledged") {
    return { taskId, tag: "completion-acknowledged" };
  }
  if (operation.stage === "implementation") {
    return { taskId, tag: "implementing" };
  }
  if (operation.stage === "fresh-task-review") {
    return { taskId, tag: "reviewing" };
  }
  if (operation.stage === "integration") {
    return { taskId, tag: "integrating" };
  }
  return { taskId, tag: "reviewing-integration" };
};

const taskExecutionsAt = (
  occurrences: ReadonlyArray<OperationOccurrence>,
): ReadonlyArray<TaskExecutionProjection> => {
  const latestByTask = new Map<TaskId, TaskExecutionProjection>();
  for (const occurrence of occurrences) {
    const execution = taskExecutionAfter(occurrence);
    latestByTask.set(execution.taskId, execution);
  }
  return [...latestByTask.values()];
};

export const projectRun = (
  run: ValidatedTraceRun,
  cursor: TraceCursor,
): RunProjection => {
  const items: TracePrefix = [
    run.items[0],
    ...run.items.slice(1).filter((item) => item.cursor <= cursor),
  ];
  const selectedItem = items[items.length - 1] ?? items[0];
  const occurrences = items.flatMap((item) =>
    item.tag === "OperationOccurred" ? [item.occurrence] : [],
  );
  return {
    cursor,
    taskDag: taskDagAt(items),
    rewrite: rewriteAt(items),
    occurrences,
    actors: actorsAt(items, occurrences),
    actorSpans: actorSpansAt(items, cursor),
    taskExecutions: taskExecutionsAt(occurrences),
    selectedItem,
  };
};

export const traceEndCursor = (run: ValidatedTraceRun): TraceCursor =>
  // Validated runs contain a nonempty, increasing sequence of branded cursors.
  Math.max(...run.items.map((item) => item.cursor)) as TraceCursor;

export const traceCursorAt = (
  run: ValidatedTraceRun,
  requestedCursor: number,
): TraceCursor => {
  const requested = Number.isSafeInteger(requestedCursor) ? requestedCursor : 0;
  // Clamping against a validated run proves this is a valid trace cursor.
  return Math.max(0, Math.min(requested, traceEndCursor(run))) as TraceCursor;
};

export interface OccurrencePresentation {
  readonly id: OccurrenceId;
  readonly label: string;
  readonly taskId: TaskId;
  readonly actorRole: ActorRole | "coordinator" | "multiple-actors";
  readonly count: number;
  readonly occurrenceIds: ReadonlyArray<OccurrenceId>;
  readonly predecessors: ReadonlyArray<{
    readonly occurrenceId: OccurrenceId;
    readonly relation: CausalRelation;
  }>;
}

const sessionBindingLabel = (actor: ActorIdentity): string => {
  const binding = actor.sessionBinding;
  if (binding.tag === "InitialSession") return "initial session";
  if (binding.tag === "ResumedSession") return "resume bound session";
  return "replacement session";
};

const occurrenceLabel = (occurrence: OperationOccurrence): string => {
  const operation = occurrence.operation;
  if (operation.tag === "ActorInvocationStarted") {
    return `${operation.stage} · ${sessionBindingLabel(operation.actor)}`;
  }
  if (
    operation.tag === "TaskReviewVerdictReturned" ||
    operation.tag === "IntegrationReviewVerdictReturned"
  ) {
    return `review verdict · ${operation.verdict}`;
  }
  return operation.tag;
};

const presentOccurrence = (
  occurrence: OperationOccurrence,
): OccurrencePresentation => ({
  id: occurrence.id,
  label: occurrenceLabel(occurrence),
  taskId: operationTaskId(occurrence),
  actorRole: operationActor(occurrence)?.role ?? "coordinator",
  count: 1,
  occurrenceIds: [occurrence.id],
  predecessors: occurrence.predecessors,
});

const isFreshReviewStart = (occurrence: OperationOccurrence): boolean =>
  occurrence.operation.tag === "ActorInvocationStarted" &&
  (occurrence.operation.stage === "fresh-task-review" ||
    occurrence.operation.stage === "fresh-integration-review");

const isConvergenceMember = (occurrence: OperationOccurrence): boolean => {
  const operation = occurrence.operation;
  if (
    operation.tag === "TaskReviewVerdictReturned" ||
    operation.tag === "IntegrationReviewVerdictReturned"
  )
    return true;
  if (operation.tag !== "ActorInvocationStarted") return false;
  return (
    operation.stage === "implementation" ||
    operation.stage === "fresh-task-review" ||
    operation.stage === "integration" ||
    operation.stage === "fresh-integration-review"
  );
};

const isConvergenceRelation = (relation: CausalRelation): boolean =>
  relation === "workflow-progression" || relation === "workflow-handback";

const collapseConvergenceLoops = (
  occurrences: ReadonlyArray<OperationOccurrence>,
): ReadonlyArray<OccurrencePresentation> => {
  const indexById = new Map(
    occurrences.map((occurrence, index) => [occurrence.id, index]),
  );
  const groupedByMember = new Map<OccurrenceId, OccurrencePresentation>();

  for (const first of occurrences) {
    if (!isFreshReviewStart(first) || groupedByMember.has(first.id)) continue;
    const group: Array<OperationOccurrence> = [first];
    const groupTaskId = operationTaskId(first);
    let member = first;

    while (true) {
      const successors = occurrences.filter(
        (candidate) =>
          (indexById.get(candidate.id) ?? -1) >
            (indexById.get(member.id) ?? -1) &&
          operationTaskId(candidate) === groupTaskId &&
          isConvergenceMember(candidate) &&
          candidate.predecessors.some(
            (predecessor) =>
              isConvergenceRelation(predecessor.relation) &&
              predecessor.occurrenceId === member.id,
          ),
      );
      if (successors.length !== 1) break;
      const successor = successors[0]!;
      group.push(successor);
      member = successor;
      if (
        (successor.operation.tag === "TaskReviewVerdictReturned" ||
          successor.operation.tag === "IntegrationReviewVerdictReturned") &&
        successor.operation.verdict === "accept"
      ) {
        break;
      }
    }

    const findingsCount = group.filter(
      (candidate) =>
        candidate.operation.tag === "TaskReviewVerdictReturned" &&
        candidate.operation.verdict === "findings",
    ).length;
    if (findingsCount === 0) continue;

    const presentation: OccurrencePresentation = {
      id: first.id,
      label: `implementation/review convergence · ${findingsCount} handback`,
      taskId: groupTaskId,
      actorRole: "multiple-actors",
      count: group.length,
      occurrenceIds: group.map((candidate) => candidate.id),
      predecessors: first.predecessors,
    };
    for (const candidate of group) {
      groupedByMember.set(candidate.id, presentation);
    }
  }

  return occurrences.flatMap(
    (occurrence): ReadonlyArray<OccurrencePresentation> => {
      const group = groupedByMember.get(occurrence.id);
      if (group === undefined) return [presentOccurrence(occurrence)];
      return group.id === occurrence.id ? [group] : [];
    },
  );
};

export const presentOccurrences = (
  occurrences: ReadonlyArray<OperationOccurrence>,
  collapseReviews: boolean,
): ReadonlyArray<OccurrencePresentation> =>
  collapseReviews
    ? collapseConvergenceLoops(occurrences)
    : occurrences.map(presentOccurrence);

export const focusTaskDag = (
  taskDag: TaskDagRevision,
  focusTaskId: TaskId,
): TaskDagRevision => {
  const byId = new Map(taskDag.tasks.map((task) => [task.id, task]));
  if (!byId.has(focusTaskId)) return taskDag;

  const included = new Set<TaskId>([focusTaskId]);
  const visitUpstream = (taskId: TaskId): void => {
    const task = byId.get(taskId);
    if (task === undefined) return;
    const upstream = [
      ...(task.parentTaskId === null ? [] : [task.parentTaskId]),
      ...task.prerequisiteIds,
    ];
    for (const upstreamId of upstream) {
      if (included.has(upstreamId)) continue;
      included.add(upstreamId);
      visitUpstream(upstreamId);
    }
  };
  visitUpstream(focusTaskId);

  const visitDownstream = (taskId: TaskId): void => {
    for (const task of taskDag.tasks) {
      if (!task.prerequisiteIds.includes(taskId) || included.has(task.id)) {
        continue;
      }
      included.add(task.id);
      visitUpstream(task.id);
      visitDownstream(task.id);
    }
  };
  visitDownstream(focusTaskId);

  return {
    revision: taskDag.revision,
    tasks: taskDag.tasks.filter((task) => included.has(task.id)),
  };
};

export const focusTaskDagOnTasks = (
  taskDag: TaskDagRevision,
  focusTaskIds: ReadonlyArray<TaskId>,
): TaskDagRevision => {
  const byId = new Map(taskDag.tasks.map((task) => [task.id, task]));
  const included = new Set<TaskId>();
  const visitContext = (taskId: TaskId): void => {
    if (included.has(taskId)) return;
    const task = byId.get(taskId);
    if (task === undefined) return;
    included.add(taskId);
    if (task.parentTaskId !== null) visitContext(task.parentTaskId);
    for (const prerequisiteId of task.prerequisiteIds) {
      visitContext(prerequisiteId);
    }
  };
  for (const taskId of focusTaskIds) visitContext(taskId);
  return {
    revision: taskDag.revision,
    tasks: taskDag.tasks.filter((task) => included.has(task.id)),
  };
};
