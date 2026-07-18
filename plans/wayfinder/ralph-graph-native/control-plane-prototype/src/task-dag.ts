import { HashMap, HashSet, Option, Result, Schema } from "effect";

export const TaskId = Schema.NonEmptyString.pipe(Schema.brand("TaskId"));
export type TaskId = typeof TaskId.Type;

export const TrackerRevision = Schema.NonEmptyString.pipe(
  Schema.brand("TrackerRevision"),
);
export type TrackerRevision = typeof TrackerRevision.Type;

export const ClaimOwner = Schema.NonEmptyString.pipe(
  Schema.brand("ClaimOwner"),
);
export type ClaimOwner = typeof ClaimOwner.Type;

export const TaskLifecycle = Schema.TaggedUnion({
  Ready: {},
  Claimed: { owner: ClaimOwner },
  Completed: {},
  Quarantined: {},
});
export type TaskLifecycle = typeof TaskLifecycle.Type;

export const isDependencySatisfied = (lifecycle: TaskLifecycle): boolean =>
  lifecycle._tag === "Completed";

export const TrackerTask = Schema.Struct({
  id: TaskId,
  lifecycle: TaskLifecycle,
  prerequisites: Schema.Array(TaskId),
});
export type TrackerTask = typeof TrackerTask.Type;

export const TrackerSnapshot = Schema.Struct({
  revision: TrackerRevision,
  tasks: Schema.Array(TrackerTask),
});
export type TrackerSnapshot = typeof TrackerSnapshot.Type;

export type ProjectionIssue =
  | { readonly _tag: "BoundaryDecodeFailed"; readonly message: string }
  | { readonly _tag: "DuplicateTask"; readonly taskId: TaskId }
  | {
      readonly _tag: "DuplicateDependency";
      readonly dependant: TaskId;
      readonly prerequisite: TaskId;
    }
  | {
      readonly _tag: "MissingPrerequisite";
      readonly dependant: TaskId;
      readonly prerequisite: TaskId;
    }
  | { readonly _tag: "SelfDependency"; readonly taskId: TaskId }
  | { readonly _tag: "Cycle"; readonly taskIds: ReadonlyArray<TaskId> };

export type ProjectionResult =
  | {
      readonly _tag: "Invalid";
      readonly issues: ReadonlyArray<ProjectionIssue>;
    }
  | { readonly _tag: "Valid"; readonly snapshot: TaskDagSnapshot };

interface TaskNode {
  readonly lifecycle: TaskLifecycle;
  readonly prerequisites: HashSet.HashSet<TaskId>;
}

const compareCodeUnits = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export const compareTaskIds = (left: TaskId, right: TaskId): number =>
  compareCodeUnits(left, right);

const recordSignature = (record: TrackerTask): string =>
  JSON.stringify({
    lifecycle: record.lifecycle,
    prerequisites: [...record.prerequisites].sort(compareTaskIds),
  });

const sorted = (ids: Iterable<TaskId>): ReadonlyArray<TaskId> =>
  [...ids].sort(compareTaskIds);

const getNode = (
  tasks: HashMap.HashMap<TaskId, TaskNode>,
  taskId: TaskId,
): Option.Option<TaskNode> => HashMap.get(tasks, taskId);

const dependantsOfTasks = (
  tasks: HashMap.HashMap<TaskId, TaskNode>,
  prerequisite: TaskId,
): ReadonlyArray<TaskId> =>
  sorted(
    [...HashMap.entries(tasks)]
      .filter(([, node]) => HashSet.has(node.prerequisites, prerequisite))
      .map(([taskId]) => taskId),
  );

const stronglyConnectedCycles = (
  tasks: HashMap.HashMap<TaskId, TaskNode>,
): ReadonlyArray<ProjectionIssue> => {
  let nextIndex = 0;
  const indexes = new Map<TaskId, number>();
  const lowLinks = new Map<TaskId, number>();
  const stack: Array<TaskId> = [];
  const onStack = new Set<TaskId>();
  const components: Array<ReadonlyArray<TaskId>> = [];

  const visit = (taskId: TaskId): void => {
    const index = nextIndex++;
    indexes.set(taskId, index);
    lowLinks.set(taskId, index);
    stack.push(taskId);
    onStack.add(taskId);

    const node = getNode(tasks, taskId);
    if (Option.isSome(node)) {
      for (const prerequisite of sorted(node.value.prerequisites)) {
        if (!indexes.has(prerequisite)) {
          visit(prerequisite);
          lowLinks.set(
            taskId,
            Math.min(
              lowLinks.get(taskId) ?? index,
              lowLinks.get(prerequisite) ?? index,
            ),
          );
        } else if (onStack.has(prerequisite)) {
          lowLinks.set(
            taskId,
            Math.min(
              lowLinks.get(taskId) ?? index,
              indexes.get(prerequisite) ?? index,
            ),
          );
        }
      }
    }

    if (lowLinks.get(taskId) !== indexes.get(taskId)) return;

    const component: Array<TaskId> = [];
    while (stack.length > 0) {
      const member = stack.pop();
      if (member === undefined) break;
      onStack.delete(member);
      component.push(member);
      if (member === taskId) break;
    }
    if (component.length > 1) components.push(sorted(component));
  };

  for (const taskId of sorted(HashMap.keys(tasks))) {
    if (!indexes.has(taskId)) visit(taskId);
  }

  return components
    .sort((left, right) => {
      const leftFirst = left[0];
      const rightFirst = right[0];
      if (leftFirst === undefined) return rightFirst === undefined ? 0 : -1;
      if (rightFirst === undefined) return 1;
      return compareTaskIds(leftFirst, rightFirst);
    })
    .map((taskIds) => ({ _tag: "Cycle", taskIds }));
};

export class TaskDagSnapshot {
  private constructor(
    readonly revision: TrackerRevision,
    private readonly tasks: HashMap.HashMap<TaskId, TaskNode>,
  ) {}

  static project(decoded: TrackerSnapshot): ProjectionResult {
    const issues: Array<ProjectionIssue> = [];
    const recordsById = new Map<TaskId, TrackerTask>();

    for (const record of [...decoded.tasks].sort((left, right) => {
      const identityOrder = compareTaskIds(left.id, right.id);
      return identityOrder !== 0
        ? identityOrder
        : compareCodeUnits(recordSignature(left), recordSignature(right));
    })) {
      if (recordsById.has(record.id)) {
        issues.push({ _tag: "DuplicateTask", taskId: record.id });
      } else {
        recordsById.set(record.id, record);
      }
    }

    let tasks = HashMap.empty<TaskId, TaskNode>();
    for (const [taskId, record] of recordsById) {
      const prerequisites = [...record.prerequisites].sort(compareTaskIds);
      const uniquePrerequisites: Array<TaskId> = [];
      let previous: TaskId | undefined;

      for (const prerequisite of prerequisites) {
        if (prerequisite === previous) {
          issues.push({
            _tag: "DuplicateDependency",
            dependant: taskId,
            prerequisite,
          });
          continue;
        }
        previous = prerequisite;
        uniquePrerequisites.push(prerequisite);
        if (prerequisite === taskId) {
          issues.push({ _tag: "SelfDependency", taskId });
        } else if (!recordsById.has(prerequisite)) {
          issues.push({
            _tag: "MissingPrerequisite",
            dependant: taskId,
            prerequisite,
          });
        }
      }

      tasks = HashMap.set(tasks, taskId, {
        lifecycle: record.lifecycle,
        prerequisites: HashSet.fromIterable(uniquePrerequisites),
      });
    }

    issues.push(...stronglyConnectedCycles(tasks));

    return issues.length > 0
      ? { _tag: "Invalid", issues }
      : {
          _tag: "Valid",
          snapshot: new TaskDagSnapshot(decoded.revision, tasks),
        };
  }

  taskLifecycle(taskId: TaskId): Option.Option<TaskLifecycle> {
    return Option.map(getNode(this.tasks, taskId), (node) => node.lifecycle);
  }

  prerequisitesOf(taskId: TaskId): ReadonlyArray<TaskId> {
    const node = getNode(this.tasks, taskId);
    return Option.isSome(node) ? sorted(node.value.prerequisites) : [];
  }

  dependantsOf(taskId: TaskId): ReadonlyArray<TaskId> {
    return dependantsOfTasks(this.tasks, taskId);
  }

  transitiveDependantsOf(taskId: TaskId): ReadonlyArray<TaskId> {
    const found = new Set<TaskId>();
    const pending = [...this.dependantsOf(taskId)];
    while (pending.length > 0) {
      const dependant = pending.shift();
      if (dependant === undefined || found.has(dependant)) continue;
      found.add(dependant);
      pending.push(...this.dependantsOf(dependant));
    }
    return sorted(found);
  }

  topologicalOrder(): ReadonlyArray<TaskId> {
    const taskIds = sorted(HashMap.keys(this.tasks));
    const remainingPrerequisites = new Map<TaskId, number>(
      taskIds.map((taskId) => [taskId, this.prerequisitesOf(taskId).length]),
    );
    const ready = taskIds.filter(
      (taskId) => remainingPrerequisites.get(taskId) === 0,
    );
    const order: Array<TaskId> = [];

    while (ready.length > 0) {
      const taskId = ready.shift();
      if (taskId === undefined) break;
      order.push(taskId);
      for (const dependant of this.dependantsOf(taskId)) {
        const remaining = (remainingPrerequisites.get(dependant) ?? 0) - 1;
        remainingPrerequisites.set(dependant, remaining);
        if (remaining === 0) {
          ready.push(dependant);
          ready.sort(compareTaskIds);
        }
      }
    }

    return order;
  }

  runnableFrontier(): ReadonlyArray<TaskId> {
    return sorted(HashMap.keys(this.tasks)).filter((taskId) => {
      const node = getNode(this.tasks, taskId);
      if (!Option.isSome(node) || node.value.lifecycle._tag !== "Ready") {
        return false;
      }
      return this.prerequisitesOf(taskId).every((prerequisite) => {
        const lifecycle = this.taskLifecycle(prerequisite);
        return (
          Option.isSome(lifecycle) && isDependencySatisfied(lifecycle.value)
        );
      });
    });
  }

  toWire(): TrackerSnapshot {
    return {
      revision: this.revision,
      tasks: [...HashMap.entries(this.tasks)]
        .sort(([left], [right]) => compareTaskIds(left, right))
        .map(([id, node]) => ({
          id,
          lifecycle: node.lifecycle,
          prerequisites: sorted(node.prerequisites),
        })),
    };
  }

  canonicalJson(): string {
    return JSON.stringify(
      Schema.encodeUnknownSync(TrackerSnapshot)(this.toWire()),
    );
  }
}

export const projectTrackerSnapshot = (input: unknown): ProjectionResult => {
  const decoded = Schema.decodeUnknownResult(TrackerSnapshot)(input);
  return Result.isFailure(decoded)
    ? {
        _tag: "Invalid",
        issues: [
          {
            _tag: "BoundaryDecodeFailed",
            message: String(decoded.failure),
          },
        ],
      }
    : TaskDagSnapshot.project(decoded.success);
};
