# Ralph L17 Mining Audit

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L17-M01-DENOMINATOR-REPORT-SHAPE",
      "status": "done",
      "title": "Add non-blocking level 1-7 mining audit outputs"
    },
    {
      "number": 2,
      "id": "L17-M02-CLASS-LEVEL5-7-MINING",
      "status": "done",
      "title": "Mine class progression rows through level 7"
    },
    {
      "number": 3,
      "id": "L17-M03-SPELL-LEVEL3-4-MINING",
      "status": "done",
      "title": "Mine spell-level 3 and 4 pressure for the level 7 frontier"
    }
  ]
}
-->

## Lane Scope

This lane extends the SRD documentation mining/audit frontier from character
level 4 to character level 7.

This is **not** a runtime admission lane. Do not admit new Units, implement new
reducers, add new battle profiles, or claim level-7 full support. The output is
checker-readable mining evidence: generated denominator artifacts, source
anchors, authored/catalog/support status, and concrete follow-up rows for later
implementation lanes.

Repository term reminder: `scripts/content-surface-survey/` is the
**mining / oracle pipeline**. It tells us what is missing. The shipped authored
corpus lives in `packages/surface/content/<slug>.dhall`. This lane may update
inventory/report machinery and generated audit artifacts, but it must not treat
survey verdicts as shipped content.

## Source Artifacts

- `scripts/srd-unit-inventory.cjs`
- `scripts/level1-full-support-report.cjs`
- `scripts/unit-profile-coverage-check.cjs`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `packages/surface/content/*.dhall`
- `packages/surface/content/*.json`
- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/*.md`
- `.references/srd-5.2.1/Feats.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- Do not browse external rules sources.
- Do not add PHB+ authored identity.
- Do not admit unsupported Units into runtime, character creation, character
  sheet, or battle support profiles.
- Do not turn level 1-7 mining into a hard full-support gate in this lane.
  Existing level 1-4 gates must keep their current meaning.
- Treat character level and spell level as separate axes:
  - character level 5 introduces spell-level-3 pressure for full casters;
  - character level 7 introduces spell-level-4 pressure for full casters;
  - half-caster and pact-magic table rows must be mined from their own class
    tables, not inferred from full-caster progression.
- Mine from both class feature tables and section headings. Repeated features
  such as Fighter level-6 Ability Score Improvement can appear in the table and
  in the level-4 feature text without a separate `### Level 6` heading.
- If a row is mined but cannot be classified yet, emit a precise follow-up row
  instead of silently closing it or broadening an existing status.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| L17-M01-DENOMINATOR-REPORT-SHAPE | L14G/LT4 current artifacts | Add non-blocking generated outputs before row mining. |
| L17-M02-CLASS-LEVEL5-7-MINING | L17-M01-DENOMINATOR-REPORT-SHAPE | Class rows need the new level-1-to-7 audit shape. |
| L17-M03-SPELL-LEVEL3-4-MINING | L17-M01-DENOMINATOR-REPORT-SHAPE | Spell pressure rows need the same audit shape and separate axes. |

## Shared Verification

- RAW and ubiquitous-language check: every mined row must trace to
  `.references/srd-5.2.1/Classes/*.md`, `.references/srd-5.2.1/Spells/*.md`,
  `.references/srd-5.2.1/Feats.md`, or `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - L17-M01-DENOMINATOR-REPORT-SHAPE

Status: `done`

Depends on:

- L14G/LT4 current artifacts

Units:

- _none_; this is generated audit infrastructure only.

SRD anchors:

- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/*.md`

Current state:

- `scripts/srd-unit-inventory.cjs` inventories class feature levels 1-4.
- `scripts/level1-full-support-report.cjs` builds full-support reports only
  through level 1-4.
- Spell-level-3 pressure is visible as a later level-5 frontier seed.
- No generated level 1-7 mining audit exists.

Output:

- Add generated, non-blocking level 1-7 mining artifacts under
  `plans/unit-profile-coverage/`.
- The artifacts must separate "mined denominator row exists" from "runtime
  supported/admitted." Do not make level 1-7 support pass or fail the current
  level 1-4 gate.
- Preserve existing level 1, 1-2, 1-3, and 1-4 reports and metrics.

Acceptance:

- Running `pnpm unit-profile-coverage:check --write` creates or refreshes the
  level 1-7 mining artifacts.
- Running `pnpm unit-profile-coverage:check` passes without requiring runtime
  admission for newly mined level 5-7 rows.
- The report text clearly says this is a mining/audit frontier, not a
  full-support claim.

Verification:

- Shared lane verification.

### Task 2 - L17-M02-CLASS-LEVEL5-7-MINING

Status: `done`

Depends on:

- L17-M01-DENOMINATOR-REPORT-SHAPE

Units:

- Class feature, subclass feature, class-table, and repeated progression rows
  reachable at character levels 5, 6, and 7.

SRD anchors:

- `.references/srd-5.2.1/Classes/Barbarian.md`
- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Classes/Monk.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Rogue.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Wizard.md`

Current state:

- Class Surface records currently grant early progression only through level 4.
- Some standalone later-level feature records already exist, but they are not a
  complete class progression chain.
- Heading-only mining misses table-derived repeated features such as Fighter
  level-6 Ability Score Improvement.

Output:

- Mine level 5-7 class feature table rows and section-heading rows for all 12
  SRD classes.
- Mine repeated features that appear in table rows or repeat clauses even when
  they do not have a dedicated level heading.
- For each mined row, report source anchor, candidate Unit identity, authored
  content state, catalog admission state, support/evidence state, and next
  action.
- Do not create or install missing Surface records in this lane unless needed
  only as a generated audit artifact.

Acceptance:

- The level 1-7 mining report enumerates every mechanically relevant
  character-level 5-7 class row or explicitly documents why a table row is
  non-runtime summary only.
- Existing level 1-4 full-support reports are unchanged except for mechanical
  regeneration noise that is directly caused by shared report code.
- The report identifies concrete follow-up work without admitting new runtime
  support.

Verification:

- Shared lane verification.

### Task 3 - L17-M03-SPELL-LEVEL3-4-MINING

Status: `done`

Depends on:

- L17-M01-DENOMINATOR-REPORT-SHAPE

Units:

- SRD spell-level-3 pressure rows reachable by character level 5.
- SRD spell-level-4 pressure rows reachable by character level 7.

SRD anchors:

- `.references/srd-5.2.1/Classes/Bard.md`
- `.references/srd-5.2.1/Classes/Cleric.md`
- `.references/srd-5.2.1/Classes/Druid.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Classes/Sorcerer.md`
- `.references/srd-5.2.1/Classes/Warlock.md`
- `.references/srd-5.2.1/Classes/Wizard.md`
- `.references/srd-5.2.1/Spells/*.md`

Current state:

- Spell levels 0-2 participate in the level 1-4 readiness path.
- Spell-level-3 is tracked as a level-5 frontier seed.
- Spell-level-4 is not part of the current generated level 1-4 reports.

Output:

- Mine class spell-list pressure rows for spell levels 3 and 4.
- Report both class-list rows and unique spell identities.
- For each spell identity, compare authored Surface content, Unit catalog
  admission, support/profile evidence, and any explicit runtime-detached
  closure or follow-up split.
- Do not implement spell runtime behavior or add new spell admission in this
  lane.

Acceptance:

- The generated level 1-7 mining report shows spell-level-3 and spell-level-4
  pressure as separate rows from class-level feature pressure.
- The report explains why spell-level-3 starts at character level 5 and
  spell-level-4 starts at character level 7.
- All missing or unsupported spell rows have a concrete next action or a clear
  runtime-detached classification requirement.

Verification:

- Shared lane verification.
