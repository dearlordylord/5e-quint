# Ralph LT4 Lane C: Origin Feat Choice Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR",
      "status": "done",
      "title": "Prove Human Versatile exposes every SRD Origin feat target"
    },
    {
      "number": 2,
      "id": "LT4-C02-MAGIC-INITIATE-SPELL-ACCESS-CLOSURE",
      "status": "done",
      "title": "Make Magic Initiate spell-access closure checker-visible"
    },
    {
      "number": 3,
      "id": "LT4-C03-SKILLED-HUMAN-VERSATILE-NESTED-CHOICE-EVIDENCE",
      "status": "done",
      "title": "Prove Skilled nested choices work through Human Versatile"
    }
  ]
}
-->

## Lane Scope

This lane prevents a repeat of the category-grant denominator bug for Human
Versatile and Origin feats.

The generated pre-work currently shows all six SRD Origin feat targets are
cataloged and selectable through Human Versatile. This lane makes that closure
durable by adding direct evidence around Human Versatile, Magic Initiate
spell-access closure, and Skilled nested proficiency choices.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL_LT4_CHOICE_CLOSURE.md`
- `plans/unit-profile-coverage/level-lt4-choice-closure.json`
- `packages/surface/content/species_human_versatile.json`
- `packages/surface/content/feat_magic_initiate_cleric.json`
- `packages/surface/content/feat_magic_initiate_druid.json`
- `packages/surface/content/feat_magic_initiate_wizard.json`
- `packages/surface/content/feat_skilled.json`
- `packages/character-creation-runtime/src/`
- `packages/character-battle-runtime/src/`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `.references/srd-5.2.1/Feats.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Human Versatile grants an Origin feat choice; selected feat behavior belongs
  to the selected feat Unit.
- Magic Initiate owns spell-access source facts. Selected spells and spell use
  must be owned by character-sheet/spell owners, not copied into Human or the
  feat as duplicate runtime state.
- Skilled owns durable proficiency projection through existing CharacterBuild
  proficiency facts.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR | LT4-CHOICE-CLOSURE-PREWORK | Establish the full Origin feat target set. |
| LT4-C02-MAGIC-INITIATE-SPELL-ACCESS-CLOSURE | LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR | Magic Initiate variants are selected through the Origin feat target set. |
| LT4-C03-SKILLED-HUMAN-VERSATILE-NESTED-CHOICE-EVIDENCE | LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR | Skilled nested choices are selected through Human Versatile. |

## Shared Verification

- RAW and ubiquitous-language check against
  `.references/srd-5.2.1/Feats.md`,
  `.references/srd-5.2.1/Character-Origins.md:231-243`, and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-battle-runtime exec vitest run src/origin-feat-selected-identity.mbt.test.ts`
- `pnpm --filter @dnd/character-battle-runtime typecheck`
- `pnpm level-lt4-choice-closure:check -- --write`
- `pnpm level-lt4-choice-closure:check`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR

Status: `done`

Depends on:

- LT4-CHOICE-CLOSURE-PREWORK

Unit:

- `species_human_versatile`

SRD anchor:

- `.references/srd-5.2.1/Character-Origins.md:237-243`

Current state:

- Human Versatile exposes all six SRD Origin feat targets in the generated
  pre-work report.
- The closure is not yet the final strict gate.

Output:

- Add or confirm direct deterministic evidence that Human Versatile exposes:
  `alert`, `feat_magic_initiate_cleric`, `feat_magic_initiate_druid`,
  `feat_magic_initiate_wizard`, `feat_savage_attacker`, and `feat_skilled`.
- Keep Background-granted Origin feats and species-granted Origin feats as
  distinct selection sources.

Acceptance:

- The pre-work gate continues to show 6/6 Human Origin feat targets selectable.
- Evidence binds the target set to Human Versatile, not to a hand-maintained
  test-only list.

Verification:

- Shared lane verification.

### Task 2 - LT4-C02-MAGIC-INITIATE-SPELL-ACCESS-CLOSURE

Status: `done`

Depends on:

- LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR

Units:

- `feat_magic_initiate_cleric`
- `feat_magic_initiate_druid`
- `feat_magic_initiate_wizard`

SRD anchor:

- `.references/srd-5.2.1/Feats.md:33-45`

Current state:

- All three Magic Initiate variants are cataloged and selectable where applicable.
- Unit claims close them as character-fact and runtime-detached spell-access
  sources.
- The level <4 choice gate treats them as explicit closures, not blockers.

Output:

- Make Magic Initiate spell-list, selected cantrip, selected level-1 spell, and
  spellcasting ability ownership checker-visible for all three variants.
- If existing closure is sufficient, update evidence/reporting rather than
  adding duplicate runtime state.

Acceptance:

- Magic Initiate Druid has the same closure quality as Cleric/Wizard.
- Character creation retains selected feat identity and spell-access source
  facts without copying selected spell execution into the feat.

Verification:

- Shared lane verification.

### Task 3 - LT4-C03-SKILLED-HUMAN-VERSATILE-NESTED-CHOICE-EVIDENCE

Status: `done`

Depends on:

- LT4-C01-HUMAN-VERSATILE-ORIGIN-FEAT-DENOMINATOR

Units:

- `species_human_versatile`
- `feat_skilled`

SRD anchors:

- `.references/srd-5.2.1/Character-Origins.md:237-243`
- `.references/srd-5.2.1/Feats.md:53-59`

Current state:

- Skilled has character-creation support for Origin feat proficiency choices.
- Human Versatile can select Skilled.

Output:

- Add or confirm deterministic evidence that selecting Skilled through Human
  Versatile discovers and finalizes the nested three-proficiency choice through
  the species-specific choice key.
- Keep Background-granted Skilled and Human Versatile Skilled choices from
  colliding.

Acceptance:

- Finalized CharacterBuild derives proficiency facts from one canonical
  proficiency choice path.
- No duplicate proficiency state is added for species-selected Skilled.

Verification:

- Shared lane verification.
