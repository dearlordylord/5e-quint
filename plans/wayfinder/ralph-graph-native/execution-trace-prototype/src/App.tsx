import { useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  largeRun,
  makeTrackerDagRun,
  trackerDagFixturePresentation,
} from "./fixture.ts";
import { occurrenceGraph, taskGraph } from "./graph.ts";
import {
  focusTaskDag,
  focusTaskDagOnTasks,
  presentOccurrences,
  projectRun,
  traceCursorAt,
  traceEndCursor,
  type ActorSpan,
} from "./projections.ts";
import type {
  ActorIdentity,
  SemanticTraceItem,
  SessionContinuationChoice,
  TaskId,
  ValidatedTraceRun,
} from "./trace-contract.ts";

const NO_GRAPH_FOCUS_TASKS: ReadonlySet<TaskId> = new Set();

const traceItemTitle = (item: SemanticTraceItem): string => {
  if (item.tag === "TrackerRevisionObserved") {
    return `Tracker ${item.taskDag.revision}`;
  }
  if (item.tag === "OperationOccurred") {
    const operation = item.occurrence.operation;
    if (operation.tag === "ActorInvocationStarted") {
      return `${operation.stage} invocation started`;
    }
    if (
      operation.tag === "TaskReviewVerdictReturned" ||
      operation.tag === "IntegrationReviewVerdictReturned"
    ) {
      return `review verdict: ${operation.verdict}`;
    }
    return operation.tag;
  }
  if (item.tag === "ActorOutputObserved") return "Actor output";
  return `Observation gap · ${item.reason}`;
};

const sessionDetail = (actor: ActorIdentity): string => {
  const binding = actor.sessionBinding;
  if (binding.tag === "InitialSession") {
    return `initial · ${binding.sessionId}`;
  }
  if (binding.tag === "ResumedSession") {
    return `resumed · ${binding.sessionId} · after ${binding.previousInvocationId}`;
  }
  return `replacement · ${binding.sessionId} · supersedes ${binding.supersededSessionId}`;
};

const operationActor = (item: SemanticTraceItem): ActorIdentity | null => {
  if (item.tag !== "OperationOccurred") return null;
  const operation = item.occurrence.operation;
  return operation.tag === "ActorInvocationStarted" ? operation.actor : null;
};

const traceItemDetail = (
  item: SemanticTraceItem,
): ReadonlyArray<readonly [string, string]> => {
  if (item.tag === "TrackerRevisionObserved") {
    return [
      ["observation", item.observationId],
      ["tasks", String(item.taskDag.tasks.length)],
    ];
  }
  if (item.tag === "OperationOccurred") {
    const actor = operationActor(item);
    const node = item.occurrence.operation.node;
    return [
      ["occurrence", item.occurrence.id],
      ["operation", item.occurrence.operationId],
      [
        "actor",
        actor !== null
          ? `${actor.role} · ${actor.invocationId}`
          : item.occurrence.operation.tag === "TaskReviewVerdictReturned"
            ? `task-reviewer · ${item.occurrence.operation.actorInvocationId}`
            : item.occurrence.operation.tag ===
                "IntegrationReviewVerdictReturned"
              ? `integration-reviewer · ${item.occurrence.operation.actorInvocationId}`
              : "coordinator",
      ],
      ...(actor === null ? [] : [["session", sessionDetail(actor)] as const]),
      ["workflow node", node.tag],
      ["task", node.taskId],
      ...(node.tag === "TaskAttempt"
        ? [
            ["attempt", node.attemptId] as const,
            ["worktree", node.worktreeId] as const,
          ]
        : [["integration", node.integrationId] as const]),
      ...(node.tag === "IntegrationLifecycle"
        ? [["integration target", node.targetId] as const]
        : []),
      [
        "authority observations",
        item.occurrence.authorityObservations
          .map(
            (reference) =>
              `${reference.observationId} @ ${reference.trackerRevision}`,
          )
          .join(" · "),
      ],
      ["why", item.occurrence.decisionReason],
      ["evidence", item.occurrence.evidenceIds.join(", ")],
      [
        "causal parents",
        item.occurrence.predecessors
          .map(
            (predecessor) =>
              `${predecessor.relation}: ${predecessor.occurrenceId}`,
          )
          .join(" · ") || "root",
      ],
    ];
  }
  if (item.tag === "ActorOutputObserved") {
    return [
      ["actor", item.actorInvocationId],
      ["channel", item.channel],
      ["evidence", item.evidenceId],
    ];
  }
  return [
    ["actor", item.actorInvocationId],
    ["after evidence", item.afterEvidenceId],
    ["continuity", "explicitly unknown"],
  ];
};

const runLabel = (run: ValidatedTraceRun): string =>
  run.mode === "observed" ? run.runId : run.scenarioId;

const GraphPanel = ({
  title,
  graph,
}: {
  readonly title: string;
  readonly graph: ReturnType<typeof taskGraph>;
}) => (
  <section className="graph-panel">
    <div className="panel-heading">
      <h2>{title}</h2>
      <span>
        {graph.nodes.length} nodes · {graph.edges.length} edges
      </span>
    </div>
    <ReactFlow
      nodes={[...graph.nodes]}
      edges={[...graph.edges]}
      fitView
      minZoom={0.04}
      maxZoom={1.7}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Background gap={28} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  </section>
);

const shortTaskId = (taskId: TaskId): string =>
  taskId.startsWith("github-issue:")
    ? `GH-${taskId.slice("github-issue:".length)}`
    : taskId;

const actorSpanLabel = (span: ActorSpan): string => {
  if (span.stage === "implementation") return "implement";
  if (span.stage === "fresh-task-review") return "review";
  if (span.stage === "integration") return "integrate";
  return "integration review";
};

const actorSpanEndExclusive = (span: ActorSpan): number =>
  span.tag === "CompletedActorSpan" ? span.endCursor : span.throughCursor + 1;

const actorSpanDisplayEnd = (span: ActorSpan): number =>
  span.tag === "CompletedActorSpan" ? span.endCursor : span.throughCursor;

const peakTaskConcurrency = (
  spans: ReadonlyArray<ActorSpan>,
  maxCursor: number,
): number =>
  Math.max(
    0,
    ...Array.from(
      { length: maxCursor + 1 },
      (_, cursor) =>
        new Set(
          spans
            .filter(
              (span) =>
                span.stage !== "integration" &&
                span.stage !== "fresh-integration-review" &&
                span.startCursor <= cursor &&
                actorSpanEndExclusive(span) > cursor,
            )
            .map((span) => span.taskId),
        ).size,
    ),
  );

const ExecutionLanes = ({
  spans,
  cursor,
  maxCursor,
}: {
  readonly spans: ReadonlyArray<ActorSpan>;
  readonly cursor: number;
  readonly maxCursor: number;
}) => {
  const spansByTask = new Map<TaskId, ReadonlyArray<ActorSpan>>();
  for (const span of spans) {
    spansByTask.set(span.taskId, [
      ...(spansByTask.get(span.taskId) ?? []),
      span,
    ]);
  }
  const divisor = Math.max(1, maxCursor);

  return (
    <section className="execution-lanes">
      <div className="lane-heading">
        <div>
          <p className="eyebrow">Derived actor spans</p>
          <h2>Parallel issue execution</h2>
        </div>
        <div className="lane-legend">
          <span>
            {peakTaskConcurrency(spans, maxCursor)} task slots overlap
          </span>
          <span className="legend-implementation">implementation</span>
          <span className="legend-review">fresh review</span>
          <span className="legend-integration">serialized integration</span>
        </div>
      </div>
      <div className="lane-chart">
        {[...spansByTask.entries()].map(([taskId, taskSpans]) => (
          <div className="lane-row" key={taskId}>
            <strong>{shortTaskId(taskId)}</strong>
            <div className="lane-track">
              {taskSpans.map((span) => (
                <div
                  className={`actor-span stage-${span.stage} ${span.tag === "ActiveActorSpan" ? "active" : "completed"}`}
                  key={span.actor.invocationId}
                  style={{
                    left: `${(span.startCursor / divisor) * 100}%`,
                    width: `${Math.max(1.5, ((actorSpanEndExclusive(span) - span.startCursor) / divisor) * 100)}%`,
                  }}
                  title={`${shortTaskId(taskId)} · ${actorSpanLabel(span)} · ${span.actor.invocationId} · cursor ${span.startCursor}–${actorSpanDisplayEnd(span)}`}
                >
                  <span>{actorSpanLabel(span)}</span>
                </div>
              ))}
              <i
                className="lane-cursor"
                style={{ left: `${(cursor / divisor) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export const App = () => {
  const [runKind, setRunKind] = useState<"tracker" | "large">("tracker");
  const [continuationChoice, setContinuationChoice] =
    useState<SessionContinuationChoice>("resume-bound-session");
  const trackerRun = useMemo(
    () => makeTrackerDagRun(continuationChoice),
    [continuationChoice],
  );
  const run = runKind === "tracker" ? trackerRun : largeRun;
  const [cursor, setCursor] = useState(
    trackerDagFixturePresentation.demonstrationCursor(trackerRun),
  );
  const [collapseLoops, setCollapseLoops] = useState(true);
  const [treeScope, setTreeScope] = useState<"scenario" | "all" | "focus">(
    "scenario",
  );
  const [selectedActors, setSelectedActors] = useState<ReadonlyArray<string>>(
    [],
  );
  const projection = useMemo(
    () => projectRun(run, traceCursorAt(run, cursor)),
    [cursor, run],
  );
  const visibleTaskDag = useMemo(
    () =>
      treeScope === "focus"
        ? focusTaskDag(
            projection.taskDag,
            trackerDagFixturePresentation.focusTaskId,
          )
        : treeScope === "scenario"
          ? focusTaskDagOnTasks(
              projection.taskDag,
              trackerDagFixturePresentation.scenarioTaskIds,
            )
          : projection.taskDag,
    [projection.taskDag, treeScope],
  );
  const tasks = useMemo(
    () =>
      taskGraph(
        visibleTaskDag,
        projection.taskExecutions,
        runKind === "tracker"
          ? new Set([trackerDagFixturePresentation.focusTaskId])
          : NO_GRAPH_FOCUS_TASKS,
      ),
    [projection.taskExecutions, runKind, visibleTaskDag],
  );
  const visibleOccurrences = useMemo(
    () => presentOccurrences(projection.occurrences, collapseLoops),
    [collapseLoops, projection.occurrences],
  );
  const occurrences = useMemo(
    () => occurrenceGraph(visibleOccurrences),
    [visibleOccurrences],
  );
  const selectedActorsResolved = projection.actors.filter((actor) =>
    selectedActors.includes(actor.actor.invocationId),
  );

  const toggleActor = (actorId: string): void => {
    setSelectedActors((selected) =>
      selected.includes(actorId)
        ? selected.filter((id) => id !== actorId)
        : [...selected, actorId],
    );
  };

  const selectRun = (next: "tracker" | "large"): void => {
    const nextRun = next === "tracker" ? trackerRun : largeRun;
    setRunKind(next);
    setTreeScope(next === "tracker" ? "scenario" : "all");
    setCursor(
      next === "tracker"
        ? trackerDagFixturePresentation.demonstrationCursor(nextRun)
        : traceEndCursor(nextRun),
    );
    setSelectedActors([]);
  };

  const selectContinuation = (next: SessionContinuationChoice): void => {
    setContinuationChoice(next);
    setCursor(trackerDagFixturePresentation.demonstrationCursor(trackerRun));
    setSelectedActors([]);
  };

  return (
    <main>
      <header className="masthead">
        <div>
          <p className="eyebrow">
            {run.mode === "observed" ? "Observed run" : "Simulation"} ·{" "}
            {runLabel(run)}
          </p>
          <h1>Ralph execution refinement</h1>
        </div>
        <div className="mode-badge">
          {run.mode === "observed"
            ? "OBSERVED HISTORY"
            : run.basis.tag === "LiveTrackerSnapshot"
              ? "SIMULATION · LIVE TRACKER BASIS"
              : "SIMULATION · SYNTHETIC STRESS"}
        </div>
      </header>

      <section className="timeline">
        <div className="cursor-copy">
          <strong>Cursor {cursor}</strong>
          <span>
            {projection.selectedItem.observedAt} ·{" "}
            {traceItemTitle(projection.selectedItem)}
          </span>
        </div>
        <input
          aria-label="Trace cursor"
          type="range"
          min={0}
          max={traceEndCursor(run)}
          value={cursor}
          onChange={(event) => setCursor(Number(event.target.value))}
        />
        <div className="view-tabs">
          <select
            aria-label="Run fixture"
            value={runKind}
            onChange={(event) =>
              selectRun(event.target.value === "large" ? "large" : "tracker")
            }
          >
            <option value="tracker">Tracker task-DAG snapshot</option>
            <option value="large">60-task synthetic stress</option>
          </select>
        </div>
      </section>

      {runKind === "tracker" && (
        <section className="policy-strip">
          <label>
            Handback session policy
            <select
              value={continuationChoice}
              onChange={(event) =>
                selectContinuation(
                  event.target.value === "start-fresh-session"
                    ? "start-fresh-session"
                    : "resume-bound-session",
                )
              }
            >
              <option value="resume-bound-session">
                Resume exact bound implementer session
              </option>
              <option value="start-fresh-session">
                Start replacement implementer session
              </option>
            </select>
          </label>
          <p>
            Every round is a new top-level invocation. Both policies retain the
            same task attempt and worktree; only the durable agent-session
            binding changes.
          </p>
          <label>
            Task-tree scope
            <select
              value={treeScope}
              onChange={(event) =>
                setTreeScope(
                  event.target.value === "focus"
                    ? "focus"
                    : event.target.value === "all"
                      ? "all"
                      : "scenario",
                )
              }
            >
              <option value="scenario">
                Scenario issues, ancestors, and blockers
              </option>
              <option value="all">Full captured tree</option>
              <option value="focus">
                {shortTaskId(trackerDagFixturePresentation.focusTaskId)}{" "}
                ancestry and dependencies
              </option>
            </select>
          </label>
        </section>
      )}

      <section className="status-strip">
        <div>
          <span>Tracker authority</span>
          <strong>{projection.taskDag.revision}</strong>
        </div>
        <div>
          <span>Tracker tasks</span>
          <strong>{projection.taskDag.tasks.length}</strong>
        </div>
        <div>
          <span>Occurrences</span>
          <strong>{projection.occurrences.length}</strong>
        </div>
        <div>
          <span>Projected actors</span>
          <strong>{projection.actors.length}</strong>
        </div>
      </section>

      {projection.rewrite !== null && (
        <aside className="rewrite-banner">
          <strong>Tracker graph rewritten</strong>
          <span>
            {projection.rewrite.from} → {projection.rewrite.to}
          </span>
          <span>
            added {projection.rewrite.addedTaskIds.join(", ") || "none"}
          </span>
          <span>
            removed {projection.rewrite.removedTaskIds.join(", ") || "none"}
          </span>
          <span>
            dependency changes{" "}
            {projection.rewrite.changedPrerequisiteTaskIds.join(", ") || "none"}
          </span>
          <span>
            parent changes{" "}
            {projection.rewrite.changedParentTaskIds.join(", ") || "none"}
          </span>
        </aside>
      )}

      {runKind === "tracker" && (
        <ExecutionLanes
          spans={projection.actorSpans}
          cursor={cursor}
          maxCursor={traceEndCursor(run)}
        />
      )}

      <div className="workbench">
        <div className="graphs">
          <GraphPanel
            title={
              runKind === "tracker"
                ? "GitHub task DAG · cursor-projected execution"
                : "Synthetic task DAG"
            }
            graph={tasks}
          />
          <section className="graph-panel">
            <div className="panel-heading">
              <h2>Simulated causal execution DAG</h2>
              <label>
                <input
                  type="checkbox"
                  checked={collapseLoops}
                  onChange={(event) => setCollapseLoops(event.target.checked)}
                />{" "}
                collapse implementation/review convergence
              </label>
            </div>
            <ReactFlow
              nodes={[...occurrences.nodes]}
              edges={[...occurrences.edges]}
              fitView
              minZoom={0.08}
              maxZoom={1.7}
              nodesDraggable={false}
              nodesConnectable={false}
            >
              <Background gap={28} size={1} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </section>
        </div>
        <aside className="inspector">
          <section>
            <p className="eyebrow">What · who · why</p>
            <h2>{traceItemTitle(projection.selectedItem)}</h2>
            {traceItemDetail(projection.selectedItem).map(([label, value]) => (
              <dl key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </dl>
            ))}
          </section>
          <section>
            <p className="eyebrow">Composite actor state</p>
            <div className="actor-grid">
              {projection.actors.map((actorProjection) => (
                <button
                  key={actorProjection.actor.invocationId}
                  className={
                    selectedActors.includes(actorProjection.actor.invocationId)
                      ? "actor-card selected"
                      : "actor-card"
                  }
                  onClick={() =>
                    toggleActor(actorProjection.actor.invocationId)
                  }
                >
                  <strong>{actorProjection.actor.role}</strong>
                  <span>{actorProjection.phase}</span>
                  <small>{actorProjection.actor.invocationId}</small>
                  <small>{sessionDetail(actorProjection.actor)}</small>
                  <small>
                    observation: {actorProjection.actor.observationCapability}
                  </small>
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="eyebrow">Pinned streams</p>
            {selectedActorsResolved.length === 0 ? (
              <p className="empty">
                Select actors to pin their adapter-native stream.
              </p>
            ) : (
              selectedActorsResolved.map((actorProjection) => (
                <div
                  className="stream"
                  key={actorProjection.actor.invocationId}
                >
                  <strong>
                    {actorProjection.actor.role} ·{" "}
                    {actorProjection.actor.invocationId}
                  </strong>
                  {actorProjection.stream.length === 0 ? (
                    <p className="empty">
                      No recoverable stream items at this cursor.
                    </p>
                  ) : (
                    actorProjection.stream.map((entry) => (
                      <p
                        className={entry.tag}
                        key={`${entry.cursor}:${entry.summary}`}
                      >
                        <span>{entry.cursor}</span>
                        {entry.summary}
                      </p>
                    ))
                  )}
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </main>
  );
};
