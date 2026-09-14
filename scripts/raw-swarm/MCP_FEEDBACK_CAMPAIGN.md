# MCP feedback and fix campaign

This document owns the methodology for an operator-directed MCP feedback
campaign: exploratory players produce evidence, a ledger keeper validates and
groups observations, a chooser creates actionable GitHub tasks, and an
implementation/review loop integrates fixes for subsequent players. It extends
the manual MCP experiment described in [OPERATIONS.md](OPERATIONS.md), not the
admitted Scenario execution contract in [SCENARIO_EXECUTION.md](SCENARIO_EXECUTION.md).
The [package README](README.md) owns existing Raw Swarm vocabulary and lanes.

## Authorization and duration

The initial pilot was authorized on 2026-09-14 with six hours of player
exploration and no preset deadline for the subsequent fix phase. Preparation
is outside the six-hour window. Record the actual first-player start and UTC
cutoff in the GitHub campaign ledger; do not silently reset either after a
restart. Stop exploratory player work at the cutoff, preserve partial evidence,
and continue triage, implementation, review, verification, and targeted fix
confirmation afterward. Confirmation attempts do not extend exploration.

The fix phase drains the problems produced or explicitly adopted by this
campaign, not the repository's entire backlog. A task requiring a product
choice, unavailable evidence, or nonconverging design remains explicitly
unresolved; absence of a time limit does not authorize inventing rules or
waiving gates. Escalate such tasks with the concrete missing decision. Keep
working independently actionable tasks. Report unresolved work at handoff.

The user authorized creating the GitHub ledger and tasks, agent delegation,
and integrating reviewed fixes into `master`. Publishing packages, deploying
services, modifying unrelated resources, and weakening acceptance contracts
are outside this authorization.

## Roles and scheduling

| Role               | Model and reasoning        | Ownership                                                                                     |
| ------------------ | -------------------------- | --------------------------------------------------------------------------------------------- |
| Orchestrator       | Parent session             | Assignments, clocks, revisions, resource coordination, integration, and recovery checkpoints. |
| Exploratory player | Luna max                   | An original story, actual public MCP interactions, expectations, and independent feedback.    |
| Ledger keeper      | Luna max                   | Evidence validation, semantic grouping, and the sole writer of the campaign ledger.           |
| Chooser            | Luna max                   | Prioritization, existing-task lookup, task creation, and task-number handoff to the keeper.   |
| Implementer        | Sol medium or Luna max     | One claimed task in an isolated checkout, its implementation, and appropriate tests.          |
| Reviewer           | Sol medium or Astra medium | Independent findings with file/line evidence and review convergence.                          |

Start with one exploratory player at a time. Together with the orchestrator,
keeper, chooser, implementer, and reviewer this fits six concurrent agents.
Roles may be idle or reused between bounded assignments. Give each worker
explicit file/worktree ownership and tell it that other agents share the
workspace. Do not let two implementers mutate the same checkout.

When the campaign enters `FIX_TAIL`, use the six slots for two fixers in
isolated checkouts, one shared reviewer, the ledger keeper, the chooser, and
the orchestrator/root; do not dispatch another exploratory player. Fixers own
disjoint tasks and files. Serialize broad checks and merges, reconcile the
latest `master` before integration, and recheck the affected integration delta
afterward. Keep the role model/reasoning assignments and all acceptance gates
above unchanged.

Fresh exploration agents receive no known-defect checklist, issue ledger,
implementation source, or earlier player feedback. Confirmation agents receive
the selected reproduction and expected behavior and are identified separately.
The orchestrator may rotate general journey objectives to expand exercised
behavior without revealing the particular defects being evaluated.

## Player contract

Use the full public production MCP tool surface, including character creation,
character sessions, battle, and dice, preserving discovery metadata. A local
protocol client or temporary transport bridge must forward tool inputs and
results unchanged. Record transport differences from deployed/native-client
use; a local source trial does not qualify the published package or deployment.
Do not substitute direct SDK operations for inaccessible MCP operations.

Each attempt receives a fresh session, a fixed tested commit, an evidence
location, an exact prompt, and explicit limits: at most 25 minutes, 120 tool
calls, four major story branch decisions, and four battle rounds by default.
The six-hour cutoff takes precedence over remaining attempt time. Record
budget exhaustion and obstruction instead of fabricating completion.

The player must:

1. Discover the user-facing workflow and create a coherent character through
   it. Inspect the resulting state against the character's intended abilities
   and readiness for the adventure.
2. Build an original short story. Before each major random choice, persist
   three to six numbered, materially different options, then call `roll_dice`
   with one die of that many faces. Follow the selected option without rerolls
   or retroactive rewriting. Retain options, request, faces, and selection.
3. Complete the assigned executable journey. The default includes character
   creation, a readiness inspection, entering a battle, and attempting at least
   two rounds before settlement or a concrete obstruction. Randomness selects
   circumstances and tactics within that obligation; a noncombat story ending
   does not satisfy an assigned battle exercise. Later attempts may explicitly
   target another journey such as recovery or character progression.
4. Form expectations from the local SRD, advertised behavior, and reasonable
   player intent, not only from the options already exposed. Check outcomes,
   discoverability, documentation, interaction burden, and error recovery.
   Preserve friction even after finding a workaround. Include a small, clearly
   identified invalid-input experiment where relevant to the journey.
5. Separate narration and Table adjudication from engine execution. Dice
   sampling alone does not demonstrate that the engine executed a narrated
   ability check or scene. Never invent identifiers, executable support, or
   successful state transitions.
6. Use the local SRD discovery workflow required by `AGENTS.md` for rules
   claims. Mark unverified expectations explicitly. Preserve the PHB+ boundary
   in [AUTHORING.md](../../docs/mushroom-playbook/AUTHORING.md).
7. Return feedback with expectation, observed result, exact exchange references,
   recovery, uncertainty, and unexercised behavior. Prepare issue-quality
   observations without independently publishing tasks or making fixes.

Run a fresh MCP process against an immutable player checkout. Do not change
its source or dependency graph while its session is active. New attempts take
the latest integrated `master`; active attempts retain their original commit.

## Evidence and ledger

The GitHub campaign issue is the canonical ledger. It contains the clock,
methodology link, attempt index, stable finding keys, grouped observations,
confidence/classification, and links to task issues and fix confirmations.
Individual task issues own their implementation detail and open/closed state.
The keeper alone edits the ledger; chooser and fixer updates flow through it.

Retain each prompt, model/reasoning selection, exact revision, start/end times,
tool discovery, ordered requests/results, pre-roll options, story, and feedback.
At every attempt termination, including completion, obstruction, timeout,
cutoff, or interruption, stop its writers, hash the retained evidence, and
retain a manifest naming the outcome and missing artifacts. If a crash prevents
sealing, the recovering orchestrator seals the surviving evidence before
triage; an incomplete manifest cannot authorize a successful-attempt claim. Store raw
session credentials only with restricted local evidence; never paste access
grants or secrets into GitHub. Publish sanitized reproduction facts and
sequence/hash references sufficient for another operator to understand the
finding. Record the storage location and any durability limitations explicitly.

Manual attempts must be identified as manual attempts. Do not manufacture
admitted Scenario identities, canonical Execution evidence, SQLite row ids,
replay certificates, or finding fingerprints that the formal pipeline has not
actually produced. Existing formal evidence follows [EVIDENCE_REVIEW.md](EVIDENCE_REVIEW.md)
and the issue-observation lifecycle in [OPERATIONS.md](OPERATIONS.md).

The keeper validates claims against exact evidence and, where necessary,
minimal read-only reproduction or local RAW. Keep confirmed observations,
suspected causes, and classification distinct. Allowed outcomes include a
rules/runtime defect, MCP defect, documentation defect, usability problem,
unsupported capability, invalid player decision, or unresolved expectation.
An agent's severity label is a proposal, not independent confirmation.

Keep confirmed defects, larger missing capabilities or features, and
intentional behavior distinct during triage. Split mixed observations into
independently closable linked tasks only when the evidence warrants it, and
preserve each task's discovery path. Keep larger features tracked with an
explicit priority, decision, and deferral reason; do not silently drop them or
call them fixed, and do not defer solely because of size. Intentional behavior
is not a defect, but add or improve discoverability and documentation when
that is needed for users to understand it.

## Choice and issue creation

The chooser reads validated ledger entries and searches open and closed GitHub
issues for semantic duplicates. Prefer problems with substantial player impact,
strong evidence, broad affected workflows, and an achievable coherent fix.
Consider dependencies and likely effort; write a brief rationale rather than
inventing a numerical priority formula. Group observations only when a common
invariant or fix justifies it. Keep independent problems independently closable.

The chooser also occasionally scans GitHub issues labelled `claude-swarm`,
which come from the secondary sidecar agent. Treat them as another source of
candidate observations, with the same evidence validation, semantic
deduplication, and priority judgment as player feedback. Reuse the original
issue when suitable; preserve its sidecar attribution and discovery path.
The keeper records an explicit adoption and issue link before it enters this
campaign's fix queue. Missing reproduction details remain unresolved until
recovered or independently reproduced; the label alone does not confirm a bug.
Before dispatch, reconcile claims with the sidecar to avoid concurrent fixes
of the same issue. These occasional scans may continue during the fix phase;
only explicitly adopted issues extend the queue, not every future labelled
issue. Record each scan checkpoint and adoption in the ledger.

Create or reuse tasks through [the GitHub workflow](../../docs/agents/issue-tracker.md).
Each task needs the finding key, tested revision, reproduction, expected and
actual behavior, evidence, scope, and acceptance checks. Rules claims need
local RAW references. Do not label a usability preference as a rules bug. Send
the resulting issue number to the keeper immediately; reconcile existing issues
before retrying a creation whose response was lost. Task-number links prevent
repeated creation after interruption.

Every task must also contain an **Agent discovery path** explaining how the
player reached the problem. Free-form prose is acceptable: include the
character/build and initial setup, relevant numbered story alternatives and
rolled selections, actions or tool calls leading to the observation, the
expected outcome, and what actually happened. Cite the attempt, tested commit,
and exchange sequences. Preserve failed attempts and workarounds that explain
the discovery. For a problem found before a story branch, say so and describe
the creation/discovery steps instead; never invent a narrative route.

A minimized technical reproduction complements this original discovery path;
it does not replace it. When several observations are grouped into one task,
retain the materially different paths, their attempt references, and the reason
they belong together. The issue body must be understandable without access to
the local transcript; link supporting artifacts while excluding access grants
and other secrets. The chooser drafts this section and the keeper checks it
against retained player evidence before the task is eligible for dispatch.

## Implementation, review, and integration

The orchestrator is the sole task-dispatch owner. Before assigning work, it
checks the issue and dependencies, records the worker/worktree claim on the
task issue, and waits for the keeper to acknowledge the claim in the ledger.
Only then may the implementer start. Release or transfer a claim explicitly
after checking that the previous worker has stopped. On restart, reconcile
existing claims before dispatching; an idle-looking worker is not an unclaimed
task. GitHub assignees alone cannot distinguish agents sharing one account.

Work on one claimed actionable task at a time. Use platform-local dependencies
in an isolated checkout under [distribution guidance](../distribution/README.md#shared-hostcontainer-checkouts).
Never reinstall dependencies in the shared host checkout. Search canonical
owners before adding state or helpers and preserve all repository contracts.

The implementation plan includes review of RAW traceability, domain language,
architecture/connascence, and code quality. Reviewers read
[review-rules.md](../../.claude/review-rules.md). Use up to four review rounds:
review, fix substantiated findings, and recheck the affected delta. Unchanged
passes need not be repeated. Four rounds are sufficient for review convergence;
after the fourth, resolve concrete findings from that round, verify the
correction and required gates, and merge when no known correctness issue
remains. Do not defer solely because a correction occurred in the final round
or run another full review loop for that reason. A knowingly unresolved
correctness issue remains unmerged and is escalated with concrete evidence.

Run focused checks during implementation. After convergence, run all required
integration gates, including `pnpm quality:milestone` and the applicable
Raw Swarm, distribution, QNT/MBT, and other acceptance checks. Follow the shared
resource locks and emergency policy in `AGENTS.md`; do not compete with another
heavy verification job. A failed or partial check is not a pass.

Only the orchestrator integrates into `master`, serially. Fetch first, account
for intervening changes, and recheck affected boundaries after rebasing or
resolving conflicts. Preserve unrelated work. Record the integrated commit and
push result. The next exploratory attempt starts a fresh server at that commit.

A fix needs both appropriate deterministic regression evidence and a targeted
public-MCP confirmation where the behavior can be exercised. Keep the original
failed attempt unchanged. If confirmation finds the same failure, reopen or
continue the same task; do not count the fix as confirmed. Distinguish merged
code, passing checks, and confirmed player behavior in the ledger.
The orchestrator owns task progress comments, closure, and reopening. It closes
a task only after the required checks and confirmation have passed (or a
concrete reason that public-MCP confirmation is inapplicable is recorded), and
sends the resulting issue and evidence links to the keeper. The keeper updates
the ledger index; it does not maintain an independent issue lifecycle.

## Recovery and assessment

Checkpoint the actual cutoff, tested and integrated revisions, active task
claims, attempt locations, review-round counts, pending findings, and next
operations in the ledger. Reconcile GitHub and local evidence before resuming;
do not restart the six-hour window, duplicate tasks, or assume an interrupted
verification succeeded. The orchestrator must remain active or use a supported
continuation mechanism; a background process alone is not orchestration.

Assess encountered workflows, detection when encountered, actionable report
quality, false positives, duplicate grouping, integrated fixes, and post-fix
confirmation. Mark unvisited workflows as untested. Narrative length, number of
attempts, and successful story endings are not coverage claims. The preliminary
2026-09-13 manual trial found restricted creation choices but overlooked an
empty loadout and never entered battle; this motivates the executable-journey
requirement without supplying future exploration players a defect checklist.
