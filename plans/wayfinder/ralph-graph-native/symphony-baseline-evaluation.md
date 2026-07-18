# Symphony as Ralph's Control-Plane Baseline

## Research snapshot

This evaluation uses OpenAI Symphony commit
[`4cbe3a9699a73b862466c0b157ceca0c1985d6d7`](https://github.com/openai/symphony/tree/4cbe3a9699a73b862466c0b157ceca0c1985d6d7),
dated 2026-06-09. It compares the language-agnostic Draft v1 specification and
the Elixir reference implementation with Ralph's retained
[bounded-leaf and non-convergence contract](../cleanroom-ralph-redesign/bounded-ralph-leaf-contract.md)
and the current [Ralph loop harness](../../../scripts/ralph-run.md).

## Decision

**Implement the Symphony specification in Effect as the scheduling substrate,
then add Ralph-owned typed extensions. Do not adopt or fork the Elixir reference
implementation, and do not reject Symphony as a base.**

Symphony supplies the correct control-loop skeleton: a single scheduling
authority, tracker-derived eligibility, bounded dispatch, pre-dispatch refresh,
per-issue workspaces, retries, active-run reconciliation, restart by repolling,
and live observability. Its specification intentionally leaves VCS population
and tracker writes outside the core, keeps claims and retry state in memory, and
models one generic agent worker rather than Ralph's implement/review/decide
protocol. Those are extension seams, not reasons to reproduce the scheduler
from scratch.

The reference implementation is the wrong adoption unit. OpenAI calls it
evaluation-only prototype software and recommends a hardened implementation of
the specification. Its tracker behavior is nominally behind an adapter, but the
runtime domain still imports `Linear.Issue`, configuration is Linear-shaped,
and only Linear and an in-memory test adapter are selected. A fork would couple
Ralph to Elixir/OTP and preserve those assumptions while this repository
already uses TypeScript, Effect, Effect Schema, Effect CLI, and an Effect-based
remote claim/Base-SHA boundary.

## Capability fit

| Desired Ralph capability | Symphony fit | Decisive boundary |
| --- | --- | --- |
| Tracker DAG eligibility | Partial | The normalized issue includes blocker references and `Todo` dispatch rejects non-terminal blockers. It does not load or validate a versioned graph snapshot, reconcile parent/child and predecessor completeness, detect graph contradictions, or make the tracker port the authority for an atomic claim. The blocker gate is state-name-specific rather than a tracker-neutral eligibility result. |
| Bounded concurrency | Strong core | Global and per-state limits are normative; the reference also has an optional per-host cap. Ralph still needs named repository resource capacities and a separately serialized integration lane, not only a count of running agents. |
| Per-task isolation | Partial | Symphony enforces one safe directory per issue and preserves it across attempts. Repository checkout is an optional hook: there is no declared Base SHA, ancestry proof, Git worktree/branch lineage, accepted head, or component-level WIP disposition. |
| Reconciliation | Strong core, incomplete domain | Every tick refreshes running work, stops terminal or unrouted work, revalidates immediately before dispatch, and detects stalls. It does not reconcile newly introduced dependency blockers against an active task, durable claims after a competing process acts, accepted-head integration, or repository lock ownership. |
| Retries | Partial | Symphony distinguishes continuation from failure and applies bounded exponential delay, but retries indefinitely. It has no separate implementation-round and full-task-attempt budgets, structured reviewer verdicts, final-attempt dispositions, or quarantine at review non-convergence. |
| Restart recovery | Weak for Ralph | The tracker and preserved workspace allow useful redispatch, but retry timers, running sessions, claims, and blocked entries are lost. Redispatch after restart can therefore reuse an active issue without proving ownership or recovering its exact Base/WIP lineage. |
| Observability and evidence | Strong live view, weak durability | Structured logs, session/token metrics, retry rows, blocked rows, a dashboard, and a JSON snapshot are useful foundations. Ralph additionally requires a durable event/evidence journal containing prompts, results, diffs, reviews, process snapshots, Base ancestry, verification, dispositions, and cleanup outcomes. |
| Cleanup | Partial | Symphony cleans terminal workspaces at startup and on active terminal transitions, with a `before_remove` hook. Ralph must retain quarantined non-convergent work, release only the exact durable claim, preserve accepted branches until integration completes, and distinguish recoverable cleanup from evidence destruction. |

Symphony evidence for this matrix is concentrated in its
[domain model](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md#L146-L273),
[eligibility and scheduling rules](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md#L704-L806),
[workspace contract](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md#L818-L911),
[tracker boundary](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md#L1141-L1223),
and [restart semantics](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md#L1589-L1604).

## Required Ralph extension surface

The extension boundary should preserve Symphony conformance below the Ralph
policy layer. Each item is a port or state machine with one owner; none should
be implemented as a second registry beside tracker or Git state.

### 1. Tracker graph port

Replace the Linear-shaped reader with a tracker-neutral port that returns one
revisioned graph snapshot and performs compare-and-set mutations:

- read the candidate subgraph with task identity, lifecycle, native blockers,
  parents/children, runnable admission, and tracker revision;
- atomically acquire, inspect, renew if required, and release a claim;
- append comments/evidence links and perform permitted lifecycle transitions;
- re-read affected nodes after every mutation and surface revision conflicts as
  typed reconciliation outcomes.

The normalized port result must make mixed tracker interpretations
unrepresentable. A blocker reference with unknown lifecycle is not equivalent
to an unblocked predecessor. Parent/child grouping is not a dependency edge.
The graph snapshot remains the status authority; local state records what the
orchestrator did against a particular revision, not a parallel task ledger.

### 2. Eligibility and claim transaction

Generalize Symphony's `should_dispatch` into a pure Ralph eligibility decision
over the graph snapshot, repository admission facts, and current capacity. It
must check the bounded-leaf preflight, full native predecessor set, absence of a
runnable child owning the same outcome, and repository launchability.

Dispatch then performs one transaction-shaped operation: refresh eligibility,
acquire the durable claim, resolve the base ref to a declared Base SHA, and
persist the execution identity before any agent starts. Extend the existing
remote claim contract rather than storing a second claim in scheduler memory.
The execution identity owns the claim token, run identity, Base SHA, output
branch, and task identity together so contradictory ownership cannot be
represented.

### 3. Git task-workspace port

Specialize Symphony's workspace manager with a Git-aware task workspace:

- create the task branch/worktree from the declared Base SHA;
- log base ref, Base SHA, `HEAD`, and the required ancestor check;
- preserve the same worktree and WIP lineage across implementation handbacks;
- expose exact head/status/diff evidence to review and decision phases;
- clean only after integration or an explicit safe release, while quarantine
  retains non-convergent work and evidence.

Hooks remain useful for dependency linking and repository setup, but Base and
lineage correctness cannot live in shell prompt convention.

### 4. Ralph execution protocol

Replace Symphony's single generic worker outcome with an explicit protocol:

1. an implementer session, stable across same-attempt handbacks;
2. a fresh independent reviewer producing `accept`, `accept-with-fixes`, or
   `reject` plus acceptance-item and scope attribution;
3. a bounded handback transition when findings remain within the same leaf;
4. a fresh decider that either emits a typed ready-for-integration result with
   its accepted head and evidence, or records the typed task disposition and
   plan impact.

Implementation-round retries, full-task attempts, transport/process retries,
and clean continuations are different domain events with different budgets.
They must not share Symphony's one monotonically increasing retry counter.
Reaching the configured review-round limit transitions to non-convergent
quarantine; it never becomes another automatic retry.

The example Symphony `WORKFLOW.md` demonstrates that implementation, human
review, rework, and merge can be expressed in a prompt and tracker states, but
that is workflow policy executed by the same agent. It is not Ralph's
independent reviewer/decider protocol or an executable non-convergence bound.

### 5. Concurrent integration coordinator

Add a coordinator after reviewer acceptance and before tracker completion. It
owns accepted-head capture, base freshness, integration ordering, merge
conflict ownership, focused post-merge verification, and publication of the
new accepted base to downstream eligibility. Only this coordinator may release
dependents after a task is actually integrated. A successful agent turn or
review is not integration.

This lane needs a capacity of one per integration target unless a later proof
establishes a safe wider protocol. Its detailed merge policy remains a
follow-up decision for the map; Symphony provides no built-in VCS or
integration semantics to inherit.

### 6. Repository resource scheduler

Lift concurrency from one scalar agent limit to named capacities. At minimum,
model agent slots, per-host slots, integration-target slots, and the shared
heavy-verification slot. A task may wait for a resource without becoming
tracker-blocked or consuming a retry attempt.

The heavy-verification capacity must delegate to the repository's existing
Git-common-directory lock and public wrapper scripts. The orchestrator observes
lease acquisition and emergency exits; it must not duplicate the lock in an
in-memory semaphore, bypass the wrappers, or allow two scheduler processes to
disagree about capacity.

### 7. Durable run journal and recovery

Persist orchestration events and evidence pointers before acknowledging each
state transition. On restart, reconcile the journal with tracker claim,
workspace/branch, accepted target, live processes, and resource leases. Recovery
must produce an explicit state such as resumable handback, ready for review,
ready for decision, awaiting integration, quarantined, or safe to redispatch;
it must not infer all active tracker issues are fresh runs.

The journal owns execution history, not task status. Live dashboards and JSON
snapshots should be projections of the same event/state owner, preserving
Symphony's useful observability without creating a second control plane.

### 8. Safe terminal and quarantine cleanup

Replace unconditional terminal-workspace deletion with a disposition-aware
cleanup protocol. Completion releases the exact claim only after accepted-head
integration and evidence finalization. Abandonment requires an explicit
compare-and-set release. Non-convergence retains claim, Base/WIP lineage, final
review, verification, and component dispositions until redesign records what
may be reused. Cleanup failures are observable typed outcomes and never silently
upgrade a task to completed.

## Adoption boundary

Implement and test Symphony's behavioral core in Effect for workflow loading,
typed configuration, polling, scheduling, agent app-server execution,
workspace safety, reconciliation, backoff, and live observability. Replace the
Draft v1 Linear integration profile with a tracker-port conformance profile and
the current GitHub adapter; do not ship an unused Linear adapter merely to
claim literal Draft v1 conformance. Add a Ralph extension conformance profile
for the eight surfaces above. The implementation may consult the Elixir code
as executable evidence—especially its immediate
[pre-dispatch refresh](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/elixir/lib/symphony_elixir/orchestrator.ex#L909-L1009)
and [single-authority dispatch state](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/elixir/lib/symphony_elixir/orchestrator.ex#L942-L980)—without
porting its Linear domain names or in-memory ownership model.

This choice rejects three alternatives:

- **Adopt the Elixir service:** wrong runtime boundary and explicitly
  evaluation-only.
- **Fork the Elixir service:** inherits Linear and in-memory claim assumptions,
  then requires cross-language integration with the existing Effect claim and
  repository tooling.
- **Reject Symphony:** discards a suitable, tested scheduler contract and would
  force Ralph to rediscover polling, bounded dispatch, reconciliation,
  workspace safety, backoff, app-server lifecycle, and observability.

## Follow-up consequences for the map

This research makes the build/adopt choice answerable: the tooling architecture
ticket can select an Effect implementation of Symphony plus Ralph extensions. It does
not settle the already-visible follow-up decisions for the precise tracker-port
schema, durable journal/store, concurrent integration algorithm, operator
pause/drain/cancel surface, release readiness, or deterministic
scheduler/failure-injection verification. Those remain beyond this research
ticket and should be specified after the tooling architecture boundary is
accepted.

No D&D rule or ubiquitous language is changed by this decision. RAW and
`UBIQUITOUS_LANGUAGE.md` are therefore not applicable verification authorities
for this orchestration research; tooling architecture, execution-contract,
tracker, and repository resource owners are the relevant authorities.

## Verification

- Primary-source pass: checked every capability claim against the pinned
  Symphony specification and reference implementation; third-party summaries
  were not used as evidence.
- Repository-authority pass: checked the conclusion against `CONTEXT-MAP.md`,
  the Ralph harness contract, the retained bounded-leaf decision, the current
  Effect claim boundary, and the shared resource-lock scripts.
- RAW and ubiquitous-language pass: confirmed this changes no D&D rule model,
  so no SRD passage or D&D glossary term applies.
- Architecture/domain and code-review loop: round one removed an ambiguous
  overlap between decider and integration ownership and clarified the deliberate
  Linear-profile deviation; round two found no remaining reasonable issue in
  ownership, redundant state, invalid-state representation, connascence,
  traceability, or scope.
- Focused document checks: `git diff --check`, local link-target existence, and
  pinned source/line-anchor inspection pass. No product, QNT, or runtime code is
  changed, so typecheck, tests, proofs, and MBT are not applicable.

## Primary sources

- [OpenAI announcement: An open-source spec for Codex orchestration—Symphony](https://openai.com/index/open-source-codex-orchestration-symphony/)
- [Symphony Draft v1 specification at the evaluated commit](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md)
- [Elixir reference implementation warning and operating summary](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/elixir/README.md#L1-L32)
- [Reference tracker adapter boundary](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/elixir/lib/symphony_elixir/tracker.ex#L1-L45)
- [Specification implementation checklist and explicit extension TODOs](https://github.com/openai/symphony/blob/4cbe3a9699a73b862466c0b157ceca0c1985d6d7/SPEC.md#L2076-L2116)
