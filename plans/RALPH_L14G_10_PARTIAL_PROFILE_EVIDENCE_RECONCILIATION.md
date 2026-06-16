# L14G-10 Partial Profile Evidence Reconciliation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-10-PARTIAL-PROFILE-EVIDENCE-RECONCILIATION",
      "status": "ready-for-research",
      "title": "Reconcile partial Unit profile evidence"
    }
  ]
}
-->

Status: ready-for-research
Owner: Battle-runtime profile claims, character-sheet owner evidence, and Unit coverage checker
Depends on: L14G-06

## Residual

L14G-06 found three rows whose current diagnostics are not pure missing-evidence rows: Druid Wild Shape, Monk Monk's Focus, and Sorcerer Metamagic. These have partial battle-runtime/profile support or catalog-installed evidence, but the checker cannot yet express the supported subset and the remaining owner boundary cleanly.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/WILD_SHAPE_STAT_BLOCK_ACTION_PLAN.md`
- `plans/WILD_SHAPE_SENSE_LANGUAGE_PROJECTION_PLAN.md`
- `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md`
- Relevant SRD class anchors under `.references/srd-5.2.1/Classes/`
- `UBIQUITOUS_LANGUAGE.md` Character Sheet, Stat Block, Spell Slot, and battle-runtime terms

## Expected Output

- Each partial row has a typed support profile or split Unit shape that states exactly which runtime facts are supported and which facts belong to another owner.
- The checker can read that split without a prose exception list.
- Existing supported battle subsets remain aligned with Quint/runtime profiles; unsupported character-sheet facts are not hidden behind broad `supported` labels.

## Acceptance

- Product-readiness diagnostics do not report these rows as ambiguous partial support.
- Runtime behavior remains parity-aligned with active QNT slices where battle behavior exists.
- No derived Stat Block, Wild Shape, Focus Point, or Metamagic facts are duplicated across owners.

## Verification

- Read the relevant SRD anchors and existing Wild Shape/Metamagic plans before implementation.
- Run reviewer-loop convergence after implementation: RAW traceability, ubiquitous-language/domain, architecture/connascence, and code-review passes; fix every reasonable finding and repeat until no reasonable findings remain.
- Run `pnpm unit-profile-coverage:check:self-test`.
- Run `pnpm unit-profile-coverage:check`.
- Run relevant focused runtime tests only if executable runtime behavior changes.
- Run `git diff --check`.
