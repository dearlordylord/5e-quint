# Ralph Lane: L3 Morning Metamagic And Kernel Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL",
      "status": "done",
      "title": "Map Careful Spell profile to rules-kernel obligations"
    },
    {
      "number": 2,
      "id": "L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED",
      "status": "done",
      "title": "Map Heightened Spell profile to rules-kernel obligations"
    },
    {
      "number": 3,
      "id": "L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED",
      "status": "done",
      "title": "Map Transmuted Spell profile to rules-kernel obligations"
    },
    {
      "number": 4,
      "id": "L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED",
      "status": "ready-for-implementation-after-light-research",
      "title": "Map Twinned Spell profile to rules-kernel obligations"
    },
    {
      "number": 5,
      "id": "L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Audit Antimagic Field QNT proof evidence rows"
    },
    {
      "number": 6,
      "id": "L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY",
      "status": "ready-for-research",
      "title": "Survey remaining Quickened action-spell procedures"
    },
    {
      "number": 7,
      "id": "L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE",
      "status": "blocked",
      "title": "Promote next Quickened Spell procedure slice"
    },
    {
      "number": 8,
      "id": "L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY",
      "status": "ready-for-research",
      "title": "Resolve Heightened repeat-save lifecycle boundary"
    },
    {
      "number": 9,
      "id": "L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY",
      "status": "ready-for-research",
      "title": "Resolve Distant Extended and Subtle cast-property boundary"
    },
    {
      "number": 10,
      "id": "L3MMETA-10-REROLL-METAMAGIC-BOUNDARY",
      "status": "ready-for-research",
      "title": "Resolve Empowered and Seeking reroll boundary"
    },
    {
      "number": 11,
      "id": "L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Audit metamagic selected-identity replay completeness"
    },
    {
      "number": 12,
      "id": "L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION",
      "status": "blocked",
      "title": "Consolidate metamagic and kernel evidence"
    }
  ]
}
-->

## Objective

Close the post-merge Metamagic/kernel accounting gap and keep expanding
Metamagic only through vertical procedure slices. The overnight Metamagic lane
finished at 2026-06-05T08:36:50Z, about 3h07m before the morning status check,
so this lane has more tasks than the previous seven-task lane.

## Declared Base And Task-Base Check

Declared Base SHA:

```text
83665a61ee9e47e11c88b3f14da9d26472320fe1
```

Before each task, log:

```sh
git rev-parse HEAD
git merge-base --is-ancestor 83665a61ee9e47e11c88b3f14da9d26472320fe1 HEAD
```

If the ancestor check fails, stop and report the branch-base mismatch.

## DAG / Queue Order

| Order | Task | Status | Depends On | Notes |
|---:|---|---|---|---|
| 1 | L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL | ready-for-implementation-after-light-research | none | Fix `unit-feature.metamagic-careful-save-protection` rules-kernel join. |
| 2 | L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED | ready-for-implementation-after-light-research | none | Fix `unit-feature.metamagic-heightened-save-disadvantage` rules-kernel join. |
| 3 | L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED | done | none | Fix `unit-feature.metamagic-damage-type-substitution` rules-kernel join. |
| 4 | L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED | ready-for-implementation-after-light-research | none | Fix `unit-feature.metamagic-effective-level-extra-target` rules-kernel join. |
| 5 | L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT | ready-for-implementation-after-light-research | none | Decide whether Antimagic MBT QNT drivers need proof rows or explicit non-proof classification. |
| 6 | L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY | ready-for-research | none | Produce a runnable next-slice list from actual supported procedures. |
| 7 | L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE | blocked | L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY | Promote exactly one next Quickened procedure through QNT, runtime, MBT, and ledgers. |
| 8 | L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY | ready-for-research | none | Close or plan repeat-save selected-target identity without duplicating occurrence state. |
| 9 | L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY | ready-for-research | none | Close or plan Distant/Extended/Subtle generic cast-property witnesses. |
| 10 | L3MMETA-10-REROLL-METAMAGIC-BOUNDARY | ready-for-research | none | Close or plan Empowered/Seeking post-roll reroll fill boundary. |
| 11 | L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT | ready-for-implementation-after-light-research | none | Verify every promoted Metamagic profile has selected-identity replay or documented non-applicability. |
| 12 | L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION | blocked | L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL, L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED, L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED, L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED, L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT, L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT | Regenerate and confirm metrics. |

## Task Details

### Task 1 - L3MMETA-01-KERNEL-JOIN-METAMAGIC-CAREFUL

Map the Careful Spell profile to the existing rules-kernel obligation vocabulary
or document the missing obligation precisely.

### Task 2 - L3MMETA-02-KERNEL-JOIN-METAMAGIC-HEIGHTENED

Map the Heightened Spell profile to the existing rules-kernel obligation
vocabulary or document the missing obligation precisely.

### Task 3 - L3MMETA-03-KERNEL-JOIN-METAMAGIC-TRANSMUTED

Map the Transmuted Spell profile to the existing rules-kernel obligation
vocabulary or document the missing obligation precisely.

### Task 4 - L3MMETA-04-KERNEL-JOIN-METAMAGIC-TWINNED

Map the Twinned Spell profile to the existing rules-kernel obligation vocabulary
or document the missing obligation precisely.

### Task 5 - L3MMETA-05-ANTIMAGIC-QNT-PROOF-EVIDENCE-AUDIT

Audit whether the Antimagic MBT QNT drivers should contribute proof evidence or
be explicitly classified as MBT-only witnesses.

### Task 6 - L3MMETA-06-QUICKENED-REMAINING-ACTION-SPELLS-SURVEY

Survey remaining Quickened action-spell procedures from current supported
profiles and produce one runnable next-slice recommendation.

### Task 7 - L3MMETA-07-QUICKENED-NEXT-PROCEDURE-SLICE

Promote exactly one next Quickened Spell procedure slice after Task 6 identifies
it.

### Task 8 - L3MMETA-08-HEIGHTENED-REPEAT-SAVE-BOUNDARY

Resolve or plan the Heightened repeat-save lifecycle boundary.

### Task 9 - L3MMETA-09-CAST-PROPERTY-METAMAGIC-BOUNDARY

Resolve or plan Distant, Extended, and Subtle cast-property witnesses.

### Task 10 - L3MMETA-10-REROLL-METAMAGIC-BOUNDARY

Resolve or plan Empowered and Seeking post-roll reroll fill boundaries.

### Task 11 - L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT

Audit selected-identity replay for promoted Metamagic profiles.

### Task 12 - L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION

Regenerate and verify Metamagic/kernel ledgers after dependencies close.

## Task Rules

- Do not make bookkeeping tasks claim runtime behavior they do not execute.
- For tasks 1-4, prefer adding or correcting profile-obligation mappings over
  inventing new rule-core slices unless the existing obligation vocabulary is
  genuinely missing.
- For tasks 6-10, research tasks may output a future plan or explicit closure.
  Only task 7 is allowed to implement new runtime behavior, and only after task
  6 identifies a narrow procedure slice.

## Verification

- RAW/ubiquitous-language check: read `.references/srd-5.2.1/Classes/Sorcerer.md`
  and relevant spell passages before modeling Metamagic behavior.
- Reviewer-loop convergence: run RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- Run `pnpm rules-kernel-coverage:check -- --write` and
  `pnpm rules-kernel-coverage:check` for kernel join tasks.
- Run `pnpm unit-profile-coverage:check -- --write` and
  `pnpm unit-profile-coverage:check` for profile/evidence tasks.
- Run focused runtime tests and `pnpm --filter @dnd/battle-runtime typecheck`
  when code changes.
- Run MBT only for completed battle-runtime behavior changes, with the global
  `.ralph/mbt-global.lock`.
