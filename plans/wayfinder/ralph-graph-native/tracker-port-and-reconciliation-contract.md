# Ralph Tracker Port and Graph Reconciliation Contract

Decision asset for [Define Ralph's tracker port and graph reconciliation
contract](https://github.com/dearlordylord/5e-quint/issues/185), under
[Wayfinder: Ralph graph-native
orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

Claims in this contract are new-orchestrator reservations obtained through the
tracker port. Historical Git-ref claims created by `ralph-run.sh` are not claim
state to import, reconcile, release, or preserve in this model.

## Decision

Ralph will consume each tracker through two Effect V4 services: a complete
read-only graph service and an authorized mutation service. A production
adapter must provide both services and an atomic exclusive claim primitive.
`ralph run <target> --dry` receives only the read service. There is no product
requirement to ship adapters for trackers that cannot safely claim tasks.

The tracker adapter is authoritative for task identity, authored task content,
lifecycle, grouping, dependencies, and claim ownership. Ralph's immutable
`TaskDagSnapshot` is one complete observation of those facts. The journal may
refer to task and observation revisions, but it never reconstructs, edits, or
outvotes tracker facts. Evidence bytes belong to the evidence store; the
tracker retains content-addressed evidence references required for auditable
completion.

The port does not promise an atomic transaction combining eligibility and
claim acquisition. Ralph selects from one complete snapshot and then
atomically acquires exclusive ownership of the chosen task. Later tracker
changes are handled by the normal refresh and reconciliation loop. This keeps
the claim primitive honest for GitHub without building stabilization machinery
for a race the owner does not consider important.

## Domain vocabulary and authority

### Run target

A **run target** is a decoded, serializable query naming one configured tracker
adapter and the tracker-native root or selection from which a run is projected.
It is data interpreted by the adapter, not an untyped CLI string carried into
the control plane.

Membership is live. Every refresh reevaluates the same run target:

- newly matching tasks enter the snapshot;
- unstarted tasks that no longer match leave the snapshot; and
- a claimed or started task that no longer matches becomes a typed
  reconciliation conflict rather than being silently abandoned.

Ralph refreshes before selecting each new task. It does not freeze the initial
membership as a second task list.

### Task identity

`TaskId` is an opaque, serializable, globally unique tracker identity. It must
survive title, URL, repository-name, and grouping changes. It is not an issue
number, title, URL, array position, graph-library node index, or Ralph-assigned
registry key. The GitHub adapter should construct it from GitHub's stable
repository and issue node identities; other adapters own equivalent stable
identities. Ralph compares and serializes `TaskId` values but never parses
adapter-specific components from them.

Display title and URL are replaceable task metadata. The canonical DAG map key
is the only copy of `TaskId` in a task entry, as selected by [Evaluate immutable
task-graph representations for
Ralph](https://github.com/dearlordylord/5e-quint/issues/181).

### Revisions

Two revision concepts have different jobs:

- `TrackerSnapshotRevision` identifies one successful, complete tracker
  observation. It is opaque adapter data, not Ralph graph-allocation history or
  a task-content hash. Two observations may have equal content and unequal
  revisions. Equal revisions with unequal canonical snapshot content are a
  reconciliation contradiction.
- `TaskExecutionRevision` identifies the execution-relevant projection of one
  task. It changes when authored requirements, execution admission, grouping,
  or prerequisites change. Claim ownership, evidence attachments, comments,
  and other audit-only activity do not change it.

An attempt binds the `TaskExecutionRevision` it implements. The journal stores
that reference as attempt history, not as a competing task definition.

### Complete snapshot

A successful read contains the selected root and grouping descendants plus the
complete transitive prerequisite closure needed to decide their eligibility.
Every included task has its lifecycle, execution admission, claim projection,
grouping relation, authored execution projection, and full immediate
prerequisite set from the same accepted observation.

The adapter must finish pagination and decode every required object and
relationship. Missing pages, inaccessible prerequisite endpoints, unsupported
native states, or contradictory records fail the entire read with accumulated
typed projection issues. Ralph never constructs or schedules from a partial
snapshot. It does not require a multi-object tracker transaction, repeated
stabilization reads, or a globally atomic tracker timestamp.

An empty prerequisite collection is present and means no prerequisites.
Omission never provides a second spelling for the same state.

### Grouping and dependency

Parent-child is grouping. Prerequisite-dependant is execution ordering. The
adapter projects both native relations independently and never infers either
from the other.

Completing all children does not complete, unblock, or close their parent.
Completing a parent does not imply that any child succeeded. A workflow that
requires one task to wait for another must use a native dependency edge.

A prerequisite outside the selected grouping hierarchy is included in the
snapshot closure, but that inclusion does not make it a child of the run root.

### Lifecycle, admission, and claims

The tracker projection separates three concepts:

- lifecycle says whether the task is open, completed successfully, or
  terminal without success;
- execution admission says whether an open task is admitted for Ralph or held;
  and
- claim says whether execution ownership is unreserved, actively reserved, or
  completing under a Ralph run.

These must be discriminated values rather than independent booleans or one
mixed status enum. Only successful completion satisfies a prerequisite.
Cancellation, `not planned`, and every other terminal-without-success outcome
remain unsatisfied, so dependants require explicit tracker repair or
disposition.

Eligibility is derived by one domain helper from the same complete snapshot:
the task is open, admitted, unclaimed, and every prerequisite completed
successfully. `isEligible`, `isFrontier`, completed-ID sets, and blocked-region
flags are never stored beside their source facts.

A **claim** is Ralph's durable exclusive reservation to execute one task. It
belongs to a `RunId` and unguessable owner token, not a human assignee, agent
session, worktree, branch, or individual attempt. Retries and clean restarts in
the same run retain it. Claim acquisition is atomic create-if-unclaimed;
release and completion use compare-and-set against the exact owned claim.

Claim state is one discriminated value:

- `Unclaimed` has no owner or completion fields;
- `ActiveClaim` carries the exact claim identity and owner; and
- `CompletionClaim` carries that same identity and owner plus exact references
  to the narrowed promoted-integration authorization and attached
  completion-evidence receipt.

Beginning completion compare-and-sets `ActiveClaim` to `CompletionClaim`.
Explicit abandonment can release only an `ActiveClaim`; it cannot erase a
completion already in progress. Task completion accepts only the corresponding
`CompletionClaim`, and final claim deletion accepts only a confirmed-completed
claim. These state-specific capabilities prevent callers from remembering the
completion sequence themselves.

Crashes, timeouts with unknown outcomes, and failed attempts retain the claim.
It is released only after confirmed task completion or an explicit abandonment
workflow. This prevents another run from starting while recoverable work may
exist.

## Effect service boundary

The concrete implementation should use Effect V4 `Context.Service`, named
`Effect.fn` operations, Schema-decoded boundary values, and
`Schema.TaggedErrorClass` failures. The signatures below describe the domain
surface rather than fixing incidental TypeScript syntax.

### `TrackerGraphReader`

The read service exposes one authoritative operation:

```text
readGraph(runTarget) -> CompleteTaskDagSnapshot
```

It performs adapter-native pagination, boundary decoding, closure expansion,
relation projection, revision construction, and the total DAG build. Expected
transport, authorization, decode, completeness, duplicate, missing-endpoint,
cycle, and same-revision contradictions remain typed failures. Consumers never
receive raw tracker payloads or a partially built graph.

The dry interpreter receives this service and no tracker mutation service. It
therefore cannot claim, attach evidence, change lifecycle, or release anything
even if an adapter implementation happens to possess credentials.

### `TrackerMutation`

The mutation service exposes domain operations, not a generic issue patch:

- atomically acquire an unclaimed task for one `ClaimOwner`;
- compare-and-set release of the exact active claim during explicit
  abandonment;
- idempotently attach one sealed `EvidenceManifestRef` under one `OperationId`;
- quarantine an exact active claim after non-convergence;
- compare-and-set an active claim into a completion claim using the narrowed
  promoted-integration proof, expected `TaskExecutionRevision`, and attached
  completion-evidence receipt;
- complete the task using that exact completion claim;
- compare-and-set delete the exact completion claim only after confirmed task
  completion; and
- perform explicit operator-authorized lifecycle repair required by a resolved
  reconciliation conflict.

Every mutating input carries the exact identity or receipt that proves its
precondition. The service returns an acknowledgement receipt, an idempotent
already-applied result, or a typed rejection containing enough current fact to
refresh and reconcile. It does not expose independent `check` and `write`
operations that callers must sequence correctly.

Tracker mutation operations are journaled as intent before invocation and
observed outcome afterward, following [Choose Ralph's durable journal and
recovery
protocol](https://github.com/dearlordylord/5e-quint/issues/183). An
infrastructure failure distinguishes a definitely-not-applied attempt from an
unknown external outcome whenever the adapter can prove that distinction.
Unknown outcomes are read back before retry. Retries are permitted only for an
idempotent `OperationId` or after reconciliation proves the effect absent and
the original ownership and revision preconditions still hold.

No adapter is required to provide a cross-operation transaction. Evidence
attachment may succeed before task completion fails; the acknowledged
attachment is retained and completion resumes. Ralph reconciles forward rather
than attempting remote rollback.

## Evidence-backed completion

Successful completion has this order:

1. seal the immutable, content-addressed completion evidence manifest;
2. journal intent to attach its reference;
3. attach the reference idempotently to the tracker task;
4. record the attachment acknowledgement;
5. verify the exact active claim, expected `TaskExecutionRevision`, and narrowed
   promoted-integration proof;
6. compare-and-set the active claim to a completion claim binding those facts;
7. journal and perform task completion using the completion claim;
8. confirm successful completion; and
9. compare-and-set delete the exact completion claim.

The tracker reference makes completion discoverable and auditable but does not
make the tracker an artifact store. If attachment fails, the task remains
incomplete and claimed. If completion fails or its outcome is unknown, the
claim remains in completing state and recovery reconciles it. If completion is
confirmed but claim deletion fails, recovery removes only the exact completed
claim and never reopens the accepted task.

## Refresh and reconciliation

Recovery and the live scheduling loop both refresh tracker authority. The same
rules apply whether divergence arose from a coordinator crash, timeout, human
edit, foreign Ralph run, or ordinary live-query change.

| Observed state                                                                                | Resolution                                                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| A complete snapshot is unavailable                                                            | Fail the refresh; retain the last snapshot only as evidence and dispatch no new work from it.           |
| Journal intent has a matching tracker outcome but no journal acknowledgement                  | Record the observed outcome; do not replay the mutation.                                                |
| Journal intent is absent from the tracker and its ownership/revision preconditions still hold | Retry only through the idempotent operation contract.                                                   |
| A human or foreign run made a contradictory change                                            | Stop that task with a typed reconciliation conflict; never overwrite the external change automatically. |
| A task disappears from the live target before claim                                           | Remove it from the next snapshot.                                                                       |
| A claimed or active task disappears from the live target                                      | Preserve its claim and work; require reconciliation.                                                    |
| The same `TrackerSnapshotRevision` decodes to unequal canonical content                       | Reject both as a tracker-revision contradiction.                                                        |
| An active task's `TaskExecutionRevision` changes                                              | Interrupt integration eligibility, preserve the attempt, and require reconcile-or-restart disposition.  |
| A completed prerequisite becomes terminal-without-success or open again                       | Recompute the frontier from tracker authority; never preserve a stale derived eligibility flag.         |

The default response to a changed active task is to preserve the attempt and
stop it before integration. An operator may then reconcile the existing work
against the new task revision or restart from scratch.

## Immediate restart from changed requirements

Restart is an orchestration workflow, not a tracker lifecycle shortcut. It is
available while implementation is running, after implementation returns,
during review, and while an accepted result is waiting for integration.

An immediate clean restart:

1. durably records `RestartRequested` for the task, old attempt, and latest
   observed `TaskExecutionRevision`;
2. interrupts the active implementation without waiting for it to finish;
3. after a bounded grace period, terminates only the attempt's owned process
   tree if it has not stopped;
4. proves no owned process can still write to the old worktree;
5. seals the interrupted diff and diagnostic evidence;
6. cleans the disposable worktree and branch by default, while allowing an
   explicit quarantine-retention disposition;
7. retains the same task claim, preventing a competing run from entering; and
8. creates a new attempt from the latest accepted head and latest task revision
   with no WIP ported from the superseded attempt.

Failure to prove process termination prevents cleanup and restart; it produces
a recoverable conflict rather than risking two writers. The same clean-restart
option remains available after an implementation has finished.

`IntegrationStarted` is the cutoff. Restart is rejected while integration is
mutating or reconciling the accepted branch. The integration protocol must
finish or recover to a stable outcome before any later corrective work begins.
This rule is state-typed so a caller cannot interrupt the integration fiber and
then clean its resources by convention.

## Adapter qualification

A production tracker adapter qualifies only if contract tests prove:

- stable opaque task identity;
- complete target, grouping, and transitive-prerequisite projection;
- deterministic canonical encoding for one accepted observation;
- correct distinction between grouping and dependency;
- successful-completion-only dependency satisfaction;
- atomic create-if-unclaimed and exact compare-and-set claim operations;
- idempotent evidence attachment and safe ambiguous-outcome reconciliation;
- expected-revision protection on completion and other destructive lifecycle
  changes;
- live target membership refresh; and
- typed, non-throwing failures for malformed, partial, unauthorized, stale, and
  contradictory external state.

GitHub is the first adapter, not the domain model. Its sub-issues, blocked-by
edges, node identities, issue states, labels, comments, and remote claim refs
are parsed into this contract at the boundary. No GitHub label, GraphQL node
shape, issue number, or Git-ref encoding escapes into the coordinator algebra.

## Documentation and parity check

This decision changes orchestration infrastructure only. It models no D&D rule,
authored game content, or runtime combat behavior, so no SRD passage,
`ASSUMPTIONS.md` entry, or D&D ubiquitous-language term changes. The accepted
facts remain in this Wayfinder decision asset until the graph-native Ralph
implementation specification promotes them to its mapped owner; they are not
copied into the Cleanroom glossary or the current runtime architecture as a
parallel authority.

The contract preserves the existing bounded-leaf, Base-SHA, reviewer-loop,
evidence, quarantine, resource-lock, and accepted-head integration decisions.
It weakens current meaning/value/sequence connascence by replacing issue-number
identity, label/body conventions, caller-managed claim sequences, and inferred
parent/blocker relationships with branded identities, parsed projections,
domain operations, and state-typed workflows.

## Verification contract

Implementation must prove at least these scenarios:

1. A run target containing grouping descendants and external prerequisites
   produces one canonical complete closure, while grouping and dependencies
   remain independently queryable.
2. A failed or incomplete pagination request, inaccessible prerequisite, bad
   boundary value, duplicate task or edge, missing endpoint, or cycle returns
   typed issues and exposes no schedulable snapshot.
3. Canonical snapshot encoding is independent of tracker enumeration order;
   equal snapshot revisions with unequal canonical content are rejected.
4. Only successful completion satisfies a dependency. Open, held, claimed,
   cancelled, and terminal-without-success prerequisites do not.
5. Two runs concurrently acquiring one task produce exactly one active claim.
   Foreign and stale claim tokens cannot release, quarantine, begin completion,
   complete, or delete it.
6. Claim acquisition does not pretend to be atomic with eligibility. A later
   refresh recomputes eligibility without storing a second frontier.
7. Evidence attachment followed by an ambiguous response is discovered by
   `OperationId` and is not duplicated. Completion cannot start without the
   exact attachment receipt and promoted-integration proof.
8. Death before and after active-to-completion claim transition, tracker close,
   and claim deletion converges without reopening a completed task or releasing
   an incomplete one.
9. A contradictory human or foreign-run change is surfaced for operator
   resolution and is never overwritten by automatic reconciliation.
10. Live-query refresh admits a newly matching task, removes an unstarted task,
    and preserves a claimed task that leaves the query as a reconciliation
    conflict.
11. An execution-relevant edit prevents integration. Reconcile preserves the
    attempt; immediate restart interrupts a running implementation, proves its
    process tree dead, seals its evidence, cleans it safely, retains the claim,
    and launches from the latest accepted head without old WIP.
12. Restart remains available after implementation and during review or queue
    wait, but the state-typed API rejects it after integration starts.
13. Live, dry-run, and deterministic test interpreters traverse the same read
    and workflow algebra. The dry layer cannot acquire the mutation service and
    produces no tracker, journal, Git, filesystem, or process writes.
14. Confirm that this changes no modeled D&D rule: consult
    `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md` and record that RAW
    traceability is not applicable beyond that ownership check.
15. After implementation, run RAW/ubiquitous-language, architecture/domain,
    connascence, and code-review passes. Fix every reasonable finding, record a
    concrete reason for any rejection, and repeat the reviewer loop until no
    reasonable findings remain. Significant implementation changes require at
    least two rounds.

Use Effect-aware deterministic synchronization for concurrency and immediate
restart tests, virtual time for grace periods and retry schedules, bounded
property tests for canonical graph projection, and injected fault points around
every ambiguity-crossing mutation. Do not test brands or exhaustiveness facts
that TypeScript already proves.

## Decision review record

Round one checked the draft against the current Ralph issue/claim protocol, the
bounded-leaf decision, the immutable-DAG evaluation, the control-plane
prototype, the durable-journal protocol, and the concurrent accepted-head
integration protocol. It replaced an implicit “completing” convention with
explicit active and completion claim states, and bound tracker completion to
the narrowed promoted-integration proof rather than accepting an evidence link
alone.

Round two checked invalid product states, authority duplication, partial
tracker failures, live-query membership, human-edit conflicts, interruption
and cleanup safety, operation idempotency, documentation ownership, and
connascence. It retained the owner's deliberate simplification that eligibility
and claim acquisition are not one atomic transaction, removed any product
commitment to read-only-only tracker adapters, and kept immediate restart out
of the non-interruptible integration state. No D&D RAW, authored identity,
Quint parity, or ubiquitous-language change applies.
