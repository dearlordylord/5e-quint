# Ralph Durable Journal and Recovery Protocol

Decision asset for [Choose Ralph's durable journal and recovery protocol](https://github.com/dearlordylord/5e-quint/issues/183), under [Wayfinder: Ralph graph-native orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

In this decision, a run, planned attempt, managed namespace, and recoverable or
untracked execution all belong to the Ralph orchestrator. Historical
`ralph-run.sh` runs, claims, worktrees, branches, and `.ralph` artifacts are
outside that namespace: they are evidence, not journal migration or recovery
inputs.

## Answer

Ralph will use a logically append-only SQLite journal to record its own
workflow intentions, observed outcomes, retry deferrals, and evidence
pointers. The journal is authoritative only for Ralph execution history. The
tracker remains authoritative for task identity, lifecycle, dependencies, and
claims; Git remains authoritative for source lineage, refs, worktrees, and
accepted integration; the execution substrate remains authoritative for
discoverable agent sessions and owned processes.

Recovery is reconciliation, not replay from a scheduler snapshot and not
rollback. Ralph acquires one coordinator lock, reloads every recoverable run
regardless of age, refreshes the external authorities, and derives explicit
continuation operations from the combined facts. A completed external effect
that lacks a journal outcome is discovered and acknowledged. An incomplete
fragment is resumed or restarted according to its typed policy. Contradictory
or destructive cases require an explicit disposition.

There is no global periodic checkpoint. The selected failure domain remains
coordinator-process death, including the processes it owns, while the host
filesystem and remote authorities survive.

## Domain language

- **Run target** is a discriminated value identifying one tracker adapter and
  either a graph root or a graph query. It identifies the work to traverse, not
  a particular observation of that graph; it cannot contain both selectors or
  neither selector.
- **Run** is one recoverable Ralph traversal of a run target, identified by a
  fresh `RunId`.
- **Planned attempt** binds an opaque `AttemptId` to its exact Attempt Base SHA
  and exact Git resource locators before any of those resources are created.
- **Workflow operation** is one named Ralph-level step such as planning an
  attempt, invoking a reviewer, queuing integration, sealing evidence,
  abandoning an attempt, or authorizing cleanup. It is not an individual agent
  tool call.
- **Intent** is a committed journal record saying Ralph is about to perform one
  workflow operation.
- **Observed outcome** records what Ralph or an authority subsequently observed
  for that operation. It does not claim a distributed exactly-once effect.
- **Untracked execution** is an execution resource in Ralph's managed namespace
  that no recoverable planned attempt references.
- **Execution resource conflict** means that the exact worktree path, branch,
  ref, base ancestry, session, or process facts observed from an authority do
  not satisfy the planned operation. It is not a generic `safe` or `unsafe`
  label.
- **Reconcile forward** means derive an explicit continuation, restart,
  preservation, abandonment, quarantine, or cleanup operation from durable and
  observed facts. Ralph does not pretend that agent work, Git mutations, or
  tracker mutations can be rolled back transactionally.
- **Recoverable run** participates in restart reconciliation and retains its
  complete operational history.
- **Retained terminal run** cannot resume, but its evidence and archived event
  segment remain under an explicit retention policy.
- **Retired run** cannot resume and no longer retains journal events or owned
  artifacts. Running the same target again allocates a new `RunId`.

These are Ralph orchestration terms. They do not belong in the D&D ubiquitous
language, Cleanroom product glossary, or modeling assumptions.

The operation catalog is not frozen across Ralph versions. Within one version,
however, it is an exhaustive tagged algebra: adding an operation requires a
named variant, boundary schema, interpreter handling, recovery semantics,
authorization policy, and evidence contract. There is no generic action string
or metadata escape hatch.

## Authority and state ownership

| Fact                                                                                                  | Authority                  | Ralph use                                                                        |
| ----------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| Task identity, lifecycle, dependency edges, grouping, and claim owner                                 | Tracker adapter            | Read as one complete revisioned graph snapshot; never rebuilt from the journal   |
| Claim Base, Attempt Base, refs, commits, ancestry, accepted result, accepted head, worktree Git facts | Git                        | Read and reconciled through a Git lineage service                                |
| Worktree provisioning, agent-session discovery, and owned-process observation                         | Execution substrate        | Compared with exact planned resource locators; never inferred from a status flag |
| Run identity, planned attempt, workflow intent, retry deferral, and observed outcome                  | Ralph journal              | Replayed as Ralph execution history and reconciled against the other authorities |
| Artifact bytes                                                                                        | Evidence store             | Written incrementally and sealed into immutable stage manifests                  |
| Evidence role, content hash, completeness, and predecessor manifest                                   | Evidence manifest          | Referenced by typed journal records; large artifacts are not stored in SQLite    |
| Fibers, semaphores, timer queues, and console or Mermaid views                                        | Live or derived projection | Recreated from services and reconciled state; never persisted as authority       |

The journal must not persist tracker lifecycle, dependency edges, runnable
frontiers, Git ancestry conclusions, worktree-exists flags, derived operation
status, or dashboard state. A tracker snapshot may be retained as diagnostic
evidence with its revision, but recovery always refreshes the tracker.

## Effect V4 tooling architecture

Effect is the Ralph tooling application architecture, including simulation and
tests:

- orchestration workflows are `Effect` programs;
- application capabilities are explicit `Context.Service` services;
- production, dry-run, and test implementations are supplied as `Layer`s;
- internal workflow decisions use an exhaustive `Data.TaggedEnum`;
- persisted and boundary-crossing records use `Schema.Struct`, constrained
  brands, `Schema.TaggedUnion`, and `Schema.TaggedErrorClass`;
- unknown tracker, Git, process, SQL, and artifact data is decoded once at its
  boundary;
- retry and polling policies use `Schedule`;
- long-lived observations and execution traces use scoped `Stream`s;
- deterministic tests use `TestClock`, `Deferred`, `Queue`, `Latch`, and `Ref`
  rather than real sleeps;
- CLI parsing and terminal interaction use `@effect/cli` and Effect console
  services;
- filesystem, path, process, and command execution use Effect platform
  services in application workflows, with Node APIs confined to platform
  adapter layers;
- production code depends on the real service tags, while simulation and test
  layers expose additional inspection controls without weakening production
  interfaces.

The scheduler produces explicit workflow operations. A live interpreter
records and performs them through fine-grained services. A simulation
interpreter applies the same algebra to an in-memory projection. This is one
program with injected capabilities, not parallel live and simulation
schedulers.

`@effect/workflow` may be evaluated later as an interpreter substrate, but it
does not own the Ralph domain contract merely because it is an Effect package.
Any use must preserve the authorities, journal protocol, explicit operation
algebra, and contract tests selected here.

## Storage contract

The initial production adapter is SQLite in WAL mode through Effect's SQL
services. The expected Node adapter is
[`@effect/sql-sqlite-node`](https://github.com/Effect-TS/effect/tree/main/packages/sql-sqlite-node),
which implements `@effect/sql` using `better-sqlite3`. The Ralph journal remains
behind its own `JournalStore` service; SQL queries and driver types do not cross
that boundary.

The adapter must provide:

1. atomic acknowledged append;
2. one canonical journal position per committed record;
3. caller-supplied, typed record keys with uniqueness enforcement;
4. idempotent re-append of an identical record;
5. a typed contradiction when the same key names unequal content;
6. schema-versioned decoding and migrations;
7. exclusive live-writer ownership under the coordinator lock;
8. complete ordered reads for one recoverable run;
9. transactional creation and verification of immutable archive metadata; and
10. typed storage failures rather than exceptions in application workflows.

The database lives in Ralph's control directory, never in a product worktree.
Ralph metadata must not be added to product files, Git indexes, branches, or
commits.

SQLite is an implementation choice. Replaceable adapters must pass the same
storage and crash-injection contract suite. WAL mode, the Node SQLite binding,
physical table layout, indexes, and migration tooling remain replaceable;
atomic append, record identity, ordering, decoding, and archive behavior do
not.

## Coordinator and resource exclusivity

Exactly one live mutating coordinator may own a Git common directory. It
acquires an OS-backed exclusive lock before opening recoverable workflows and
releases that lock automatically on process death. It does not use a durable
TTL row as a second coordinator authority.

Bounded task concurrency lives inside that coordinator. Narrower authorities
remain distinct:

- tracker claims exclude task ownership through the tracker port;
- exact worktree leases exclude concurrent use of one attempt resource;
- the existing repository resource-lock wrappers remain authoritative for
  broad verification, Quint proofs, and battle MBT;
- accepted-head integration is serialized and reconciled against Git;
- an in-process semaphore may coordinate live fibers but is never recovery
  evidence.

A dry run is non-mutating and does not become a second coordinator. It may read
the tracker and other configured read-only services while a live coordinator
exists, but it cannot acquire claims or invoke mutating services.

The selected failure domain is one surviving host. Multi-host execution would
require a separately selected fenced coordinator and integration lease; a TTL
lease must not be silently added to the single-host design.

## Transition and idempotency protocol

Every ambiguity-crossing operation follows the same Ralph-level protocol:

1. Construct a typed operation with a stable `OperationId`.
2. Append and commit its intent under a stable record key.
3. Invoke the external service with that identity when the service supports an
   idempotency key.
4. Observe or discover the external result.
5. Append the typed observed outcome.

The journal provides exactly-once records, not exactly-once external effects.
After a timeout or process death between steps 3 and 5, recovery consults the
external authority before retrying. A retry reuses the same `OperationId`.
When an external system has no idempotency facility, its service must expose a
domain-specific observation or reconciliation operation; blind retry is not
allowed.

`OperationId`, journal position, tracker revision, `RunId`, `TaskId`,
`AttemptId`, agent-session identity, Git SHA, evidence-manifest identity, and
resource-lock identity are distinct domain values. One must not be reused as
another merely because their runtime representation is a string or integer.

The live interpreter owns intent/effect/outcome ordering. Callers cannot invoke
the underlying mutating service and append the intent separately. This
localizes the strong execution-order connascence in one operation interpreter.

## Planned attempts and Git resources

Git worktrees have no intrinsic Ralph attempt identity. Ralph therefore does
not add an ownership marker to a worktree and does not infer an `AttemptId`
from worktree contents.

Before mutation, the execution planner returns one opaque `PlannedAttempt`
containing:

- `RunId` and `AttemptId`;
- exact `TaskId`;
- exact Attempt Base SHA;
- exact worktree path;
- exact task branch ref; and
- every other resource locator the create-or-discover operation requires.

The journal commits that plan in SQLite. The execution service then performs
`createOrDiscover(plannedAttempt)`:

- when the exact resources are absent, it creates them idempotently;
- when they exist with the planned path, branch, and required base ancestry,
  it returns the observed facts;
- when Git reports conflicting facts, it returns a typed execution resource
  conflict;
- when a resource in Ralph's managed namespace has no recoverable planned
  attempt, discovery returns an `UntrackedExecution` and preserves it for an
  explicit disposition.

The planner and journal must prevent two recoverable attempts from allocating
the same exclusive resource locator. Git observations are parsed into narrowed
types before they reach recovery logic.

## Recovery protocol

Startup recovery performs these steps:

1. Acquire the coordinator lock.
2. Open and migrate the journal, then decode all records for every recoverable
   run. Age is irrelevant.
3. Refresh the complete tracker graph and claims through the configured tracker
   adapter.
4. Discover exact Git claims, refs, commits, accepted integrations, worktrees,
   and ancestry.
5. Discover executor resources, resumable agent sessions, owned processes,
   sealed evidence manifests, and resource-lock observations.
6. Accumulate every independent parse, identity, lifecycle, and reconciliation
   issue rather than hiding later issues behind the first one.
7. Derive explicit workflow operations for the facts that agree.
8. Automatically execute only the unique continuation authorized by policy.
   Present destructive, lineage-changing, contradictory, abandonment, and
   quarantine choices to the operator.

Recovery does not reconstruct task truth from journal events. It does not
delete an unexplained resource, reset an operator worktree, or treat absence of
a live PID as proof that a workflow operation failed.

An agent or reviewer invocation is a workflow fragment, not a periodic
checkpoint. For example, before launching semantic review round three,
technical attempt one, Ralph records the invocation intent. If the coordinator
dies ten minutes later, recovery:

- accepts a complete reviewer result if one is discoverable;
- resumes the exact reviewer session when the executor proves it resumable;
- otherwise restarts the same semantic review round under an explicit workflow
  operation;
- never creates a handback or advances the semantic round until a valid verdict
  is durably observed.

Coordinator-caused interruption does not consume the reviewer's technical
retry budget. An established reviewer, tool, or transport failure does.
Repeated coordinator death is an operator-health problem, not review evidence
against the leaf.

The same identity rule applies when an implementation-agent process exits
non-zero, including an OOM termination. Ralph preserves the exact planned
attempt, worktree mutations, agent-session identity, and partial evidence as
one lineage. When the execution substrate proves that session resumable,
technical recovery continues that implementation node by resuming the exact
session in the exact worktree; it does not start a fresh implementation agent
over the retained files and does not send incomplete work to semantic review.
If the session is not resumable, replacement, preservation, or quarantine must
follow an explicit typed policy. A resource emergency must be diagnosed before
an unchanged invocation is resumed.

Recovery conflicts are localized by resource ownership. A conflict pauses the
affected attempt, run, and dependent work. A different run using different
worktrees and branches may continue. A conflict involving coordinator
ownership, journal integrity, the same accepted integration branch, or another
shared authority pauses every operation that could touch that authority.

## Explicit continuation and operator authorization

Ralph does not have a generic rollback operation. The evolving operation
algebra names domain actions such as resuming a session, restarting a workflow
fragment, replacing an unresumable session within an attempt, preserving an
interrupted attempt, abandoning an attempt, quarantining a task, sealing
evidence, and authorizing owned-resource cleanup.

This list illustrates the initial surface; it is not a permanent closed catalog.
Every executable variant is nevertheless closed and exhaustively handled in
the version that defines it.

"Explicit" does not mean every operation requires a human prompt. It means the
operation is named, typed, journaled in live execution, evidence-backed, and
handled exhaustively. Ralph may automatically execute a single non-destructive
continuation selected by an accepted policy. Destructive actions, lineage
changes, abandonment, quarantine, or contradictory observations require an
operator-authorized operation unless a later decision defines a more specific
executable policy.

## Retry deferrals

The journal persists a typed not-before fact, not scheduler state. A retry
deferral carries:

- its retry scope;
- the exact workflow subject;
- the next attempt ordinal;
- one `notBefore` instant; and
- the evidence for the failure or interruption that caused it.

Technical reviewer retries, semantic handbacks, and whole-task reruns are
distinct variants. They do not share a counter or an optional scope field.
Starting the exact next attempt supersedes its deferral. After recovery and
authority reconciliation, overdue deferrals are immediately eligible and
future deferrals are scheduled for the remaining delay. The live timer queue
is derived and never persisted.

The scheduling policy uses Effect `Schedule`; deterministic verification uses
`TestClock`. A stored `notBefore` is the already-decided durable fact. Ralph
does not persist both a delay and a deadline that could disagree.

## Evidence manifests

Evidence files remain outside SQLite in an attempt-owned evidence store. They
may be written incrementally while an agent, reviewer, verifier, or integrator
runs. A mutable path alone cannot authorize a later transition.

Before a transition depends on evidence, Ralph seals an immutable stage
manifest containing:

- a manifest schema version and identity;
- the owning run, task, attempt, operation, and stage identities that apply;
- typed artifact roles;
- artifact paths or object-store locators;
- byte sizes and content hashes;
- an explicit completeness variant; and
- the preceding stage-manifest identity when one exists.

Later stages add manifests that link to earlier manifests; they do not mutate a
single final manifest. Acceptance/review evidence must be sealed before an
accepted result is queued. Integration evidence must be sealed before tracker
completion and exact claim release. Cleanup produces a later outcome manifest.
Interrupted artifacts remain explicitly partial and cannot authorize tracker
completion, destructive cleanup, or acceptance.

The manifest relationship is executable: a transition method accepts the
narrowed sealed-manifest type it requires. Callers do not pass a weak evidence
pointer and ask the transition to re-check completeness.

## Cleanup and closure

Cleanup is its own recoverable workflow. It is not a generic `finally` block.
Effect scopes release live-process resources such as fibers, file descriptors,
and kernel locks, but durable or destructive cleanup still requires an
explicit operation and disposition.

A narrowed cleanup authorization is derivable only after reconciliation
establishes the relevant disposition:

- **Integrated:** stop owned processes, seal the required evidence, reconcile
  tracker and exact claim transitions, then remove the specifically authorized
  task worktree and eligible task branch.
- **Explicitly abandoned:** seal abandonment evidence, compare-and-set release
  the exact claim, then remove only the resources named by the abandonment
  authorization.
- **Quarantined:** terminate owned processes and release ephemeral locks, but
  preserve claim, worktree, branches, agent sessions, and evidence.
- **Interrupted or ambiguous:** preserve resources until reconciliation
  produces another explicit disposition.

Every destructive cleanup has intent and observed-outcome records and can be
discovered after a crash. Cleanup is idempotent over exact resource locators.
Ralph restores only resources it acquired and owns; it never generically resets
an operator worktree or claims to reverse an ambiguous external effect.

## Run identity, retention, and compaction

For one run target:

- `ralph run <target>` resumes an existing recoverable run regardless of age;
- if only terminal or archived runs exist, it allocates a fresh `RunId`;
- two recoverable runs for the same target are invalid;
- forcing fresh execution requires explicitly abandoning or quarantining the
  recoverable run first; and
- `ralph run <target> --dry` is ephemeral and creates no database record.

Compaction is lossless while history remains retained. Active and nonterminal
runs retain complete SQLite events. Once a run is terminal, required evidence
is sealed, and no cleanup or reconciliation work remains, Ralph may atomically
encode its events into an immutable, schema-versioned, hashed archive segment.
Only after archive verification may it remove those event rows from the hot
database.

The hot database may retain a small retained-run catalog entry containing the
`RunId`, terminal disposition, archive locator and hash, and retention policy.
Retirement atomically removes that entry with the archive; it does not leave a
row pointing at deleted evidence. The catalog does not retain old tracker
graphs. Finished Wayfinder runs therefore do not accumulate as live scheduler
data when a later Wayfinder run starts.

Retention is disposition-based, never age-based for recoverable work. A run
interrupted for thirty days remains recoverable. A terminal archived run may
later be explicitly retired under retention policy, deleting its archive and
owned artifacts. A stale nonterminal run must first receive an explicit
abandonment or quarantine disposition. Quarantined runs are never
automatically retired.

Derived summaries, console views, dashboards, and graph diagrams can be
discarded and regenerated. They are not part of compaction authority.

## Dry-run contract

`ralph run <target> --dry` reads the real task graph through the selected
read-only tracker adapter and traverses it with the same Effect scheduler and
operation algebra used by live execution. Its simulation layers:

- do not open the production journal for writing;
- do not acquire tracker claims;
- do not launch agents or child tools;
- do not create, modify, or delete filesystem resources;
- do not mutate Git refs, indexes, worktrees, or commits;
- do not call tracker mutation operations; and
- keep all simulated lifecycle and scheduling facts in memory.

The default scenario makes simulated agent, review, integration, and tracker
steps succeed immediately so the operator can inspect traversal, bounded
parallelism, dependency release, and serialization. Scenario layers may inject
typed delays, retryable failures, review rejection, crashes, quarantine, or
resource conflicts. Simulation is deterministic unless a scenario explicitly
provides a seeded random service.

Every simulated operation emits an ordered trace labelled as simulation. The
first presentation may be console output. Mermaid or another visual projection
is derived from that same trace later. Simulated outcomes are never execution,
acceptance, or review evidence.

GitHub is the first tracker adapter, not a task-domain authority. The tracker
port must support interchangeable adapters with a read-only graph service used
by both live and dry execution and a separately provided mutation service that
is absent from the dry-run layer.

## Replaceable and fixed decisions

Replaceable behind contract tests:

- SQLite driver and Effect SQL adapter;
- physical journal schema and migration implementation;
- tracker adapter, with GitHub only the first implementation;
- agent, process, and worktree execution substrate;
- evidence bytes store;
- trace presentation, including console, Mermaid, or a dashboard;
- retry schedule parameters; and
- possible future use of `@effect/workflow` as a substrate.

Fixed by this decision unless a later tooling architecture decision supersedes
it:

- Effect V4 services and layers for all capabilities, simulation, and tests;
- one explicit, exhaustively handled workflow-operation algebra;
- one live mutating coordinator per Git common directory;
- SQLite as the initial logically append-only production journal;
- intent before ambiguity-crossing effect and observation after it;
- reconcile-before-retry for ambiguous external effects;
- tracker, Git, executor, evidence, and journal authority separation;
- no Ralph metadata in product worktrees or Git history;
- no global scheduler checkpoint or persisted derived frontier;
- fail-closed, disposition-typed cleanup;
- immutable chained stage evidence manifests;
- recoverable runs never expiring by age; and
- a side-effect-free `--dry` interpreter of the same Effect program.

## Connascence check

- Operation ordering is strong execution connascence. It is localized in the
  live operation interpreter instead of split between callers and adapters.
- Operation tags, persistence schemas, live handling, simulation handling,
  recovery handling, authorization, and trace rendering must change together.
  One tagged algebra plus exhaustive matching makes that coupling local and
  compiler-visible.
- `OperationId` is threaded through intent, adapter invocation, observation,
  and retry. It is one domain identity, not repeated string conventions.
- Planned Git locators and discovery must change together. One execution
  service owns both allocation and `createOrDiscover`; no caller reconstructs
  paths or branch names.
- Evidence roles, sealing, and transition admission must change together. A
  narrowed sealed-manifest type carries that proof into the transition.
- Retry scope, counter, deferral, and schedule policy are distinct variants,
  preventing callers from remembering which generic counter they are using.
- Terminal disposition and permissible cleanup must change together. Cleanup
  accepts disposition-specific authorization rather than a boolean or status
  plus optional fields.
- Live and dry behavior must change together. They run one Effect program and
  operation algebra under different layers; there is no duplicated traversal
  algorithm.

## Verification

Implementation must include all of the following:

1. Contract-test every live service against real and test layers, including
   journal append identity, SQLite crash tails/transactions, tracker reads and
   mutations, Git discovery, executor create-or-discover, evidence sealing,
   and idempotent cleanup.
2. Run the same scheduler fixtures through live-fake and dry-run layers and
   assert identical operation traces up to explicitly interpreter-owned
   observations. Assert that the dry layer performs zero filesystem, Git,
   journal, tracker-mutation, and process-launch operations.
3. Inject death before and after every intent, external effect, observation,
   evidence seal, integration, tracker transition, and cleanup boundary.
   Recovery must resume, restart, preserve, reconcile, or request operator
   disposition exactly as the typed protocol declares.
4. Use `TestClock` for retry deferrals and prove overdue, future, and
   coordinator-interrupted reviewer cases without real sleeping.
5. Prove a thirty-day-old recoverable run resumes while terminal runs leave the
   hot event tables after archive. Prove quarantined runs cannot auto-retire.
6. Prove resource conflicts remain local when resources do not overlap and
   that journal, coordinator, accepted-head, and shared-lock contradictions
   prevent every operation that could touch the disputed authority.
7. Prove all persisted and external values decode at their boundary, all
   independent recovery issues accumulate, and no ordinary runtime failure is
   represented by an assertion or exception.
8. Confirm no modeled D&D rule changes: consult `.references/srd-5.2.1/` and
   `UBIQUITOUS_LANGUAGE.md`; record that the implementation concerns Ralph
   orchestration only and introduces no RAW or D&D terminology.
9. Run the repository's focused checks and required resource-bounded public
   scripts. Do not add battle MBT or QNT proof runs for this orchestration-only
   work unless a later implementation unexpectedly changes those owners.
10. After implementation, run RAW traceability, ubiquitous-language/domain,
    architecture/connascence, and code-review passes. Fix every reasonable
    finding, reject a finding only with a concrete recorded reason, and repeat
    the full reviewer loop until no reasonable findings remain. Significant
    changes require at least two rounds even when the first round appears
    clean.

## Review record for this decision

Round one found and removed three misleading shapes from the provisional
discussion: a generic `safe worktree` predicate, invented worktree ownership
metadata, and a permanent closed operation catalog. It replaced them with
exact planned Git locators plus observed Git facts, `UntrackedExecution`, typed
resource conflicts, and deliberate algebra extension under exhaustive
handling.

Round two checked authority duplication, lifecycle, Effect dependency
injection, dry-run mutation boundaries, retry accounting, evidence closure,
cleanup ordering, archive retention, and connascence. No D&D rule or ubiquitous
language term is modeled. The remaining detailed tracker algebra, operator UX,
and deterministic test implementation belong to their existing child tickets
rather than being duplicated here.
