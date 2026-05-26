# Ralph Lane A: Character Levels 1-3 Ultra-Golden Gate

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY", "status": "ready-for-research", "title": "Close Mind Spike selected-identity witness" },
    { "number": 2, "id": "L13UG-A02-LEVEL13-CLAIM-REFRESH", "status": "ready-for-research", "title": "Refresh level 1-3 full-support claim artifacts" },
    { "number": 3, "id": "L13UG-A03-ULTRA-GOLDEN-SCOPE-ADMISSION", "status": "ready-for-research", "title": "Admit level 1-3 into aggregate ultra-golden gate" },
    { "number": 4, "id": "L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT", "status": "ready-for-research", "title": "Audit MCP scenario evidence for level 1-3 scope" },
    { "number": 5, "id": "L13UG-A05-MCP-LEVEL13-SCENARIO-IF-NEEDED", "status": "ready-for-research", "title": "Add level 1-3 MCP scenario evidence only if the audit finds a real gap" },
    { "number": 6, "id": "L13UG-A06-MIND-SPIKE-REGRESSION-GATE", "status": "ready-for-research", "title": "Add regression coverage for deferred selected-identity disposition" },
    { "number": 7, "id": "L13UG-A07-LEVEL13-FOLLOWUP-SPLIT-AUDIT", "status": "ready-for-research", "title": "Audit level 1-3 follow-up splits for claim-gate correctness" },
    { "number": 8, "id": "L13UG-A08-LEVEL13-DIAGNOSTIC-READINESS-AUDIT", "status": "ready-for-research", "title": "Audit non-blocking product-readiness diagnostics" },
    { "number": 9, "id": "L13UG-A09-CLAIM-VS-DIAGNOSTIC-DOC-TIGHTENING", "status": "ready-for-research", "title": "Tighten claim-gate wording around diagnostics" },
    { "number": 10, "id": "L13UG-A10-LEVEL13-REPORT-CONSISTENCY", "status": "ready-for-research", "title": "Verify generated report consistency after scope admission" },
    { "number": 11, "id": "L13UG-A11-LEVEL13-UNIT-JOIN-AUDIT", "status": "ready-for-research", "title": "Audit supported Unit to rules-kernel join for level 1-3" },
    { "number": 12, "id": "L13UG-A12-LEVEL13-SRD-PRESSURE-AUDIT", "status": "ready-for-research", "title": "Audit SRD pressure rows with no Unit matrix row" },
    { "number": 13, "id": "L13UG-A13-LEVEL13-CLOSED-DISPOSITION-RAW-AUDIT", "status": "ready-for-research", "title": "RAW audit closed runtime-detached dispositions in level 1-3" },
    { "number": 14, "id": "L13UG-A14-LEVEL13-CHECKER-SELFTESTS", "status": "ready-for-research", "title": "Extend checker self-tests for level 1-3 ultra-golden failures" },
    { "number": 15, "id": "L13UG-A15-LEVEL13-CLOSEOUT", "status": "ready-for-research", "title": "Close out level 1-3 ultra-golden lane" },
    { "number": 16, "id": "L13UG-A16-RECURSIVE-NEXT-BATCH", "status": "ready-for-research", "title": "Plan the next level-support batch if this lane drains" }
  ]
}
-->

This is the active Ralph lane for opening the character levels 1-3
ultra-golden gate. Character level and spell level are separate axes:
character levels 1-3 include spell-level-2 pressure, not spell-level-3
pressure.

## Context Budget

Read only these by default:

- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md`
- Relevant `mind_spike` files when a task touches Mind Spike:
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Mind Spike`,
  `packages/surface/content/mind_spike.json`,
  `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`,
  `packages/battle-runtime/src/unit-profile-admission-damage-spells.test.ts`,
  and existing selected-identity tests with the same spell-damage shape.

Do not recursively read historical Ralph plans. Use generated artifacts and
current code as source of truth. Preserve authored-identity boundaries:
selection/evidence may name SRD Units; runtime behavior must use support
profiles, typed procedure facts, and explicit runtime state.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 master`, `git log --oneline -1 HEAD`, and
  `git merge-base --is-ancestor <declared-base-sha> HEAD`.
- Keep table-owned perception/knowledge out of runtime state. For Mind Spike,
  runtime owns save damage, Spell Slot spend, Concentration ownership, duration,
  and cleanup; table/runtime-detached owner keeps same-plane location knowledge,
  Hidden prevention, and observer-scoped Invisible benefit denial.
- Do not strengthen the level 1-3 claim gate by smuggling diagnostic product
  readiness into the support claim. If a diagnostic should become a blocker,
  make that a deliberate checker change with a self-test.
- Run the reviewer loop until convergence: RAW traceability,
  ubiquitous-language/domain language, architecture/connascence, and code
  review. Fix every reasonable finding; reject only with a concrete reason.

## Verification

Every task must run the narrowest relevant checks, and at minimum for claim or
artifact changes:

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check` if rules-kernel joins or evidence change
- Focused package tests for touched runtime/evidence files
- `git diff --check`

## Tasks

### Task 1 - L13UG-A01-MIND-SPIKE-SELECTED-IDENTITY - Close Mind Spike selected-identity witness

Status: `ready-for-research`

Input: current Mind Spike Unit claim/evidence rows, local SRD Mind Spike text,
and existing selected-identity MBT patterns for save-damage spells.

Output: selected-identity witness evidence for the supported Mind Spike runtime
subset. The witness must prove that selected SRD Unit identity reaches the
spell-invocation runtime path for target admission, Wisdom save damage, Spell
Slot spend, failed-save Concentration duration/cleanup, and successful-save
half damage without starting the Mind Spike Concentration effect.

Acceptance: `mind_spike` no longer has
`missing-witness-deferred-not-applicable`; deferred perception/knowledge
mechanics remain explicitly runtime-detached.

### Task 2 - L13UG-A02-LEVEL13-CLAIM-REFRESH - Refresh level 1-3 full-support claim artifacts

Status: `ready-for-research`

Input: Task 1 output and generated coverage artifacts.

Output: refreshed generated level 1-3 artifacts showing the claim gate result.
Do not manually edit generated summaries except through the checker.

Acceptance: `plans/unit-profile-coverage/level1-3-full-support.json` reports
`claimGate.status: "pass"` or records the exact remaining blocker with no stale
Mind Spike row.

### Task 3 - L13UG-A03-ULTRA-GOLDEN-SCOPE-ADMISSION - Admit level 1-3 into aggregate ultra-golden gate

Status: `ready-for-research`

Input: passing level 1-3 full-support claim and current ultra-golden checker
scope.

Output: checker-supported level 1-3 aggregate ultra-golden scope. The aggregate
gate must remain conjunctive across support completeness, QNT/generator
readiness, MBT/parity evidence, and MCP scenario evidence.

Acceptance: `ULTRA_GOLDEN_GATE.md` includes `level-1-3` only if all four layers
pass; otherwise it reports the precise blocked layer.

### Task 4 - L13UG-A04-MCP-LEVEL13-EVIDENCE-AUDIT - Audit MCP scenario evidence for level 1-3 scope

Status: `ready-for-research`

Input: MCP scenario evidence manifest and level 1-3 required user-facing flows.

Output: written checker-owned decision, preferably generated, on whether level
1-3 can reuse existing flows or needs a new executable scenario.

Acceptance: no hand-wavy reuse. Either existing scenario evidence is tied to
level 1-3 requirements, or Task 5 remains necessary with exact inputs.

### Task 5 - L13UG-A05-MCP-LEVEL13-SCENARIO-IF-NEEDED - Add level 1-3 MCP scenario evidence only if the audit finds a real gap

Status: `ready-for-research`

Input: Task 4 audit.

Output: if needed, one focused MCP scenario that demonstrates a level-3
character path using supported level 1-3 content without PHB+ identity leakage.
If not needed, mark this task done with an evidence-backed no-op commit or plan
update.

Acceptance: MCP evidence layer for level 1-3 is pass or explicitly blocked
with a concrete missing scenario.

### Task 6 - L13UG-A06-MIND-SPIKE-REGRESSION-GATE - Add regression coverage for deferred selected-identity disposition

Status: `ready-for-research`

Input: checker code and self-tests around selected-identity dispositions.

Output: self-test coverage proving that a Unit with a supported subset plus
runtime-detached deferred mechanics still needs selected-identity evidence for
the supported subset.

Acceptance: removing Mind Spike selected-identity evidence would fail the
claim gate in the self-test shape.

### Task 7 - L13UG-A07-LEVEL13-FOLLOWUP-SPLIT-AUDIT - Audit level 1-3 follow-up splits for claim-gate correctness

Status: `ready-for-research`

Input: six current `blocked-follow-up-split` rows in
`LEVEL1_3_FULL_SUPPORT.md`.

Output: confirm each split is correctly non-blocking under the current claim
gate or produce new atomic tasks if any split should block level 1-3.

Acceptance: no follow-up split silently hides an executable level 1-3 support
gap.

### Task 8 - L13UG-A08-LEVEL13-DIAGNOSTIC-READINESS-AUDIT - Audit non-blocking product-readiness diagnostics

Status: `ready-for-research`

Input: level 1-3 product readiness diagnostic rows with
`battle-runtime-required`, `owner-evidence-required`, and
`partial-battle-runtime`.

Output: concise artifact or generated note explaining why each diagnostic
status does or does not block the level 1-3 claim.

Acceptance: no diagnostic status is left ambiguous as a hidden blocker.

### Task 9 - L13UG-A09-CLAIM-VS-DIAGNOSTIC-DOC-TIGHTENING - Tighten claim-gate wording around diagnostics

Status: `ready-for-research`

Input: findings from Tasks 7 and 8.

Output: documentation/checker report wording that clearly separates strict
claim gates from diagnostic lower-layer accounting.

Acceptance: future readers can see why a 95% product-readiness diagnostic can
coexist with a passing full-support claim.

### Task 10 - L13UG-A10-LEVEL13-REPORT-CONSISTENCY - Verify generated report consistency after scope admission

Status: `ready-for-research`

Input: generated markdown/json reports after Tasks 2-9.

Output: fix stale cross-report numbers, stale blocker mentions, and stale
references to `shining_smite` as a blocker.

Acceptance: `LEVEL1_3_FULL_SUPPORT.md`, `ULTRA_GOLDEN_GATE.md`, and related
JSON agree on blockers and layer statuses.

### Task 11 - L13UG-A11-LEVEL13-UNIT-JOIN-AUDIT - Audit supported Unit to rules-kernel join for level 1-3

Status: `ready-for-research`

Input: `level1-3-full-support.json`, `unit-matrix.json`, and
`rules-kernel-coverage/profile-obligations.jsonl`.

Output: confirm every supported level 1-3 Unit with reducer semantics joins to
rules-kernel evidence, or add precise follow-up tasks.

Acceptance: supported Unit rules-kernel chain remains 100% with no orphan
supported reducer Unit.

### Task 12 - L13UG-A12-LEVEL13-SRD-PRESSURE-AUDIT - Audit SRD pressure rows with no Unit matrix row

Status: `ready-for-research`

Input: `LEVEL1_3_FULL_SUPPORT.md` SRD pressure with no Unit matrix row section.

Output: confirm each no-matrix row is legitimately non-executable,
container-only, or covered by an adopted frontier decision; add tasks only for
real missing Unit rows.

Acceptance: no level 1-3 SRD pressure gap is hidden outside the Unit matrix.

### Task 13 - L13UG-A13-LEVEL13-CLOSED-DISPOSITION-RAW-AUDIT - RAW audit closed runtime-detached dispositions in level 1-3

Status: `ready-for-research`

Input: closed runtime-detached rows in level 1-3 and local SRD passages.

Output: focused audit of 3-5 highest-risk closed dispositions, prioritizing
detection, perception, social, and spatial facts.

Acceptance: if any closure overreaches, add a concrete follow-up; otherwise
document the sampled evidence and why the closure vocabulary holds.

### Task 14 - L13UG-A14-LEVEL13-CHECKER-SELFTESTS - Extend checker self-tests for level 1-3 ultra-golden failures

Status: `ready-for-research`

Input: unit-profile coverage checker self-tests.

Output: self-tests covering level 1-3 aggregate admission failure for at least
one blocked layer and success when all four layers are present.

Acceptance: checker behavior protects the new aggregate scope from silent
regression.

### Task 15 - L13UG-A15-LEVEL13-CLOSEOUT - Close out level 1-3 ultra-golden lane

Status: `ready-for-research`

Input: results from Tasks 1-14.

Output: concise closeout section in this plan or generated summary identifying
whether level 1-3 is now ultra-golden, what remains non-blocking, and what the
next frontier is.

Acceptance: no active task remains in this lane except recursive planning if
new work is discovered.

### Task 16 - L13UG-A16-RECURSIVE-NEXT-BATCH - Plan the next level-support batch if this lane drains

Status: `ready-for-research`

Input: current generated reports after Task 15.

Output: if level 1-3 is closed, create the next coherent level-support lane
plan with 10-20 atomic tasks and context-budget rules. If level 1-3 is not
closed, add exact repair tasks here instead of ending the run.

Acceptance: Ralph must not end merely because the initial list is done. It
either leaves a closed lane with a clear next plan committed, or it appends
new runnable tasks discovered from current generated artifacts.
