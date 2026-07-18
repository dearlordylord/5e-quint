# Ralph graph-native control-plane prototype

Disposable prototype evidence for [Prototype Ralph's graph-native control-plane seams](https://github.com/dearlordylord/5e-quint/issues/182), under [Wayfinder: Ralph graph-native orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

This prototype tests new-orchestrator seams. It neither models compatibility
with the historical shell harness nor supports importing or resuming that
harness's runs.

## Provisional result

The prototype currently demonstrates these live-process and state-reconstruction seams:

1. an opaque Ralph-owned `TaskDagSnapshot`, projected from one tracker revision and backed by Effect V4 persistent `HashMap` and `HashSet` values;
2. an append-only operational event journal that stores transition facts and evidence pointers, never task lifecycle or dependencies;
3. tracker refresh plus Git and executor discovery on restart, with typed reconciliation contradictions;
4. Effect fibers with a bounded execution frontier and one coordinator-owned integration semaphore while the process remains alive;
5. capability ports that separate side-effect-free attempt planning from idempotent create-or-resume execution.

The restart fixture now binds an attempt to a durable agent session and covers coordinator death between executor-side session creation and control-plane acknowledgement. This qualifies the port and recovery-state shape for the selected failure domain; it does not qualify a real Codex adapter or select the disposable NDJSON journal for production.

## Durability finding: there is no global checkpoint

"Checkpoint" was too coarse a term for this system. Ralph has no single state image to save, and copying the repository, transcript, graph, and scheduler every 60 seconds would duplicate authority while adding avoidable I/O. Recovery instead has to compose the latest naturally durable fact from each authority.

The relevant target is event-relative, not time-relative: after process death, preserve every completed workspace mutation, recorded agent item, acknowledged tracker/Git operation, and control-plane transition. Only the currently incomplete fragment may need to be retried or reconciled. This meets the owner's requirement better than a periodic interval: ten minutes containing many completed tool calls should not collapse to the start of the invocation merely because no timer fired.

That target has honest limits. If the agent spends ten minutes inside one model inference that has emitted no canonical item, the provider exposes no exact continuation point. If it spends ten minutes inside one child process, files and remote effects already written may remain, but the process itself is not resumable unless the execution substrate provides a durable process handle and reattach protocol. Ralph must describe those as interrupted fragments, not pretend that an agent-session ID snapshots arbitrary process memory.

### Natural recovery inventory

| Moving part                             | Naturally durable boundary                                                                                 | What process-death recovery can use                                                            | Remaining gap or caveat                                                                                                                                            | Added hot-path work proposed here                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Tracker graph and lifecycle             | Acknowledged tracker mutation and later snapshot revision                                                  | Refresh the tracker; do not replay graph state from Ralph                                      | Remote acknowledgement still needs idempotency/reconciliation after an ambiguous timeout                                                                           | None beyond refreshes already required for correctness                               |
| Worktree files and Git index            | Each completed filesystem write/rename/index update                                                        | Reopen the same preserved worktree and inspect status/diff                                     | Filesystem cache is normally sufficient for process death, not necessarily host/power loss; cleanup must not delete ambiguous work                                 | None; these writes already happen                                                    |
| Git objects and refs                    | Successful Git object/ref operation                                                                        | Discover exact refs, commits, and ancestry                                                     | Uncommitted edits live in the worktree, not Git; an ambiguous remote push needs ref reconciliation                                                                 | None beyond existing Git operations                                                  |
| Codex agent session                     | Canonical rollout items appended to the session JSONL; exact session ID is resumable                       | Resume the exact session in the same worktree from its last recorded item                      | The current Codex writer has a small asynchronous queue and flushes each JSONL line but does not `fsync` each line; an incomplete inference is not a recorded item | None in Ralph; Codex already records the stream                                      |
| Agent-adapter invocation evidence       | Adapter-declared durable event or output boundary                                                          | Recover the session identity and inspect emitted evidence when the adapter supports it          | It is evidence, not a second transcript authority; gaps and tail truncation must be explicit                                                                        | Defined and qualified by each new-orchestrator adapter                               |
| Active tool/child process               | Tool-specific: completed file writes, remote acknowledgements, or a substrate-owned durable process handle | Reattach only when the substrate supports it; otherwise inspect effects and retry idempotently | PID and in-memory command state are not durable; a half-completed non-idempotent tool requires explicit reconciliation                                             | Capability-dependent; no blanket per-tool snapshot                                   |
| Control-plane attempt/integration state | A small intent or outcome record acknowledged before crossing an ambiguity boundary                        | Replay attempt identity, retry due time, queued integration, and evidence pointers             | The adapter must define process-loss versus power-loss durability and exclusive-writer behavior                                                                    | One small transition write at orchestration boundaries, not at every agent tool call |
| Effect fiber and semaphore              | None                                                                                                       | Rebuild fibers and local gates from reconciled durable facts                                   | They are deliberately live-process mechanisms only                                                                                                                 | None                                                                                 |
| Integration exclusivity                 | Process lock release plus durable queued intent and Git outcome                                            | A new coordinator acquires ownership and reconciles Git before continuing                      | Multi-host execution needs a fenced lease; a semaphore alone is insufficient                                                                                       | Lease acquisition/renewal only if multi-host coordination is required                |

The Codex adapter evidence is stronger than the earlier proposal assumed.
`codex exec` is persistent unless `--ephemeral` is selected, and `codex exec
resume <session-id>` resumes an exact recorded session. In Codex CLI 0.144.5,
the open-source rollout recorder queues canonical items to one writer, appends
JSONL, and flushes each line. This supports a new adapter contract for
process-restart recovery from the last recorded item; it does **not** establish
synchronous-disk or whole-host disaster recovery.

The historical harness demonstrated why unconditional `EXIT`, `INT`, and
`TERM` cleanup is unsafe: it could remove an active worktree and task branch.
That is negative evidence for the independently accepted cleanup requirement,
not behavior or state for the new orchestrator to preserve. Cleanup in the new
system is allowed only after a durable terminal disposition proves the attempt
is integrated or explicitly abandoned; unknown or interrupted new-system
attempts are preserved for reconciliation.

### Selected failure domain

The owner selected **coordinator-process death, including every process the coordinator owns, while the host filesystem and remote authorities survive**. No 60-second checkpoint mechanism is proposed.

The execution contract reflects that decision:

1. `AttemptPlanned` is acknowledged before worktree or agent provisioning.
2. `bindAgentSession` idempotently creates or discovers the worktree and returns an exact `AgentSessionId`.
3. `AgentSessionBound` records that pointer before `runAttempt` may run or resume it.
4. Recovery reconciles the journal with executor discovery into a discriminated `Planned`, `WorktreeProvisioned`, or `AgentResumable` attempt. A discovered session wins the crash window where the executor created it but the coordinator died before journaling the binding; contradictory session identities fail recovery.
5. Executor discoveries that do not match a live planned attempt are returned as `unmatchedExecutions`, not discarded. Cleanup requires an already established terminal disposition.

Whole-host, storage, and universe failures are outside this contract. A production Codex adapter still needs a kill-and-resume contract test; the prototype establishes the seam it must satisfy.

## Authority boundaries

| Fact                                                             | Authority             | Prototype use                                                                              |
| ---------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| Task identity, lifecycle, dependencies, claim owner              | Tracker snapshot      | Parsed into the revision-scoped `TaskDagSnapshot`; never reconstructed from journal events |
| Claim Base, accepted result, accepted head, integration ancestry | Git                   | Reconciled through discovered claim and integration facts                                  |
| Worktree existence, path, and resumable agent session            | Execution substrate   | Discovered after restart; not inferred from a journal-only status marker                   |
| Attempt identity, Attempt Base, and recorded session pointer     | Control-plane journal | Replayed as orchestration intent and reconciled against executor discovery                 |
| Retry due time                                                   | Control-plane journal | Replayed, then cleared by a later attempt start                                            |
| Pending integration and evidence pointer                         | Control-plane journal | Queued before integration; reconciled against Git after restart                            |

This split removed two invalid prototype shapes found during the first review: putting Claim Base into tracker lifecycle, and treating journal acknowledgement as the only proof that a Git integration completed.

## Falsification evidence

### Revisioned graph projection

`task-dag.ts` decodes branded tracker identities, stores every dependency once on the dependant, and returns either accumulated projection issues or an opaque valid DAG. Canonical task ordering is independent of input insertion order. The invalid fixture reports a duplicate task, duplicate dependency, missing endpoint, self-edge, and two independent cycles in one result.

A bounded fast-check property generates 100 valid DAGs. For each one it verifies insertion-order-invariant canonical encoding, encode/decode idempotence, and the topological edge-order law without reproducing the sorting algorithm.

### Concurrent execution, serial integration

`makeCoordinator` runs two frontier tasks concurrently. The test holds both execution fibers at deterministic `Deferred` gates and observes both starts before releasing either. Accepted results are journaled as queued before entering a one-permit semaphore. Separate integration gates prove the maximum active integration count remains one. The disposable file adapter also serializes append/recovery operations behind its own gate, so concurrent fibers cannot interleave journal lines within one process.

### Local quarantine

Review-cap exhaustion appends its evidence pointer and asks the tracker port to quarantine exactly that task. A refreshed tracker projection then derives the blocked region from the DAG: the failed task's child and grandchild remain blocked while an unrelated ready task stays on the runnable frontier. No blocked or runnable flags are persisted.

### Coordinator-process-death recovery

The restart test creates a fresh NDJSON journal instance, discards and repairs a simulated partially written final record, then proves new records can be appended without corrupting the acknowledged prefix. It replays live attempts, retry timers, pending quarantines, and accepted-result queue events; refreshes tracker lifecycle and claim ownership; and discovers Git claims, Git integrations, worktrees, and agent sessions. The live attempt deliberately has no `AgentSessionBound` journal event: executor discovery recovers it as `AgentResumable`, covering death after Codex session creation but before Ralph acknowledgement. A leftover worktree for an already completed task is retained as an unmatched execution for explicit cleanup reconciliation.

Retry, accepted-result, and quarantine events close the preceding live attempt rather than leaving stale running state. A queued result already present in Git but missing its `IntegrationCompleted` event is removed during reconciliation, covering the crash window after Git success and before journal acknowledgement. A quarantine event not yet reflected by the tracker is recovered as a pending transition that must reconcile before dispatch.

The persisted lines contain neither `lifecycle` nor `prerequisites`, so the journal cannot become another canonical task ledger through its current schema.

## Comparison

| Candidate seam                                          | Result                            | Reason                                                                                                           |
| ------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Ralph-owned persistent DAG                              | Pass                              | Direct branded identity, accumulated typed construction issues, canonical traversal, one stored dependency fact  |
| General Effect `Graph` as authority                     | Rejected by prerequisite research | Allocated `NodeIndex`, shallow mutable representation, throwing projection failures, and no Ralph snapshot codec |
| Persist a scheduler-state snapshot                      | Fail                              | Duplicates tracker lifecycle/dependencies and cannot truthfully resolve tracker/Git divergence after restart     |
| Event journal without authority refresh                 | Fail                              | Replays stale claims and misses integrations that completed before journal acknowledgement                       |
| Event journal plus tracker/Git/executor reconciliation  | Prototype pass                    | Reconstructs chosen-domain control state and exact resumable agent-session identity                              |
| Create worktree, then record attempt                    | Fail                              | A crash between those operations leaves a worktree with no recoverable attempt identity                          |
| Record attempt plan, then idempotently create-or-resume | Pass                              | Replay and executor discovery converge on the same attempt lineage                                               |
| Per-task integration from concurrent fibers             | Fail                              | Accepted-head updates overlap                                                                                    |
| One coordinator-owned integration gate                  | Live-process pass                 | Serializes accepted-head mutation but is not itself durable across process death                                 |

## Prototype limits carried into the specification

- The NDJSON adapter proves replay shape, not power-loss durability. Select or build a journal adapter with atomic acknowledged append and exclusive-writer semantics.
- Real tracker, Git, worktree, and agent-process adapters remain contract-test work. In particular, claim and accepted-result discovery must use exact refs/ancestry rather than names or filesystem guesses.
- A real agent adapter must prove session creation/discovery/resume and process-tree death against the execution-port contract. The in-memory fake establishes only the state machine.
- The selected failure domain is coordinator and owned-process death on a surviving host. There is no proposed periodic checkpoint interval.
- The semaphore is an in-process coordinator. Restart safety comes from the queued-before-integrate event and Git reconciliation; multi-process integration must additionally share one exclusive lease.
- Retry timers are reconstructed here; scheduling policy, backoff, and `TestClock` verification belong to the deterministic-verification ticket.
- Cleanup and cancellation are deliberately absent. A preserved or quarantined worktree cannot be removed through these prototype ports.

## Run the evidence

This is an isolated pnpm project because the repository currently uses Effect V3 while the candidate control plane targets Effect V4.

```bash
pnpm install --dir plans/wayfinder/ralph-graph-native/control-plane-prototype --ignore-workspace
pnpm --dir plans/wayfinder/ralph-graph-native/control-plane-prototype typecheck
pnpm --dir plans/wayfinder/ralph-graph-native/control-plane-prototype test
```

The preserved run on 2026-07-17 passed TypeScript strict checking, six falsification tests, and the 100-case graph property with `effect@4.0.0-beta.99`.
