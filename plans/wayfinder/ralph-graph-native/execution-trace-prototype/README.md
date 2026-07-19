# Ralph execution-trace presentation prototype

Disposable HITL comparison artifact for [Prototype Ralph's multi-actor
execution-trace refinement view](https://github.com/dearlordylord/5e-quint/issues/197).

## What it shows

- **React Flow + Dagre** renders synchronized tracker task-DAG and simulated
  causal-execution projections, with a local composite actor view, typed edge
  meanings, cursor replay, graph rewrite notices, zoom/pan/fit, a minimap,
  implementation/review convergence collapse, actor selection, pinned
  adapter-native streams, and event-derived actor-span lanes that make
  cross-issue concurrency visible.
  A selectable 60-task/120-occurrence fixture exercises minimap, fit, pan, zoom,
  and overview density without changing the projection code.

The discarded Stately Inspector and hypothetical-policy experiments are not
part of this prototype. They did not contribute to the accepted core direction
and their controls implied functionality the demo did not provide.

The fixture is executable decision evidence derived from the provisional trace
shape in `operator-and-resource-control-surface.md`. It is not the accepted
implementation specification or a runtime authority. It contains tracker revisions,
workflow occurrences, typed causal parents, decision reasons, evidence
references, and adapter capabilities. The trace contract and UI support actor
output and explicit observation gaps, but this accepted prototype deliberately
defers representative stream fixtures and stream UX.
Tracker lifecycle and dependency facts occur only in tracker snapshots; the
journal projection does not copy them.

## Tracker task-DAG snapshot basis

The default fixture is a snapshot of the native GitHub sub-issue tree rooted at
[Specification: Language-neutral Cleanroom SDK readiness and
acceptance](https://github.com/dearlordylord/5e-quint/issues/12), captured at
`2026-07-18T21:01:25Z`. It contains 105 issues, 104 containment edges, and 108
native blocker edges. The full view highlights [Purge authored-name Battle
replay keys and publish presentation
joins](https://github.com/dearlordylord/5e-quint/issues/170); a focused view
keeps that task's ancestor, prerequisite, and dependant closure.

The GitHub snapshot is authority input. The execution occurrences layered over
it are explicitly marked as simulation, not observed Ralph history. The
scenario uses three members of that tree:

- GH-170 and GH-46 acquire the two task-execution slots together.
- GH-46 reaches acceptance first, allowing GH-99 to acquire its released slot
  while GH-170 remains in its review/implementation convergence loop.
- accepted results queue independently, then the single integration target is
  serialized GH-46 → GH-170 → GH-99.
- the first simulated completion adds a visibly synthetic follow-up task, so
  cursor replay exercises structural task-DAG rewrite presentation without
  claiming that the added task came from the captured GitHub snapshot.

The span lanes are derived from actor-start occurrences and their causal
successors. They are not a second schedule fixture. Moving the cursor therefore
reconstructs active/completed spans from the same trace prefix used by the
causal graph.

The task DAG is also cursor-projected. Its default scenario-focused scope keeps
the three executed issues plus their ancestors and blockers visible, while node
color and an execution label distinguish implementation, review, findings,
queueing, integration, and acknowledged completion. The full 105-issue snapshot
remains available in the task-tree scope selector.

## Handback and session semantics

Filtering the uncollapsed fixture to GH-170 is:

```text
implementer invocation
→ fresh reviewer invocation
→ findings verdict
→ implementer invocation
→ fresh reviewer invocation
→ accept verdict
→ accepted result queued
```

A verdict is an occurrence emitted by the existing reviewer invocation; it is
not another reviewer run. Collapse groups the entire implementation/review
convergence segment, including the implementer handback.

Every implementation round is a distinct top-level actor invocation. The
policy control chooses how that invocation binds an agent session:

- **Resume bound session** demonstrates the accepted exact-session continuation
  requirement: retain the task attempt and worktree, then resume the exact
  durable implementer session when the adapter proves that capability.
- **Start replacement session** retains the same attempt, worktree, findings,
  and evidence, but binds a new durable implementer session.

The session-binding union belongs to generic actor invocation on a workflow
node. Task attempts and integration lifecycles can both use it; the model does
not encode the choice as an implementer-name special case.

## Run

This is an isolated pnpm project because it is extraction-bound Dalph tooling,
not a package in the D&D main-application workspace. The isolated lockfile
becomes the repository lockfile when the prototype moves to Dalph.

```bash
cd <execution-trace-prototype-directory>
pnpm install --ignore-workspace
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

The graph workbench is local after dependency installation.

## Questions for the owner

1. Does the full GH-12 snapshot remain navigable, and is the GH-170 dependency focus
   the right smaller projection?
2. Should session continuation be selected per actor role, per workflow node,
   or per individual handback?
