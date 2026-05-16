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
      "status": "ready-for-implementation-after-light-research",
      "title": "Recursive Level-1 Battle Feature Planning Review"
    }
  ]
}
-->

## DAG / Queue Order

| Order | Task | Status | Depends on | Blocks | Key context | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 332 | SRDINV89C - Promote Light Visibility Boundary | done | SRDINV88B | SRDINV89D | SRDINV88B review, Light, Faerie Fire, Bright/Dim Light, Darkvision, Lightly Obscured, UNIT_REPORT, UBIQUITOUS_LANGUAGE | Completed in `f059bf8b`: promoted source-owned light emitter projection, opaque-cover suppression for Light object emitters, Bright/Dim/Darkness illumination derivation, Darkvision adjustment, Lightly Obscured Perception Disadvantage projection, QNT parity, and focused runtime evidence. |
| 333 | SRDINV89D - Recursive Level-1 Battle Feature Planning Review | ready-for-implementation-after-light-research | SRDINV89A, SRDINV89B, SRDINV89C | next concrete batch unless accepted battle coverage is 100% | SRD inventory report, UNIT_REPORT, SRDINV88B review, ACTIVE_PLAN, UBIQUITOUS_LANGUAGE | Recompute readiness after SRDINV89A-SRDINV89C and append the next concrete runnable batch unless level-1 battle readiness is genuinely complete or all residual rows are owner-accepted as non-battle/non-runtime. |

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

Status: `ready-for-implementation-after-light-research`

Depends on: SRDINV89A, SRDINV89B, SRDINV89C

Blocks: next concrete batch unless accepted battle coverage is 100%

Research / plan:
[SRDINV88B review](/workspace/typescript/dnd/plans/unit-profile-coverage/SRDINV88B_RECURSIVE_LEVEL_1_BATTLE_FEATURE_REVIEW.md),
[SRD_UNIT_INVENTORY.md](/workspace/typescript/dnd/plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md),
[UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md),
[ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md),
[UBIQUITOUS_LANGUAGE.md](/workspace/typescript/dnd/UBIQUITOUS_LANGUAGE.md)

Scope: recompute product readiness after SRDINV89A-SRDINV89C, compare it to
generated Unit runtime metrics, SRD inventory rows, supported executable Unit
coverage, and the battle-runtime acceptance surface. Append the next concrete
runnable batch unless level-1 battle readiness is genuinely 100% or every
remaining row is explicitly owner-accepted as non-battle/non-runtime.

Out of scope: treating active-plan exhaustion, a closed lane, supported-profile
coverage, or catalog admission as product completion.

Verification: RAW/source review for any newly selected rule slices and
`UBIQUITOUS_LANGUAGE.md`; active-plan consistency across Ralph index, DAG table,
and task details; `pnpm unit-profile-coverage:check --write` if matrix artifacts
change; a short review note that reports product acceptance percentage
separately from supported executable Unit coverage; `/simplify` convergence,
minimum two rounds unless the final changeset is trivial.
