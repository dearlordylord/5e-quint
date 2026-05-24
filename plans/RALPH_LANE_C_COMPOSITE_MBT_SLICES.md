# Ralph Lane C - Composite MBT Slices

Purpose: add focused QNT-to-TypeScript witnesses for high-value composite
runtime behavior, following ADR-0001's forest-of-slices design. This lane adds
parity witnesses; it does not change Level 1/2 product support claims unless a
new witness exposes a real accounting bug.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable slice
tasks or prove from `REPORT.md` and existing package tests that no high-value
slice candidates remain.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    { "number": 1, "id": "C1-SLICE-CANDIDATE-SURVEY", "status": "ready-for-research", "title": "Survey composite MBT slice candidates" },
    { "number": 2, "id": "C2-DIRECT-CONDITION-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add direct condition lifecycle slice" },
    { "number": 3, "id": "C3-SAVE-CONDITION-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add save-gated condition lifecycle slice" },
    { "number": 4, "id": "C4-SEE-INVISIBILITY-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add See Invisibility observer-sight slice" },
    { "number": 5, "id": "C5-RAY-ENFEEBLEMENT-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Ray of Enfeeblement lifecycle slice" },
    { "number": 6, "id": "C6-WEB-RESTRAINT-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Web restraint hazard slice" },
    { "number": 7, "id": "C7-HEAT-METAL-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Heat Metal object-contact slice" },
    { "number": 8, "id": "C8-GUST-OF-WIND-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Gust of Wind line lifecycle slice" },
    { "number": 9, "id": "C9-ANTIMAGIC-SUPPRESSION-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Antimagic Field suppression slice" },
    { "number": 10, "id": "C10-SPIKE-GROWTH-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Spike Growth movement hazard slice" },
    { "number": 11, "id": "C11-DRAGONS-BREATH-INITIAL-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Dragon's Breath initial-effect slice" },
    { "number": 12, "id": "C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Dragon's Breath granted-action slice" },
    { "number": 13, "id": "C13-MIRROR-IMAGE-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Mirror Image hit-interception slice" },
    { "number": 14, "id": "C14-WARDING-BOND-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Warding Bond linked-effect slice" },
    { "number": 15, "id": "C15-SANCTUARY-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Sanctuary targeting-interdiction slice" },
    { "number": 16, "id": "C16-SPELL-SEQUENCING-INTEGRATION-MBT", "status": "blocked", "title": "Add bounded spell sequencing integration MBT" },
    { "number": 17, "id": "C17-SLICE-SCRIPT-AND-REPORT-CLOSURE", "status": "blocked", "title": "Refresh package scripts and rules-kernel rows" },
    { "number": 18, "id": "C18-END-TO-END-SLICE-VERIFICATION", "status": "blocked", "title": "Run and document lane C verification" },
    { "number": 19, "id": "C19-RECURSIVE-NEXT-BATCH", "status": "blocked", "title": "Mine next composite MBT slice batch" }
  ]
}
-->

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Reviewer loop: RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code review. Repeat until no reasonable findings
remain. MBT is scarce: run only the focused package-local test for the slice.

## Boundaries

Lane C owns:

- `packages/battle-runtime/*.qnt`
- `packages/battle-runtime/src/*mbt*.test.ts`
- `packages/battle-runtime/package.json` focused test scripts
- rules-kernel obligation/profile rows needed for new witnesses

Lane C must not:

- change generator-readiness status except as generated fallout from new witness
  rows;
- add new authored Unit support claims;
- model table-owned geometry, perception, or social adjudication.

## DAG / Queue Order

| # | Task | Status | Depends | Notes |
|---:|---|---|---|---|
| 1 | C1-SLICE-CANDIDATE-SURVEY - Survey composite MBT slice candidates | ready-for-research | none | Confirm each slice is not already present. |
| 2 | C2-DIRECT-CONDITION-SLICE - Add direct condition lifecycle slice | ready-for-implementation-after-light-research | none | Small state lifecycle. |
| 3 | C3-SAVE-CONDITION-SLICE - Add save-gated condition lifecycle slice | ready-for-implementation-after-light-research | none | Save/fail/effect. |
| 4 | C4-SEE-INVISIBILITY-SLICE - Add See Invisibility observer-sight slice | ready-for-implementation-after-light-research | none | Observer sight fact only. |
| 5 | C5-RAY-ENFEEBLEMENT-SLICE - Add Ray of Enfeeblement lifecycle slice | ready-for-implementation-after-light-research | none | D20 and damage-penalty lifecycle. |
| 6 | C6-WEB-RESTRAINT-SLICE - Add Web restraint hazard slice | ready-for-implementation-after-light-research | none | Restraint and hazard lifecycle. |
| 7 | C7-HEAT-METAL-SLICE - Add Heat Metal object-contact slice | ready-for-implementation-after-light-research | none | Object contact and repeat damage. |
| 8 | C8-GUST-OF-WIND-SLICE - Add Gust of Wind line lifecycle slice | ready-for-implementation-after-light-research | none | Line effect and movement interaction. |
| 9 | C9-ANTIMAGIC-SUPPRESSION-SLICE - Add Antimagic Field suppression slice | ready-for-implementation-after-light-research | none | Suppression active-effect state. |
| 10 | C10-SPIKE-GROWTH-SLICE - Add Spike Growth movement hazard slice | ready-for-implementation-after-light-research | none | Movement hazard only; recognition remains table-owned. |
| 11 | C11-DRAGONS-BREATH-INITIAL-SLICE - Add Dragon's Breath initial-effect slice | ready-for-implementation-after-light-research | none | Initial grant state. |
| 12 | C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE - Add Dragon's Breath granted-action slice | ready-for-implementation-after-light-research | none | Granted action damage. |
| 13 | C13-MIRROR-IMAGE-SLICE - Add Mirror Image hit-interception slice | ready-for-implementation-after-light-research | none | Duplicate roll and hit transfer. |
| 14 | C14-WARDING-BOND-SLICE - Add Warding Bond linked-effect slice | ready-for-implementation-after-light-research | none | Damage sharing. |
| 15 | C15-SANCTUARY-SLICE - Add Sanctuary targeting-interdiction slice | ready-for-implementation-after-light-research | none | Targeting gate. |
| 16 | C16-SPELL-SEQUENCING-INTEGRATION-MBT - Add bounded spell sequencing integration MBT | blocked | C2-C15 | Cross-slice bounded fixture. |
| 17 | C17-SLICE-SCRIPT-AND-REPORT-CLOSURE - Refresh package scripts and rules-kernel rows | blocked | C2-C16 | Scripts and generated rows. |
| 18 | C18-END-TO-END-SLICE-VERIFICATION - Run and document lane C verification | blocked | C17 | Focused MBT only. |
| 19 | C19-RECURSIVE-NEXT-BATCH - Mine next composite MBT slice batch | blocked | C18 | Must append >=12 tasks or prove exhaustion. |

## Task Details

### Task 1 - C1-SLICE-CANDIDATE-SURVEY - Survey composite MBT slice candidates

Status: `ready-for-research`

Output: add a short Findings update listing which candidate tasks already have
adequate slice-style MBT and which remain valid. Do not implement a slice in
this task.

Acceptance: no duplicate slice work is left queued after the survey.

### Task 2 - C2-DIRECT-CONDITION-SLICE - Add direct condition lifecycle slice

Status: `ready-for-implementation-after-light-research`

Output: focused QNT slice and TS witness for direct condition application,
duration/cleanup, and removal where current runtime already supports it.

Acceptance: package-local script exists and passes; rules-kernel check passes.

### Task 3 - C3-SAVE-CONDITION-SLICE - Add save-gated condition lifecycle slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for save-gated condition application and failed-save
effects. Keep table-owned target legality as input facts.

Acceptance: focused test passes and obligation row remains covered.

### Task 4 - C4-SEE-INVISIBILITY-SLICE - Add See Invisibility observer-sight slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for observer sight state created by See Invisibility.

Acceptance: no spatial perception model is added.

### Task 5 - C5-RAY-ENFEEBLEMENT-SLICE - Add Ray of Enfeeblement lifecycle slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for repeat d20 lifecycle and source damage-roll penalty.

Acceptance: the test hits both maintained and ended states.

### Task 6 - C6-WEB-RESTRAINT-SLICE - Add Web restraint hazard slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for Web-created restraint/hazard lifecycle using
caller-supplied area facts.

Acceptance: no geometry derivation is introduced.

### Task 7 - C7-HEAT-METAL-SLICE - Add Heat Metal object-contact slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for object contact damage, ongoing choice, and active
effect state already implemented by runtime.

Acceptance: focused MBT or deterministic replay passes.

### Task 8 - C8-GUST-OF-WIND-SLICE - Add Gust of Wind line lifecycle slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for line lifecycle and table-supplied line interaction
facts.

Acceptance: route/geometry remains table-owned.

### Task 9 - C9-ANTIMAGIC-SUPPRESSION-SLICE - Add Antimagic Field suppression slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for suppressing and restoring ongoing spell effects in an
Antimagic Field.

Acceptance: active-effect field names match runtime types exactly.

### Task 10 - C10-SPIKE-GROWTH-SLICE - Add Spike Growth movement hazard slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for movement-triggered hazard damage. The RAW recognition
clause remains table-owned; this slice consumes the table-provided movement and
area facts only.

Acceptance: task notes explicitly reject adding perception/knowledge state.

### Task 11 - C11-DRAGONS-BREATH-INITIAL-SLICE - Add Dragon's Breath initial-effect slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for initial target effect and granted action setup.

Acceptance: no duplicate spell slot state is added.

### Task 12 - C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE - Add Dragon's Breath granted-action slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for granted exhalation action, save result, damage type,
and damage roll.

Acceptance: command and hole types are covered by production runtime.

### Task 13 - C13-MIRROR-IMAGE-SLICE - Add Mirror Image hit-interception slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for duplicate roll, duplicate AC check, and hit transfer.

Acceptance: test covers at least one duplicate-hit and one original-target case.

### Task 14 - C14-WARDING-BOND-SLICE - Add Warding Bond linked-effect slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for linked damage sharing and separation-fact consumption.

Acceptance: separation geometry remains table-owned.

### Task 15 - C15-SANCTUARY-SLICE - Add Sanctuary targeting-interdiction slice

Status: `ready-for-implementation-after-light-research`

Output: focused slice for target interdiction and save-driven retarget/fail
branching.

Acceptance: no social/intent inference is introduced.

### Task 16 - C16-SPELL-SEQUENCING-INTEGRATION-MBT - Add bounded spell sequencing integration MBT

Status: `blocked`

Output: one bounded fixture-world integration MBT covering two or three
already-sliced spell interactions, such as concentration + reaction + ongoing
turn hook. It is not a generation input.

Acceptance: documented scope and bounded runtime.

### Task 17 - C17-SLICE-SCRIPT-AND-REPORT-CLOSURE - Refresh package scripts and rules-kernel rows

Status: `blocked`

Output: add package scripts for new focused tests, update obligation/profile
rows only where evidence changed, regenerate reports.

Acceptance: `pnpm rules-kernel-coverage:check -- --write` then check pass.

### Task 18 - C18-END-TO-END-SLICE-VERIFICATION - Run and document lane C verification

Status: `blocked`

Output: run every new focused slice script once, rules-kernel coverage
write/check, `git diff --check`, and package typecheck if TS changed.

Acceptance: no broad MBT run is used unless the task explicitly justifies it.

### Task 19 - C19-RECURSIVE-NEXT-BATCH - Mine next composite MBT slice batch

Status: `blocked`

Output: append at least 12 new atomic slice tasks from remaining high-value
covered obligations lacking focused slice witnesses. If fewer than 12 remain,
record the exact checker/test evidence proving exhaustion.

Acceptance: do not mark done unless at least 12 new runnable tasks were added
or exhaustion is proven from generated reports and test inventory.

## Verification

- New focused package-local slice script for each task
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm --filter @dnd/battle-runtime typecheck` when TS changes
- `git diff --check`

## Findings

- Spike Growth recognition is not runtime-owned; this lane may test movement
  hazard damage only, consuming table-provided area/movement facts.
