# Ralph Execution Contract and Failure-Semantics Inventory

Research asset for [Inventory the Ralph execution contract and failure
semantics](https://github.com/dearlordylord/5e-quint/issues/177), under
[Wayfinder: Ralph graph-native orchestration](https://github.com/dearlordylord/5e-quint/issues/175).

Baseline inspected: local `master` at
`f7c203daa2cf61abaefac53113fbdad620929a79` on 2026-07-17. This inventory
describes the historical one-off shell harness at that commit.

## Scope boundary

This asset is an evidence inventory, not the architecture or a compatibility
contract for the new Ralph orchestrator. The historical harness can reveal a
useful requirement, failure mode, or design lesson. None of its scheduler
stages, plan-index state, claim representation, run-directory layout, prompts,
shell functions, or retained runs transfers into the new system merely because
it existed or worked once.

A **candidate requirement** is an observation mined from the historical
harness. An **accepted requirement** is a requirement explicitly selected by
an owning Wayfinder decision or later implementation specification. The new
orchestrator implements accepted requirements directly through its own domain
model and ports; it does not preserve behavioral parity with, invoke, resume,
or migrate the historical harness.

## Answer

The inspected harness implemented a fail-closed, single-launcher task executor
whose unit of work is an indexed plan task projected to one canonical GitHub
issue.
It creates a per-attempt worktree from the integration branch, runs a bounded
implement/review handback loop, lets a fresh decider apply accepted work to the
integration branch, and re-reads the task graph before dispatching again.
Git-ref claims exclude competing runners; completion separately proves Base,
output, and acceptance ancestry before closing an issue and deleting its claim.

Three previously accepted requirements were stronger than the inspected
implementation:

1. non-convergence promises quarantine of the claim, branch, worktree, and
   evidence, while default EXIT cleanup deletes the worktree and task branch;
2. the accepted graph contract calls for native tracker dependencies, while the
   GitHub bridge treats an issue-body `## Blocked by` section plus the local
   plan index as the dependency authority;
3. the required converging reviewer loop has four named quality perspectives,
   while the harness enforces only a parsable verdict from one general review
   prompt per semantic round.

The remaining mismatches are mostly stale documentation, ambiguous ownership,
or insufficiently executable evidence rules. They are listed below rather than
silently promoted into product requirements.

## Source and authority classification

| Source | Role in this inventory | Authority limit |
| --- | --- | --- |
| [`scripts/ralph-run.sh`](../../../scripts/ralph-run.sh) and [`scripts/ralph-issue-context.ts`](../../../scripts/ralph-issue-context.ts) | Historical executable behavior | Evidence of what the one-off harness did; no authority over the new orchestrator |
| [`scripts/ralph-run.test.ts`](../../../scripts/ralph-run.test.ts) and the `ralph-issue-context` test files | Historical executable invariants and edge cases | Evidence for candidate requirements, not conformance tests for the new orchestrator |
| [`scripts/ralph-run.md`](../../../scripts/ralph-run.md) | Historical operator promise | Evidence of intended behavior and contradictions in the one-off harness |
| [Bounded Ralph Leaf and Non-Convergence Contract](../cleanroom-ralph-redesign/bounded-ralph-leaf-contract.md) | Accepted durable delivery decision | Owns leaf, handback, cap, quarantine, and redesign semantics; its historical numeric default is superseded |
| [Cleanroom Ralph Delivery Post-mortem](../../../docs/cleanroom/postmortems/2026-07-16-cleanroom-ralph-delivery.md) | Retained observed evidence | Establishes failures and operator recovery; does not make accidental mechanics durable |
| `AGENTS.md` and [code-review rules](../../../.claude/review-rules.md) | Repository quality and resource contract | Applies to workers and reviewers; not all of it is machine-enforced by Ralph |

The exact model names, shell layout, Markdown parser forms, directory names,
GitHub CLI calls, numeric defaults, stage boundaries, and orchestration order
are historical mechanics. Safety, ownership, convergence, graph, evidence, and
acceptance observations below are candidate requirements unless another linked
owner explicitly accepts them.

Key executable anchors at the inspected baseline:

- launch/base/cleanliness and GitHub-plan admission:
  [`ralph-run.sh` lines 438–524](../../../scripts/ralph-run.sh#L438-L524);
- generic worktree/branch cleanup and EXIT handling:
  [`ralph-run.sh` lines 1005–1053](../../../scripts/ralph-run.sh#L1005-L1053);
- review prompt, technical retries, handbacks, and safety cap:
  [`ralph-run.sh` lines 1209–1586](../../../scripts/ralph-run.sh#L1209-L1586);
- claim-before-worktree ordering and cap failure:
  [`ralph-run.sh` lines 2609–2709](../../../scripts/ralph-run.sh#L2609-L2709);
- refreshed-status disposition and completion dispatch:
  [`ralph-run.sh` lines 2769–2887](../../../scripts/ralph-run.sh#L2769-L2887);
- issue runnable/blocker projection:
  [`ralph-issue-context.ts` lines 881–1158](../../../scripts/ralph-issue-context.ts#L881-L1158);
- claim acquire/release/complete protocol:
  [`ralph-issue-context.ts` lines 1191–1530](../../../scripts/ralph-issue-context.ts#L1191-L1530);
- plan-to-issue graph reconciliation:
  [`ralph-issue-context.ts` lines 1532–1707](../../../scripts/ralph-issue-context.ts#L1532-L1707);
- executable review-budget assertions:
  [`ralph-run.test.ts` lines 621–777](../../../scripts/ralph-run.test.ts#L621-L777).

## Domain model

- **Ralph leaf**: one runnable canonical issue delivering one coherent
  capability or tracer bullet. It is vertical across owners when necessary and
  must not bundle independently acceptable outcomes.
- **Acceptance branch**: the branch named by `--base`; it is the eventual branch
  whose ancestry authorizes tracker completion.
- **Output branch**: the integration branch on which the decider records
  accepted task results. In direct mode it is the acceptance branch itself.
- **Claim Base SHA**: the SHA frozen when a GitHub-backed task is first claimed
  in a run and recorded in the remote claim.
- **Attempt Base SHA**: output-branch `HEAD` when a particular decider-level
  attempt starts. The task worktree and its review diff use this SHA.
- **Handback**: another implement/review semantic round in the same task
  attempt, worktree, and WIP lineage.
- **Task rerun**: another full decider-level attempt for the same indexed task
  after the plan intentionally leaves it runnable.
- **Technical review attempt**: a retry to obtain one valid reviewer process
  result and verdict. It is transport/tool recovery, not a handback and not a
  semantic review round.
- **Completing claim**: an active claim atomically advanced with the exact
  result SHA before GitHub close. It makes completion resumable and prevents
  abandonment cleanup from racing issue completion.
- **Non-convergent leaf**: a leaf whose semantic handback loop reaches its
  configured cap without `accept`, or whose review exposes a pre-cap violation
  of the one-leaf contract.
- **Quarantine**: preservation without acceptance or integration, followed by a
  component-level reuse decision and delivery redesign.

These terms belong to Ralph execution planning, not D&D language, Cleanroom
product language, architecture, or modeling assumptions. No shared context or
glossary owner should duplicate them.

## Durable observable contract

### 1. Graph and launch admission

1. A plan has a machine-readable `ralph-plan.v1` task index. Task numbers are
   body anchors; stable task IDs, ordering, status, and dependency IDs come from
   the index. References must exist and the graph must be acyclic.
2. A runnable GitHub-backed entry maps exactly once to exactly one canonical
   issue. The issue must be open, carry `ready-for-agent`, declare exactly one
   `Runnable: yes` marker, and have only closed/completed blockers.
3. Plan dependencies and tracker dependencies must agree before launch.
   Current code implements this against the issue-body `## Blocked by` list,
   not GitHub's native dependency graph.
4. A done task maps to a closed/completed issue, except for the one task pending
   completion during the atomic close workflow. Blocked/deferred tasks map to
   open, unlabeled issues with `Runnable: no`.
5. The launcher starts only from a clean worktree whose `HEAD` exactly equals
   the resolved base ref. A nonblocking per-launcher-worktree flock excludes a
   second runner, but does not provide repository-wide scheduler exclusion.
6. GitHub-backed integration-branch runs require explicit `--task` selection.
   The generic queue can choose the first runnable task or use a model chooser;
   selected tasks retain caller order and cannot bypass blockers.
7. The task Base SHA must already contain the repository's current shared
   resource-lock and one-worker verification protocol. Ralph refuses to claim a
   task based on an older unguarded commit.

### 2. Worktree and Base-SHA ownership

1. A normal run creates a new output branch from the base SHA and refuses an
   existing output branch. Direct mode requires the launcher to be checked out
   on the base branch.
2. Each task attempt creates a distinct implementation branch and worktree from
   the current output-branch `HEAD`. Workers may commit there, but the branch is
   input evidence, not merge authority.
3. Implementer and reviewer prompts require logging the declared ref and
   `HEAD`, then proving `git merge-base --is-ancestor <attempt-base> HEAD`.
   Agents stop on failure; the runner/decider owns branch repair.
4. Handbacks reuse the same task worktree. Codex handbacks resume the exact
   persisted session ID; reviewer and decider sessions remain fresh. A known
   pre-sampling compaction failure starts a fresh implementer session in the
   same worktree and records the fallback.
5. The decider alone applies or reconstructs the accepted result in the main
   launcher worktree. It must keep that worktree on the output branch, verify,
   commit a task-scoped result, and leave no tracked changes.

### 3. Claim ownership and mutual exclusion

1. Before task-worktree creation, a GitHub-backed task acquires
   `refs/heads/ralph/claims/issue-<number>` on `origin` with a non-forced push.
   The commit is parentless and uses the empty tree, so it does not publish the
   Claim Base SHA or unpublished product history.
2. Claim metadata is strictly decoded and binds phase, run ID, random owner
   token, issue number, output branch, acceptance ref, and Claim Base SHA.
3. Acquisition is idempotent only for the exact same active claim identity.
   Competing runners, branches, bases, acceptance refs, or completing claims
   fail closed. A rejected push is re-read to distinguish an equivalent race
   from a conflicting owner.
4. Release is compare-and-swap deletion of the exact active claim SHA and never
   closes the issue. A completing claim cannot be abandoned through release.
5. Failure after claim acquisition intentionally retains the claim. Operators
   must explicitly release an abandoned run before deleting its run directory
   or output branch.

### 4. Convergence and the retry scopes

There are two semantic retry scopes and one technical recovery budget:

| Scope | Identity retained | Current default | Terminal behavior |
| --- | --- | --- | --- |
| Technical review attempt | Same implementation and semantic round | 3 | Exhaustion is fatal before handback or decider |
| Semantic handback | Same task attempt, attempt Base, worktree, and WIP lineage | 6 rounds | Non-`accept` at the cap stops before decider/integration and requires quarantine/redesign |
| Whole-task rerun | Same indexed task and claim, new attempt directory and normally a new attempt Base | 3 decider arrivals per run | The final attempt may not remain runnable; invalid final disposition is fatal |

An implementer nonzero exit is still reviewed because it may have left useful
partial work. One semantic review returns `accept`, `accept-with-fixes`, or
`reject`. Only `accept` reaches the decider. The other verdicts hand back every
actionable finding while the work remains the same coherent outcome. Review
must not waive repeated findings.

The current technical review retry isolates runner exits and unparsable review
reports from semantic round accounting. This repairs the post-mortem behavior
where two model-capacity failures consumed two of six semantic rounds for the
presentation-free Oracle facts leaf.

### 5. Reviewer-loop evidence

The durable repository contract requires convergence across RAW traceability,
ubiquitous/domain language, architecture/connascence, and code review. A round
with reasonable findings must hand them back; acceptance means no reasonable
actionable findings remain. Significant changes normally need multiple review
passes.

The current runner only partially makes this executable:

- the review prompt requires task scope, RAW/ubiquitous-language traceability,
  redundant-state checks, honest generated artifacts, and focused
  verification;
- it tells the reviewer to read repository instructions and emits a typed
  three-value verdict;
- the runner parses the verdict and preserves prompts, logs, report, exit, and
  before/after-review diffs;
- it does **not** require four identifiable passes, prove that
  `.claude/review-rules.md` was consulted, require finding-to-acceptance-item
  mapping, or parse dispositions of prior findings.

Therefore `accept` is the current executable gate, while four-perspective
reviewer-loop convergence remains a product requirement for a replacement
orchestrator.

### 6. Plan mutation and task dispositions

1. The source plan is live orchestration state. Ralph snapshots it into the run
   directory, re-parses it after each decider, and dispatches newly added,
   reordered, unblocked, or intentionally rerunnable tasks.
2. For GitHub-backed plans, canonical issue bodies own requirements and blocker
   declarations; the plan should retain only matching execution metadata. A
   durable requirement or dependency change must happen on the issue first,
   followed by plan reconciliation and full graph validation.
3. Every worker reports `Plan Impact`. The decider may mutate durable planning
   only after stating the new fact, why the current plan did not imply it, and
   why it will outlive run-local evidence. Attempt-specific scar tissue is
   forbidden in the plan.
4. Excluded but still desired work must remain as executable graph tasks, not
   prose. For runnable rejections, attempt-agnostic retry guidance belongs on
   the canonical issue (or the local task body for non-GitHub plans).
5. Refreshed plan status determines effective disposition:

| Plan status | Effective disposition | Meaning |
| --- | --- | --- |
| `done` | `done` | Accepted result is committed |
| implementation-ready status | `retry-same-task` | Concrete implementable delta remains |
| `ready-for-research` | `needs-more-research` | Ralph can narrow/research without owner input |
| `blocked` | `blocked-needs-design` | Only dependency or explicit owner decision is valid |
| `deferred` | `deferred` | Requires explicit owner instruction to park |

The decider report's disposition is diagnostic when it disagrees with refreshed
status. However, current code makes one exception: a parsed `done` report can
auto-repair a non-done plan row to `done` and commit that change. The plan is
therefore not unconditionally authoritative.

### 7. Integration and accepted completion

1. The decider must not blindly merge the task branch. It applies the final
   result to the output branch, runs appropriate focused or configured
   verification, commits, and leaves the main worktree clean.
2. A direct-to-base done result immediately enters the completion protocol.
   Integration-branch runs leave issues and claims open until an operator calls
   `complete` after acceptance integration.
3. Completion requires all of the following:
   - plan status is `done`;
   - caller owns the exact claim and names its acceptance ref;
   - caller's integration ref equals the current claimed output-branch tip;
   - result differs from Claim Base SHA;
   - Claim Base SHA is an ancestor of the result;
   - result is an ancestor of the acceptance-branch tip;
   - the canonical issue is still runnable and all blockers are still complete.
4. The claim transitions from active to completing with the exact result SHA
   before issue close. Lost responses can be resumed. A completed external
   close permits leased claim deletion; cancellation or another external close
   reason retains the claim and fails.
5. GitHub close occurs before claim deletion. A close failure retains the
   completing claim. A lost successful deletion response is treated as success
   only after re-read confirms the ref is absent.

### 8. Resource and verification constraints

Ralph refuses unguarded Base SHAs, shares one Git-common-directory heavy lock
across root checks, QNT proofs, and MBT, caps Turbo and Vitest concurrency, and
injects the repository's SIGKILL/137 emergency protocol into worker prompts.
Cross-run evaluator/artifact cleanup runs only when the current and legacy
resource locks are all idle. The configured broad command is diagnostic: an
unrelated baseline failure must not expand the task.

The resource bounds are candidate requirements backed by repository policy.
The shell's exact three-lock sequence and process-name filters are historical
mechanics, not new-orchestrator requirements.

### 9. Evidence, observation, and cleanup

Each run preserves `state.env`, plan/task snapshots, event and attempt history,
heartbeats, process snapshots, a final run report, per-round prompts/logs/exits,
review reports, implementation finals, diffs, matrix snapshots, and a
non-convergence summary. The run report is written on success and failure.

Normal accepted attempts delete temporary task worktrees and branches unless
`--keep-worktrees` is set. Run-local evidence remains. Claims are not part of
generic EXIT cleanup: they are removed only by successful completion or an
explicit release.

At non-convergence, the durable requirement is stricter: preserve claim, run
directory, Base SHA, worktree, branch, complete review history, commands and
verification evidence, and a component-level WIP disposition until
reconciliation. Current default cleanup does not satisfy that requirement.

## State-transition model

| From | Event/guard | To | Required effect |
| --- | --- | --- | --- |
| Candidate | Graph/admission preflight passes | Runnable | Plan, issue, blockers, label, and marker agree |
| Runnable, unclaimed | Atomic claim succeeds and post-claim issue recheck passes | Claimed/active | Persist exact owner identity and Claim Base SHA |
| Claimed/active | Attempt starts | Implementing | Create attempt evidence, task branch, and worktree from attempt Base |
| Implementing | Technical reviewer failure within budget | Implementing | Retry review only; do not increment semantic round |
| Implementing | `accept-with-fixes` or `reject`, below cap | Handback | Preserve worktree/session and attach review to next round |
| Implementing | `accept` | Deciding | Freeze reviewed evidence; fresh decider owns main-worktree result |
| Implementing | Non-accept at semantic cap | Non-convergent | Stop before decider; quarantine and redesign |
| Deciding | Commit plus refreshed `done` | Integrated locally | Record history; in direct mode begin completion |
| Deciding | Runnable rejection below task-attempt cap | Runnable | Record durable retry guidance; later attempt gets new attempt Base |
| Deciding | Valid dependency/owner block | Blocked | Make issue non-runnable and remove readiness label |
| Deciding | Explicit owner parking | Deferred | Make issue non-runnable and record instruction |
| Active claim plus integrated result | Completion preconditions pass | Completing | CAS claim to exact result SHA |
| Completing | Issue closes as completed | Complete | Lease-delete exact claim |
| Claimed/active | Explicit abandonment | Runnable, unclaimed | Lease-delete claim only; do not close issue |
| Any live run | Fatal error or signal | Aborted | Write report/history; preserve claim; cleanup behavior depends on `--keep-worktrees` |

## Failure-disposition matrix

| Failure | Current observable result | Durable disposition |
| --- | --- | --- |
| Dirty launcher, Base mismatch, invalid args, invalid graph, old resource guard | Fail before claim/worktree | Correct fail-closed preflight |
| Issue hydration or claim conflict | Fatal task/run failure before worktree | Preserve any foreign claim; no product mutation |
| Task install failure after claim/worktree creation | EXIT cleanup normally deletes task branch/worktree; own claim remains | Gap: preserve recoverable WIP or prove none exists before cleanup |
| Implementer exits nonzero | Review current diff | Correct: partial WIP can still be judged |
| Reviewer runner exit or invalid report | Retry up to technical budget without semantic round | On exhaustion, fatal before decider; preserve evidence and claim |
| Semantic reject below round cap | Same-worktree handback | Continue only while every finding belongs to same leaf outcome |
| Semantic non-accept at round cap | Exit nonzero before decider; safety-cap artifact and claim retained | Quarantine all named evidence and route to redesign |
| Decider exits, omits detectable `Plan Impact`, leaves dirty state, or produces invalid planning state | Fatal run | No tracker completion; retain claim; preserve evidence |
| Runnable disposition on final task attempt | Fatal contract failure | Gap: no representable terminal state when no dependency/owner block or owner deferral exists |
| Issue completion fails before close | Fatal, claim retained/completing | Resume or reconcile; never infer completion |
| Claim deletion fails after confirmed close | Fatal diagnostic after product completion | Re-read and clean exact claim; do not reopen accepted issue |
| Operator INT/TERM | Exit 130/143, run report, generic cleanup | Stop at clean handoff when possible; explicitly choose abandon vs quarantine |
| SIGKILL/137 in verification | Worker prompt requires emergency inspection and no unchanged retry | Evidence must include command, PIDs, resource counters, and orphan cleanup |

## Contradictions and contract gaps

### Critical

1. **Quarantine versus default cleanup.** The accepted non-convergence decision
   and generated safety-cap report promise that the worktree and task branch
   remain quarantined. `run_task_attempt` returns fatal while both are still in
   the generic active arrays; the EXIT trap then force-removes them and deletes
   the branch unless `--keep-worktrees` was set. Retained post-mortem
   quarantines demonstrate a successful operator practice, not the default
   implementation guarantee.
2. **Native graph versus issue-body graph.** The accepted map destination and
   leaf preflight require native blocker edges. `validatePlanEntries` instead
   parses exactly one `## Blocked by` section and compares it with local indexed
   dependencies. GitHub native dependencies are neither read nor reconciled.
3. **Review convergence is under-specified in code.** The project requires RAW,
   domain-language, architecture/connascence, and code-review passes until no
   reasonable findings remain. Ralph accepts one generic review verdict and
   does not make those four perspectives or prior-finding disposition
   executable.

### High

4. **Two Base SHAs share one word.** The claim freezes the first attempt's Base
   SHA, but later whole-task reruns create worktrees from the then-current
   output `HEAD`. Completion proves ancestry from the Claim Base, not from each
   attempt Base. Both are legitimate facts, but documentation usually calls
   both “the task Base SHA.” A replacement contract must name and retain both.
5. **The final task-attempt state can be impossible.** The final attempt forbids
   both runnable dispositions. `blocked` is valid only for a dependency or
   owner decision, and `deferred` only for an explicit owner instruction. A
   still-fixable but non-landed task with none of those conditions has no valid
   terminal plan state, so the harness fails without the quarantine/redesign
   transition used by semantic round caps.
6. **Shared output branch weakens per-task completion identity.** Completion
   requires the integration ref to equal the current output-branch tip. If a
   GitHub-backed integration lane runs multiple tasks before acceptance, an
   earlier issue can be closed against a later aggregate tip rather than its
   own accepted task commit. Explicit task lanes reduce but do not prohibit
   this state.
7. **Failure-after-claim cleanup can strand ownership.** Claims are acquired
   before worktree creation and intentionally survive all generic failures;
   generic cleanup can delete the only task branch/worktree. The run directory
   may retain diffs, but the contract does not prove enough WIP was captured
   before destructive cleanup.

### Medium

8. **Numeric cap history is stale in the accepted decision.** The bounded-leaf
   asset says ten rounds; current config, operator docs, and tests say six. The
   durable rule is a positive finite configured cap with quarantine on
   non-accept, not the historical number ten.
9. **Documented stop conditions are incomplete.** The operator guide says the
   loop stops only for no work, operator interruption, or a fatal harness error,
   then gives a narrow fatal list. Code also stops for safety-cap
   non-convergence, exhausted technical reviews, hydration/claim/completion
   failures, workload underflow, task-attempt exhaustion, invalid dispositions,
   missing retry guidance, invalid blocker/deferred evidence, and more.
10. **“Plan status is authoritative” has an exception.** If the decider report
    parses as `done`, Ralph may rewrite a non-done plan row to `done`, commit the
    repair, and then treat it as authoritative. The report can therefore drive
    control state in this path.
11. **Plan Impact enforcement is lexical.** The runner checks only whether the
    decider output contains the words `Plan Impact`; it does not parse one
    unambiguous section or validate its status and fields.
12. **Filtered and full diffs are currently identical.** `save_diff` and
    `save_full_diff` both run the same `git diff --binary <base>`, while the
    operator guide promises filtered task-owned diffs that exclude standard
    fuzz-script stubs and separate raw full diffs.
13. **Status is duplicated across authorities.** Plan status, issue state,
    readiness label, runnable marker, blocker prose, remote claim, and Git
    ancestry can temporarily contradict. Validation catches many combinations
    at launch/refresh, but invalid states remain representable and require a
    multi-write reconciliation protocol.

## Retained evidence findings

The 2026-07-16 delivery provides useful counterexamples:

- The presentation-free Oracle facts leaf reached a six-round cap, but rounds
  one and five were model-capacity failures rather than semantic reviews. The
  retained event log recorded empty verdicts with nonzero reviewer status.
  Current code now gives a semantic review up to three technical attempts and
  tests that technical retries do not consume a semantic round.
- The exact Character Build profile graph failed both a ten-round Luna run and
  a six-round Sol run. This supports the durable rule that increasing or
  changing the cap does not make an oversized leaf conformant.
- The canonical weapon-attack interruption frame failed ten Luna rounds, then
  succeeded in two Sol rounds after component-level quarantine and correction.
  This supports selective WIP disposition rather than rejected-branch merging.
- The schema-owned Surface string-role result was valid, but an ambiguous
  disposition parser aborted the harness after acceptance. Manual ancestry,
  integration, and completion recovered the product. The parser has since been
  tightened, but the incident demonstrates why tracker completion must remain
  separately resumable from implementation acceptance.
- The owner-stopped leaf had its exact claim released and all dirty worktrees
  and branches deleted, with nothing integrated. This is valid explicit
  abandonment, distinct from automatic non-convergence cleanup.
- Tracker reconciliation was a separate follow-up after capped runs. That is
  evidence that current task execution and graph/status reconciliation are not
  one atomic state transition.

## Requirements to carry into the build/adopt decision

1. Preserve the Ralph leaf as one coherent vertical outcome; reject or redesign
   a leaf that exposes independently acceptable outcomes.
2. Give the tracker port one authoritative DAG snapshot and native dependency
   projection, with atomic claim semantics and reconciliation of stale external
   state.
3. Represent Claim Base, attempt Base, reviewed WIP head, accepted result, and
   acceptance head as distinct typed identities with explicit ancestry checks.
4. Preserve both semantic retry scopes. Treat technical model/runner recovery
   as a separate budget that cannot consume semantic convergence rounds.
5. Make the four reviewer perspectives and prior-finding disposition
   observable enough to prove convergence, without requiring four particular
   model invocations when one structured review can supply equivalent evidence.
6. Make cap exhaustion an explicit non-convergent/quarantined state, not a
   generic fatal exit. Apply the same terminal model to whole-task attempt
   exhaustion.
7. Disable normal destructive cleanup for claimed, non-convergent, or otherwise
   unreconciled WIP. Cleanup should be state-typed: accepted disposable,
   explicitly abandoned disposable, or quarantined preserved.
8. Bind issue completion to the exact accepted result for that leaf, not merely
   the latest shared output-branch tip.
9. Keep requirements, graph state, claims, execution evidence, and derived run
   projections distinct. Do not create a second status ledger.
10. Make plan mutation and completion crash-resumable, with idempotent
    transitions and clear operator actions for every partial failure.
11. Preserve bounded, serialized verification and the exit-137 emergency
    protocol independently of the implementation substrate.
12. Define an evidence manifest whose “filtered” and “full” artifacts have
    executable, tested meanings and whose preservation policy follows the
    terminal state.

## Documentation ownership

This asset records the answer to one Wayfinder investigation and remains
historical evidence after downstream decisions promote accepted facts to their
owners. It changes no D&D rule, Cleanroom product requirement, architecture, or
modeling assumption, so `UBIQUITOUS_LANGUAGE.md`, `docs/cleanroom/CONTEXT.md`,
`ARCHITECTURE.md`, and `ASSUMPTIONS.md` require no parallel edits.
