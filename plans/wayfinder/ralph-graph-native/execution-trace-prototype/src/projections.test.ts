import { describe, expect, it } from "vitest";
import {
  largeRun,
  makeTrackerDagRun,
  TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID,
} from "./fixture.ts";
import { occurrenceGraph, taskGraph } from "./graph.ts";
import {
  focusTaskDag,
  presentOccurrences,
  projectRun,
  traceEndCursor,
} from "./projections.ts";
import type { TaskId } from "./trace-contract.ts";

describe("trace projections", () => {
  it("mirrors the captured GH-12 tracker hierarchy and native blocker DAG", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const projection = projectRun(run, 0);
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
      .filter(
        (occurrence) =>
          !occurrence.label.startsWith("integration") &&
          occurrence.label !== "TrackerCompletionAcknowledged",
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
    const resumed = projectRun(
      makeTrackerDagRun("resume-bound-session"),
      9,
    ).actors.find(
      (actor) =>
        actor.actor.invocationId === "actor:gh-170-implementer-round-2",
    );
    const replaced = projectRun(
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
    const unrelated = projectRun(largeRun, 1).occurrences[0]!;
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
    const projection = projectRun(makeTrackerDagRun("resume-bound-session"), 2);
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
      ["github-issue:170", 19, 20],
      ["github-issue:99", 22, 23],
    ]);
  });

  it("projects issue execution state onto the tracker DAG", () => {
    const projection = projectRun(
      makeTrackerDagRun("resume-bound-session"),
      14,
    );
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
    const projection = projectRun(
      makeTrackerDagRun("resume-bound-session"),
      18,
    );

    expect(projection.rewrite?.addedTaskIds).toEqual([
      TRACKER_STRUCTURAL_FOLLOW_UP_TASK_ID,
    ]);
    expect(projection.taskDag.tasks).toHaveLength(106);
  });

  it("focuses the live DAG on GH-170 ancestry, blockers, and dependants", () => {
    const run = makeTrackerDagRun("resume-bound-session");
    const taskDag = projectRun(run, 0).taskDag;
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
