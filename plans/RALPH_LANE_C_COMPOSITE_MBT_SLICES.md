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
    { "number": 1, "id": "C1-SLICE-CANDIDATE-SURVEY", "status": "done", "title": "Survey composite MBT slice candidates" },
    { "number": 2, "id": "C2-DIRECT-CONDITION-SLICE", "status": "done", "title": "Direct condition lifecycle slice already present" },
    { "number": 3, "id": "C3-SAVE-CONDITION-SLICE", "status": "done", "title": "Save-gated condition lifecycle slice already present" },
    { "number": 4, "id": "C4-SEE-INVISIBILITY-SLICE", "status": "done", "title": "Add See Invisibility observer-sight slice" },
    { "number": 5, "id": "C5-RAY-ENFEEBLEMENT-SLICE", "status": "done", "title": "Add Ray of Enfeeblement lifecycle slice" },
    { "number": 6, "id": "C6-WEB-RESTRAINT-SLICE", "status": "done", "title": "Add Web restraint hazard slice" },
    { "number": 7, "id": "C7-HEAT-METAL-SLICE", "status": "done", "title": "Add Heat Metal object-contact slice" },
    { "number": 8, "id": "C8-GUST-OF-WIND-SLICE", "status": "done", "title": "Add Gust of Wind line lifecycle slice" },
    { "number": 9, "id": "C9-ANTIMAGIC-SUPPRESSION-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Antimagic Field suppression slice" },
    { "number": 10, "id": "C10-SPIKE-GROWTH-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Spike Growth movement hazard slice" },
    { "number": 11, "id": "C11-DRAGONS-BREATH-INITIAL-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Dragon's Breath initial-effect slice" },
    { "number": 12, "id": "C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE", "status": "ready-for-implementation-after-light-research", "title": "Add Dragon's Breath granted-action slice" },
    { "number": 13, "id": "C13-MIRROR-IMAGE-SLICE", "status": "done", "title": "Mirror Image hit-interception slice already present" },
    { "number": 14, "id": "C14-WARDING-BOND-SLICE", "status": "done", "title": "Warding Bond linked-effect slice already present" },
    { "number": 15, "id": "C15-SANCTUARY-SLICE", "status": "done", "title": "Sanctuary targeting-interdiction slice already present" },
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
| 1 | C1-SLICE-CANDIDATE-SURVEY - Survey composite MBT slice candidates | done | none | Findings recorded in `plans/rules-kernel-coverage/C1_SLICE_CANDIDATE_SURVEY.md`. |
| 2 | C2-DIRECT-CONDITION-SLICE - Direct condition lifecycle slice already present | done | none | Existing focused MBT and package script found by C1; no new slice work queued. |
| 3 | C3-SAVE-CONDITION-SLICE - Save-gated condition lifecycle slice already present | done | none | Existing selected-identity MBT found by C1; script/report cleanup remains in C17. |
| 4 | C4-SEE-INVISIBILITY-SLICE - Add See Invisibility observer-sight slice | done | none | Observer sight fact only. |
| 5 | C5-RAY-ENFEEBLEMENT-SLICE - Add Ray of Enfeeblement lifecycle slice | done | none | D20 and damage-penalty lifecycle. |
| 6 | C6-WEB-RESTRAINT-SLICE - Add Web restraint hazard slice | done | none | Focused Web restraint/hazard lifecycle MBT added. |
| 7 | C7-HEAT-METAL-SLICE - Add Heat Metal object-contact slice | done | none | Object contact and repeat damage. |
| 8 | C8-GUST-OF-WIND-SLICE - Add Gust of Wind line lifecycle slice | done | none | Line effect and movement interaction. |
| 9 | C9-ANTIMAGIC-SUPPRESSION-SLICE - Add Antimagic Field suppression slice | ready-for-implementation-after-light-research | none | Suppression active-effect state. |
| 10 | C10-SPIKE-GROWTH-SLICE - Add Spike Growth movement hazard slice | ready-for-implementation-after-light-research | none | Movement hazard only; recognition remains table-owned. |
| 11 | C11-DRAGONS-BREATH-INITIAL-SLICE - Add Dragon's Breath initial-effect slice | ready-for-implementation-after-light-research | none | Initial grant state. |
| 12 | C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE - Add Dragon's Breath granted-action slice | ready-for-implementation-after-light-research | none | Granted action damage. |
| 13 | C13-MIRROR-IMAGE-SLICE - Mirror Image hit-interception slice already present | done | none | Existing focused MBT and package script found by C1; no new slice work queued. |
| 14 | C14-WARDING-BOND-SLICE - Warding Bond linked-effect slice already present | done | none | Existing focused MBT and package script found by C1; no new slice work queued. |
| 15 | C15-SANCTUARY-SLICE - Sanctuary targeting-interdiction slice already present | done | none | Existing selected-identity MBT found by C1; script/report cleanup remains in C17. |
| 16 | C16-SPELL-SEQUENCING-INTEGRATION-MBT - Add bounded spell sequencing integration MBT | blocked | C4-C12 | Cross-slice bounded fixture over non-duplicate new slices only. |
| 17 | C17-SLICE-SCRIPT-AND-REPORT-CLOSURE - Refresh package scripts and rules-kernel rows | blocked | C4-C12,C16 | Scripts and generated rows, including C1-discovered existing witness cleanup. |
| 18 | C18-END-TO-END-SLICE-VERIFICATION - Run and document lane C verification | blocked | C17 | Focused MBT only. |
| 19 | C19-RECURSIVE-NEXT-BATCH - Mine next composite MBT slice batch | blocked | C18 | Must append >=12 tasks or prove exhaustion. |

## Task Details

### Task 1 - C1-SLICE-CANDIDATE-SURVEY - Survey composite MBT slice candidates

Status: `done`

Output: add a short Findings update listing which candidate tasks already have
adequate slice-style MBT and which remain valid. Do not implement a slice in
this task.

Acceptance: no duplicate slice work is left queued after the survey.

Findings: see `plans/rules-kernel-coverage/C1_SLICE_CANDIDATE_SURVEY.md`.

### Task 2 - C2-DIRECT-CONDITION-SLICE - Direct condition lifecycle slice already present

Status: `done`

Output: no new slice implementation. C1 found existing focused QNT/TS MBT at
`packages/battle-runtime/battle-runtime-direct-condition-lifecycle.mbt.qnt` and
`packages/battle-runtime/src/direct-condition-lifecycle.mbt.test.ts`.

Acceptance: duplicate slice work is not runnable in this lane; existing package
script `test:mbt:direct-condition-lifecycle` remains available for closure
verification.

### Task 3 - C3-SAVE-CONDITION-SLICE - Save-gated condition lifecycle slice already present

Status: `done`

Output: no new slice implementation. C1 found existing selected-identity MBT at
`packages/battle-runtime/battle-runtime-condition-saving-throw-selected-identity.mbt.qnt`
and
`packages/battle-runtime/src/condition-saving-throw-selected-identity.mbt.test.ts`.

Acceptance: duplicate slice work is not runnable in this lane; any missing
package script or obligation-row witness cleanup is handled by C17.

### Task 4 - C4-SEE-INVISIBILITY-SLICE - Add See Invisibility observer-sight slice

Status: `done`

Output: focused slice for observer sight state created by See Invisibility.

Acceptance: no spatial perception model is added.

### Task 5 - C5-RAY-ENFEEBLEMENT-SLICE - Add Ray of Enfeeblement lifecycle slice

Status: `done`

Output: focused slice for repeat d20 lifecycle and source damage-roll penalty.

Acceptance: the test hits both maintained and ended states.

### Task 6 - C6-WEB-RESTRAINT-SLICE - Add Web restraint hazard slice

Status: `done`

Output: focused slice for Web-created restraint/hazard lifecycle using
caller-supplied area facts.

Acceptance: no geometry derivation is introduced.

Witnesses:
`packages/battle-runtime/battle-runtime-web-restraint-hazard.mbt.qnt` and
`packages/battle-runtime/src/web-restraint-hazard.mbt.test.ts`.

### Task 7 - C7-HEAT-METAL-SLICE - Add Heat Metal object-contact slice

Status: `done`

Output: focused slice for object contact damage, ongoing choice, and active
effect state already implemented by runtime.

Acceptance: focused MBT or deterministic replay passes.

Witnesses:
`packages/battle-runtime/battle-runtime-heat-metal-object-contact.mbt.qnt` and
`packages/battle-runtime/src/heat-metal-object-contact.mbt.test.ts`.

### Task 8 - C8-GUST-OF-WIND-SLICE - Add Gust of Wind line lifecycle slice

Status: `done`

Output: focused slice for line lifecycle and table-supplied line interaction
facts.

Acceptance: route/geometry remains table-owned.

Witnesses:
`packages/battle-runtime/battle-runtime-gust-of-wind-line-lifecycle.mbt.qnt`
and `packages/battle-runtime/src/gust-of-wind-line-lifecycle.mbt.test.ts`.

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

### Task 13 - C13-MIRROR-IMAGE-SLICE - Mirror Image hit-interception slice already present

Status: `done`

Output: no new slice implementation. C1 found existing focused QNT/TS MBT at
`packages/battle-runtime/battle-runtime-mirror-image-hit-interception.mbt.qnt`
and `packages/battle-runtime/src/mirror-image-hit-interception.mbt.test.ts`.

Acceptance: duplicate slice work is not runnable in this lane; existing package
script `test:mbt:mirror-image-hit-interception` remains available for closure
verification.

### Task 14 - C14-WARDING-BOND-SLICE - Warding Bond linked-effect slice already present

Status: `done`

Output: no new slice implementation. C1 found existing focused QNT/TS MBT at
`packages/battle-runtime/battle-runtime-warding-bond-damage-sharing.mbt.qnt` and
`packages/battle-runtime/src/warding-bond-damage-sharing.mbt.test.ts`.

Acceptance: duplicate slice work is not runnable in this lane; existing package
script `test:mbt:warding-bond-damage-sharing` remains available for closure
verification.

### Task 15 - C15-SANCTUARY-SLICE - Sanctuary targeting-interdiction slice already present

Status: `done`

Output: no new slice implementation. C1 found existing selected-identity MBT at
`packages/battle-runtime/battle-runtime-sanctuary-selected-identity.mbt.qnt` and
`packages/battle-runtime/src/sanctuary-selected-identity.mbt.test.ts`.

Acceptance: duplicate slice work is not runnable in this lane; any missing
package script or obligation-row witness cleanup is handled by C17.

### Task 16 - C16-SPELL-SEQUENCING-INTEGRATION-MBT - Add bounded spell sequencing integration MBT

Status: `blocked`

Output: one bounded fixture-world integration MBT covering two or three
non-duplicate C4-C12 spell interactions, such as concentration + reaction +
ongoing turn hook. It is not a generation input.

Acceptance: documented scope and bounded runtime.

### Task 17 - C17-SLICE-SCRIPT-AND-REPORT-CLOSURE - Refresh package scripts and rules-kernel rows

Status: `blocked`

Output: add package scripts for new focused tests, add package scripts for
C1-discovered existing MBT witnesses that lack scripts, update
obligation/profile rows only where evidence changed or existing focused-MBT
witnesses need row/report alignment, regenerate reports.

Acceptance: `pnpm rules-kernel-coverage:check -- --write` then check pass.

### Task 18 - C18-END-TO-END-SLICE-VERIFICATION - Run and document lane C verification

Status: `blocked`

Output: run every new focused slice script once, run existing focused slice
scripts retained for C1-discovered evidence once, rules-kernel coverage
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

- New focused package-local slice script for each runnable new slice task
- Existing focused package-local slice script for each retained existing slice
  witness
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm --filter @dnd/battle-runtime typecheck` when TS changes
- `git diff --check`

## Findings

- Spike Growth recognition is not runtime-owned; this lane may test movement
  hazard damage only, consuming table-provided area/movement facts.
