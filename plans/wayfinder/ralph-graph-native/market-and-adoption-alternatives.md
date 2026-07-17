# Ralph graph-native orchestration: market and adoption alternatives

Research date: 2026-07-17  
Wayfinder map: [Ralph graph-native orchestration](https://github.com/dearlordylord/5e-quint/issues/175)  
Research ticket: [Evaluate Gas Town, Beads, and Agent Orchestrator as Ralph adoption alternatives](https://github.com/dearlordylord/5e-quint/issues/180)

## Conclusion

Parallel coding agents in isolated worktrees are no longer a niche. Dependency-aware task boards, bounded concurrency, review feedback, merge queues, retries, and cleanup also exist in several combinations. What remains uncommon is their composition into Ralph's complete protocol:

1. an external issue tracker is the canonical DAG and task ledger;
2. the orchestrator mechanically derives and atomically claims the runnable frontier;
3. each claimed task has a declared Base SHA and an isolated worktree;
4. implementation and independent review converge through bounded handbacks;
5. technical retries and semantic review handbacks are distinct budgets;
6. accepted work is integrated serially onto a moving accepted head;
7. exhausted or structurally invalid work is quarantined with evidence, without releasing its dependants;
8. worktrees, claims, branches, and restart state have explicit recovery and cleanup rules.

No surveyed tool ships that whole contract. Wholesale adoption would replace or duplicate the tracker, weaken Ralph's acceptance semantics, or require enough new control-plane code that the adopted product would be a substrate rather than the orchestrator.

The evidence therefore supports a **compose or build** hypothesis, not a whole-tool adoption. It also shifts the implementation hypothesis toward a typed control plane that imports Ralph's proven contracts rather than adding parallel lifecycle state to the current shell harness. That is evidence for the architecture decision ticket, not the architecture decision itself.

## Comparison rubric

The test is behavioral, not feature-count based. A candidate must distinguish these concerns rather than merely mentioning them:

| Concern | Required semantics |
| --- | --- |
| Graph authority | Read dependencies from a tracker-neutral port; reject cycles or inconsistent snapshots; never require a second canonical ledger. |
| Frontier and claims | Derive eligible open nodes after every terminal transition; claim atomically; enforce global and resource-specific concurrency. |
| Task isolation | Create one task worktree from its declared Base SHA; preserve that ancestry invariant through handbacks. |
| Acceptance | Use an independent reviewer with an executable verdict contract; feed actionable findings back to the same task lineage until acceptance. |
| Retry scopes | Separate transient execution retries from semantic implement/review rounds; apply bounded backoff and observable budgets. |
| Non-convergence | Stop before integration, quarantine the leaf, preserve evidence and correction ledger, and keep dependants blocked. |
| Integration | Reconcile accepted task output against the current accepted head, serialize the mutation, verify it, then advance graph state. |
| Recovery and cleanup | Reconstruct authoritative state after restart; clean only terminal resources; preserve conflicted or quarantined evidence. |
| Portability | Avoid coupling the domain protocol to GitHub, Linear, a proprietary board, tmux, pull requests, or one agent runtime. |

## Market topology

The market contains useful pieces at four different levels. Treating them as interchangeable obscures the adoption cost.

- **Execution substrates** such as Sandcastle provide agents, sandboxes, sessions, and worktree lifecycle but intentionally do not own workflow semantics.
- **Session and pull-request supervisors** such as Agent Orchestrator and Cline Kanban run parallel worktrees and route CI or review feedback, but rely on operator or PR lifecycle decisions.
- **Graph-aware task systems** such as Beads/Gas Town and Agent Kanban schedule unblocked work, but make their own ledger or board authoritative.
- **Autonomous pipelines** such as AIF Handoff provide plan/implement/review/rework and quarantine behavior, but orchestrate a task's internal pipeline rather than traverse an external issue DAG through Ralph-style integration.

General DAG workflow runtimes can supply durable execution, but adopting one would still require implementing every coding-specific protocol above. They are an implementation option, not an existing Ralph replacement.

## Candidate findings

### Symphony

[OpenAI Symphony's specification](https://github.com/openai/symphony/blob/main/SPEC.md) is the strongest control-plane reference. It specifies dependency eligibility, bounded global and per-state concurrency, deterministic workspaces, retry backoff, stall detection, reconciliation, and cleanup. Its current normative tracker behavior is Linear-specific, its authoritative scheduler state is in memory, and tracker writes remain agent-owned. It does not specify Ralph's independent reviewer, accepted-head integration, or quarantine protocol.

Verdict: a control-plane baseline and vocabulary source, not a turnkey adoption. The dedicated Symphony research ticket owns the deeper evaluation.

### Sandcastle

[Sandcastle](https://github.com/mattpocock/sandcastle) is deliberately workflow-agnostic. It is a credible source of task-execution primitives and cleanup behavior. Its parallel planner example has the model infer dependencies, starts ready work with `Promise.allSettled`, and delegates review and merge to agents; it does not provide a bounded graph scheduler, a converging independent-review contract, or serialized accepted-head integration.

Verdict: plausible execution substrate, not control plane. The dedicated Sandcastle research ticket owns the deeper evaluation.

### Gas Town and Beads

[Beads](https://github.com/gastownhall/beads) supplies a distributed dependency graph, ready-work queries, claims, closure, and blocker release. [Gas Town](https://github.com/gastownhall/gastown) layers bounded worker capacity, worktree hooks, role-based supervision, failure tracking, and a merge queue over that ledger.

This is the broadest shipped overlap, but the overlap comes with a different system boundary: Beads/Dolt becomes the task authority, while Gas Town brings its own Mayor/Witness/Refinery roles, convoy abstractions, and operational assumptions. Keeping an external tracker canonical would require a bidirectional synchronization protocol and would create exactly the duplicate task state this project forbids. Replacing the tracker is possible in principle but is a product migration, not adoption of a tracker-neutral traverser. Its review and merge semantics also do not establish Ralph's bounded independent-review convergence and quarantine contract.

Verdict: reject wholesale adoption; reuse scheduler, claim, and merge-queue ideas.

### Agent Orchestrator

[Agent Orchestrator](https://github.com/AgentWrapper/agent-orchestrator) has strong worktree, runtime, source-control, CI, review-reaction, conflict, and cleanup abstractions. Its own [status document](https://github.com/AgentWrapper/agent-orchestrator/blob/main/docs/STATUS.md) says the tracker adapter exists as a lane but lacks the daemon observer and lifecycle-to-issue synchronization needed for runtime orchestration. Its primary lifecycle is one session and pull request per task, with configurable auto-merge, rather than a dependency frontier and accepted-head protocol.

Verdict: reject as the graph control plane; consider its plugin seams and reaction model as prior art.

### Agent Kanban

[Agent Kanban](https://github.com/saltbo/agent-kanban) is a meaningful counterexample to the claim that dependency-aware agent dispatch is absent. It ships task dependencies, cycle prevention, computed blocking, atomic claims, bounded machine concurrency, worktrees, resumable review rejection, and pull-request completion.

It nevertheless owns a Cloudflare/D1-backed board as the canonical task system. Its lifecycle is worker submission followed by leader or human PR review and merge. It does not supply Ralph's independent multi-pass review gate, separate retry budgets, quarantine evidence, or serialized integration onto an orchestrator-owned accepted head.

Verdict: a credible graph/claim implementation reference; adoption would require replacing the tracker and acceptance protocol.

### AIF Handoff

[AIF Handoff](https://github.com/lee-to/aif-handoff) is the closest surveyed implementation of Ralph's task-local failure semantics. It ships plan/implement/review stages, worktree-backed implementation, parallel internal dependency layers, structured review findings, automatic review-to-rework loops, heartbeat recovery, retry backoff, and quarantine after stale-stage retry exhaustion. Review-iteration exhaustion is surfaced as an explicit manual-review handoff rather than silent success.

Its unit of orchestration is a record in its own SQLite Kanban application. Internal dependency layers describe implementation subtasks; they are not an external tracker DAG whose completed nodes release downstream tracker issues. Its exhausted semantic-review state is recorded as `done` plus manual review required, which is not Ralph's rule that a non-accepted leaf must stop before integration and remain dependency-blocking. It also does not own Ralph's accepted-head integration protocol.

Verdict: strongest source for retry, watchdog, and structured-review designs; not adoptable without replacing its task model and terminal semantics.

### Cline Kanban

[Cline Kanban](https://github.com/cline/cline/blob/main/docs/kanban/core-workflow.mdx) is a research-preview operator surface with parallel worktrees and dependency chains that can start downstream tasks automatically. Review comments are operator-authored and commit/open-PR actions are explicit UI decisions.

Verdict: evidence that worktree and dependency UX is becoming standard; not an unattended Ralph replacement.

### Overstory

[Overstory](https://github.com/jayminwest/overstory) implemented isolated worktrees, typed agent mail, reviewer and merger roles, a FIFO merge queue, conflict recovery, watchdogs, checkpoints, and cleanup. The repository is now archived and explicitly redirects new development elsewhere. Its coordinator decomposes and dispatches work through its own task ecosystem rather than treating an external issue DAG as the mechanical authority.

Verdict: valuable operational prior art, but not an adoption candidate.

## Is this a niche?

The answer depends on the boundary:

- **No:** parallel agents, worktree isolation, bounded capacity, dependency-aware claiming, review feedback, retries, dashboards, and merge assistance are active product categories.
- **Partly:** graph scheduling and autonomous review exist, but usually in different products and under product-owned task state.
- **Yes, at the complete protocol boundary:** external tracker DAG authority combined with independent converging review, distinct bounded retry scopes, serialized accepted-head integration, and dependency-preserving quarantine remains a niche composition.

This distinction explains why many tools look like an 80% match in a feature list yet would require replacement of their scheduler, task model, or acceptance lifecycle to preserve Ralph's semantics.

## Extend the current harness or create a clean control plane?

### Extend the current harness

Advantages:

- preserves already-executable task context, Base SHA checks, prompts, review handbacks, decider behavior, resource locks, evidence layout, and cleanup;
- permits a smaller first experiment around concurrent frontier dispatch;
- minimizes migration distance for existing `.ralph` configuration and runbooks.

Risks:

- `scripts/ralph-run.sh` is already about 3,000 lines and owns scheduling, process lifecycle, tracker adaptation, worktrees, review parsing, integration, evidence, and cleanup in one mutable shell process;
- its single launcher lock and single current integration checkout are structural assumptions, not merely a missing `maxParallelism` option;
- parallel tasks introduce durable state, cancellation, per-task ownership, restart reconciliation, and a serialized integration queue across many shell traps and arrays;
- keeping compatibility branches beside a second scheduler would make lifecycle facts change together across distant code.

### Create a clean control plane with a compatibility boundary

Advantages:

- models task, attempt, review, quarantine, and integration states as explicit discriminated transitions;
- makes bounded parallel dispatch and serialized integration separate resources rather than incidental shell order;
- gives tracker, executor, reviewer, integrator, and evidence storage typed ports;
- can use Effect for scoped worktree/process acquisition, typed failures, retry schedules, bounded concurrency, interruption, and structured observability;
- can initially invoke proven Ralph task-stage behavior instead of rewriting every prompt and rule at once.

Risks:

- a rewrite can silently lose obscure Ralph semantics unless the execution-contract inventory becomes executable conformance tests;
- migration needs one authoritative owner for claims, tracker mutations, and integration; two live schedulers cannot safely share a run;
- optional Sandcastle adoption must prove that its worktree and process lifecycle can carry Base SHA, evidence preservation, cancellation, and quarantine requirements without an adapter-owned shadow state.

### Evidence-weighted direction for the architecture ticket

Do not add parallel lifecycle directly to the monolithic shell runner, and do not adopt a surveyed product wholesale. Test a clean, typed control plane while treating current Ralph as the behavioral oracle and compatibility source.

The safest transition shape is incremental:

1. freeze the Ralph execution contract as fixtures and state-transition tests;
2. put tracker snapshots, claims, frontier derivation, task state, and integration serialization under one new control-plane owner;
3. initially delegate one claimed task's implementation/review/decider pipeline to a compatibility executor;
4. replace that executor only after parity is demonstrated, optionally using Sandcastle primitives;
5. retire the shell scheduler only when restart, quarantine, cleanup, and integration conflict scenarios pass end-to-end.

Before selecting this direction, prototype the three seams most likely to falsify it:

- two independent ready tasks execute concurrently while one accepted-head integrator advances them safely;
- review-cap exhaustion quarantines one leaf, preserves its evidence, and leaves only its transitive dependants blocked;
- restart reconstructs claims, worktrees, running attempts, retry timers, and the integration queue without a second canonical ledger.

## Decision input

- Whole-tool adoption: **not supported by the evidence**.
- Market hypothesis: **emerging category with composable substrates; complete Ralph protocol remains uncommon**.
- Strongest reusable control-plane reference: **Symphony specification**.
- Strongest possible execution substrate: **Sandcastle**, pending its dedicated evaluation.
- Strongest graph/claim prior art: **Beads/Gas Town and Agent Kanban**.
- Strongest retry/review/quarantine prior art: **AIF Handoff**.
- Implementation hypothesis to test: **clean Effect-based control plane with compatibility reuse of Ralph semantics**, not a predetermined final decision.

