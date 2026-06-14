# Ralph Lane: Level 4 ASI Catalog Source

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-01-LEVEL4-ASI-CATALOG-SOURCE",
      "status": "ready-for-implementation",
      "title": "Close level-4 Ability Score Improvement catalog/source gaps"
    }
  ]
}
-->

## Lane Scope

This is one parallel Ralph lane for the level 1-4 ultra-golden effort. It owns
only the missing level-4 Ability Score Improvement catalog/source rows surfaced
by the generated SRD inventory.

Do not implement per-class ASI runtime behavior. The domain decision already in
the generated reports is that ASI is a selection-grant container: selected feat
Units and Character Sheet ability-score facts own executable behavior.

## Source Artifacts

- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/surface/content/*_ability_score_improvement_l4.json`
- `packages/surface/content/class_fighter.json`
- `packages/surface/content/class_paladin.json`
- `packages/surface/content/class_warlock.json`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before implementation.
- Use pnpm only.
- Read the local SRD anchors for Fighter, Paladin, and Warlock level 4 before
  authoring records.
- Preserve provenance as SRD 5.2.1. Do not introduce PHB+ identity or external
  rules text.
- Do not duplicate ASI behavior per class. Reuse the existing ASI source shape
  and `selection-grant-container` closure pattern.

### Task 1 - L14G-01-LEVEL4-ASI-CATALOG-SOURCE

Status: `ready-for-implementation`

Expected size: about one focused day.

Output:

- Author missing SRD Surface records for:
  - `fighter_ability_score_improvement_l4`
  - `paladin_ability_score_improvement_l4`
  - `warlock_ability_score_improvement_l4`
- Add level-4 ASI `featureGrants` to the Fighter, Paladin, and Warlock class
  records through the existing class feature-grant shape.
- Add or update Unit claim rows so every level-4 ASI row closes as
  `selection-grant-container`.
- Regenerate checker-owned coverage artifacts.

Acceptance:

- The generated inventory no longer reports those three ASI rows as no-matrix
  level-4 class-feature pressure.
- Existing installed ASI rows and the three new rows share one generic
  selection-container closure pattern.
- No production runtime code dispatches on class-specific ASI authored
  identity.
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md` still reports support
  completeness as pass.

Verification:

- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Plan Impact:

- If the lane discovers additional level-4 ASI source gaps, update this file
  and `plans/ACTIVE_PLAN.md`.
- If the lane narrows scope, preserve any excluded ASI work as a concrete
  Ralph task rather than prose.
