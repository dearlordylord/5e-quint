/**
 * Lightweight XState machine visualizer adapted from statelyai/sketch (MIT).
 * Uses @statelyai/graph for graph data structure.
 * Renders a sub-machine (e.g. turnPhase region) as a card-based statechart.
 */

import {
  addEdge,
  addNode,
  createGraph,
  getChildren,
  getOutEdges,
  getRoots,
  type Graph,
  type GraphEdge,
  type GraphNode
} from "@statelyai/graph"
import type { AnyStateMachine } from "xstate"

// --- Graph types ---

interface StateNodeData {
  readonly key: string
  readonly type: "compound" | "parallel" | "atomic" | "final" | null
  readonly entry: ReadonlyArray<string>
  readonly exit: ReadonlyArray<string>
  readonly initialId: string | null
}

interface TransitionData {
  readonly eventType: string
  readonly actions: ReadonlyArray<string>
  readonly guard: string | null
  readonly isTargetless: boolean
}

type MachineGraph = Graph<StateNodeData, TransitionData>

// --- Machine to graph conversion (adapted from sketch lib/machine.ts) ---
// XState internal state node types are not exported, so `any` is required here.
/* eslint-disable @typescript-eslint/no-explicit-any */

function machineToGraph(machine: AnyStateMachine): MachineGraph {
  const graph = createGraph<StateNodeData, TransitionData>()

  function addNodes(stateNode: any) {
    const stateType = stateNode.type as string
    const initialChildId = stateNode.initial?.target?.[0]?.id ?? null
    addNode(graph, {
      id: stateNode.id,
      parentId: stateNode.parent?.id ?? null,
      initialNodeId: initialChildId ?? undefined,
      label: stateNode.key,
      data: {
        key: stateNode.key,
        type:
          stateType === "compound"
            ? "compound"
            : stateType === "parallel"
              ? "parallel"
              : stateType === "final"
                ? "final"
                : stateNode.states && Object.keys(stateNode.states).length > 0
                  ? "compound"
                  : "atomic",
        entry:
          stateNode.entry
            ?.map((a: any) => (typeof a === "string" ? a : typeof a === "object" && a?.type ? a.type : null))
            .filter((x: any) => x !== null && !x.startsWith("xstate.")) ?? [],
        exit:
          stateNode.exit
            ?.map((a: any) => (typeof a === "string" ? a : typeof a === "object" && a?.type ? a.type : null))
            .filter((x: any) => x !== null && !x.startsWith("xstate.")) ?? [],
        initialId: initialChildId
      }
    })

    for (const child of Object.values(stateNode.states ?? {})) {
      addNodes(child)
    }
  }

  function addEdges(stateNode: any) {
    for (const [eventType, transitions] of stateNode.transitions) {
      if (!Array.isArray(transitions) || transitions.length === 0) continue
      transitions.forEach((transition: any, i: number) => {
        addEdge(graph, {
          id: `${stateNode.id}:${eventType}:${i}`,
          sourceId: stateNode.id,
          targetId: transition.target?.[0]?.id ?? stateNode.id,
          label: eventType,
          data: {
            eventType,
            guard: transition.guard?.type ?? (typeof transition.guard === "string" ? transition.guard : null),
            actions:
              transition.actions
                ?.map((a: any) => (typeof a === "string" ? a : typeof a === "object" && a?.type ? a.type : null))
                .filter((x: any) => x !== null && !x.startsWith("xstate.")) ?? [],
            isTargetless: !transition.target
          }
        })
      })
    }

    for (const child of Object.values(stateNode.states ?? {})) {
      addEdges(child)
    }
  }

  addNodes(machine.root)
  addEdges(machine.root)
  return graph
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// --- Extract a sub-graph rooted at a specific state ---

function getSubGraph(machine: AnyStateMachine, stateId: string): MachineGraph | null {
  const full = machineToGraph(machine)
  const targetNode = full.nodes.find((n) => n.id.endsWith(`.${stateId}`) || n.data.key === stateId)
  if (!targetNode) return null

  const subGraph = createGraph<StateNodeData, TransitionData>()
  const relevantIds = new Set<string>()

  // Collect target node and all descendants
  function collect(id: string) {
    relevantIds.add(id)
    for (const child of full.nodes.filter((n) => n.parentId === id)) {
      collect(child.id)
    }
  }
  collect(targetNode.id)

  // Add target node as root first, then children in order
  // (graph library requires parent to exist before child)
  const sorted = full.nodes.filter((n) => relevantIds.has(n.id))
  sorted.sort((a, b) => {
    if (a.id === targetNode.id) return -1
    if (b.id === targetNode.id) return 1
    return 0
  })

  for (const node of sorted) {
    addNode(subGraph, {
      id: node.id,
      parentId: node.id === targetNode.id ? null : node.parentId,
      initialNodeId: node.initialNodeId ?? undefined,
      label: node.label,
      data: node.data
    })
  }

  for (const edge of full.edges) {
    if (relevantIds.has(edge.sourceId)) {
      addEdge(subGraph, {
        id: edge.id,
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        label: edge.label,
        data: edge.data
      })
    }
  }

  return subGraph
}

// --- React components ---

function TransitionRow({ edge, isActive }: { edge: GraphEdge<TransitionData>; isActive: boolean }) {
  const targetKey = edge.targetId.split(".").pop() ?? edge.targetId
  const isSelfTransition = edge.sourceId === edge.targetId

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] border-t border-gray-800 ${isActive ? "bg-amber-500/10" : ""}`}
    >
      <span className={`font-mono font-semibold ${isActive ? "text-amber-300" : "text-gray-400"}`}>
        {edge.data.eventType}
      </span>
      {!isSelfTransition && !edge.data.isTargetless && (
        <>
          <span className="text-gray-600">&rarr;</span>
          <span className={`font-mono ${isActive ? "text-amber-400" : "text-sky-400"}`}>{targetKey}</span>
        </>
      )}
      {edge.data.guard && <span className="text-violet-400 font-mono text-[10px]">[{edge.data.guard}]</span>}
      {edge.data.actions.length > 0 && (
        <span className="text-gray-600 font-mono text-[10px]">/ {edge.data.actions.join(", ")}</span>
      )}
    </div>
  )
}

function StateCard({
  activeEvent,
  activeStateKey,
  graph,
  isInitial,
  node
}: {
  node: GraphNode<StateNodeData>
  graph: MachineGraph
  isInitial: boolean
  activeStateKey: string
  activeEvent: string
}) {
  const isActive = node.data.key === activeStateKey
  const children = getChildren(graph, node.id)
  const outEdges = getOutEdges(graph, node.id)

  return (
    <div className="flex min-w-[130px] flex-col">
      <div
        className={`rounded-md border-2 text-[12px] overflow-hidden ${
          isActive
            ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]"
            : "border-gray-700 bg-gray-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          {isInitial && <span className="text-gray-500 text-[10px]">&raquo;</span>}
          <span className={`font-semibold ${isActive ? "text-amber-300" : "text-gray-300"}`}>{node.data.key}</span>
        </div>

        {/* Entry/exit actions */}
        {(node.data.entry.length > 0 || node.data.exit.length > 0) && (
          <div className="flex flex-wrap border-t border-gray-800">
            {node.data.entry.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5">
                <span className="text-[9px] font-semibold uppercase text-gray-600">entry</span>
                {node.data.entry.map((a, i) => (
                  <span key={i} className="rounded bg-gray-800 px-1 font-mono text-[10px] text-gray-400">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Transitions */}
        {outEdges.length > 0 &&
          outEdges.map((edge) => (
            <TransitionRow key={edge.id} edge={edge} isActive={isActive && edge.data.eventType === activeEvent} />
          ))}

        {/* Children */}
        {children.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-1.5 border-t border-gray-800">
            {children.map((child) => (
              <StateCard
                key={child.id}
                node={child}
                graph={graph}
                isInitial={node.data.initialId === child.id}
                activeStateKey={activeStateKey}
                activeEvent={activeEvent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Public component ---

export function SubMachineViz({
  activeEvent,
  activeStateKey,
  machine,
  stateId
}: {
  machine: AnyStateMachine
  stateId: string
  activeStateKey: string
  activeEvent: string
}) {
  const graph = getSubGraph(machine, stateId)
  if (!graph) return null

  const roots = getRoots(graph)
  if (roots.length === 0) return null

  const root = roots[0]
  const children = getChildren(graph, root.id)

  return (
    <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded bg-sky-900/60 border border-sky-600/40 px-2 py-0.5 text-[10px] font-bold text-sky-300">
          XState
        </span>
        <code className="text-[10px] text-sky-400">{stateId}</code>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        {children.map((child) => (
          <StateCard
            key={child.id}
            node={child}
            graph={graph}
            isInitial={root.data.initialId === child.id}
            activeStateKey={activeStateKey}
            activeEvent={activeEvent}
          />
        ))}
      </div>
    </div>
  )
}
