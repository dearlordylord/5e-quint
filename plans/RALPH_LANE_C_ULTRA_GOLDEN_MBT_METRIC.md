# Ralph Lane C - Ultra-Golden MBT Metric

Purpose: make the stronger "ultra-golden" claim measurable without changing
the existing level 1/2 support claim. This lane owns aggregate gates and focused
MBT/scenario evidence for already-supported behavior. It must not implement new
SRD feature support or rewrite battle semantics.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable tasks
or prove from checker-owned artifacts that no metric or MBT evidence work
remains.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "C1-ULTRA-GOLDEN-DEFINITION-GATE",
      "status": "done",
      "title": "Define the ultra-golden aggregate gate"
    },
    {
      "number": 2,
      "id": "C2-LEVEL12-QNT-MBT-JOIN-REPORT",
      "status": "done",
      "title": "Report level 1-2 support to QNT/MBT evidence join"
    },
    {
      "number": 3,
      "id": "C3-MCP-LEVEL12-SCENARIO-GATE",
      "status": "done",
      "title": "Gate level 1-2 MCP scenario evidence"
    },
    {
      "number": 4,
      "id": "C4-SELECTED-IDENTITY-EVIDENCE-AUDIT",
      "status": "done",
      "title": "Audit selected-identity evidence against supported Units"
    },
    {
      "number": 5,
      "id": "C5-UNIT-PROFILE-RULES-KERNEL-GAP-REPORT",
      "status": "done",
      "title": "Report supported profile rules-kernel gaps"
    },
    {
      "number": 6,
      "id": "C6-MBT-WITNESS-KIND-NORMALIZATION",
      "status": "ready-for-research",
      "title": "Normalize MBT/runtime witness kinds in the metric"
    },
    {
      "number": 7,
      "id": "C7-SPELL-PROCEDURE-MBT-EVIDENCE-GATE",
      "status": "ready-for-research",
      "title": "Gate spell procedure MBT evidence for supported profiles"
    },
    {
      "number": 8,
      "id": "C8-FEATURE-PROCEDURE-MBT-EVIDENCE-GATE",
      "status": "ready-for-research",
      "title": "Gate feature procedure MBT evidence for supported profiles"
    },
    {
      "number": 9,
      "id": "C9-CHARACTER-CREATION-MCP-EVIDENCE",
      "status": "ready-for-research",
      "title": "Add character-creation MCP evidence rows"
    },
    {
      "number": 10,
      "id": "C10-CHARACTER-SHEET-MCP-EVIDENCE",
      "status": "ready-for-research",
      "title": "Add character-sheet MCP evidence rows"
    },
    {
      "number": 11,
      "id": "C11-BATTLE-MCP-EVIDENCE",
      "status": "ready-for-research",
      "title": "Add battle MCP evidence rows"
    },
    {
      "number": 12,
      "id": "C12-LEVEL12-ULTRA-GOLDEN-SUMMARY",
      "status": "ready-for-research",
      "title": "Publish level 1-2 ultra-golden summary"
    },
    {
      "number": 13,
      "id": "C13-MBT-CONTEXT-BUDGET-CHECK",
      "status": "ready-for-research",
      "title": "Check MBT plan context budget and stale references"
    },
    {
      "number": 14,
      "id": "C14-RUST-MIGRATION-QUEUE-DRY",
      "status": "ready-for-research",
      "title": "Dry the Rust migration queue entrypoints"
    },
    {
      "number": 15,
      "id": "C15-ULTRA-GOLDEN-CHECKER-REGRESSION",
      "status": "ready-for-research",
      "title": "Add ultra-golden checker regression coverage"
    },
    {
      "number": 16,
      "id": "C16-END-TO-END-ULTRA-GOLDEN-VERIFY",
      "status": "ready-for-research",
      "title": "Verify ultra-golden gate and focused MCP/MBT checks"
    },
    {
      "number": 17,
      "id": "C17-RECURSIVE-NEXT-BATCH",
      "status": "ready-for-research",
      "title": "Mine next ultra-golden metric or MBT batch"
    }
  ]
}
-->

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Reviewer loop: RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code review. Repeat until no reasonable findings
remain.

## Context Budget

Read only:

- this plan;
- `AGENTS.md`;
- `docs/adr/0001-forest-of-qnt-slices.md` decision/consequences only;
- `plans/QNT_COVERAGE_PROGRAM.md`;
- `plans/rules-kernel-coverage/README.md`;
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- relevant checker scripts and package-local tests for the current task.

Do not read historical Ralph lane transcripts. If context is missing, derive it
from checker-owned JSON/JSONL artifacts instead of old work logs.

## Boundaries

Lane C owns:

- aggregate ultra-golden metric/report/checker work;
- focused MCP scenario coverage for already-supported level 1/2 SRD flows;
- focused MBT witness accounting for already-modeled obligations;
- context-budget cleanup for MBT/rules-kernel plans.

Lane C must not:

- add or change SRD runtime feature behavior;
- change Unit support admission policy;
- split QNT semantic cores owned by Lane A or B;
- run battle MBT for exploratory questions.

## Verification

Run as applicable:

- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- focused MCP tests changed by the task
- focused package-local MBT or QNT tests changed by the task
- `git diff --check`

If an MBT run is needed, follow the repo MBT protocol in `AGENTS.md`.

## Tasks

### Task 1 - C1-ULTRA-GOLDEN-DEFINITION-GATE - Define the ultra-golden aggregate gate

Status: `done`

Input: existing level 1 and level 1-2 support reports plus rules-kernel
coverage reports.

Output: a checker-owned definition that distinguishes support completeness,
QNT/generator readiness, MBT/parity evidence, and MCP scenario evidence.

Acceptance: metric output cannot report "ultra-golden 100%" unless each layer
is explicitly complete.

### Task 2 - C2-LEVEL12-QNT-MBT-JOIN-REPORT - Report level 1-2 support to QNT/MBT evidence join

Status: `done`

Output: generated report joining level 1-2 supported profiles to
rules-kernel obligations, QNT owners, and parity witnesses.

Acceptance: open gaps are explicit rows, not hidden percentages.

### Task 3 - C3-MCP-LEVEL12-SCENARIO-GATE - Gate level 1-2 MCP scenario evidence

Status: `done`

Output: MCP scenario evidence is represented as its own layer and checked by a
focused package-local test command.

Acceptance: MCP evidence failure cannot be mistaken for support-profile failure.

### Task 4 - C4-SELECTED-IDENTITY-EVIDENCE-AUDIT - Audit selected-identity evidence against supported Units

Status: `done`

Output: audit rows for supported Units whose selected-identity evidence exists
but lacks an ultra-golden join to QNT/MBT or MCP evidence.

Acceptance: no authored identity dispatch is introduced.

### Task 5 - C5-UNIT-PROFILE-RULES-KERNEL-GAP-REPORT - Report supported profile rules-kernel gaps

Status: `done`

Output: supported profile rows missing rules-kernel obligation joins are
reported with owning follow-up task ids.

Acceptance: `unit-profile-coverage:check` and `rules-kernel-coverage:check`
remain green.

### Task 6 - C6-MBT-WITNESS-KIND-NORMALIZATION - Normalize MBT/runtime witness kinds in the metric

Status: `ready-for-research`

Output: documented and checked witness-kind vocabulary distinguishing focused
MBT, deterministic QNT replay, runtime test, and MCP scenario evidence.

Acceptance: invalid witness kind fails the checker.

### Task 7 - C7-SPELL-PROCEDURE-MBT-EVIDENCE-GATE - Gate spell procedure MBT evidence for supported profiles

Status: `ready-for-research`

Output: spell procedure supported profiles have explicit QNT/MBT evidence rows
or gap rows.

Acceptance: no new spell behavior; checker/report only.

### Task 8 - C8-FEATURE-PROCEDURE-MBT-EVIDENCE-GATE - Gate feature procedure MBT evidence for supported profiles

Status: `ready-for-research`

Output: unit-feature supported profiles have explicit QNT/MBT evidence rows or
gap rows.

Acceptance: coordinates with Lane A output without duplicating its work.

### Task 9 - C9-CHARACTER-CREATION-MCP-EVIDENCE - Add character-creation MCP evidence rows

Status: `ready-for-research`

Output: character creation evidence rows for level 1-2 SRD flows.

Acceptance: focused MCP test green.

### Task 10 - C10-CHARACTER-SHEET-MCP-EVIDENCE - Add character-sheet MCP evidence rows

Status: `ready-for-research`

Output: character sheet evidence rows for level 1-2 SRD flows.

Acceptance: focused MCP test green.

### Task 11 - C11-BATTLE-MCP-EVIDENCE - Add battle MCP evidence rows

Status: `ready-for-research`

Output: battle MCP evidence rows for level 1-2 SRD flows.

Acceptance: focused MCP test green; slow tests get explicit timeout if needed.

### Task 12 - C12-LEVEL12-ULTRA-GOLDEN-SUMMARY - Publish level 1-2 ultra-golden summary

Status: `ready-for-research`

Output: concise generated summary of level 1-2 support, QNT/generator,
MBT/parity, and MCP layers.

Acceptance: summary cannot hide non-complete layers behind a single percent.

### Task 13 - C13-MBT-CONTEXT-BUDGET-CHECK - Check MBT plan context budget and stale references

Status: `ready-for-research`

Input: QNT/MBT planning docs referenced by active Ralph lanes.

Output: remove obsolete references and keep durable context in a compact source
of truth.

Acceptance: no active task requires reading stale lane histories.

### Task 14 - C14-RUST-MIGRATION-QUEUE-DRY - Dry the Rust migration queue entrypoints

Status: `ready-for-research`

Input: `plans/QNT_COVERAGE_PROGRAM.md` and rules-kernel readiness artifacts.

Output: one compact source of truth for Rust migration/generator readiness
entrypoints, with stale duplicated MBT plans deleted or redirected.

Acceptance: Ralph task context stays bounded.

### Task 15 - C15-ULTRA-GOLDEN-CHECKER-REGRESSION - Add ultra-golden checker regression coverage

Status: `ready-for-research`

Output: checker self-test proving incomplete layers are reported as incomplete.

Acceptance: regression fails before the new gate and passes after.

### Task 16 - C16-END-TO-END-ULTRA-GOLDEN-VERIFY - Verify ultra-golden gate and focused MCP/MBT checks

Status: `ready-for-research`

Output: run the focused commands required by changed checker/test files and
record only durable findings.

Acceptance: checker green; changed focused tests green.

### Task 17 - C17-RECURSIVE-NEXT-BATCH - Mine next ultra-golden metric or MBT batch

Status: `ready-for-research`

Input: current metric reports and checker-owned artifacts after C16.

Output: append at least 12 new atomic runnable tasks or prove from generated
reports that no ultra-golden metric/MBT work remains.

Acceptance: plan has new runnable tasks or a concise durable closure note.
