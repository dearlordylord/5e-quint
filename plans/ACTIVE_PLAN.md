# Active Plan

Date: 2026-05-16

This is the active Ralph queue for the level-1 battle-runtime frontier. Older
completed task detail remains in git history, task-specific research files, and
generated coverage reports. Keep this file small so implementer agents receive
only the current frontier context.

## Authority

- `@dnd/battle-runtime` plus
  `packages/battle-runtime/battle-runtime.qnt` is the promoted battle authority
  for Unit/StatBlock-backed behavior.
- Use local SRD 5.2.1 references in `.references/srd-5.2.1/` and
  `UBIQUITOUS_LANGUAGE.md` before modeling rules.
- Do not duplicate runtime state that can be derived from existing source
  facts. Prefer projections and table-supplied witnesses for map/geometry facts.
- Keep product readiness separate from supported executable Unit/profile
  coverage. Do not treat supported-profile coverage as full product completion.
- MBT is scarce. Use focused deterministic checks first, then package-local
  battle MBT only when the completed behavior changes promoted reducer semantics.

## Context Links

- [SRD inventory report](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md)
- [Unit coverage report](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)
- [SRDINV88B review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV88B_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md)
- [PRD: Battle Light, Obscurement, And Sight Witnesses](/workspace/typescript/dnd/PRD_BATTLE_LIGHT_OBSCUREMENT_WITNESSES.md)
- [Battle runtime README](/workspace/typescript/dnd/packages/battle-runtime/README.md)
- [Battle runtime architecture graph](/workspace/typescript/dnd/packages/battle-runtime/ARCHITECTURE_GRAPH.md)
- [Ubiquitous language](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

## Status Vocabulary

- `ready-for-research`: research/source reading is the next step.
- `ready-for-implementation-after-light-research`: implementation may begin
  after the listed RAW/blast-radius check.
- `blocked`: a dependency or owner decision must land first.
- `deferred`: owner explicitly parked the work.
- `done`: work completed and verification recorded.

## Ralph Task Index

The Ralph harness reads this machine-readable index for task order and status.
Keep it synchronized with the DAG table and task details.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 332,
      "id": "SRDINV89C",
      "status": "done",
      "title": "Promote Light Visibility Boundary"
    },
    {
      "number": 333,
      "id": "SRDINV89D",
      "status": "done",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    },
    {
      "number": 334,
      "id": "SRDINV90A",
      "status": "done",
      "title": "Model Battle Readiness Owner-Accepted Closures"
    },
    {
      "number": 335,
      "id": "SRDINV90B",
      "status": "done",
      "title": "Recursive Level-1 Battle Readiness Closure Review"
    },
    {
      "number": 336,
      "id": "SRDINV91A",
      "status": "ready-for-research",
      "title": "Recursive Battle Runtime Coverage Frontier Review"
    }
  ]
}
-->

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Key context | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 332 | SRDINV89C - Promote Light Visibility Boundary | done | SRDINV88B | SRDINV89D | SRDINV88B review, Light, Faerie Fire, Bright/Dim Light, Darkvision, Lightly Obscured, UNIT_REPORT, UBIQUITOUS_LANGUAGE | Completed in `f059bf8b`: promoted source-owned light emitter projection, opaque-cover suppression for Light object emitters, Bright/Dim/Darkness illumination derivation, Darkvision adjustment, Lightly Obscured Perception Disadvantage projection, QNT parity, and focused runtime evidence. |
| 333 | SRDINV89D - Recursive Level-1 Battle Feature Planning Review | done | SRDINV89A, SRDINV89B, SRDINV89C | SRDINV90A | SRDINV89D review, SRD inventory report, UNIT_REPORT, SRDINV88B review, ACTIVE_PLAN, UBIQUITOUS_LANGUAGE | Completed: post-SRDINV89A-C readiness is 309/367 (84.2%) while supported executable Unit coverage is 85/117 (72.6%); appended SRDINV90A-SRDINV90B because the remaining gap is now the readiness classifier's owner-accepted closure boundary, not catalog admission or active-plan exhaustion. |
| 334 | SRDINV90A - Model Battle Readiness Owner-Accepted Closures | done | SRDINV89D | SRDINV90B | SRDINV89D review, SRD_UNIT_INVENTORY, UNIT_REPORT, unit-claims.jsonl, unit-matrix.json, UBIQUITOUS_LANGUAGE | Completed: level-1 battle readiness now consumes explicit Unit-claim/deferred-owner closure facts for non-battle, later-level, table/spatial, social/knowledge, companion-AI, and outside-runtime residuals; refreshed readiness is 367/367 (100%) without counting catalog admission alone. |
| 335 | SRDINV90B - Recursive Level-1 Battle Readiness Closure Review | done | SRDINV90A | SRDINV91A | SRDINV89D review, refreshed SRD inventory report, refreshed UNIT_REPORT, ACTIVE_PLAN, UBIQUITOUS_LANGUAGE, SRDINV90B review | Completed: post-SRDINV90A product readiness is 367/367 (100%) with zero remaining battle-runtime-required or partial-battle-runtime rows. This closes only the product-readiness classifier lane; it does not close supported executable profile expansion, proof, deterministic admission, or MBT coverage planning. |
| 336 | SRDINV91A - Recursive Battle Runtime Coverage Frontier Review | ready-for-research | SRDINV90B | next concrete frontier task(s) | SRDINV90B review, refreshed SRD inventory report, UNIT_REPORT, unit-matrix.json, unit-claims.jsonl, ACTIVE_PLAN, UBIQUITOUS_LANGUAGE | Re-open the recursive frontier from the non-terminal metrics left after SRDINV90B: supported executable Unit coverage 85/117 (72.6%), deterministic admission/projection 78/85 (91.8%), QNT proof 61/62 (98.4%), and selected identity MBT 10/85 (11.8%). Do not treat 367/367 product readiness or active-plan exhaustion as permission to stop. |

## Task Details

### Task 332 - SRDINV89C - Promote Light Visibility Boundary

Status: `done`

Depends on: SRDINV88B

Blocks: SRDINV89D

Research / plan:
[SRDINV88B review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV88B_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[Light](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Faerie Fire](/workspace/typescript/dnd/.references/srd-5.2.1/Spells/Descriptions-E-L.md),
[Bright Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Dim Light](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Darkvision](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[Lightly Obscured](/workspace/typescript/dnd/.references/srd-5.2.1/Rules-Glossary.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: promoted the Light/Faerie Fire illumination boundary through
source-owned emitter projections and table-supplied projection facts. Runtime now
derives Bright/Dim/Darkness illumination, suppresses Light object emitters behind
opaque cover, adjusts sight through Darkvision, and projects Lightly Obscured
Perception Disadvantage without owning map geometry or duplicating emitter state.

Verification completed:
`pnpm --filter @dnd/battle-runtime typecheck`;
`pnpm unit-profile-coverage:check`;
`pnpm --filter @dnd/battle-runtime exec vitest run src/unit-profile-admission.test.ts`;
`pnpm --filter @dnd/battle-runtime exec quint test battle-runtime.qnt --match 'test_light_visibility_projection|test_faerie_fire_object_outline_until_concentration_break'`.

### Task 333 - SRDINV89D - Recursive Level-1 Battle Feature Planning Review

Status: `done`

Depends on: SRDINV89A, SRDINV89B, SRDINV89C

Blocks: SRDINV90A

Research / plan:
[SRDINV89D review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV89D_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRDINV88B review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV88B_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Completed: recomputed product readiness after SRDINV89A-SRDINV89C and recorded
that generated level-1 battle readiness remains 309/367 (84.2%) while supported
executable Unit coverage is 85/117 (72.6%). The remaining 25
`battle-runtime-required` and 33 `partial-battle-runtime` rows mostly already
name non-battle, later-level, table/spatial, social/knowledge, companion-AI, or
outside-runtime owners in Unit claims. The next executable work is therefore a
readiness-boundary modeling task, not another reducer slice selected from
catalog admission alone.

Verification completed:
RAW/source review for the residual Unit families in local SRD 5.2.1 text;
`UBIQUITOUS_LANGUAGE.md` terminology check; active-plan consistency across Ralph
index, DAG table, and task details; two-round `/simplify` convergence recorded
in the SRDINV89D review note.

### Task 334 - SRDINV90A - Model Battle Readiness Owner-Accepted Closures

Status: `done`

Depends on: SRDINV89D

Blocks: SRDINV90B

Research / plan:
[SRDINV89D review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV89D_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[unit-claims.jsonl](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl),
[unit-matrix.json](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-matrix.json),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: make the level-1 battle readiness classifier consume explicit
Unit-claim/deferred-owner closure facts instead of hard-coded contradictory
outcomes. Rows that are selection/grant containers, later-level-only residuals,
table/spatial derivations, social/knowledge effects, companion-AI exclusions,
or outside-runtime presentation/exploration effects should have an executable
owner-accepted closure state at the matrix/inventory boundary. Do not count
catalog admission alone as support, and do not convert a partial supported
runtime subset into full support unless the remaining mechanics have an explicit
non-battle/non-runtime owner.

Out of scope: implementing new battle reducer behavior; broad spatial,
line-of-sight, social, illusion, detection, companion-AI, or later-level
mechanics; treating active-plan exhaustion, supported-profile coverage, or
catalog admission as product completion.

Completed: modeled explicit `battleReadinessClosure` facts on Unit claims and
deferred profile-subset mechanics, made the readiness classifier consume those
facts, and refreshed matrix/inventory artifacts. Level-1 battle readiness is now
367/367 (100%) with rows by status: accepted 276, accepted-no-battle-effect 91.
Catalog admission alone still does not count as support.

Verification completed:
RAW/source review for changed closure families in local SRD 5.2.1 text;
`UBIQUITOUS_LANGUAGE.md` terminology check; `pnpm unit-profile-coverage:check
--write`; `pnpm unit-profile-coverage:check`; active-plan consistency across
Ralph index, DAG table, and task details; two-round `/simplify` convergence.

### Task 335 - SRDINV90B - Recursive Level-1 Battle Readiness Closure Review

Status: `done`

Depends on: SRDINV90A

Blocks: SRDINV91A

Research / plan:
[SRDINV89D review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV89D_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRDINV90B review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV90B_RECURSIVE_LEVEL_1_BATTLE_READINESS_CLOSURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: recompute product readiness after SRDINV90A, compare it to generated Unit
runtime metrics, SRD inventory rows, supported executable Unit coverage, and the
battle-runtime acceptance surface. Close only if level-1 battle readiness is
genuinely 100% or every remaining row is explicitly owner-accepted as
non-battle/non-runtime; otherwise append the next concrete executable owner for
rows still truly battle-runtime-required.

Out of scope: treating active-plan exhaustion, supported-profile coverage, or
catalog admission as product completion.

Verification: RAW/source review for any newly selected rule slices and
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG table,
and task details; `pnpm unit-profile-coverage:check --write` if matrix artifacts
change; a short review note that reports product acceptance percentage
separately from supported executable Unit coverage; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.

Completed: closed the level-1 battle readiness lane after confirming the
generated product metric is 367/367 (100%) with rows by status: accepted 276,
accepted-no-battle-effect 91. A direct artifact check found zero remaining
`battle-runtime-required` or `partial-battle-runtime` rows. Supported executable
Unit coverage remains separately reported as 85/117 (72.6%) and is not used as
the product readiness closure metric. This completion does not terminate the
broader battle-runtime workstream; SRDINV91A continues from the remaining
profile, proof, deterministic-admission, and MBT coverage metrics.

Verification completed:
RAW/source review for the accepted closure families in local SRD 5.2.1 text;
`UBIQUITOUS_LANGUAGE.md` terminology check; `pnpm unit-profile-coverage:check`;
active-plan consistency across Ralph index, DAG table, and task details;
two-round `/simplify` convergence recorded in the SRDINV90B review note.

### Task 336 - SRDINV91A - Recursive Battle Runtime Coverage Frontier Review

Status: `ready-for-research`

Depends on: SRDINV90B

Blocks: next concrete frontier task(s)

Research / plan:
[SRDINV90B review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV90B_RECURSIVE_LEVEL_1_BATTLE_READINESS_CLOSURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[unit-matrix.json](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-matrix.json),
[unit-claims.jsonl](/workspace/typescript/dnd/plans/unit-profile-coverage/unit-claims.jsonl),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: continue recursive planning from the metrics that SRDINV90B explicitly
left open. Product readiness is 367/367, but supported executable Unit coverage
is 85/117 (72.6%), deterministic admission/projection coverage is 78/85
(91.8%), QNT proof coverage is 61/62 (98.4%), and selected identity MBT coverage
is 10/85 (11.8%). Inspect those remaining gaps and append the next concrete
Ralph-sized task batch for the highest-value battle-runtime frontier.

Out of scope: reopening SRDINV90A's product-readiness closure merely because
supported executable coverage is lower; treating product readiness, catalog
admission, or active-plan exhaustion as the end of the broader workstream;
starting broad MBT for exploration.

Acceptance: `ACTIVE_PLAN.md` must end with at least one new runnable concrete
task, or a blocker that names the exact owner decision needed. Do not leave the
Ralph task index with every task `done` unless the project owner explicitly asks
to park the workstream. Record product readiness separately from supported
profile/proof/admission/MBT metrics.

Verification: RAW/source review for any newly selected rule slices and
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG table,
and task details; `pnpm unit-profile-coverage:check`; a short review note if
new frontier facts are recorded; `/simplify` convergence, minimum two rounds
unless the final changeset is trivial.
