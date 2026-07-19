import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type {
  OccurrencePresentation,
  TaskExecutionProjection,
} from "./projections.ts";
import type { TaskDagRevision, TaskId } from "./trace-contract.ts";

export interface GraphData {
  readonly nodes: ReadonlyArray<Node>;
  readonly edges: ReadonlyArray<Edge>;
}

interface DagrePosition {
  readonly x: number;
  readonly y: number;
}

const readDagrePosition = (value: unknown): DagrePosition | null => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("x" in value) ||
    !("y" in value) ||
    typeof value.x !== "number" ||
    typeof value.y !== "number"
  )
    return null;
  return { x: value.x, y: value.y };
};

const layout = (
  nodes: ReadonlyArray<Node>,
  edges: ReadonlyArray<Edge>,
  direction: "LR" | "TB",
): GraphData => {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: 44,
    ranksep: 72,
    marginx: 24,
    marginy: 24,
  });
  for (const node of nodes) graph.setNode(node.id, { width: 188, height: 74 });
  for (const edge of edges) graph.setEdge(edge.source, edge.target);
  dagre.layout(graph);
  return {
    nodes: nodes.map((node, index) => {
      const position = readDagrePosition(graph.node(node.id)) ?? {
        x: 118 + index * 220,
        y: 61,
      };
      return { ...node, position: { x: position.x - 94, y: position.y - 37 } };
    }),
    edges,
  };
};

const taskExecutionLabel = (execution: TaskExecutionProjection): string => {
  if (execution.tag === "implementing") return "IMPLEMENTING";
  if (execution.tag === "reviewing") return "FRESH REVIEW";
  if (execution.tag === "findings-returned") return "FINDINGS → IMPLEMENTER";
  if (execution.tag === "accepted-awaiting-queue") return "ACCEPTED";
  if (execution.tag === "queued-for-integration")
    return "QUEUED FOR INTEGRATION";
  if (execution.tag === "integrating") return "INTEGRATING";
  if (execution.tag === "reviewing-integration") return "INTEGRATION REVIEW";
  if (execution.tag === "integration-accepted-awaiting-completion")
    return "INTEGRATION ACCEPTED";
  return "COMPLETION ACKNOWLEDGED";
};

export const taskGraph = (
  taskDag: TaskDagRevision,
  taskExecutions: ReadonlyArray<TaskExecutionProjection>,
  focusTaskIds: ReadonlySet<TaskId>,
): GraphData => {
  const executionByTask = new Map(
    taskExecutions.map((execution) => [execution.taskId, execution]),
  );
  const nodes: ReadonlyArray<Node> = taskDag.tasks.map((task) => {
    const execution = executionByTask.get(task.id);
    return {
      id: task.id,
      position: { x: 0, y: 0 },
      data: {
        label: `${task.id.replace("github-issue:", "GH-")} · ${task.title}\n${task.lifecycle} · ${task.assignment.tag === "Assigned" ? `assigned to ${task.assignment.owner}` : "unassigned"}${task.labels.length === 0 ? "" : ` · ${task.labels.join(", ")}`}${execution === undefined ? "" : `\n▶ ${taskExecutionLabel(execution)}`}`,
      },
      className: `task-node lifecycle-${task.lifecycle}${focusTaskIds.has(task.id) ? " focus-task" : ""}${execution === undefined ? "" : ` execution-${execution.tag}`}`,
    };
  });
  const containmentEdges: ReadonlyArray<Edge> = taskDag.tasks.flatMap((task) =>
    task.parentTaskId === null
      ? []
      : [
          {
            id: `contains:${task.parentTaskId}->${task.id}`,
            source: task.parentTaskId,
            target: task.id,
            label: "contains",
            type: "smoothstep",
            className: "containment-edge",
          },
        ],
  );
  const blockerEdges: ReadonlyArray<Edge> = taskDag.tasks.flatMap((task) =>
    task.prerequisiteIds.map((prerequisiteId) => ({
      id: `blocks:${prerequisiteId}->${task.id}`,
      source: prerequisiteId,
      target: task.id,
      label: "blocks",
      type: "smoothstep",
      className: "blocker-edge",
    })),
  );
  const edges = [...containmentEdges, ...blockerEdges];
  return layout(nodes, edges, "LR");
};

export const occurrenceGraph = (
  occurrences: ReadonlyArray<OccurrencePresentation>,
): GraphData => {
  const representative = new Map(
    occurrences.flatMap((occurrence) =>
      occurrence.occurrenceIds.map((id) => [id, occurrence.id] as const),
    ),
  );
  const nodes: ReadonlyArray<Node> = occurrences.map((occurrence) => ({
    id: occurrence.id,
    position: { x: 0, y: 0 },
    data: {
      label: `${occurrence.label}\n${occurrence.taskId.replace("task:", "")} · ${occurrence.actorRole}`,
    },
    className: `occurrence-node role-${occurrence.actorRole}`,
  }));
  const edges: ReadonlyArray<Edge> = occurrences.flatMap((occurrence) =>
    occurrence.predecessors.flatMap((predecessor) => {
      const source = representative.get(predecessor.occurrenceId);
      if (source === undefined || source === occurrence.id) return [];
      return [
        {
          id: `${source}->${occurrence.id}:${predecessor.relation}`,
          source,
          target: occurrence.id,
          label: predecessor.relation,
          type: "smoothstep",
          className: `causal-edge relation-${predecessor.relation}`,
        },
      ];
    }),
  );
  return layout(nodes, edges, "LR");
};
