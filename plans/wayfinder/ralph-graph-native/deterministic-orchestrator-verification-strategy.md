# Ralph Deterministic Orchestrator Verification Strategy

Decision asset for [Design deterministic verification for Ralph's
orchestrator](https://github.com/dearlordylord/5e-quint/issues/187), under
[Wayfinder: Ralph graph-native
orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

This strategy verifies the Ralph orchestrator against its independently accepted
contract. Historical-harness traces and artifacts may motivate scenarios, but
behavioral parity, replay, migration, and compatibility with
`scripts/ralph-run.sh` are not verification goals.

## Answer

Verify Ralph with one executable workflow program, one canonical trace
contract, and four progressively more concrete test lanes:

1. pure domain properties for graph projection, planning, reconciliation,
   codecs, evidence chains, and resource admission;
2. deterministic Effect scenarios using controlled service layers,
   `TestClock`, `Deferred`, `Queue`, `Latch`, and `Ref`;
3. reusable port contracts run against both controlled adapters and the real
   SQLite, Git, filesystem, process, evidence-store, resource-lock, and tracker
   adapters; and
4. one bounded local end-to-end lane using real processes, repositories,
   worktrees, journal storage, and resource locks, with only the tracker and
   agent intelligence simulated deterministically.

The scenario lane is the behavioral authority. It runs the same scheduler and
planner under live-fake, dry-run, and test layers and compares their canonical
workflow traces. The real-adapter lanes prove that capability implementations
honor the facts assumed by those scenarios. The end-to-end lane proves the
layers are wired together without trying to repeat the full scenario matrix
through slow external resources.

Do not create a second expected scheduler or persist expected workflow state in
the test harness. Fixtures provide authoritative observations and capability
outcomes; assertions inspect the operations selected by Ralph and the facts
left in each owning authority.

## Verification vocabulary

- **Scenario** is an immutable set of initial authority observations plus a
  finite script of controlled capability outcomes. It is test input, not a
  scheduler snapshot.
- **Workflow trace** is the ordered, canonical record of Ralph directives and
  observed domain outcomes emitted by the workflow program. It contains no
  adapter-private calls, timestamps, paths, PIDs, SQL rows, or presentation
  text.
- **Capability audit** is an interpreter-specific record of attempted reads
  and writes at capability boundaries. It proves which effects occurred but is
  not part of workflow semantics.
- **Fault point** is a deterministic interruption boundary around one
  ambiguity-crossing operation: before intent, after committed intent, after
  the external effect, or after the observed outcome.
- **Contract suite** is one reusable set of laws for every implementation of a
  capability port.
- **Qualification fixture** is a real external resource used to prove one
  adapter contract. It never becomes task or workflow authority.
- **Verification evidence manifest** is the sealed, content-addressed record of
  a verification run. It is distinct from a task's implementation, review,
  integration, and cleanup stage manifests.

These are Ralph orchestration terms. They do not belong in the D&D ubiquitous
language, Cleanroom glossary, or modeling assumptions.

## What each layer proves

| Layer                    | Uses                                                           | Proves                                                                                                                       | Must not prove by duplication                                  |
| ------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Pure domain              | Values and pure functions                                      | Construction, canonicalization, state narrowing, planning, reconciliation, serialization, algebraic laws                     | Adapter behavior or wall-clock/process behavior                |
| Deterministic scenario   | One workflow program plus controlled Effect layers             | Scheduling, retry, recovery, review, integration, quarantine, cleanup, restart, and resource behavior                        | A unique agent-produced diff or adapter internals              |
| Port contract            | Reusable laws against controlled and production adapters       | Boundary decoding, idempotency, compare-and-set, discovery, interruption, and typed failures                                 | Whole-run scheduling                                           |
| Bounded local end to end | Real journal, Git, worktrees, processes, filesystem, and locks | Runtime wiring and cross-port lifecycle                                                                                      | Exhaustive failure combinations                                |
| Tracker qualification    | Disposable tracker-owned fixtures                              | Native pagination, closure, identity, dependencies, claims, evidence, ambiguous mutation reconciliation, and human conflicts | Ralph domain semantics already proved through the tracker port |

No battle MBT or QNT proof lane applies. This effort changes orchestration
infrastructure, not battle behavior or SRD formalization.

## One program and one trace

### Workflow and interpreters

The coordinator is one Effect program that repeatedly:

1. reads a complete authoritative observation;
2. parses it into narrowed domain facts;
3. invokes the total planner;
4. emits one typed workflow operation;
5. interprets that operation through supplied capabilities; and
6. observes the resulting authority facts before planning again.

Production, live-fake, dry-run, and test are layer compositions around that
program. There is no dry scheduler, recovery scheduler, or test scheduler.

- **Production** uses every real service and records the real journal.
- **Live-fake** interprets mutations against controlled in-memory authorities,
  including intent/outcome journaling and capability audits.
- **Dry-run** receives the real `TrackerGraphReader` but no production journal,
  tracker mutation, filesystem mutation, Git mutation, or process-launch
  capability. Its simulation authorities exist only in memory.
- **Test** uses the same controlled authorities plus inspection and fault
  controls that production code cannot access.

The absence of mutating production services from the dry layer is a compile-
time and layer-construction fact. The capability audit independently proves at
runtime that no write was attempted.

### Canonical workflow trace

Every trace item is one schema-decoded tagged value containing only the domain
identities and facts needed to explain the transition. Initial variants should
cover:

- accepted complete observation;
- selected operation;
- committed intent;
- observed operation outcome;
- retry deferred or made eligible;
- reconciliation conflict or requested disposition; and
- terminal run disposition.

The operation value already owns task, attempt, stage, target, resource, and
operation identities. Trace items reference that value or its canonical
projection rather than copying its fields into parallel trace metadata.
Presentation strings and Mermaid diagrams derive from the trace.

Trace equality compares a **semantic projection** that removes facts owned by
an interpreter, such as an in-memory journal position versus a SQLite journal
position. The projection is one shared function used by all comparison tests;
each scenario declares no custom ignore list. Stable scenario identities and
logical instants replace generated UUIDs and wall-clock times.

For every core scenario, assert:

```text
semanticTrace(liveFake) == semanticTrace(dryRun) == semanticTrace(test)
```

The complete traces may differ only in the explicitly typed
interpreter-observation variants removed by `semanticTrace`. The live-fake and
test final authority projections must also agree. Dry-run final facts exist
only in its simulation and must leave every supplied real authority unchanged.

### Side-effect audit

Every capability boundary records a typed audit entry classified as a read or
one of these write authorities:

- journal;
- filesystem;
- Git;
- tracker mutation;
- process launch or termination; or
- evidence bytes.

Dry-run may contain reads and simulated workflow outcomes. Its audit must
contain zero entries in every write class. Snapshot the configured real
authorities before and after dry traversal as defense in depth: no journal file
or run row, file or worktree, Git ref/index/commit, tracker mutation, child
process, or evidence artifact may appear.

## Test-support architecture

### Controlled authorities

Build first-class test services backed by the same object for each production
service tag and its test-control tag. Production code depends only on the
production tag. Test controls expose operations such as:

- replace the next complete tracker observation;
- return a typed partial-read or mutation result;
- gate an executor, reviewer, integrator, verifier, or cleanup operation;
- expose observed calls and authority contents;
- fail, time out, interrupt, or crash at a named fault point; and
- advance a logical capability result without sleeping.

Use `Deferred`, `Queue`, and `Latch` for ordering and concurrency assertions.
Use `Ref` for observation state. Use `TestClock` for retry schedules, grace
periods, leases, and timeouts. Tests must not use real sleeps or infer
concurrency from log timestamps.

The scenario builder accepts complete domain observations. Raw malformed
payloads belong to adapter contract fixtures so internal workflows never
receive `unknown`.

### Fault-point coverage

Each ambiguity-crossing operation has a typed sample factory in a compile-time
complete test record keyed by the workflow-operation tag. For each applicable
operation, a table-driven contract injects death at these boundaries:

1. before intent append;
2. after intent commit and before external invocation;
3. after the external effect and before outcome append; and
4. after outcome commit and before the next plan.

Evidence sealing, promotion, tracker transitions, and destructive cleanup also
inject failure inside their adapter-owned atomic boundary where the adapter can
truthfully distinguish not-applied, applied, and ambiguous results. A missing
sample for a newly added operation is a compile error. The operation algebra,
not a hand-maintained prose matrix, remains the source of operation membership.

The generic fault contract asserts recovery is idempotent, never blindly
repeats an ambiguous effect, and reaches either the same stable authority state
as an uninterrupted run or the exact typed conflict/disposition required by
policy. Operation-specific scenarios then assert stronger facts such as exact
ancestry, claim retention, or cleanup preservation.

### Policy supplied by the operator decision

The parallel [Define Ralph's operator and resource-control
surface](https://github.com/dearlordylord/5e-quint/issues/186) decision owns
concrete positive capacities, schedules, grace periods, review caps, and
operator authorizations. This strategy defines reusable tests over a supplied
`ResourcePolicy`; it does not select those values.

Contract tests reject zero, negative, contradictory, or unbounded policies at
the configuration boundary. Scenario tests exercise the minimum positive
policy and at least one multi-slot policy, plus every boundary at `limit - 1`,
`limit`, and attempted `limit + 1`.

## Deterministic behavioral suites

### Graph and tracker projection

Prove with examples and bounded `fast-check` properties:

- grouping descendants plus external prerequisites form one complete closure;
- grouping and dependency remain independent relations;
- permutation of tracker enumeration produces identical canonical encoding
  and deterministic traversal;
- encode/decode round-trips preserve the canonical snapshot;
- duplicate identities or edges, missing endpoints, cycles, inaccessible
  prerequisites, partial pagination, and contradictory equal revisions expose
  typed issues and no schedulable snapshot;
- only successful completion satisfies a blocker; and
- eligibility is derived from lifecycle, admission, claim, and prerequisites
  rather than stored.

Generate small valid DAGs directly—normally 0 to 12 tasks with bounded edge
density—and generate invalid graphs by applying one named corruption. Avoid
filter-heavy generators. Retain explicit examples for the empty graph, one
task, one external prerequisite, diamond dependency, disconnected grouping,
and cycle.

### Scheduler and resources

Use gates rather than timestamps to prove:

- two ready tasks begin execution before either is released;
- execution never exceeds its supplied capacity;
- integration-agent capacity, one-per-target integration lease, and heavy
  verification lock are distinct resources;
- work for different non-overlapping authorities continues during a localized
  conflict;
- journal, coordinator, accepted-head, target-lease, or shared-lock conflict
  stops every operation that could touch that authority; and
- no resource count or lock observation is persisted as tracker or journal
  truth.

The repository heavy-verification wrappers remain the authority. A fake lock
port proves scheduler admission; the real lock contract proves that Ralph
waits for and invokes the public guarded command without nesting or bypassing
the lock.

### Retry and review convergence

Use `TestClock` and distinct typed retry variants to prove:

- future deferrals sleep for only the remaining duration after recovery;
- overdue deferrals are immediately eligible;
- starting the exact next attempt supersedes one deferral;
- technical reviewer retries do not consume semantic handback rounds;
- coordinator interruption consumes neither technical nor semantic budget;
- a non-zero implementation-agent exit, including simulated OOM, preserves the
  exact worktree and session together and resumes that session in the same
  attempt after the resource cause is addressed;
- incomplete implementation WIP is not advanced to semantic review merely
  because its process exited;
- review rejection returns to the same implementer session and attempt;
- fresh reviewers see the full unresolved finding history;
- acceptance occurs only when no reasonable finding remains; and
- each cap exhausts to its own typed non-convergent disposition.

The tests assert operations, attempt/session identities, counters, sealed
evidence, and dispositions. They do not assert the text of an agent's patch.

### Accepted-head integration

Controlled agent and reviewer outputs must falsify:

- two independent accepted results queue by committed journal position and
  integrate serially while task execution stays concurrent;
- queue order survives death and is independent of timestamps, task IDs, and
  input enumeration;
- ancestor-based stale results remain admissible after an independent
  integration, while unrelated or rewritten lineage fails before agent launch;
- conflict resolution, reviewer rejection, same-session handback, and fresh-
  reviewer acceptance create no tracker graph node;
- cap exhaustion materializes `IntegrationNonConvergent`, preserves evidence,
  keeps dependants blocked, releases the target, and admits unrelated work;
- verification precedes promotion;
- compare-and-set promotion expects the exact candidate first parent;
- the promoted result has the exact accepted-result parent, not merely
  equivalent content;
- a promoted result missing journal acknowledgement is discovered by exact
  ancestry; and
- tracker-confirmed completion in a refreshed complete snapshot is the only
  fact that releases dependants.

### Tracker claims and completion

Run the tracker mutation contract and workflow scenarios for:

- exactly one winner from competing claim acquisition;
- stale or foreign tokens rejected for release, quarantine, completion start,
  completion, and deletion;
- claim retention after crashes, timeouts, failed attempts, and quarantine;
- idempotent evidence attachment after an ambiguous response;
- active-to-completion claim narrowing with exact evidence receipt,
  `TaskExecutionRevision`, and promoted-integration proof;
- death around every completion step without reopening a completed task or
  releasing an incomplete one;
- contradictory human or foreign-run changes surfaced and never overwritten;
  and
- live-query additions, unstarted removals, and claimed-task removal conflict.

### Immediate clean restart

Drive a real child process that writes heartbeats in its owned worktree and has
one owned descendant process. Deterministically request restart and prove:

1. `RestartRequested` is durable before interruption;
2. the active implementation is interrupted immediately;
3. the grace deadline is controlled by `TestClock` in scenarios and a short
   bounded duration in the real-process contract;
4. only the identified owned process tree is terminated;
5. both parent and child are dead before cleanup begins;
6. interrupted evidence is sealed as partial;
7. default cleanup removes only the superseded attempt resources, or an
   explicit retention disposition preserves them;
8. the exact tracker claim survives;
9. the new attempt uses the latest task revision and accepted head with no old
   WIP; and
10. the state-typed API rejects restart after `IntegrationStarted`.

Failure to prove process-tree death must leave the old resources intact and
produce a recoverable conflict. Include a foreign process with a similar name
to prove cleanup uses ownership identity rather than process-name matching.

### Journal, archive, recovery, and cleanup

The logically append-only journal and recovery suites prove:

- identical record-key/content append is idempotent, while equal key with
  unequal content is a typed contradiction;
- canonical positions are ordered and stable across reopen;
- schema decoding and migrations reject malformed or unsupported data without
  exposing a partial run;
- SQLite transaction rollback and process death cannot acknowledge a partial
  append;
- all independent recovery issues accumulate;
- recovery records already-completed external effects before continuing;
- recoverable runs resume regardless of age;
- terminal runs archive losslessly before hot-row deletion;
- quarantined runs cannot auto-retire; and
- cleanup is idempotent over exact locators and follows only a narrowed
  integrated, abandoned, quarantined, or ambiguous disposition.

Do not use the disposable NDJSON prototype as the production-journal oracle.
It remains evidence about the selected seams only.

### Evidence manifests

Property and example tests prove:

- manifest encode/decode round-trip and deterministic content identity;
- changing artifact bytes, roles, ownership identity, completeness, schema
  version, or predecessor changes the content identity;
- declared byte sizes and hashes match stored artifacts;
- every stage after the first links the exact preceding manifest;
- partial evidence cannot narrow to acceptance, promotion, tracker completion,
  or destructive-cleanup authorization;
- accepted-result queueing requires sealed implementation and review evidence;
- tracker completion requires sealed integration-review and verification
  evidence; and
- cleanup produces a later outcome manifest rather than mutating an earlier
  one.

Use the production verifier to check generated manifests; do not reproduce its
hashing or chain algorithm in the test assertion.

## Port qualification

### Reusable contract suites

Every replaceable adapter runs a shared contract suite. The suite accepts an
adapter-specific fixture factory and black-box observation controls; it does
not inspect private tables or calls when a public authority observation can
prove the result.

Required suites are:

- `JournalStore`: append identity, ordering, reopen, migrations, atomicity,
  archive, and typed storage failures;
- `TrackerGraphReader`: closure, pagination, canonical revisions, stable
  identity, grouping/dependency separation, and fail-fast completeness;
- `TrackerMutation`: exact claims, evidence idempotency, compare-and-set
  completion, ambiguous outcomes, human conflicts, and live membership;
- `GitLineage`: exact ancestry, candidate parents, ref compare-and-set,
  create-or-discover, and contradictory resources;
- `Execution`: worktree lease, exact session discovery/resume, bounded process
  outcomes, owned-tree interruption, and untracked execution preservation;
- `EvidenceStore`: atomic bytes, hashes, immutable sealing, chain verification,
  and partial artifacts;
- `Cleanup`: exact authorization, idempotency, crash discovery, and
  disposition-specific preservation; and
- `RepositoryResourceLock`: shared-lock exclusion, public-wrapper invocation,
  interruption, and no nested lock ownership.

Controlled adapters run these contracts on every pull request. Production
adapters run them against temporary resources locally and in CI wherever the
resource is hermetic.

### Real tracker fixture

The GitHub adapter qualification lane uses a dedicated disposable repository
or a uniquely named fixture subtree, never this Wayfinder map or product work.
It creates native grouping and dependency relations, paginates beyond one
page, uses GraphQL node identity as opaque adapter input, races two claim
mutations, injects an ambiguous client response followed by read-back, edits a
task as a human/foreign actor, and removes tasks from a live query.

The lane serializes against itself, records every created identity, and cleans
only confirmed fixture resources. Cleanup failure retains the fixture and
reports exact locators. Network/provider failures are a distinct typed lane
failure, never silently converted into a passing adapter contract.

Because this lane depends on credentials and network behavior, it is not the
sole evidence for any domain rule. The controlled adapter suite provides fast,
deterministic coverage; the real fixture qualifies the native projection.

## Bounded end-to-end lane

Run one hermetic local scenario with:

- a temporary Git repository and bare remote;
- real task branches, worktrees, commits, ancestry, and accepted-head ref;
- the real SQLite journal and evidence store;
- real coordinator and worktree leases;
- real child processes with bounded scripted output;
- real repository resource-lock wrappers around a harmless focused command;
- a deterministic in-memory tracker adapter that passes the shared tracker
  contract; and
- deterministic scripted implementer, reviewer, integrator, and verifier
  processes.

The graph contains two initially ready tasks and one dependant. One ready task
integrates normally. The other requires one integration handback. Their
accepted results queue durably, integration is serialized, promotion uses
exact ancestry, tracker completion releases the dependant only after refresh,
and terminal cleanup removes only authorized resources. Interrupt the
coordinator once after a real external effect but before its journal outcome,
then restart the same run and require convergence without duplicate mutation.

Keep this lane fixed, single-worker, and bounded by per-process and whole-lane
timeouts. It must finish from local resources without model or network access.
Do not multiply it by every failure point; those combinations belong to the
deterministic scenario and port-contract lanes.

## Stateful properties and formal-model boundary

Use bounded stateful `fast-check` commands for protocols with small, precise
state:

- journal append/reopen/archive;
- tracker claim acquisition through completion and deletion;
- evidence-chain construction and authorization narrowing;
- integration FIFO and target-lease release; and
- recovery idempotence after generated fault points.

The model records only externally visible authority facts needed to state the
law. It must not reimplement the production planner. Commands invoke public
operations, check preconditions from observations, and assert invariants such
as unique ownership, monotonic evidence chains, exact compare-and-set, no
incomplete blocker release, and `recover(recover(x)) == recover(x)` once no new
authority fact arrives.

Constrain generated sequences to small domains and fixed maximum lengths so
shrinking remains useful and CI cost remains predictable. Persist the seed and
minimal counterexample in the verification evidence manifest.

Do not introduce a Quint model in the first implementation. The operation
algebra and planner are still being promoted into their owning specification;
an independently maintained transition model would duplicate unsettled state
and operation membership. Reconsider a formal model only if implementation
reveals a compact stable protocol whose concurrent safety property cannot be
adequately falsified by deterministic schedules and stateful properties. If
selected later, the model must project from the same named domain operations
and have an explicit conformance bridge.

## Verification evidence

Each qualifying run seals a verification evidence manifest containing:

- repository commit and dirty-state observation;
- test package and suite identity;
- command and configuration identities;
- Effect, Node, SQLite, Git, and adapter versions;
- scenario identities;
- property seeds and run counts;
- canonical workflow-trace and capability-audit hashes;
- pass, typed failure, interruption, and timeout results;
- artifact locators for traces, counterexamples, process output, repository
  observations, and adapter fixtures; and
- predecessor manifest when the run supersedes an earlier result.

Suite membership is discovered from executable tests and their typed scenario
metadata. Do not maintain a second handwritten checklist of test file names.
The accepted implementation specification may map requirements to stable
scenario identities, and CI must fail if a referenced identity is absent or
duplicated.

A partial, killed, or timed-out run seals partial diagnostic evidence and
cannot authorize acceptance. Exit 137 triggers the repository emergency
protocol; the partial run is not verification and must not be retried unchanged.

## CI and resource budget

Use these lanes deliberately:

1. **Focused development:** one pure or deterministic scenario file.
2. **Pull request deterministic:** typecheck, pure properties, all controlled
   scenario suites, and controlled port contracts; single Vitest worker where
   required by repository policy.
3. **Pull request hermetic integration:** real SQLite, Git, filesystem,
   process, evidence, cleanup, and resource-lock contracts plus the one bounded
   local end-to-end scenario.
4. **Tracker qualification:** serialized credentialed GitHub fixture lane when
   tracker-adapter code changes and on a scheduled cadence.
5. **Release readiness:** all preceding lanes against the exact candidate
   commit, followed by acceptance of the Ralph orchestrator on its own contract.

Run public root verification scripts directly under their existing shared
resource guard. Focused package checks stay focused. Never run broad workspace,
QNT proof, battle MBT, or fuzz commands merely to increase apparent coverage
of this orchestration-only change.

Every spawned process and property run has a positive bound. The bounded local
end-to-end lane is serialized. Tests confirm no second heavy verifier starts
while the repository lock is held and check for surviving owned child
processes before teardown.

## Acceptance gates

The implementation is verified only when:

1. every workflow-operation tag has live-fake, dry-run, test, trace, recovery,
   authorization, and fault-sample handling enforced by exhaustive types;
2. all core scenarios have equal semantic traces across live-fake, dry-run,
   and test interpreters;
3. dry-run has zero audited or observed writes while traversing the complete
   graph;
4. every controlled and production adapter passes its applicable shared
   contract;
5. every ambiguity boundary converges or yields its exact typed conflict under
   deterministic crash injection;
6. scheduler, retry, review, integration, tracker, restart, quarantine,
   cleanup, and resource scenarios above pass;
7. evidence-chain and verification-evidence assertions pass;
8. the bounded local end-to-end lane passes without leaked processes,
   worktrees, refs, locks, or temporary tracker state;
9. no ordinary runtime/domain failure uses an assertion or exception;
10. focused and required resource-bounded repository checks pass; and
11. the reviewer loop converges with no reasonable findings remaining.

## Documentation, RAW, and reviewer convergence

This decision changes Ralph tooling verification architecture only. It changes
no main-application architecture and models no D&D rule, authored content,
battle-runtime behavior, or Quint parity obligation.
Before implementation acceptance, inspect `.references/srd-5.2.1/` ownership
and `UBIQUITOUS_LANGUAGE.md` and record that no modeled rule or D&D term changed;
there is no rule passage to cite beyond that non-applicability check.

After implementation, run these review passes:

1. RAW and authored-content boundary;
2. ubiquitous and Ralph domain language;
3. architecture, authority ownership, redundant state, and connascence; and
4. code review under `.claude/review-rules.md`.

Fix every reasonable finding and repeat the full loop until none remain.
Record a concrete reason beside any rejected note. Significant changes require
at least two complete rounds even if the first appears clean.

The accepted implementation specification will own executable requirements.
This Wayfinder asset remains historical decision evidence and must not become a
parallel tooling architecture, glossary, acceptance ledger, or test inventory.

## Connascence check

- Operation tags, planners, interpreters, recovery, authorization, traces, and
  fault samples must change together. Exhaustive tagged matching and the typed
  operation sample record make that name/type coupling local and compiler-
  visible.
- Live-fake, dry-run, and test traversal must change together. One workflow
  program and one semantic trace projection remove distant algorithm coupling.
- Intent/effect/outcome order is strong execution connascence. The operation
  interpreter owns it; tests inject faults at its named boundaries rather than
  reproducing the sequence in callers.
- Queue order and integration restart order share one journal position. Tests
  never reconstruct FIFO from timestamps, task numbers, or array positions.
- Evidence identity, artifact hashes, completeness, predecessor, and transition
  admission change together. Production manifest verification and narrowed
  authorization types own that relationship.
- Process interruption, writer death, and cleanup order are high-risk timing
  connascence. One owned-process-tree operation proves termination before it
  can return cleanup authorization.
- Tracker completion and dependant release remain deliberately sequential
  across tracker authority. Only a refreshed complete snapshot derives the new
  frontier.
- Test scenario IDs and requirement references change together. CI discovers
  typed test metadata and rejects missing or duplicate IDs instead of relying
  on a parallel file-name list.

## Decision review record

Round one reconciled the durable-journal, concurrent-integration, tracker-port,
immutable-DAG, control-plane-prototype, current Ralph, Effect V4 testing, and
property-testing contracts. It separated semantic workflow traces from
interpreter capability audits, kept dry-run mutation absence both layer-typed
and observable, and assigned real resources only to adapter qualification and
one bounded end-to-end lane.

Round two challenged authority duplication, agent nondeterminism, crash-matrix
growth, test-only registries, resource timing, process cleanup, evidence
closure, tracker network dependence, and formal-model drift. It made resource
policy an input from the parallel operator decision, replaced a second
scheduler model with operation-level stateful properties, made fault coverage
compile-time complete over the operation algebra, and retained real GitHub
qualification without making it the domain oracle. No reasonable finding
remains; no D&D RAW or ubiquitous-language change applies.
