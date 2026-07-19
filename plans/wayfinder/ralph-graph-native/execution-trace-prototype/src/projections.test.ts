import { describe, expect, it } from "vitest";
import {
  largeRun,
  makeTrackerDagRun,
  TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID,
} from "./fixture.ts";
import { trackerTaskDagSnapshot } from "./tracker-task-dag-snapshot.generated.ts";
import { occurrenceGraph, taskGraph } from "./graph.ts";
import {
  focusTaskDag,
  presentOccurrences,
  projectRun,
  traceCursorAt,
  traceEndCursor,
} from "./projections.ts";
import {
  validateTraceRun,
  type OperationOccurrence,
  type TaskId,
  type TraceRun,
  type TraceValidationIssue,
  type ValidatedTraceRun,
} from "./trace-contract.ts";

describe("trace projections", () => {
  const projectAt = (
    run: ReturnType<typeof makeTrackerDagRun>,
    cursor: number,
  ) => projectRun(run, traceCursorAt(run, cursor));

  const rewriteOccurrence = (
    run: ValidatedTraceRun,
    occurrenceId: string,
    rewrite: (occurrence: OperationOccurrence) => unknown,
  ): TraceRun => {
    const [first, ...remaining] = run.items;
    return {
      ...run,
      items: [
        first,
        ...remaining.map((item) =>
          item.tag === "OperationOccurred" &&
          item.occurrence.id === occurrenceId
            ? {
                ...item,
                // Invalid-wire tests deliberately violate narrowed occurrence
                // invariants before exercising the runtime trace validator.
                occurrence: rewrite(item.occurrence) as OperationOccurrence,
              }
            : item,
        ),
      ],
    };
  };

  const validationIssues = (
    trace: TraceRun,
  ): ReadonlyArray<TraceValidationIssue> => {
    const result = validateTraceRun(trace);
    expect(result.tag).toBe("InvalidTrace");
    return result.tag === "InvalidTrace" ? result.issues : [];
  };

  it("rejects invalid trace ordering before projection", () => {
    const valid = makeTrackerDagRun("resume-bound-session");
    const secondItem = valid.items[1];
    if (secondItem === undefined) {
      throw new Error(
        "Expected the established fixture to contain a second item",
      );
    }
    const invalid: TraceRun = {
      ...valid,
      items: [valid.items[0], { ...secondItem, cursor: 0 }],
    };

    const result = validateTraceRun(invalid);
    expect(result.tag).toBe("InvalidTrace");
    if (result.tag === "InvalidTrace") {
      expect(result.issues).toContainEqual({
        tag: "NonIncreasingCursor",
        cursor: 0,
      });
    }
  });

  it("keeps grouping independent from prerequisite cycle detection", () => {
    const trace: TraceRun = {
      schemaVersion: 1,
      mode: "simulation",
      scenarioId: "scenario:independent-grouping-and-dependency",
      basis: { tag: "SyntheticStress" },
      items: [
        {
          tag: "TrackerRevisionObserved",
          cursor: 0,
          observedAt: "00:00:00",
          observationId: "observation:independent-relations",
          taskDag: {
            revision: "tracker-revision:independent-relations",
            tasks: [
              {
                id: "task:parent",
                title: "Parent blocked by its child",
                lifecycle: "open",
                parentTaskId: null,
                prerequisiteIds: ["task:child"],
                assignment: { tag: "Unassigned" },
                labels: [],
              },
              {
                id: "task:child",
                title: "Grouped child",
                lifecycle: "open",
                parentTaskId: "task:parent",
                prerequisiteIds: [],
                assignment: { tag: "Unassigned" },
                labels: [],
              },
            ],
          },
        },
      ],
    };

    expect(validateTraceRun(trace).tag).toBe("ValidTrace");
  });

  it("rejects cross-attempt actor completion", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-46-review",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                node: {
                  ...occurrence.operation.node,
                  attemptId: "attempt:wrong",
                  worktreeId: "worktree:wrong",
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidActorCompletion",
      actorInvocationId: "actor:gh-46-implementer",
    });
  });

  it("rejects duplicate actor completion", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-46-accepted-result-queued",
      (occurrence) => ({
        ...occurrence,
        actorCompletion: {
          tag: "ActorCompleted",
          actorInvocationId: "actor:gh-46-reviewer",
        },
      }),
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "ActorAlreadyCompleted",
      actorInvocationId: "actor:gh-46-reviewer",
    });
  });

  it("rejects continuation from an active predecessor", () => {
    const withoutCompletion = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-170-review-round-1",
      (occurrence) => ({
        ...occurrence,
        actorCompletion: { tag: "NoActorCompleted" },
      }),
    );

    expect(validationIssues(withoutCompletion)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-170-implementer-round-2",
    });
  });

  it("rejects unknown continuation lineage", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-170-implementation-round-2",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                actor: {
                  ...occurrence.operation.actor,
                  sessionBinding: {
                    tag: "ResumedSession",
                    sessionId: "session:gh-170-implementer",
                    previousInvocationId: "actor:unknown",
                  },
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-170-implementer-round-2",
    });
  });

  it("rejects simultaneous reuse of an active session", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-46-implementation",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                actor: {
                  ...occurrence.operation.actor,
                  sessionBinding: {
                    tag: "InitialSession",
                    sessionId: "session:gh-170-implementer",
                  },
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-46-implementer",
    });
  });

  it("rejects relabeling a completed session as initial", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-170-implementation-round-2",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                actor: {
                  ...occurrence.operation.actor,
                  sessionBinding: {
                    tag: "InitialSession",
                    sessionId: "session:gh-170-implementer",
                  },
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-170-implementer-round-2",
    });
  });

  it("rejects replacement with a previously used session", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-170-implementation-round-2",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                actor: {
                  ...occurrence.operation.actor,
                  sessionBinding: {
                    tag: "ReplacementSession",
                    sessionId: "session:gh-46-reviewer",
                    supersededSessionId: "session:gh-170-implementer",
                  },
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-170-implementer-round-2",
    });
  });

  it("rejects continuation into another attempt worktree", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-170-implementation-round-2",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                node: {
                  ...occurrence.operation.node,
                  attemptId: "attempt:gh-170-2",
                  worktreeId: "worktree:gh-170-2",
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-170-implementer-round-2",
    });
  });

  it("rejects resuming a stale invocation in a session lineage", () => {
    const invalid = rewriteOccurrence(
      makeTrackerDagRun("resume-bound-session"),
      "occurrence:gh-99-integration",
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted"
          ? {
              ...occurrence,
              operation: {
                ...occurrence.operation,
                actor: {
                  ...occurrence.operation.actor,
                  sessionBinding: {
                    tag: "ResumedSession",
                    sessionId: "session:integration-main",
                    previousInvocationId: "actor:gh-46-integrator",
                  },
                },
              },
            }
          : occurrence,
    );

    expect(validationIssues(invalid)).toContainEqual({
      tag: "InvalidSessionLineage",
      actorInvocationId: "actor:gh-99-integrator",
    });
  });

  it("retains canonical operation, authority, target, and causal identity", () => {
    const projection = projectAt(makeTrackerDagRun("resume-bound-session"), 10);
    const integration = projection.occurrences.find(
      (occurrence) =>
        occurrence.operation.tag === "ActorInvocationStarted" &&
        occurrence.operation.stage === "integration",
    );

    expect(integration?.operationId).toBe("operation:gh-46-integration");
    expect(integration?.authorityObservations).toEqual([
      {
        observationId: "observation:github-issue-12-tree",
        trackerRevision: trackerTaskDagSnapshot.revision,
      },
    ]);
    expect(integration?.operation.node).toMatchObject({
      targetId: "integration-target:main",
    });
    expect(integration?.predecessors).toEqual([
      {
        occurrenceId: "occurrence:gh-46-accepted-result-queued",
        relation: "workflow-progression",
      },
    ]);
  });
  it("mirrors the captured GH-12 tracker hierarchy and native blocker DAG", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const projection = projectAt(run, 0);
    const gh170 = projection.taskDag.tasks.find(
      (task) => task.id === "github-issue:170",
    );
    const graph = taskGraph(
      projection.taskDag,
      projection.taskExecutions,
      new Set(["github-issue:170"]),
    );

    expect(projection.taskDag.tasks).toHaveLength(105);
    expect(gh170).toMatchObject({
      parentTaskId: "github-issue:157",
      lifecycle: "open",
      prerequisiteIds: [
        "github-issue:174",
        "github-issue:173",
        "github-issue:172",
      ],
    });
    expect(graph.nodes).toHaveLength(105);
    expect(
      graph.edges.filter((edge) => edge.className === "containment-edge"),
    ).toHaveLength(104);
    expect(
      graph.edges.filter((edge) => edge.className === "blocker-edge"),
    ).toHaveLength(108);
  });

  it("alternates implementer and fresh reviewer invocations around findings", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const projection = projectRun(run, traceEndCursor(run));
    const labels = presentOccurrences(projection.occurrences, false)
      .filter((occurrence) => occurrence.taskId === "github-issue:170")
      .filter((occurrence) =>
        projection.occurrences.some(
          (candidate) =>
            candidate.id === occurrence.id &&
            candidate.operation.node.tag === "TaskAttempt",
        ),
      )
      .map((occurrence) => occurrence.label);

    expect(labels).toEqual([
      "implementation · initial session",
      "fresh-task-review · initial session",
      "review verdict · findings",
      "implementation · resume bound session",
      "fresh-task-review · initial session",
      "review verdict · accept",
      "AcceptedResultQueued",
    ]);
  });

  it("makes resumed and replacement implementer sessions distinct", () => {
    const resumed = projectAt(
      makeTrackerDagRun("resume-bound-session"),
      9,
    ).actors.find(
      (actor) =>
        actor.actor.invocationId === "actor:gh-170-implementer-round-2",
    );
    const replaced = projectAt(
      makeTrackerDagRun("start-fresh-session"),
      9,
    ).actors.find(
      (actor) =>
        actor.actor.invocationId === "actor:gh-170-implementer-round-2",
    );

    expect(resumed?.actor.sessionBinding).toEqual({
      tag: "ResumedSession",
      sessionId: "session:gh-170-implementer",
      previousInvocationId: "actor:gh-170-implementer-round-1",
    });
    expect(replaced?.actor.sessionBinding).toEqual({
      tag: "ReplacementSession",
      sessionId: "session:gh-170-implementer-replacement",
      supersededSessionId: "session:gh-170-implementer",
    });
    expect(resumed?.taskIds).toEqual(["github-issue:170"]);
    expect(replaced?.taskIds).toEqual(["github-issue:170"]);
  });

  it("collapses the whole implementation-review convergence loop", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const projection = projectRun(run, traceEndCursor(run));
    const collapsed = presentOccurrences(projection.occurrences, true);
    const convergence = collapsed.find((occurrence) =>
      occurrence.label.startsWith("implementation/review convergence"),
    );

    expect(convergence?.occurrenceIds).toEqual([
      "occurrence:gh-170-review-round-1",
      "occurrence:gh-170-findings-round-1",
      "occurrence:gh-170-implementation-round-2",
      "occurrence:gh-170-review-round-2",
      "occurrence:gh-170-accept-round-2",
    ]);
    expect(convergence?.actorRole).toBe("multiple-actors");
  });

  it("does not collapse an interleaved workflow node into another task's loop", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const projection = projectRun(run, traceEndCursor(run));
    const unrelated = projectRun(largeRun, traceCursorAt(largeRun, 1))
      .occurrences[0]!;
    const interleaved = [
      ...projection.occurrences.slice(0, 3),
      unrelated,
      ...projection.occurrences.slice(3),
    ];
    const collapsed = presentOccurrences(interleaved, true);

    expect(
      collapsed.find((occurrence) =>
        occurrence.occurrenceIds.includes(unrelated.id),
      )?.occurrenceIds,
    ).toEqual([unrelated.id]);
    expect(
      collapsed
        .find((occurrence) =>
          occurrence.label.startsWith("implementation/review convergence"),
        )
        ?.occurrenceIds.includes(unrelated.id),
    ).toBe(false);
  });

  it("derives two simultaneously active issue workflows from causal events", () => {
    const projection = projectAt(makeTrackerDagRun("resume-bound-session"), 2);
    const activeTaskIds = projection.actorSpans
      .filter((span) => span.tag === "ActiveActorSpan")
      .map((span) => span.taskId);

    expect(activeTaskIds).toEqual(["github-issue:170", "github-issue:46"]);
  });

  it("serializes integration while task workflows overlap", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const integrations = projectRun(run, traceEndCursor(run)).actorSpans.filter(
      (span) => span.stage === "integration",
    );

    expect(
      integrations.map((span) => [
        span.taskId,
        span.startCursor,
        span.tag === "CompletedActorSpan" ? span.endCursor : null,
      ]),
    ).toEqual([
      ["github-issue:46", 10, 17],
      ["github-issue:170", 21, 22],
      ["github-issue:99", 26, 27],
    ]);
  });

  it("projects issue execution state onto the tracker DAG", () => {
    const projection = projectAt(makeTrackerDagRun("resume-bound-session"), 14);
    const graph = taskGraph(
      projection.taskDag,
      projection.taskExecutions,
      new Set(["github-issue:170"]),
    );
    const nodeClass = (taskId: TaskId): string | undefined =>
      graph.nodes.find((node) => node.id === taskId)?.className;

    expect(nodeClass("github-issue:46")).toContain("execution-integrating");
    expect(nodeClass("github-issue:170")).toContain("execution-reviewing");
    expect(nodeClass("github-issue:99")).toContain(
      "execution-queued-for-integration",
    );
  });

  it("projects a structural tracker rewrite after the first completion", () => {
    const projection = projectAt(makeTrackerDagRun("resume-bound-session"), 20);

    expect(projection.rewrite?.addedTaskIds).toEqual([
      TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID,
    ]);
    expect(projection.taskDag.tasks).toHaveLength(106);
  });

  it("focuses the live DAG on GH-170 ancestry, blockers, and dependants", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const taskDag = projectAt(run, 0).taskDag;
    const focused = focusTaskDag(taskDag, "github-issue:170");
    const ids = new Set(focused.tasks.map((task) => task.id));

    expect(focused.tasks.length).toBeLessThan(taskDag.tasks.length);
    const expectedIds = [
      "github-issue:12",
      "github-issue:32",
      "github-issue:61",
      "github-issue:92",
      "github-issue:157",
      "github-issue:170",
      "github-issue:172",
      "github-issue:173",
      "github-issue:174",
      "github-issue:160",
      "github-issue:166",
      "github-issue:169",
      "github-issue:168",
    ] as const satisfies ReadonlyArray<TaskId>;
    for (const id of expectedIds) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("lays out the synthetic large-run fixture without dropping facts", () => {
    const projection = projectRun(largeRun, traceEndCursor(largeRun));
    const taskLayout = taskGraph(
      projection.taskDag,
      projection.taskExecutions,
      new Set(),
    );
    const occurrenceLayout = occurrenceGraph(
      presentOccurrences(projection.occurrences, true),
    );
    expect(projection.taskDag.tasks).toHaveLength(60);
    expect(projection.occurrences).toHaveLength(120);
    expect(projection.actors).toHaveLength(120);
    expect(taskLayout.nodes).toHaveLength(60);
    expect(occurrenceLayout.nodes).toHaveLength(120);
    expect(
      taskLayout.nodes.every(
        (node) =>
          Number.isFinite(node.position.x) && Number.isFinite(node.position.y),
      ),
    ).toBe(true);
    expect(
      occurrenceLayout.nodes.every(
        (node) =>
          Number.isFinite(node.position.x) && Number.isFinite(node.position.y),
      ),
    ).toBe(true);
  });
});
