# Ralph Concurrent Accepted-Head Integration Protocol

Decision asset for [Define Ralph's concurrent accepted-head integration
protocol](https://github.com/dearlordylord/5e-quint/issues/184), under
[Wayfinder: Ralph graph-native
orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

This protocol integrates results accepted by the Ralph orchestrator. Historical
shell-harness branches, worktrees, claims, and run artifacts are evidence only
and never enter its integration queue.

## Answer

Ralph will execute independent tasks concurrently and integrate their accepted
results through a serialized, agent-driven lane for each integration target.
The deterministic control plane establishes identity, lineage, authority,
resource ownership, and promotion preconditions. An integration agent owns the
semantic merge, including conflict resolution, and fresh independent reviewers
review the combined result before repository-defined post-integration
verification may authorize promotion.

The protocol is declarative. Each reconciliation cycle refreshes authoritative
facts, parses them into one discriminated `IntegrationObservation`, and uses a
total planner to select one typed next operation. After that operation Ralph
observes the authorities again. Live execution, restart recovery, dry-run, and
tests interpret the same operation algebra; recovery is not a second
if/else-driven procedure.

This is a soft-adopted v1 protocol. Its invariants are firm enough to specify
and falsify, while operation granularity, state names, retry limits, and
verification policy may be simplified or extended when implementation evidence
shows that the model contains too much or too little detail. Such changes must
remain explicit schema and algebra changes, not metadata escape hatches.

## Domain language

- **Accepted Result** is the exact immutable Git commit for one task that its
  bounded implement/review loop accepted. Its sealed acceptance evidence names
  that commit. Acceptance makes the result eligible for integration; it does
  not mean the result is already present in the integration target.
- **Accepted Head** is the moving Git commit at the integration target that
  contains every result whose integration has been promoted and
  post-integration verified.
- **Integration Target** is the exact Git ref and repository resource scope to
  which one ordered stream of accepted results is integrated.
- **Integration Queue Entry** binds one accepted result and its sealed evidence
  to one integration target and one durable journal position.
- **Integration Candidate** is an isolated two-parent merge based on one
  observed accepted head and one exact accepted result. It is not the accepted
  head and cannot authorize task completion.
- **Integration Target Lease** is the typed, scoped capability allowing one
  live integration lifecycle to touch an integration target. In the selected
  single-host failure domain it is backed by coordinator ownership and a
  one-per-target runtime permit; it is not a durable TTL record or recovery
  authority.
- **Integration Review** is a fresh independent review of the combined
  candidate, including any edits made by the integration agent. It is distinct
  from the task review that accepted the task-local result.
- **Promoted Integration** is an integration candidate that passed integration
  review and post-integration verification and then advanced the target through
  a compare-and-set ref operation.

These are Ralph orchestration terms. They do not belong in the D&D ubiquitous
language, Cleanroom product glossary, or modeling assumptions.

## Authority and identity

The authority split selected by [Ralph Durable Journal and Recovery
Protocol](./durable-journal-and-recovery-protocol.md) remains unchanged:

| Fact                                                                                 | Authority           |
| ------------------------------------------------------------------------------------ | ------------------- |
| Task lifecycle, blockers, and claim owner                                            | Tracker             |
| Attempt Base, accepted-result commit, accepted-head ref, merge parents, and ancestry | Git                 |
| Queue intent, operation history, review handbacks, and evidence pointers             | Ralph journal       |
| Agent and reviewer session identity                                                  | Execution substrate |
| Sealed acceptance, integration-review, verification, and completion artifacts        | Evidence store      |

The journal explicitly materializes integration workflow history, but it does
not copy tracker lifecycle or Git lineage into a second authority. A
discriminated integration projection is derived from journal facts plus fresh
authority observations. There is no independently mutable `integrationStatus`
field that can disagree with those facts.

`TaskId`, `AttemptId`, `AcceptedResultCommit`, `AcceptedHeadCommit`,
`IntegrationCandidateCommit`, `IntegrationOperationId`, queue position,
evidence-manifest identity, agent-session identity, and integration-target
identity are distinct domain values even when several are represented as
strings or Git SHAs.

## Declarative reconciliation

The integration coordinator does not execute a memorized multi-step script.
For one cycle it:

1. refreshes tracker, Git, journal, executor, evidence, and resource facts;
2. parses all boundary values and accumulates independent contradictions;
3. constructs one precise `IntegrationObservation`;
4. applies a total planner that returns one typed directive;
5. interprets that directive through live, dry-run, or test layers; and
6. begins the next cycle from fresh observations.

The directive algebra distinguishes at least:

- wait because no queue entry or required resource is eligible;
- acquire or release one integration-target lease;
- create or rediscover an isolated candidate;
- start or resume the exact integration-agent session;
- start a fresh integration-review session;
- hand review or verification findings back to the integration agent;
- run repository-selected post-integration verification;
- seal stage evidence;
- promote by compare-and-set;
- request tracker completion through the tracker port;
- acknowledge an already-observed external outcome;
- quarantine a non-convergent integration; and
- request an operator decision for contradictory, destructive, or
  lineage-changing circumstances.

This catalog is deliberately soft-adopted. Each shipped version nevertheless
uses a closed tagged algebra with exhaustive handling. Adding or removing a
variant changes its boundary schema, journal codec, interpreters,
reconciliation, authorization, evidence contract, and deterministic tests
together.

Agentic work does not weaken the declarative design. `RunIntegrationAgent` is a
typed operation whose output is an observed candidate and sealed evidence, not
a deterministic pure function. The planner reasons about the resulting facts
on the next cycle rather than embedding agent behavior in procedural recovery
branches.

## Queue and resource protocol

Each integration target has an independent durable FIFO. Ordering is the
journal commit order of `IntegrationQueued`, which is recorded only after the
accepted result and its acceptance evidence are sealed. Wall-clock completion,
task number, and agent scheduling do not reorder entries. A restart reconstructs
the same order from the journal.

One integration target admits one active integration lifecycle. Its
`IntegrationTargetLease` is held from candidate creation through agent merge,
review handbacks, verification, promotion, and tracker confirmation. It is
released only after completion is confirmed, non-convergence is quarantined,
or reconciliation establishes another safe terminal disposition. Coordinator
death releases the runtime permit; recovery reconstructs the lifecycle from
authoritative facts before granting it again.

Task-execution capacity, integration-agent capacity, per-target integration
leases, and repository heavy-verification locks are different typed resources.
Holding one does not imply ownership of another. The existing repository lock
wrappers remain authoritative for broad checks, QNT proofs, and battle MBT.
Different integration targets may proceed independently only when every shared
resource they require is separately available.

An entry that reaches a recorded non-convergent disposition leaves the active
queue and releases its target lease, allowing unrelated later entries to be
considered. The affected task remains incomplete, so tracker-derived dependants
remain blocked.

## Freshness and candidate construction

Equality between Attempt Base and the latest accepted head is not required;
requiring it would serialize task execution and defeat the graph-native design.
Before candidate construction, a fresh observation must prove:

- the Attempt Base is an ancestor of the accepted head;
- the exact accepted-result commit descends from the declared task lineage;
- the accepted result and sealed acceptance evidence still belong to the
  active claimed task;
- the tracker still reports the task in an integration-eligible lifecycle;
- all tracker blockers remain complete; and
- the integration-target lease names the exact target being observed.

A failed mechanical precondition produces a typed reconciliation conflict. It
does not ask an agent to guess about ownership or rewrite lineage. Once those
preconditions pass, semantic freshness and conflict resolution belong to the
integration agent and its independent review loop.

The candidate is always an explicit two-parent merge:

1. first parent: the accepted head observed for this integration operation;
2. second parent: the exact immutable accepted result.

Ralph never rebases or rewrites the accepted result. The integration agent may
edit the merge result to reconcile textual or semantic conflicts, but the
accepted result remains an exact parent. This keeps the reviewed task result
addressable while making integration-authored changes visible at one commit
boundary.

## Agent integration and review convergence

A textual merge conflict is normal agent work, not an automatic terminal
failure. The integration agent works only in the isolated candidate resource
and owns coherent integration against the observed accepted head. It may merge,
edit, and reconcile intent, and it must report the resulting candidate and
evidence precisely.

Every candidate containing integration-agent work receives a fresh independent
integration review. A rejection returns findings to the same integration-agent
session and candidate lineage. The next review uses a fresh reviewer. Attempts,
review rounds, handbacks, and findings are explicitly journaled and linked by
sealed evidence; they are not tracker graph nodes.

The loop is bounded by an explicitly configured positive limit. Technical
invocation retries and semantic integration handbacks are different typed
retry scopes. The exact default limits and schedules belong to the later
operator and deterministic-verification decisions.

At semantic-cap exhaustion Ralph records `IntegrationNonConvergent`, preserves
the accepted result, candidate, sessions, findings, and evidence, keeps the
canonical task incomplete, and releases the integration-target lease. It does
not automatically create tracker issues or dependency edges. Any remediation
or replacement node is a deliberate graph-planning decision based on the
preserved evidence.

## Verification and promotion

An integration-approved candidate runs the repository-defined
post-integration verification plan in its isolated candidate worktree. Test
selection, virtual-time scenarios, port contract suites, and bounded
end-to-end coverage belong to [Design deterministic verification for Ralph's
orchestrator](https://github.com/dearlordylord/5e-quint/issues/187); this
decision owns the admission and promotion semantics, not that detailed policy.

A technical verification failure follows its typed retry policy. A semantic
failure is handed to the integration agent, followed by another fresh
integration review before verification is attempted again. Verification
failure never mutates or rolls back the accepted head.

After verification passes and its evidence is sealed, Ralph promotes the
candidate with a compare-and-set ref update whose expected old value is the
candidate's first parent. If the accepted head moved, promotion returns a
typed stale-head observation and the planner reconciles from fresh state; it
does not force-update the ref.

Only the compare-and-set outcome observed from Git establishes promotion. A
journal outcome without the Git fact is insufficient, and an ambiguous Git
timeout is reconciled before retry.

## Completion ancestry and blocker release

Tracker completion requires a narrowed promoted-integration fact proving:

- the promoted merge commit has the exact accepted result as its second parent;
- its first parent is the compare-and-set expected accepted head;
- the merge commit is the accepted head or an ancestor of a later accepted
  head;
- integration review and post-integration verification evidence are sealed;
  and
- the exact task claim still permits the requested completion transition.

Equivalent file content, a patch-id match, a squash, or a differently rewritten
commit is not completion ancestry.

Ralph requests completion through the tracker mutation port, then refreshes the
tracker. Dependants become eligible only when a complete tracker snapshot
reports the predecessor complete and the normal claim/eligibility rules admit
them. Git ancestry and journal state never release blockers directly. The
tracker-port decision owns the exact compare-and-set and partial-failure shape
of that mutation.

If Ralph dies after Git promotion but before recording or confirming tracker
completion, recovery observes the exact merge ancestry and sealed evidence,
acknowledges any already-completed operation, and idempotently requests or
confirms the missing tracker transition. A later accepted head may have
advanced; ancestry of the exact promoted merge preserves the proof.

## Failure and recovery disposition

Ordinary recovery is autonomous when fresh facts identify one
non-destructive continuation:

- rediscover an existing candidate rather than create another;
- resume the exact integration-agent session rather than invent a replacement;
- accept a complete discoverable reviewer or verifier result;
- acknowledge an already-promoted Git commit or completed tracker transition;
  or
- retry an idempotent operation with the same operation identity after
  authority reconciliation.

Merge conflict, integration quality, and semantic verification failures remain
agent/reviewer work within the bounded integration lifecycle. The operator is
required only when authorities contradict one another, ownership cannot be
proven, or continuation would require destructive cleanup, abandonment,
quarantine authorization not already granted by policy, or rewriting lineage.

The planner materializes each disposition explicitly. It does not collapse
interruption, rejection, conflict, failed verification, stale head,
non-convergence, and authority contradiction into a generic failed status.

## Graph effect

The task graph describes product work and dependencies. Integration queue
entries, candidates, agent invocations, reviews, handbacks, and technical
retries are Ralph workflow facts and therefore never become graph nodes.

Successful integration affects the graph only through the tracker-owned task
completion transition and its subsequently refreshed eligibility projection.
Non-convergent integration leaves that task incomplete and its dependants
blocked while unrelated graph branches continue. New remediation or
replacement nodes require an explicit planning decision; Ralph does not mutate
the graph structure as an incidental retry mechanism.

## Connascence check

- Accepted-result identity, merge parent position, evidence identity,
  promotion, and completion ancestry must change together. One narrowed
  promoted-integration type carries those facts into tracker completion.
- Queue order and restart order must change together. One durable
  `IntegrationQueued` journal position owns both; timestamps and task numbers
  do not reproduce the order.
- Candidate first parent and compare-and-set expectation must change together.
  Candidate construction produces the promotion authorization instead of
  requiring callers to remember the observed head.
- State tags, journal codecs, planners, live/dry/test interpreters, trace
  rendering, evidence requirements, and recovery behavior must change together.
  One tagged operation algebra plus exhaustive matching localizes the coupling.
- Integration-agent findings, candidate lineage, and review rounds must change
  together. A typed handback operation binds them; tracker comments or session
  names are not the protocol.
- Tracker completion and blocker release are deliberately sequential across an
  external authority. The tracker mutation port owns completion idempotency,
  and only a refreshed graph projection owns later eligibility.
- Integration, execution, and heavy verification are distinct resources. No
  shared boolean or generic capacity count can accidentally grant more than
  one authority.

## Verification contract

Implementation must prove at least these scenarios:

1. Two independent tasks execute concurrently, queue in durable order, and
   integrate one at a time on the same target while execution remains
   concurrent.
2. Queue order survives coordinator death and does not depend on timestamps,
   task identifiers, or input enumeration order.
3. A result based on an ancestor accepted head remains admissible after an
   independent integration advances the head; a result from unrelated or
   rewritten lineage fails with a typed observation before agent invocation.
4. An integration agent resolves a conflict, a fresh reviewer rejects it, the
   same agent session revises it, and a fresh reviewer accepts it without
   creating tracker graph nodes.
5. Review-cap exhaustion materializes `IntegrationNonConvergent`, preserves
   evidence, keeps dependants blocked, releases the target lease, and allows an
   unrelated queued result to proceed.
6. Verification failure cannot move the accepted head. A passing candidate
   promotes only when compare-and-set still observes its exact first parent.
7. Death before and after candidate creation, agent invocation, review result,
   evidence seal, verification, promotion, and tracker completion converges by
   the same planner without duplicating an external effect.
8. A promoted integration missing its journal outcome or tracker confirmation
   is discovered through exact ancestry and completed idempotently. Equivalent
   content without the exact accepted-result parent cannot complete the task.
9. Dependants remain ineligible until a refreshed tracker snapshot confirms
   completion, even when Git promotion and journal acknowledgement already
   exist.
10. Live-fake, dry-run, and test interpreters traverse the same directives;
    dry-run emits the planned agentic and mechanical operations without
    mutating Git, tracker, journal, filesystem, or process state.
11. Every ordinary parse, lineage, ownership, conflict, rejection,
    verification, and recovery failure is represented by a precise typed
    result rather than an exception or assertion.
12. Confirm that this changes no modeled D&D rule: consult
    `.references/srd-5.2.1/` and `UBIQUITOUS_LANGUAGE.md` and record that RAW
    traceability is not applicable beyond that ownership check.
13. After implementation, run RAW/ubiquitous-language, architecture/domain,
    connascence, and code-review passes. Fix every reasonable finding, record a
    concrete reason for any rejection, and repeat the loop until no reasonable
    findings remain. Significant implementation changes require at least two
    rounds.

## Decision review record

Round one checked the decision against the retained bounded-leaf contract,
current Ralph integration behavior, the control-plane prototype, and the
durable journal decision. It corrected the initial assumption that textual
conflict should immediately create a repair attempt: integration is explicitly
agentic, while mechanical lineage and ownership gates remain deterministic.

Round two checked authority duplication, invalid optional-state shapes,
workflow-versus-graph ownership, integration-target resource lifetime, exact
ancestry, crash ambiguity, declarative operation handling, documentation
ownership, and connascence. Detailed tracker mutation algebra, resource-control
UX, and deterministic test selection remain with their existing downstream
tickets rather than being duplicated here.
