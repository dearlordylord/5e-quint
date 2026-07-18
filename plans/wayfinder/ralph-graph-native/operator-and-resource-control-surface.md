# Ralph Operator and Resource-Control Surface

Decision asset for [Define Ralph's operator and resource-control
surface](https://github.com/dearlordylord/5e-quint/issues/186), under
[Wayfinder: Ralph graph-native
orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

## Answer

Ralph exposes a closed, state-typed operator-control algebra over run scheduling,
exact attempts, integration recovery, disposition, and durable policy. A local
control service is the mutation boundary; CLI is the first client, while TUI,
web, dry-run, tests, and later diagrams consume the same schemas and trace.

Pause-scheduling gates new admission without interruption. Drain is the derived
quiescence barrier over that gate. Cancellation proves an exact pre-integration
attempt stopped writing while retaining its claim and resources. Abandonment
releases a claim and authorizes exact cleanup; quarantine releases ephemeral
capacity while retaining claim, lineage, sessions, and evidence. Work after
`IntegrationStarted` cannot be cancelled or clean-restarted.

Task execution is dynamically bounded from one through eight with a default of
two. Integration remains one agent repository-wide and one active lifecycle per
target in v1. The repository's heavy-verification lock stays external authority.
All capacities, durations, limits, identities, revisions, and resource locators
are parsed into distinct constrained brands at their boundaries.

## Resolved domain language

- **Pause scheduling** durably stops admission of new workflow fragments while
  already-running fragments continue. The bare term `pause` is not used because
  it misleadingly suggests interruption of active work.
- **Drain** pauses scheduling and waits until admitted workflow fragments reach
  stable boundaries and release their runtime permits. It is a quiescence
  barrier for maintenance, shutdown, or handoff, not a second durable scheduler
  state. A paused run may still be active; a successfully drained run is
  quiescent.
- Pause-scheduling and drain may target either one recoverable run or the whole
  repository coordinator. They do not target individual tasks: task admission
  remains tracker authority, while active task disposition uses the explicit
  attempt and claim operations below.
- **Resume scheduling** removes the matching run- or coordinator-scoped
  scheduling gate only after Ralph refreshes tracker, Git, journal, executor,
  evidence, and resource facts. It does not choose a recovery policy for
  cancelled work. A cancelled attempt instead requires an explicit
  `ContinueAttempt` when its exact session and lineage remain valid, or the
  already-selected clean `RestartAttempt` workflow.
- **Cancel** interrupts an interruptible owned workflow fragment, seals its
  partial evidence, and leaves its claim and recoverable resources under Ralph
  ownership. Cancellation is not abandonment and does not authorize claim
  release or destructive cleanup.
- The durable cancellation operation targets one exact attempt. Run- and
  coordinator-level bulk commands are projections that expand into and report
  one `CancelAttempt` operation per eligible attempt; they do not create a
  generic bulk-cancel state. Active integration lifecycles are reported as
  non-cancellable and remain under their integration-target leases.
- A successful `CancelAttempt` proves quiescence: Ralph durably requests
  cancellation, sends a graceful interrupt, bounds the grace period, terminates
  only the proven-owned process tree if necessary, confirms that its writers
  stopped, and seals partial evidence. Failure to prove ownership or termination
  returns a typed cancellation conflict and preserves all resources.
- **Abandon** is an explicit terminal operator disposition that relinquishes
  execution ownership. It seals abandonment evidence, compare-and-set releases
  the exact active claim, and authorizes cleanup only for the resources named by
  the resulting abandonment authorization.
- **Quarantine** is an explicit preservation disposition. It stops owned live
  processes and releases ephemeral runtime permits while retaining the claim,
  worktree, branches, sessions, and evidence for reconciliation or redesign.
- Work at or after `IntegrationStarted` is not cancellable. The integration
  lifecycle must reconcile to a stable outcome before later corrective work can
  begin.

## Resolved resource policy

- Task execution, integration-agent work, integration-target leases, and the
  repository heavy-verification lock are distinct typed resources. Waiting for
  any resource is scheduling pressure, not a tracker blocker or retry attempt.
- V1 admits exactly one integration agent for the repository coordinator and
  exactly one active integration lifecycle per integration target. The
  integration-agent resource remains a distinct architecture seam, but `1` is
  a protocol invariant rather than an operator-configurable capacity. Supporting
  multiple integration agents later requires an explicit protocol decision and
  concurrency evidence; it cannot be enabled by changing a number.
- The existing Git-common-directory heavy-verification lock and its public
  wrappers remain sole authority. Ralph may observe and wait for it but cannot
  configure, duplicate, bypass, or pre-acquire it through an in-memory permit.
- Only task-execution capacity is operator-configurable in v1. A decrease is
  non-preemptive: current holders continue, and new task execution waits until
  usage is below the new positive bound.
- Task-execution capacity defaults to `2`. It is a ceiling over concurrently
  admitted frontier-task implementation pipelines, not a promise of parallel
  work when the tracker DAG exposes fewer eligible tasks. Operators may select
  another positive bound.
- `TaskExecutionCapacity` accepts integers from `1` through `8`, inclusive. The
  default is `2`; values outside the range are rejected by the branded boundary
  schema.
- Every live policy change is non-preemptive. A workflow fragment retains the
  resource permit and policy values captured by its admitting operation. For
  example, lowering task-execution capacity from six to two lets all six
  admitted pipelines continue and withholds new permits until usage falls below
  two.
- `IntegrationReviewRoundLimit` accepts integers from `1` through `20`,
  inclusive, and defaults to `6`. Initial configuration sets the fresh
  coordinator value; a live typed operation changes the durable default.
  `IntegrationStarted` captures the effective limit, so later changes affect
  later integration lifecycles and never move an active loop's terminal bound.
- Integration-agent and integration-reviewer technical invocation failures use
  an Effect exponential retry schedule. `TechnicalAttemptLimit` is separately
  branded, accepts `1` through `10` total attempts, and defaults to `3`.
  `TechnicalRetryInitialDelay` accepts `1 second` through `5 minutes` and
  defaults to `5 seconds`; `TechnicalRetryMaximumDelay` accepts the initial
  delay through `30 minutes` and defaults to `1 minute`. The exponential factor
  is the fixed protocol value `2`, so the default retry delays are five and ten
  seconds before the three-attempt limit is exhausted.
- A technical retry scope captures its effective policy on its first invocation.
  Startup configuration initializes a fresh coordinator and live typed
  operations change the durable defaults for later scopes. Technical failures
  never consume semantic review rounds. The schedule decides one exact branded
  `notBefore` instant and journals that fact; recovery does not persist or
  reconstruct an in-memory timer.
- Exhausting technical attempts produces a recoverable
  `TechnicalRetryExhausted` disposition, not semantic non-convergence. Ralph
  preserves the integration candidate, exact sessions, evidence, task claim,
  and integration-target lease. Unrelated task execution may continue, but
  later queue entries cannot integrate onto that target. The operator may
  authorize a fresh technical retry scope, replace a proven-unresumable session,
  or quarantine the integration. Cancellation and clean restart remain invalid
  after `IntegrationStarted`.
- The running coordinator accepts live capacity changes through one local
  control endpoint, validates and journals them, and applies them on its next
  scheduling cycle. A CLI is a client of that endpoint and never becomes a
  second SQLite writer or policy authority. Increasing capacity may admit more
  frontier work immediately; decreasing it remains non-preemptive.
- Owned attempt-process shutdown has a default graceful period of `10 seconds`.
  Ralph requests cooperative shutdown first, then terminates only the
  proven-owned process tree after that deadline. The period is configurable at
  initial coordinator creation and through a live typed control operation. A
  cancel, restart, or quarantine operation captures the effective deadline when
  it is durably requested; later policy changes affect only later shutdowns.
- `OwnedProcessShutdownGracePeriod` accepts whole-second durations from `1 second`
  through `5 minutes`, inclusive. The default is `10 seconds`; values outside
  the range are rejected by the branded boundary schema.
- `InitialControlPolicy` is accepted only while creating a fresh coordinator
  database. Once durable policy exists, normal startup supplies no second copy:
  recovery reads the last durable revision, and changes go through the live
  control operation. Passing initialization-only policy to an existing database
  is rejected as an inapplicable command rather than compared with or silently
  overriding durable policy.

## Reliability baseline

The graph-native Ralph implementation must meet this repository's existing
quality gates and the reliability baseline demonstrated by the sibling
`hulymcp` harness:

- schemas own every CLI, control-endpoint, journal, SQL, tracker, Git, process,
  evidence, configuration, and trace boundary shape;
- meaningful primitive domains are constrained and branded at their first
  boundary, including capacities, durations, ordinals, operation identities,
  run/task/attempt identities, revisions, resource identities, and evidence
  identities;
- brands are compile-time distinctions erased at runtime; successful Schema
  decoding or a trusted smart constructor supplies the runtime proof;
- expected parse, policy, lifecycle, ownership, authorization, persistence,
  process, and reconciliation failures remain precise typed Effect failures;
- strict TypeScript, exact optional properties, unchecked-index protection,
  exhaustive tagged operations, no cast-based boundary escapes, Effect-layer
  test seams without module mocks, discoverable property tests, high coverage,
  duplication detection, and circular-dependency detection are executable
  gates; and
- the owning package exposes one resource-bounded comprehensive quality command
  integrated with this repository's public verification and reviewer-loop
  requirements.

Generic `number` values and one broad `PositiveInteger` are not sufficient for
distinct domains. For example, `TaskExecutionCapacity` and
`OwnedProcessShutdownGracePeriod` are separately branded schemas even though both
encode positive numbers.

## Operator authorization boundary

- Authorization is durable proof that an operator deliberately requested one
  exact high-impact typed transition. It is not a generic action string and v1
  does not require a new product RBAC system.
- CLI, TUI, web, and future presentations are replaceable clients of one local
  transport-independent control service. The CLI is the simplest first client,
  not policy or mutation authority.
- Abandonment, quarantine, owned-resource cleanup, session replacement after
  retry exhaustion, and other destructive or preservation dispositions carry
  the exact subject, expected claim/revision or narrowed workflow state,
  operator identity supplied by the authenticated local transport, and a
  separately branded non-empty `OperatorReason`. Stale expected state rejects
  the operation.
- A presentation shows the concrete effects and obtains deliberate
  confirmation. A CLI may prompt or accept an explicit `--yes` for automation;
  TUI and web clients may use their native confirmation UX. All produce the same
  schema-decoded authorization request and journal outcome.
- Pause-scheduling, drain, resume-scheduling, non-preemptive policy changes, and
  exact cancellation remain explicit typed control requests but do not need the
  destructive-disposition confirmation gate.

## Observability contract

- One schema-versioned ordered trace is emitted by the control service and
  consumed by CLI, TUI, web, Mermaid, tests, and `--dry` projections. A view is
  derived and never becomes an orchestration authority.
- Trace records are a tagged union rather than one record with optional fields.
  Durable-operation records carry journal position and reference the canonical
  identity projection owned by their workflow operation;
  authority-observation records carry their observation identity; drain-progress
  records carry their subscription sequence. A trace references its operation
  value or one shared canonical projection rather than copying run/task/attempt
  fields into parallel metadata. Each variant carries only the typed resource
  facts, outcome or precise typed failure, and evidence-manifest reference that
  can exist for that event.
- Live ordering derives from committed journal position plus explicit observed
  external facts. Dry and deterministic-test layers allocate an in-memory
  simulation sequence using the same trace schema.
- Trace entries contain no credentials, raw secrets, or full model transcripts.
  Large prompts, reports, diffs, logs, and process snapshots remain sealed
  evidence artifacts referenced by identity.
- The first presentation is a concise ordered console trace. Later visual
  projections must consume the same records rather than reconstructing workflow
  state from logs or tracker metadata.
- A drain subscriber receives `DrainWaiting` immediately, an update on every
  relevant state change, and `DrainProgress` heartbeats every `30 seconds` by
  default. `DrainHeartbeatPeriod` is a branded duration from `5 seconds` through
  `5 minutes`; each client may request a value in that range without changing
  durable orchestration policy. Progress reports elapsed wait, client timeout
  remaining when applicable, active operations and phases, resources still
  held, last meaningful event time, and the explicit facts that scheduling
  remains paused and admitted work continues. It never invents an ETA.
- A client wait timeout or disconnect ends only that observation subscription.
  It never resumes scheduling, cancels work, or changes the durable drain facts.
  A later client reconnects to the same derived drain condition.

## State-typed control operations

The public control service accepts a closed Schema-owned request union. Each
request is planned through the same exhaustive workflow-operation algebra used
by live execution, recovery, dry-run, and tests. Presentations never call Git,
tracker, process, journal, or evidence adapters directly.

| Operation | Legal subject and precondition | Authorized transition or result |
| --- | --- | --- |
| `PauseRunScheduling` | One recoverable run | `SchedulingOpen` to `SchedulingPaused`; idempotently reports an existing matching gate |
| `PauseCoordinatorScheduling` | The repository coordinator | Atomically installs the coordinator gate that prevents admission in every owned run; run-specific gates remain independently represented |
| `AwaitRunDrain` / `AwaitCoordinatorDrain` | Matching scheduling gate exists | Observes until quiescence; creates no `Draining` state and never interrupts work |
| `ResumeRunScheduling` | Exact run gate and fresh reconciled authority facts | Removes only that run gate; a coordinator gate may still prevent admission |
| `ResumeCoordinatorScheduling` | Exact coordinator gate and fresh reconciled authority facts | Removes only the coordinator gate; run gates remain effective |
| `SetTaskExecutionCapacity` | Branded capacity and expected policy revision | Durably changes the future-admission ceiling without revoking held permits |
| `SetOwnedProcessShutdownGracePeriod` | Branded duration and expected policy revision | Changes the default captured by later cancel, restart, and quarantine shutdowns |
| `SetIntegrationReviewRoundLimit` | Branded limit and expected policy revision | Changes the default captured by later integration lifecycles |
| `SetTechnicalRetryPolicy` | One complete branded policy whose initial delay does not exceed its maximum | Changes the defaults captured by later technical retry scopes |
| `CancelAttempt` | Exact claimed attempt with interruptible work before `IntegrationStarted` | `ActiveAttempt` to `CancellationRequested`, then `CancelledAttempt` only after writer termination proof and partial-evidence sealing |
| `ContinueAttempt` | Exact `CancelledAttempt`, active claim, unchanged task revision, proven resumable session and resources | Returns to the same attempt and WIP lineage; otherwise yields a typed continuation conflict |
| `RestartAttempt` | Claimed pre-integration task in any restart-admissible attempt state | Uses the selected immediate clean-restart workflow: stop writers, seal interrupted evidence, dispose or explicitly retain old resources, retain the claim, and create a new attempt from latest revision and accepted head without old WIP |
| `AbandonAttempt` | Quiescent pre-integration attempt with exact `ActiveClaim` | Seals abandonment evidence, compare-and-set releases the claim, and produces disposition-specific cleanup authorization |
| `QuarantineTaskExecution` | Exact active, cancelled, conflicted, or non-convergent pre-integration task | Stops owned processes, releases ephemeral permits, and preserves claim, Git/execution resources, sessions, and evidence |
| `AuthorizeTechnicalRetry` | Exact `TechnicalRetryExhausted` observation | Starts one fresh bounded technical retry scope without altering the semantic review ordinal |
| `ReplaceUnresumableSession` | Executor proves the exact integration agent or reviewer session unresumable | Binds a replacement session to the same semantic step and candidate lineage; it does not create a graph node or semantic handback |
| `QuarantineIntegration` | Exact integration lifecycle at a stable or technically exhausted observation | Records the preservation disposition, releases the target lease and ephemeral permits, keeps the tracker task incomplete and claimed, and preserves candidate lineage and evidence |
| `AbandonQuarantinedTask` | Quarantined task, no live writers, exact `ActiveClaim`, and proof that no candidate was promoted | Seals abandonment evidence, releases the exact claim, and produces exact cleanup authorization; promoted or completing claims are rejected |

Bulk cancellation is a presentation-level plan containing exact
`CancelAttempt` requests and per-attempt outcomes. There is no generic
`ControlAction`, untyped resource name, independent `isPaused` flag, stored
`isDrained` flag, or caller-managed check-then-mutate protocol.

Scheduling gates affect admission of new implementation, review, retry,
integration-agent, and verification fragments. They do not stop authority
refresh, recovery reconciliation, observation, evidence sealing, already
authorized cleanup, or an explicit safety/disposition operation. Quiescence is
derived when no admitted workflow fragment or owned writer remains active and
no task-execution permit, integration-agent permit, integration-target lease,
or repository heavy-verification lock is held by a Ralph-owned fragment in the
drained scope. Unrelated host work does not become part of Ralph's drain.
Durable claims and quarantined evidence do not themselves prevent quiescence.

## Resource acquisition and release

- Scheduler eligibility is derived from a complete tracker snapshot. Ralph
  reserves a task-execution permit before attempting the atomic tracker claim;
  a rejected claim immediately releases that permit. A successful claim then
  authorizes attempt planning, exact worktree creation/discovery, and agent
  invocation. A task never remains claimed merely because all execution permits
  were occupied.
- One task-execution permit spans the task implementation/review pipeline and
  is released after an accepted result is durably queued for integration, or
  after cancellation, quarantine, abandonment, or another stable disposition
  stops that pipeline. Claim lifetime remains independent and normally spans
  through tracker-confirmed integration completion.
- The integration-target lease is acquired before candidate creation and spans
  through tracker confirmation or an explicit safe terminal disposition. The
  v1 integration-agent permit is acquired only for actual integration-agent
  work and released while a reviewer, verifier, or operator owns the next step;
  the target lease continues to serialize the candidate lifecycle.
- Repository verification obtains the existing external heavy-verification lock
  only through the public wrapper for the exact verification command. Ralph
  neither reserves a shadow permit nor interprets tracker blocking as lock
  ownership. Exit `137` invokes the repository emergency protocol and forbids
  an unchanged automatic retry.
- Resource waits emit typed trace facts and consume neither tracker-blocker
  state nor technical/semantic retry budgets. No workflow holds one resource
  while polling for an earlier resource in this order; acquisitions that fail
  or become stale release their narrower runtime permit before reconciliation.
- Continuing a cancelled attempt must reacquire a task-execution permit before
  relaunching its resumable session. Cancellation never creates a hidden permit
  reservation. A clean restart similarly re-enters normal capacity admission
  while retaining the tracker claim.

## Dry-run and presentation projection

`ralph run <target> --dry` remains the side-effect-free interpretation of the
same scheduler, planner, operation algebra, policy schemas, and trace contract.
It reads the complete real tracker graph through the read-only port, supplies
in-memory journal/Git/executor/evidence/resource facts, and uses deterministic
success outcomes unless a scenario layer selects typed delays or failures.

The dry layer cannot acquire tracker mutation, production journal writer, Git
mutation, filesystem mutation, process-launch, evidence-write, cleanup, or
operator-control mutation services. It traverses every graph branch and emits
the operations that live execution would request, including resource waits,
pause/drain behavior, retries, integration serialization, and tracker
completion. Its trace is explicitly labelled simulation and can never serve as
acceptance, review, integration, completion, or cleanup evidence.

## Selected defaults

| Policy | Branded range | Default | Live change effect |
| --- | --- | --- | --- |
| Task execution capacity | Integer 1–8 | 2 | Future admissions; held permits continue |
| Owned-process shutdown grace period | Whole seconds 1–300 | 10 seconds | Later cancel, restart, and quarantine requests |
| Integration semantic review rounds | Integer 1–20 | 6 | Later integration lifecycles |
| Technical total invocation attempts | Integer 1–10 | 3 | Later technical retry scopes |
| Technical initial retry delay | 1–300 seconds | 5 seconds | Later technical retry scopes |
| Technical maximum retry delay | Initial delay through 1,800 seconds | 60 seconds | Later technical retry scopes |
| Technical exponential factor | Fixed protocol value | 2 | Not configurable in v1 |
| Drain progress heartbeat | 5–300 seconds | 30 seconds | Per observation subscription |

The technical retry defaults yield delays of five and ten seconds because the
three-attempt bound includes the initial invocation. Semantic review-cap
exhaustion produces `IntegrationNonConvergent` and quarantine; technical-attempt
exhaustion produces `TechnicalRetryExhausted` and an operator decision. Neither
becomes a tracker node, tracker blocker, successful completion, or automatic
whole-task rerun.

One semantic integration round is consumed only by a successfully decoded fresh
integration-review verdict. Agent or reviewer invocation failure, transport
failure, malformed output, coordinator interruption, and resource wait do not
consume it. A semantic verification finding is handed to the same integration
agent, and the next fresh integration-review verdict consumes the next round;
the verifier failure itself does not increment the review ordinal.

## Documentation ownership and connascence

This decision models Ralph orchestration only. It changes no D&D rule, authored
content, runtime battle behavior, Quint slice, SRD assumption, or D&D ubiquitous
language. Its terms remain in this Wayfinder asset until the accepted
graph-native Ralph implementation specification promotes them to the owning
package documentation identified through `CONTEXT-MAP.md`.

The design localizes strong connascence as follows:

- operation tag, request Schema, journal codec, authorization, live/dry/test
  interpreter, recovery planner, trace variant, evidence requirement, and
  deterministic scenario change together through one exhaustive operation
  module;
- each policy's constrained brand, default, control request, persisted revision,
  captured operation value, and boundary tests are colocated in one
  `ControlPolicy` owner;
- pause gates and drain completion derive from one admission model; there are no
  duplicated paused/drained booleans;
- cancellation grace, its captured deadline, owned-process interruption,
  writer-termination proof, partial manifest, and `CancelledAttempt` constructor
  are owned by one cancellation workflow;
- integration review ordinal and technical attempt ordinal are different
  brands and tagged scopes, preventing either failure from consuming the other
  budget; and
- resource names, acquisition, release, trace, and deterministic limits are
  typed by the owning resource service rather than repeated strings or permit
  counts.

The trigger words `current`, `first`, `only`, `phase`, and `order` in this asset
refer to executable distinctions: expected policy revision, first invocation
capturing policy, exactly-one integration invariants, tagged workflow phases,
and journal/queue ordering. Widening any of those domains must change an
exhaustive union, branded constructor, or narrowed operation precondition.

## Verification contract

Implementation must prove all of the following:

1. Schema decoding rejects every zero, negative, fractional, out-of-range,
   mismatched-delay, malformed identity, stale revision, and impossible tagged
   request before control logic runs. Distinct brands cannot substitute for one
   another in typed code.
2. Run and coordinator scheduling gates compose independently. Pause admits no
   new fragments, resume removes only its exact gate, and neither interrupts an
   admitted fragment.
3. Drain is derived, never persisted. It waits for every owned admitted fragment
   and runtime permit, reports state changes and bounded heartbeats, survives
   client disconnect, and treats client timeout as observation-only.
4. Cancellation scenarios cover cooperative exit before ten seconds, forced
   termination at ten seconds, process-tree ownership conflict, surviving child
   detection, writer-stop proof, partial evidence sealing, and rejection after
   `IntegrationStarted`. Use `TestClock` and explicit process gates rather than
   real sleeps.
5. Continue and clean restart reacquire task capacity. Continue requires the
   exact resumable session and unchanged revision; restart retains the claim but
   uses latest task revision and accepted head without superseded WIP.
6. Abandonment cannot release a completing, foreign, stale, live-writer, or
   promoted claim. Quarantine preserves every required resource and evidence
   while releasing only ephemeral permits. Exact cleanup authorization cannot
   name an unowned resource.
7. Capacity property tests cover one and eight permits, live increases, lowering
   six to two without interruption, frontier exhaustion below capacity,
   competing claim rejection, recovery of durable policy, and no task claim
   held merely while waiting for capacity.
8. V1 never runs two integration agents or two lifecycles on one target. Task
   execution remains concurrent while integration is serialized, and the
   external heavy-verification lock is acquired only by repository wrappers.
9. Technical retries use the captured Effect exponential schedule and durable
   `notBefore` fact. Boundaries at attempt one, limit minus one, limit, and limit
   plus one prove that technical failures never advance the semantic review
   ordinal.
10. Semantic round-cap exhaustion quarantines as
    `IntegrationNonConvergent`; technical exhaustion produces
    `TechnicalRetryExhausted`, retains the target lease, and admits only the
    explicit retry, proven session replacement, or quarantine operations.
11. Every high-impact authorization is bound to exact observed state, operator,
    and non-empty reason. Stale confirmation, client replay, unknown outcome,
    and coordinator death reconcile without duplicate mutation.
12. Run one workflow under live-fake, dry, and deterministic-test layers and
    compare traces through one shared semantic projection that removes only
    explicitly interpreter-owned positions and observations. Per-scenario
    ignore lists are forbidden. Dry performs zero production journal,
    filesystem, Git, tracker-mutation, process-launch, evidence-write, cleanup,
    and control-policy writes while traversing the complete graph.
13. CLI, TUI fixture, web fixture, console, and Mermaid projections consume the
    same trace union in contract tests. No projection infers authority from log
    prose, exposes secrets, or treats simulated output as evidence.
14. The owning package adopts the sibling `hulymcp` harness bar: strict
    TypeScript flags, Effect-aware layer tests without module mocks, property
    tests in discoverable property files, 99% coverage thresholds, at most 2%
    detected duplication, circular-dependency detection, secrets scanning, and
    one comprehensive resource-bounded quality command.
15. Confirm RAW and ubiquitous-language ownership before implementation: inspect
    `.references/srd-5.2.1/`, `UBIQUITOUS_LANGUAGE.md`, and `CONTEXT-MAP.md`, and
    record that this infrastructure change models no SRD rule and needs no RAW
    passage or `ASSUMPTIONS.md` entry.
16. After implementation, repeatedly run RAW/ubiquitous-language,
    architecture/domain, connascence, and strict code-review passes. Fix every
    reasonable finding, record a concrete reason for any rejection, and repeat
    until no reasonable findings remain. Significant changes require at least
    two rounds.

## Decision review record

Round one checked the draft against the durable-journal, accepted-head
integration, tracker-port, bounded-leaf, current Ralph execution, repository
resource-lock, and deterministic-verification contracts. It narrowed drain
quiescence to locks held by Ralph-owned fragments and made semantic-round
consumption explicit so technical or verification failures cannot increment the
wrong ordinal.

Round two applied `.claude/review-rules.md`, `CONTEXT-MAP.md`, the Effect V4
schema/service/scheduling/testing guidance, the sibling `hulymcp` harness, and
the repository's invalid-state and connascence rules. It removed parallel trace
identity metadata, renamed cancellation grace to the shared
`OwnedProcessShutdownGracePeriod`, made initialization-only policy unrepresentable
after durable policy exists, and required one shared semantic trace projection.

The review rejected four tempting shortcuts with concrete reasons:

- a task-specific scheduling pause would duplicate tracker execution admission;
- a persisted `Draining` status would duplicate the scheduling gate and derived
  resource facts;
- a configurable integration-agent count above one would represent a protocol
  the v1 accepted-head design has not made safe; and
- a drain observation timeout that interrupts work would collapse waiting into
  cancellation and violate the non-interruptible integration boundary.

After those corrections, no reasonable RAW/ubiquitous-language,
architecture/domain, state-space, connascence, or code-review finding remains.
No D&D RAW or Quint parity change applies.
