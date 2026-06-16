# Ralph Lane A: Level 4 ASI Catalog Admission Units

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-A01-BARBARIAN-ASI-CATALOG-ADMISSION",
      "status": "done",
      "title": "Install Barbarian level-4 ASI catalog admission"
    },
    {
      "number": 2,
      "id": "L14G-A02-BARD-ASI-CATALOG-ADMISSION",
      "status": "done",
      "title": "Install Bard level-4 ASI catalog admission"
    },
    {
      "number": 3,
      "id": "L14G-A03-CLERIC-ASI-CATALOG-ADMISSION",
      "status": "done",
      "title": "Install Cleric level-4 ASI catalog admission"
    },
    {
      "number": 4,
      "id": "L14G-A04-DRUID-ASI-CATALOG-ADMISSION",
      "status": "done",
      "title": "Install Druid level-4 ASI catalog admission"
    },
    {
      "number": 5,
      "id": "L14G-A05-MONK-ASI-CATALOG-ADMISSION",
      "status": "done",
      "title": "Install Monk level-4 ASI catalog admission"
    },
    {
      "number": 6,
      "id": "L14G-A06-RANGER-ASI-CATALOG-ADMISSION",
      "status": "ready-for-implementation",
      "title": "Install Ranger level-4 ASI catalog admission"
    },
    {
      "number": 7,
      "id": "L14G-A07-ROGUE-ASI-CATALOG-ADMISSION",
      "status": "ready-for-implementation",
      "title": "Install Rogue level-4 ASI catalog admission"
    },
    {
      "number": 8,
      "id": "L14G-A08-SORCERER-ASI-CATALOG-ADMISSION",
      "status": "ready-for-implementation",
      "title": "Install Sorcerer level-4 ASI catalog admission"
    }
  ]
}
-->

## Lane Scope

This lane is the per-Unit ASI catalog-admission lane for the level-4 Golden
Gate tail. It has one Ralph task per missing class-specific level-4 ASI Unit.

All eight tasks are strongly coupled by the same domain invariant: class-specific
ASI records are selection-grant containers. They must not own per-class battle
behavior. A Ralph task may implement a generic fix that closes sibling ASI
tasks, but it must update this file and the generated evidence so the closure is
explicit rather than accidental.

## Source Artifacts

- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `packages/surface/content/`
- `packages/surface/src/surface/unit-catalog.ts`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Feats.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before implementation.
- Read the local SRD class anchor and the Ability Score Improvement feat text
  before touching a Unit.
- Preserve the selected-feat boundary: selected feat Units and Character Sheet
  projections own executable behavior.
- Do not add runtime dispatch on class-specific ASI authored identity.
- Prefer one catalog/progression helper when it closes the eight Units together.

## Shared Verification

- RAW and ubiquitous-language check against the task's local SRD class anchor,
  `.references/srd-5.2.1/Feats.md`, and `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/surface test`
- `pnpm --filter @dnd/surface typecheck`
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - L14G-A01-BARBARIAN-ASI-CATALOG-ADMISSION

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `barbarian_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Barbarian.md:108-111`

Current state:

- Surface ASI content exists.
- `class_barbarian` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Barbarian ASI grant through the same class feature-grant shape
  used by installed ASI rows.
- Ensure catalog admission becomes `installed`.
- Keep the Unit claim as a selection-grant container.

Acceptance:

- `barbarian_ability_score_improvement_l4` is installed in generated coverage.
- No Barbarian-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 2 - L14G-A02-BARD-ASI-CATALOG-ADMISSION

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `bard_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Bard.md:109-112`

Current state:

- Surface ASI content exists.
- `class_bard` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Bard ASI grant through the class feature-grant shape.
- Ensure catalog admission becomes `installed`.
- Keep executable behavior owned by the selected feat or Character Sheet
  projection.

Acceptance:

- `bard_ability_score_improvement_l4` is installed in generated coverage.
- No Bard-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 3 - L14G-A03-CLERIC-ASI-CATALOG-ADMISSION

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `cleric_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Cleric.md:106-109`

Current state:

- Surface ASI content exists.
- `class_cleric` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Cleric ASI grant through the class feature-grant shape.
- Ensure catalog admission becomes `installed`.

Acceptance:

- `cleric_ability_score_improvement_l4` is installed in generated coverage.
- No Cleric-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 4 - L14G-A04-DRUID-ASI-CATALOG-ADMISSION

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `druid_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Druid.md:134-137`

Current state:

- Surface ASI content exists.
- `class_druid` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Druid ASI grant through the class feature-grant shape.
- Ensure catalog admission becomes `installed`.

Acceptance:

- `druid_ability_score_improvement_l4` is installed in generated coverage.
- No Druid-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 5 - L14G-A05-MONK-ASI-CATALOG-ADMISSION

Status: `done`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `monk_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Monk.md:112-115`

Current state:

- Surface ASI content exists.
- `class_monk` has `monk_slow_fall` at level 4 but lacks the ASI grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Monk ASI grant without disturbing the existing Slow Fall
  level-4 grant.
- Ensure catalog admission becomes `installed`.

Acceptance:

- `monk_ability_score_improvement_l4` is installed in generated coverage.
- `monk_slow_fall` remains installed and unchanged.
- No Monk-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 6 - L14G-A06-RANGER-ASI-CATALOG-ADMISSION

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `ranger_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Ranger.md:106-109`

Current state:

- Surface ASI content exists.
- `class_ranger` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Ranger ASI grant through the class feature-grant shape.
- Ensure catalog admission becomes `installed`.

Acceptance:

- `ranger_ability_score_improvement_l4` is installed in generated coverage.
- No Ranger-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 7 - L14G-A07-ROGUE-ASI-CATALOG-ADMISSION

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `rogue_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Rogue.md:93-96`

Current state:

- Surface ASI content exists.
- `class_rogue` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Rogue ASI grant through the class feature-grant shape.
- Ensure catalog admission becomes `installed`.

Acceptance:

- `rogue_ability_score_improvement_l4` is installed in generated coverage.
- No Rogue-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

### Task 8 - L14G-A08-SORCERER-ASI-CATALOG-ADMISSION

Status: `ready-for-implementation`

Depends on:

- L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Unit: `sorcerer_ability_score_improvement_l4`

SRD anchor: `.references/srd-5.2.1/Classes/Sorcerer.md:123-126`

Current state:

- Surface ASI content exists.
- `class_sorcerer` lacks the level-4 ASI feature grant.
- Unit matrix reports `not-in-unit-catalog`, `unsupported-profile`, and a
  selection-grant-container closure.

Output:

- Add the level-4 Sorcerer ASI grant through the class feature-grant shape.
- Ensure catalog admission becomes `installed`.

Acceptance:

- `sorcerer_ability_score_improvement_l4` is installed in generated coverage.
- No Sorcerer-specific ASI runtime reducer or battle profile is introduced.

Verification:

- Shared lane verification.

## Verification

- Run reviewer-loop convergence after implementation: RAW traceability,
  ubiquitous-language/domain, architecture/connascence, and code-review passes;
  fix every reasonable finding and repeat until no reasonable findings remain.
- Run the shared lane verification commands.
