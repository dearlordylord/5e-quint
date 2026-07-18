# Ralph Execution State-Machine and Tooling Boundary

Decision asset for the Wayfinder investigation “Validate Ralph's execution
state-machine and tooling boundary,” under “Wayfinder: Ralph graph-native
orchestration.”

## Answer

Model Ralph execution as one **composite transition system**, not as one agent
walking a graph. The repository coordinator admits and supervises concurrent
task-workflow instances; each task workflow owns its implementer and fresh
reviewer invocations; accepted results enter separately serialized integration
lifecycles. Typed resources and external authorities constrain which transition
is enabled.

The state machine is semantic. Its graphs are disposable projections:

- the **task DAG** projects one complete tracker revision and its lifecycle,
  claim, and eligibility facts;
- the **observed execution DAG** projects occurred workflow operations and
  outcomes, connected by durable or reconstructible causal predecessors;
- the **current execution-state view** is reconstructed from Ralph journal
  facts plus refreshed tracker, Git, executor, evidence, and resource facts;
  and
- intentions and possible futures are explicitly discriminated projections,
  never observed history.

The primary operator view is one observed run. Scrubbing its cursor replays a
trace prefix into historical projections; it is diagnostic time travel, not an
operational rollback. Ralph continues to reconcile external effects forward.
An optional bounded-possibility view may unfold cyclic workflow policy into a
finite DAG of mutually exclusive hypothetical paths, but it must never imply
that every branch occurred or that one agent owns all branches.

## Canonical trace implications

The ordered journal position remains the durable storage order. A semantic
trace item additionally needs enough typed information to derive concurrency,
causality, and explanation without parsing prose:

- run, task, attempt, operation, stage, target, and actor-invocation identities
  where applicable;
- the typed selected directive, committed intent, or observed outcome;
- causal predecessor operation identities or a principled rule for deriving
  them;
- the authoritative observation revisions and evidence identities used by the
  decision;
- the planner/guard reason in typed domain terms; and
- explicit gaps, unsupported observation, or incomplete evidence rather than
  invented continuity.

Task prerequisites, resource ordering, same-task handback, journal ordering,
and observed authority acknowledgement are distinct edge meanings. Integration
serialization may add execution-causality edges without adding tracker task
dependencies. Presentation should preserve those types rather than merging the
two graphs into one authority.

## Effect V4 decision

Use **Effect V4 core** for v1: schema-backed boundary events, tagged internal
directives, services and layers, scoped concurrent workflows, schedules,
streams, and deterministic concurrency tests. This is the already-selected
Ralph tooling application architecture and does not introduce another
authority.

Do **not** make `effect/unstable/workflow` Ralph's v1 durability or recovery
authority. It provides real deterministic workflow identities, replayable
activities, child workflows, durable waits, queues and clocks, and
interrupt/resume. Its included memory engine is non-durable, while its current
production-durable engine uses unstable cluster sharding and persisted message
storage. Adopting that engine or implementing a second SQLite-backed workflow
engine would coexist with Ralph's required intent/effect/outcome journal.

Generic activity replay does not replace Ralph's reconciliation of ambiguous
Git, tracker, evidence, or agent-session effects; generic interruption and
compensation do not replace state-typed cancellation, quarantine, abandonment,
integration non-cancellability, or cleanup authorization. Reconsider Effect
Workflow only after the operation algebra stabilizes, through a focused spike
that proves it removes material lifecycle code while retaining one journal
authority and the same canonical semantic trace.

## XState decision

Do **not** add XState beside the total Ralph planner as another production
scheduler. Encoding the same guards and transitions twice would create two
semantic authorities, and restoring XState actor snapshots would conflict with
the decision to reconstruct derived workflow state from journal facts plus
fresh authority observations.

XState and Stately Inspector remain credible **presentation experiments**.
Their actor, parallel-state, transition-microstep, and sequence views naturally
fit an orchestrator with dynamically spawned task actors. The Inspector can
consume manually supplied actor, event, and snapshot observations, so a UI may
project Ralph's trace into it without making XState authoritative. Production
XState is admissible only under a future decision to replace—not accompany—the
owned planner.

## Quint decision

Do **not** introduce a Quint model in the first implementation. This confirms
the deterministic-verification decision: the operation algebra and planner are
still moving, so an independently maintained transition model would prove a
second specification rather than Ralph unless a conformance bridge kept them
aligned.

If later implementation exposes a compact stable concurrency protocol that
deterministic Effect schedules and bounded stateful properties cannot
adequately falsify, the strongest candidate is accepted-head integration and
crash recovery—not the whole task graph and not agent output. A useful bounded
instance would contain two or three accepted tasks, one target lease, a small
durable FIFO, abstract review/verification outcomes, bounded coordinator
crashes at intent/effect/outcome boundaries, and delayed or ambiguous external
observations.

Candidate invariants are:

- at most one active integration lifecycle per target;
- only the durable FIFO head may own the target or promote;
- queue order survives coordinator death;
- promotion requires accepted evidence, integration review, verification, and
  a successful compare-and-set;
- tracker completion requires exact promoted-integration proof;
- dependants remain ineligible until refreshed tracker completion;
- ambiguous external mutation is reconciled rather than blindly duplicated;
- non-convergence releases its lease without completing its task; and
- task execution, integration-agent capacity, target leases, and heavy
  verification locks are not interchangeable.

Required reachability witnesses include concurrent task execution with serial
integration, recovery after promotion but before outcome acknowledgement, and
unrelated queue progress after one non-convergent integration.

Quint graduates into the Ralph tooling architecture only when operation tags
and authority facts are stable, the model remains small, a named safety claim depends on
interleavings, existing tests are inadequate for that claim, and CI exercises
an explicit mapping between TypeScript operations/canonical traces and Quint
actions/states. Until then, deterministic Effect scenarios plus bounded
stateful `fast-check` commands give stronger implementation conformance.

## UI continuation

The remaining question is presentation, not execution authority. A dedicated
prototype should consume the canonical trace contract selected by “Define
Ralph's operator and resource-control surface” and compare suitable graph and
statechart renderers. It should test:

- a multi-actor overview with selectable or pinned task, reviewer, and
  integration streams;
- synchronized task-DAG revision, execution-causality, and composite-state
  views at one cursor;
- typed “what happened, who did it, and why” inspection;
- visible graph rewrites and explicit authority-observation gaps;
- zoom, pan, fit, collapse, and large-run legibility; and
- an optional, clearly hypothetical bounded-policy unfolding separate from the
  observed run.

The earlier standalone Mermaid experiment established that synchronized
scrubbing, graph rewrites, bounded unfolding, and SVG zoom/pan are feasible,
but its fake hard-coded trace is disposable and is not retained as a contract
or implementation baseline.
