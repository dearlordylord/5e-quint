# Ralph LT4 Final: Choice Closure Gate Activation

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "LT4-D01-STRICT-CHOICE-CLOSURE-GATE-ACTIVATION",
      "status": "ready-for-research",
      "title": "Activate strict level <4 choice closure gate"
    }
  ]
}
-->

## Lane Scope

This is the sequential final task after lanes A, B, and C land.

It turns the level <4 choice closure pre-work from a non-strict generated audit
into a strict gate that prevents future reports from saying "full level <4"
while missing legal SRD choice targets behind category grants.

## Source Artifacts

- `scripts/level-lt4-choice-closure-check.cjs`
- `package.json`
- `plans/unit-profile-coverage/LEVEL_LT4_CHOICE_CLOSURE.md`
- `plans/unit-profile-coverage/level-lt4-choice-closure.json`
- `plans/RALPH_LT4_LANE_A_FIGHTING_STYLE_CHOICE_CLOSURE.md`
- `plans/RALPH_LT4_LANE_B_SPECIES_ADMISSION_CLOSURE.md`
- `plans/RALPH_LT4_LANE_C_ORIGIN_FEAT_CHOICE_CLOSURE.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/level1-2-full-support.json`
- `plans/unit-profile-coverage/level1-3-full-support.json`
- `.references/srd-5.2.1/`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run only after lanes A, B, and C have merged.
- Do not hide remaining blockers by deleting target rows or weakening the RAW
  target set.
- If a target is outside runtime, encode an explicit closure; if it is a legal
  character-creation choice, it must remain cataloged and selectable.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| LT4-D01-STRICT-CHOICE-CLOSURE-GATE-ACTIVATION | LT4-A01, LT4-A02, LT4-A03, LT4-B01, LT4-B02, LT4-B03, LT4-B04, LT4-C01, LT4-C02, LT4-C03 | Strict mode should activate only after all parallel closure lanes land. |

## Verification

- RAW/ubiquitous-language check against `.references/srd-5.2.1/Feats.md`,
  `.references/srd-5.2.1/Character-Origins.md`, relevant class files, and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm level-lt4-choice-closure:check -- --write`
- `pnpm level-lt4-choice-closure:check -- --strict`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `git diff --check`

### Task 1 - LT4-D01-STRICT-CHOICE-CLOSURE-GATE-ACTIVATION

Status: `ready-for-research`

Depends on:

- LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR
- LT4-A02-FIGHTER-FIGHTING-STYLE-ALL-TARGETS
- LT4-A03-PALADIN-RANGER-FIGHTING-STYLE-ALL-TARGETS
- LT4-B01-GNOME-ADMISSION-OWNER-RESEARCH
- LT4-B02-GNOMISH-LINEAGE-CHOICE-OWNER
- LT4-B03-GNOME-LINEAGE-TRAIT-PROJECTION
- LT4-B04-GNOME-SPECIES-ADMISSION-EVIDENCE
- LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR
- LT4-C02-MAGIC-INITIATE-SPELL-ACCESS-CLOSURE
- LT4-C03-SKILLED-HUMAN-VERSATILE-NESTED-CHOICE-EVIDENCE

Current state:

- `pnpm level-lt4-choice-closure:check` is non-strict and reports known
  blockers.

Output:

- Regenerate level <4 choice closure after all blockers are closed.
- Make strict mode part of the appropriate quality path or documented gate for
  Golden Gate level <4 support.
- Confirm level 1, level 1-2, and level 1-3 reports cannot hide category-grant
  target holes.

Acceptance:

- `pnpm level-lt4-choice-closure:check -- --strict` passes.
- The generated report has zero blockers.
- The final report explicitly accounts for Fighting Style feat targets, Human
  Origin feat targets, and all nine SRD species.

Verification:

- Lane verification above.

