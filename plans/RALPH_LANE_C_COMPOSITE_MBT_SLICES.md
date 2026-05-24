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
    {
      "number": 1,
      "id": "C1-SLICE-CANDIDATE-SURVEY",
      "status": "done",
      "title": "Survey composite MBT slice candidates"
    },
    {
      "number": 2,
      "id": "C2-DIRECT-CONDITION-SLICE",
      "status": "done",
      "title": "Direct condition lifecycle slice already present"
    },
    {
      "number": 3,
      "id": "C3-SAVE-CONDITION-SLICE",
      "status": "done",
      "title": "Save-gated condition lifecycle slice already present"
    },
    {
      "number": 4,
      "id": "C4-SEE-INVISIBILITY-SLICE",
      "status": "done",
      "title": "Add See Invisibility observer-sight slice"
    },
    {
      "number": 5,
      "id": "C5-RAY-ENFEEBLEMENT-SLICE",
      "status": "done",
      "title": "Add Ray of Enfeeblement lifecycle slice"
    },
    {
      "number": 6,
      "id": "C6-WEB-RESTRAINT-SLICE",
      "status": "done",
      "title": "Add Web restraint hazard slice"
    },
    {
      "number": 7,
      "id": "C7-HEAT-METAL-SLICE",
      "status": "done",
      "title": "Add Heat Metal object-contact slice"
    },
    {
      "number": 8,
      "id": "C8-GUST-OF-WIND-SLICE",
      "status": "done",
      "title": "Add Gust of Wind line lifecycle slice"
    },
    {
      "number": 9,
      "id": "C9-ANTIMAGIC-SUPPRESSION-SLICE",
      "status": "done",
      "title": "Add Antimagic Field suppression slice"
    },
    {
      "number": 10,
      "id": "C10-SPIKE-GROWTH-SLICE",
      "status": "done",
      "title": "Add Spike Growth movement hazard slice"
    },
    {
      "number": 11,
      "id": "C11-DRAGONS-BREATH-INITIAL-SLICE",
      "status": "done",
      "title": "Add Dragon's Breath initial-effect slice"
    },
    {
      "number": 12,
      "id": "C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE",
      "status": "done",
      "title": "Add Dragon's Breath granted-action slice"
    },
    {
      "number": 13,
      "id": "C13-MIRROR-IMAGE-SLICE",
      "status": "done",
      "title": "Mirror Image hit-interception slice already present"
    },
    {
      "number": 14,
      "id": "C14-WARDING-BOND-SLICE",
      "status": "done",
      "title": "Warding Bond linked-effect slice already present"
    },
    {
      "number": 15,
      "id": "C15-SANCTUARY-SLICE",
      "status": "done",
      "title": "Sanctuary targeting-interdiction slice already present"
    },
    {
      "number": 16,
      "id": "C16-SPELL-SEQUENCING-INTEGRATION-MBT",
      "status": "done",
      "title": "Add bounded spell sequencing integration MBT"
    },
    {
      "number": 17,
      "id": "C17-SLICE-SCRIPT-AND-REPORT-CLOSURE",
      "status": "done",
      "title": "Refresh package scripts and rules-kernel rows"
    },
    {
      "number": 18,
      "id": "C18-END-TO-END-SLICE-VERIFICATION",
      "status": "done",
      "title": "Run and document lane C verification"
    },
    {
      "number": 19,
      "id": "C19-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Mine next composite MBT slice batch"
    },
    {
      "number": 20,
      "id": "C20-FIND-FAMILIAR-COMPANION-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Find Familiar companion lifecycle focused MBT"
    },
    {
      "number": 21,
      "id": "C21-WILD-SHAPE-FORM-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Wild Shape form lifecycle focused MBT"
    },
    {
      "number": 22,
      "id": "C22-DISPEL-MAGIC-ONGOING-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Dispel Magic ongoing spell ending focused MBT"
    },
    {
      "number": 23,
      "id": "C23-QUICKENED-SPELL-GOVERNOR-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Quickened Spell governor focused MBT"
    },
    {
      "number": 24,
      "id": "C24-DARKNESS-POINT-ORIGIN-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Darkness point-origin lifecycle focused MBT"
    },
    {
      "number": 25,
      "id": "C25-SPELL-CREATED-HELD-OBJECT-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add spell-created held object lifecycle focused MBT"
    },
    {
      "number": 26,
      "id": "C26-SELF-TELEPORT-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add self-teleport lifecycle focused MBT"
    },
    {
      "number": 27,
      "id": "C27-BLUR-ATTACK-DEFENSE-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add Blur attack-roll defense focused MBT"
    },
    {
      "number": 28,
      "id": "C28-SCALAR-BUFF-ACTIVE-EFFECTS-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add scalar buff active effects focused MBT"
    },
    {
      "number": 29,
      "id": "C29-SELF-TRANSFORMATION-MODE-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add self-transformation mode focused MBT"
    },
    {
      "number": 30,
      "id": "C30-REACTION-CASTING-TIME-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add reaction casting time focused MBT"
    },
    {
      "number": 31,
      "id": "C31-CHAINED-ATTACK-SEQUENCE-SLICE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Add chained attack sequence focused MBT"
    }
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
| 9 | C9-ANTIMAGIC-SUPPRESSION-SLICE - Add Antimagic Field suppression slice | done | none | Suppression active-effect state. |
| 10 | C10-SPIKE-GROWTH-SLICE - Add Spike Growth movement hazard slice | done | none | Movement hazard only; recognition remains table-owned. |
| 11 | C11-DRAGONS-BREATH-INITIAL-SLICE - Add Dragon's Breath initial-effect slice | done | none | Initial grant state. |
| 12 | C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE - Add Dragon's Breath granted-action slice | done | none | Granted action damage. |
| 13 | C13-MIRROR-IMAGE-SLICE - Mirror Image hit-interception slice already present | done | none | Existing focused MBT and package script found by C1; no new slice work queued. |
| 14 | C14-WARDING-BOND-SLICE - Warding Bond linked-effect slice already present | done | none | Existing focused MBT and package script found by C1; no new slice work queued. |
| 15 | C15-SANCTUARY-SLICE - Sanctuary targeting-interdiction slice already present | done | none | Existing selected-identity MBT found by C1; script/report cleanup remains in C17. |
| 16 | C16-SPELL-SEQUENCING-INTEGRATION-MBT - Add bounded spell sequencing integration MBT | done | C4-C12 | Cross-slice bounded fixture over non-duplicate new slices only. |
| 17 | C17-SLICE-SCRIPT-AND-REPORT-CLOSURE - Refresh package scripts and rules-kernel rows | done | none | Scripts and generated rows, including C1-discovered existing witness cleanup. C4-C12 and C16 are already done; do not keep done task ids as blocking dependencies. |
| 18 | C18-END-TO-END-SLICE-VERIFICATION - Run and document lane C verification | done | none | Focused MBT-only closure documented in `plans/rules-kernel-coverage/C18_END_TO_END_SLICE_VERIFICATION.md`. |
| 19 | C19-RECURSIVE-NEXT-BATCH - Mine next composite MBT slice batch | done | none | Appended 12 focused MBT slice tasks from covered battle obligations that lack focused witnesses; see `plans/rules-kernel-coverage/C19_RECURSIVE_NEXT_BATCH.md`. |
| 20 | C20-FIND-FAMILIAR-COMPANION-SLICE - Add Find Familiar companion lifecycle focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; companion lifecycle, replacement, telepathy, touch delivery, and Pact reaction-attack state. |
| 21 | C21-WILD-SHAPE-FORM-SLICE - Add Wild Shape form lifecycle focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; form statistics, Temporary Hit Points, spellcasting block, and supported reversion. |
| 22 | C22-DISPEL-MAGIC-ONGOING-SLICE - Add Dispel Magic ongoing spell ending focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; target-scoped ending and higher-level ability-check gate for tracked ongoing spell effects. |
| 23 | C23-QUICKENED-SPELL-GOVERNOR-SLICE - Add Quickened Spell governor focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; known selection, Sorcery Point affordability, action rewrite, and same-turn leveled-spell governor. |
| 24 | C24-DARKNESS-POINT-ORIGIN-SLICE - Add Darkness point-origin lifecycle focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; point-origin magical Darkness area identity, witness consumption, Concentration, and cleanup. |
| 25 | C25-SPELL-CREATED-HELD-OBJECT-SLICE - Add spell-created held object lifecycle focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; Flame Blade-style held object, hand occupancy, active-object attack, and cleanup. |
| 26 | C26-SELF-TELEPORT-SLICE - Add self-teleport lifecycle focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; Misty Step-style destination witness, Bonus Action and Spell Slot spend, and no-OA projection. |
| 27 | C27-BLUR-ATTACK-DEFENSE-SLICE - Add Blur attack-roll defense focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; self defense effect, Blindsight/Truesight bypass witnesses, roll-mode cancellation, and cleanup. |
| 28 | C28-SCALAR-BUFF-ACTIVE-EFFECTS-SLICE - Add scalar buff active effects focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; scalar buffs for AC, Speed, special speeds, HP maximum, and Temporary Hit Points. |
| 29 | C29-SELF-TRANSFORMATION-MODE-SLICE - Add self-transformation mode focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; Alter Self mode choice/replacement, natural-weapon override, and Aquatic projections. |
| 30 | C30-REACTION-CASTING-TIME-SLICE - Add reaction casting time focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; Counterspell/Hellish Rebuke triggers, Reaction spend, Spell Slot ledger, interruption, and continuation resume. |
| 31 | C31-CHAINED-ATTACK-SEQUENCE-SLICE - Add chained attack sequence focused MBT | ready-for-implementation-after-light-research | none | Runtime-test-only obligation; Chromatic Orb-style damage-type choice, target history, per-step rolls, and leap limits. |

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

Status: `done`

Output: focused slice for suppressing and restoring ongoing spell effects in an
Antimagic Field.

Acceptance: active-effect field names match runtime types exactly.

Witnesses:
`packages/battle-runtime/battle-runtime-antimagic-field-ongoing-suppression.mbt.qnt`
and
`packages/battle-runtime/src/antimagic-field-ongoing-suppression.mbt.test.ts`.

### Task 10 - C10-SPIKE-GROWTH-SLICE - Add Spike Growth movement hazard slice

Status: `done`

Output: focused slice for movement-triggered hazard damage. The RAW recognition
clause remains table-owned; this slice consumes the table-provided movement and
area facts only.

Acceptance: task notes explicitly reject adding perception/knowledge state.

Witnesses:
`packages/battle-runtime/battle-runtime-spike-growth-movement-hazard.mbt.qnt`
and
`packages/battle-runtime/src/spike-growth-movement-hazard.mbt.test.ts`.

### Task 11 - C11-DRAGONS-BREATH-INITIAL-SLICE - Add Dragon's Breath initial-effect slice

Status: `done`

Output: focused slice for initial target effect and granted action setup.

Acceptance: no duplicate spell slot state is added.

Witnesses:
`packages/battle-runtime/battle-runtime-dragons-breath-initial-effect.mbt.qnt`
and
`packages/battle-runtime/src/dragons-breath-initial-effect.mbt.test.ts`.

### Task 12 - C12-DRAGONS-BREATH-GRANTED-ACTION-SLICE - Add Dragon's Breath granted-action slice

Status: `done`

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

Status: `done`

Output: one bounded fixture-world integration MBT covering two or three
non-duplicate C4-C12 spell interactions, such as concentration + reaction +
ongoing turn hook. It is not a generation input.

Acceptance: documented scope and bounded runtime.

### Task 17 - C17-SLICE-SCRIPT-AND-REPORT-CLOSURE - Refresh package scripts and rules-kernel rows

Status: `done`

Output: add package scripts for new focused tests, add package scripts for
C1-discovered existing MBT witnesses that lack scripts, update
obligation/profile rows only where evidence changed or existing focused-MBT
witnesses need row/report alignment, regenerate reports.

Dependency repair: this task is intentionally runnable after C4-C12 and C16
are done. The Ralph chooser removes done tasks from its active dependency
index, so retaining those done ids as dependencies makes this closure task
permanently blocked.

Acceptance: `pnpm rules-kernel-coverage:check -- --write` then check pass.

### Task 18 - C18-END-TO-END-SLICE-VERIFICATION - Run and document lane C verification

Status: `done`

Output: run every new focused slice script once, run existing focused slice
scripts retained for C1-discovered evidence once, rules-kernel coverage
write/check, `git diff --check`, and package typecheck if TS changed.

Acceptance: no broad MBT run is used unless the task explicitly justifies it.

Findings: see `plans/rules-kernel-coverage/C18_END_TO_END_SLICE_VERIFICATION.md`.

### Task 19 - C19-RECURSIVE-NEXT-BATCH - Mine next composite MBT slice batch

Status: `done`

Output: append at least 12 new atomic slice tasks from remaining high-value
covered obligations lacking focused slice witnesses. If fewer than 12 remain,
record the exact checker/test evidence proving exhaustion.

Acceptance: do not mark done unless at least 12 new runnable tasks were added
or exhaustion is proven from generated reports and test inventory.

Findings: see `plans/rules-kernel-coverage/C19_RECURSIVE_NEXT_BATCH.md`.

Completed: C19 found 20 covered battle obligations whose generated
rules-kernel rows do not currently declare a `focused-mbt` witness. Two of
those already have package-local focused MBT scripts in the test inventory
(`flaming-sphere-hazard-ram` and `moonbeam-movable-zone`) and should be handled
as report-alignment cleanup, not duplicate slice work. C19 appended 12 new
runnable focused-slice tasks, C20-C31, from the remaining high-value
runtime-test-only obligations.

Verification completed:
`pnpm rules-kernel-coverage:check -- --write`;
`pnpm rules-kernel-coverage:check`;
`git diff --check`.

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
- C19 did not model new D&D rules. Source anchors for the appended tasks come
  from existing `obligations.jsonl` surface evidence and were checked against
  local SRD headings plus `UBIQUITOUS_LANGUAGE.md`; each implementation task
  must reread its specific SRD passage before changing behavior.

### Task 20 - C20-FIND-FAMILIAR-COMPANION-SLICE - Add Find Familiar companion lifecycle focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE`.

Acceptance: witness covers companion creation/replacement state, selected form
and type facts, telepathy/touch-delivery runtime state, and Pact of the Chain
reaction-attack state without adding companion AI or table route ownership.

Verification: focused package script, `pnpm rules-kernel-coverage:check -- --write`,
`pnpm rules-kernel-coverage:check`, package typecheck when TS changes, and
`git diff --check`.

### Task 21 - C21-WILD-SHAPE-FORM-SLICE - Add Wild Shape form lifecycle focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE`.

Acceptance: witness covers spending a Wild Shape use, form stat projection,
Temporary Hit Points, spellcasting block, and supported reversion conditions;
do not model unsupported Beast catalog expansion in this lane.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 22 - C22-DISPEL-MAGIC-ONGOING-SLICE - Add Dispel Magic ongoing spell ending focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING`.

Acceptance: witness covers ending tracked ongoing spell effects, including the
higher-level ability-check gate. Keep target choice and object/world matching as
caller/table facts.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 23 - C23-QUICKENED-SPELL-GOVERNOR-SLICE - Add Quickened Spell governor focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR`.

Acceptance: witness covers known Metamagic selection, Sorcery Point
affordability, one-option-per-spell gates, Action-to-Bonus-Action rewrite, and
the same-turn level-1-plus spell limit.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 24 - C24-DARKNESS-POINT-ORIGIN-SLICE - Add Darkness point-origin lifecycle focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE`.

Acceptance: witness covers point-origin magical Darkness active effect state,
caller-supplied area/light witnesses, Concentration ownership, and cleanup. Do
not add map geometry or line-of-sight derivation.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 25 - C25-SPELL-CREATED-HELD-OBJECT-SLICE - Add spell-created held object lifecycle focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE`.

Acceptance: witness covers held object creation, hand occupancy, release and
re-evocation, active-object spell attack, light projection where applicable,
Concentration, and cleanup.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 26 - C26-SELF-TELEPORT-SLICE - Add self-teleport lifecycle focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE`.

Acceptance: witness covers destination witness consumption, Bonus Action and
Spell Slot spend, no-Movement/no-Opportunity-Attack projection, and equipment
transport. Destination legality remains caller/table supplied.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 27 - C27-BLUR-ATTACK-DEFENSE-SLICE - Add Blur attack-roll defense focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE`.

Acceptance: witness covers self Spell Effect creation, Attack Roll
Disadvantage projection, Blindsight and Truesight bypass witnesses, roll-mode
cancellation, Concentration, and cleanup.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 28 - C28-SCALAR-BUFF-ACTIVE-EFFECTS-SLICE - Add scalar buff active effects focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`.

Acceptance: witness covers representative scalar buffs for Armor Class, Speed,
special speeds, Hit Point maximum, and Temporary Hit Points while keeping the
existing profile shapes as the single source of runtime facts.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 29 - C29-SELF-TRANSFORMATION-MODE-SLICE - Add self-transformation mode focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.SELF_TRANSFORMATION_MODE`.

Acceptance: witness covers Alter Self mode choice, Magic Action replacement,
natural-weapon override, and Aquatic projections. Do not model appearance
adjudication beyond the runtime-owned mode state.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 30 - C30-REACTION-CASTING-TIME-SLICE - Add reaction casting time focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.REACTION_CASTING_TIME`.

Acceptance: witness covers spell-cast and after-damage reaction triggers,
Reaction spend, Spell Slot ledger, interruption, and continuation resume for
representative Counterspell/Hellish Rebuke-style flows.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.

### Task 31 - C31-CHAINED-ATTACK-SEQUENCE-SLICE - Add chained attack sequence focused MBT

Status: `ready-for-implementation-after-light-research`

Output: add a focused `*.mbt.qnt` plus `src/*.mbt.test.ts` witness and package
script for `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`.

Acceptance: witness covers damage-type choice, duplicate-die leap admission,
target history, per-step attack and damage rolls, and slot-level leap limits
without dispatching runtime behavior on authored spell identity.

Verification: focused package script, rules-kernel write/check, package
typecheck when TS changes, and `git diff --check`.
