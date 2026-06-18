# Ralph L5 Lane C: Spell-Level 3 Missing Authored Records 1

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-C01-BESTOW-CURSE",
      "status": "ready-for-research",
      "title": "Close Bestow Curse missing authored record"
    },
    {
      "number": 2,
      "id": "L5-C02-BLINK",
      "status": "ready-for-research",
      "title": "Close Blink missing authored record"
    },
    {
      "number": 3,
      "id": "L5-C03-CONJURE-ANIMALS",
      "status": "ready-for-research",
      "title": "Close Conjure Animals missing authored record"
    },
    {
      "number": 4,
      "id": "L5-C04-GASEOUS-FORM",
      "status": "ready-for-research",
      "title": "Close Gaseous Form missing authored record"
    },
    {
      "number": 5,
      "id": "L5-C05-GLYPH-OF-WARDING",
      "status": "ready-for-research",
      "title": "Close Glyph of Warding missing authored record"
    },
    {
      "number": 6,
      "id": "L5-C06-HASTE",
      "status": "ready-for-research",
      "title": "Close Haste missing authored record"
    },
    {
      "number": 7,
      "id": "L5-C07-MAGIC-CIRCLE",
      "status": "ready-for-research",
      "title": "Close Magic Circle missing authored record"
    },
    {
      "number": 8,
      "id": "L5-C08-MELD-INTO-STONE",
      "status": "ready-for-research",
      "title": "Close Meld into Stone missing authored record"
    },
    {
      "number": 9,
      "id": "L5-C09-NONDETECTION",
      "status": "ready-for-research",
      "title": "Close Nondetection missing authored record"
    },
    {
      "number": 10,
      "id": "L5-C10-PHANTOM-STEED",
      "status": "ready-for-research",
      "title": "Close Phantom Steed missing authored record"
    }
  ]
}
-->

## Lane Scope

This lane closes the first half of spell-level-3 identities that the level 1-7
mining audit marks as `missing-authored-record`.

Each task owns one missing SRD spell Unit. The task may author a redistributable
SRD-provenance Surface record, install it only after support/owner evidence is
clear, or explicitly close the row with a typed runtime-detached boundary. Do
not touch Lane B authored-review spells or Lane D missing-record spells unless a
RAW dependency is unavoidable and documented.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/surface/content/*.json`
- `packages/surface/content/*.dhall`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/*.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- Do not browse external rules sources.
- Do not add PHB+ authored identity.
- One task equals one unique spell Unit identity. Class-list rows are evidence
  for that Unit, not separate implementation tasks.
- Keep provenance, structured input, and runtime projection separate.
- Missing authored record closure means either a real SRD-provenance Surface
  record exists or the task records a precise reason the row is outside this
  runtime/catalog boundary. Do not hide it with a status-only label.
- Runtime behavior must not dispatch on spell id, name, or provenance section.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| L5-C01-BESTOW-CURSE | merged L17 mining audit | Independent missing spell Unit. |
| L5-C02-BLINK | merged L17 mining audit | Independent missing spell Unit. |
| L5-C03-CONJURE-ANIMALS | merged L17 mining audit | Independent missing spell Unit. |
| L5-C04-GASEOUS-FORM | merged L17 mining audit | Independent missing spell Unit. |
| L5-C05-GLYPH-OF-WARDING | merged L17 mining audit | Independent missing spell Unit. |
| L5-C06-HASTE | merged L17 mining audit | Independent missing spell Unit. |
| L5-C07-MAGIC-CIRCLE | merged L17 mining audit | Independent missing spell Unit. |
| L5-C08-MELD-INTO-STONE | merged L17 mining audit | Independent missing spell Unit. |
| L5-C09-NONDETECTION | merged L17 mining audit | Independent missing spell Unit. |
| L5-C10-PHANTOM-STEED | merged L17 mining audit | Independent missing spell Unit. |

## Shared Verification

- RAW and ubiquitous-language check: read the listed spell description, class
  spell-list anchors, and `UBIQUITOUS_LANGUAGE.md` before authoring or closing
  the Unit.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/surface typecheck`
- `pnpm --filter @dnd/surface exec vitest run src/surface/unit-catalog.test.ts`
- Run focused tests/typechecks for any touched owner package.
- If battle-runtime behavior changes, update the relevant QNT/spec first and
  run the focused MBT only after code changes are complete, one MBT run at a
  time per `AGENTS.md`.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - L5-C01-BESTOW-CURSE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `bestow_curse`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:481`
- `.references/srd-5.2.1/Classes/Bard.md:217`
- `.references/srd-5.2.1/Classes/Cleric.md:206`
- `.references/srd-5.2.1/Classes/Wizard.md:238`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author the SRD Surface record or record a precise typed closure.
- If admitted, add support-profile/evidence for curse options, save timing, and
  concentration ownership.

Acceptance:

- `bestow_curse` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 2 - L5-C02-BLINK

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `blink`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:580`
- `.references/srd-5.2.1/Classes/Sorcerer.md:300`
- `.references/srd-5.2.1/Classes/Wizard.md:239`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Blink with an explicit owner for turn-end roll, plane
  transition, and return-position table facts.

Acceptance:

- `blink` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 3 - L5-C03-CONJURE-ANIMALS

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `conjure_animals`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:948`
- `.references/srd-5.2.1/Classes/Druid.md:254`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Conjure Animals with a precise owner for summoned creature
  selection, initiative, control, and stat-block provenance.

Acceptance:

- `conjure_animals` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 4 - L5-C04-GASEOUS-FORM

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `gaseous_form`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:688`
- `.references/srd-5.2.1/Classes/Sorcerer.md:308`
- `.references/srd-5.2.1/Classes/Warlock.md:384`
- `.references/srd-5.2.1/Classes/Wizard.md:246`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Gaseous Form with owner facts for movement, resistance,
  action limits, and form state.

Acceptance:

- `gaseous_form` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 5 - L5-C05-GLYPH-OF-WARDING

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `glyph_of_warding`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:842`
- `.references/srd-5.2.1/Classes/Bard.md:221`
- `.references/srd-5.2.1/Classes/Cleric.md:211`
- `.references/srd-5.2.1/Classes/Wizard.md:247`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Glyph of Warding with a precise owner for stored spell,
  trigger, movement invalidation, and table object/location facts.

Acceptance:

- `glyph_of_warding` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 6 - L5-C06-HASTE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `haste`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:1091`
- `.references/srd-5.2.1/Classes/Sorcerer.md:309`
- `.references/srd-5.2.1/Classes/Wizard.md:248`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Haste with typed facts for speed, AC, Dexterity saves, extra
  action limits, and lethargy cleanup.

Acceptance:

- `haste` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 7 - L5-C07-MAGIC-CIRCLE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `magic_circle`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:37`
- `.references/srd-5.2.1/Classes/Cleric.md:212`
- `.references/srd-5.2.1/Classes/Warlock.md:386`
- `.references/srd-5.2.1/Classes/Wizard.md:251`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Magic Circle with owner facts for creature types, planar
  movement, charm/frighten/possession prevention, and area inversion.

Acceptance:

- `magic_circle` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 8 - L5-C08-MELD-INTO-STONE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `meld_into_stone`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:247`
- `.references/srd-5.2.1/Classes/Cleric.md:214`
- `.references/srd-5.2.1/Classes/Druid.md:257`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Meld into Stone with an owner for table terrain, occupancy,
  perception, damage, and forced exit facts.

Acceptance:

- `meld_into_stone` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 9 - L5-C09-NONDETECTION

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `nondetection`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:481`
- `.references/srd-5.2.1/Classes/Bard.md:225`
- `.references/srd-5.2.1/Classes/Wizard.md:253`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Nondetection with a precise owner for divination targeting
  and magical scrying detection boundaries.

Acceptance:

- `nondetection` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 10 - L5-C10-PHANTOM-STEED

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `phantom_steed`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:558`
- `.references/srd-5.2.1/Classes/Wizard.md:254`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Phantom Steed with a precise owner for mount creation,
  riding speed, dismissal/fade timing, and table travel facts.

Acceptance:

- `phantom_steed` leaves `missing-authored-record`.

Verification:

- Shared lane verification.
