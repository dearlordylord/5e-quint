# Ralph L5 Lane D: Spell-Level 3 Missing Authored Records 2

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-D01-PLANT-GROWTH",
      "status": "ready-for-research",
      "title": "Close Plant Growth missing authored record"
    },
    {
      "number": 2,
      "id": "L5-D02-REMOVE-CURSE",
      "status": "ready-for-research",
      "title": "Close Remove Curse missing authored record"
    },
    {
      "number": 3,
      "id": "L5-D03-REVIVIFY",
      "status": "ready-for-research",
      "title": "Close Revivify missing authored record"
    },
    {
      "number": 4,
      "id": "L5-D04-SENDING",
      "status": "ready-for-research",
      "title": "Close Sending missing authored record"
    },
    {
      "number": 5,
      "id": "L5-D05-SLEET-STORM",
      "status": "ready-for-research",
      "title": "Close Sleet Storm missing authored record"
    },
    {
      "number": 6,
      "id": "L5-D06-SLOW",
      "status": "ready-for-research",
      "title": "Close Slow missing authored record"
    },
    {
      "number": 7,
      "id": "L5-D07-SPEAK-WITH-DEAD",
      "status": "ready-for-research",
      "title": "Close Speak with Dead missing authored record"
    },
    {
      "number": 8,
      "id": "L5-D08-SPEAK-WITH-PLANTS",
      "status": "ready-for-research",
      "title": "Close Speak with Plants missing authored record"
    },
    {
      "number": 9,
      "id": "L5-D09-TINY-HUT",
      "status": "ready-for-research",
      "title": "Close Tiny Hut missing authored record"
    },
    {
      "number": 10,
      "id": "L5-D10-WATER-WALK",
      "status": "ready-for-research",
      "title": "Close Water Walk missing authored record"
    }
  ]
}
-->

## Lane Scope

This lane closes the second half of spell-level-3 identities that the level 1-7
mining audit marks as `missing-authored-record`.

Each task owns one missing SRD Spell Definition decision first, then a separate
catalog admission or owner-boundary decision. Author a redistributable
SRD-provenance Surface record when the local SRD body is representable; if it is
not representable yet, record the catalog-boundary reason and any typed
follow-up split. Do not touch Lane B authored-review spells or Lane C
missing-record spells unless a RAW dependency is unavoidable and documented.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/L3_SLOW_RUNTIME_SURVEY.md`
- `packages/surface/content/*.json`
- `packages/surface/content/*.dhall`
- `packages/battle-runtime/src/`
- `.references/srd-5.2.1/Classes/*.md`
- `.references/srd-5.2.1/Spells/*.md`
- `UBIQUITOUS_LANGUAGE.md`
- `ASSUMPTIONS.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- If RAW is ambiguous or a task requires a modeling choice the SRD does not
  prescribe, do not silently choose; document the proposed assumption in
  `ASSUMPTIONS.md` or stop for owner direction.
- Do not browse external rules sources.
- Do not add PHB+ authored identity.
- One task equals one unique spell Unit identity. Class-list rows are evidence
  for that Unit, not separate implementation tasks.
- Keep provenance, structured input, and runtime projection separate.
- Missing authored record closure requires resolving the Surface Spell
  Definition/provenance question first: author the SRD-provenance record when
  the local SRD body is representable, or record a catalog-boundary reason it is
  not representable yet. A battle-runtime-detached owner statement alone does
  not close a missing authored record.
- Runtime behavior must not dispatch on spell id, name, or provenance section.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L5-D01-PLANT-GROWTH - Close Plant Growth missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 2 | L5-D02-REMOVE-CURSE - Close Remove Curse missing authored record | ready-for-research | none | May resolve Surface Spell Definition before Bestow Curse runtime occurrence semantics exist. |
| 3 | L5-D03-REVIVIFY - Close Revivify missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 4 | L5-D04-SENDING - Close Sending missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 5 | L5-D05-SLEET-STORM - Close Sleet Storm missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 6 | L5-D06-SLOW - Close Slow missing authored record | ready-for-research | none | Preserve Surface authoring, active penalties, and turn/Somatic split from `plans/unit-profile-coverage/L3_SLOW_RUNTIME_SURVEY.md`. |
| 7 | L5-D07-SPEAK-WITH-DEAD - Close Speak with Dead missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 8 | L5-D08-SPEAK-WITH-PLANTS - Close Speak with Plants missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 9 | L5-D09-TINY-HUT - Close Tiny Hut missing authored record | ready-for-research | none | Independent missing spell Unit. |
| 10 | L5-D10-WATER-WALK - Close Water Walk missing authored record | ready-for-research | none | Independent missing spell Unit. |

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
- If a unit task changes coverage inputs, run
  `pnpm unit-profile-coverage:check --write` locally. Shared generated
  inventory/matrix refresh is owned by
  `plans/RALPH_L5_POST_LANE_GENERATED_COVERAGE_FINALIZATION.md` after all four
  lanes merge; individual unit-task agents should not hand-resolve cross-lane
  generated artifact conflicts.
- `pnpm unit-profile-coverage:check`
- `git diff --check`

## Task Details

### Task 1 - L5-D01-PLANT-GROWTH

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `plant_growth`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:626`
- `.references/srd-5.2.1/Classes/Bard.md:226`
- `.references/srd-5.2.1/Classes/Druid.md:258`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Resolve the SRD Spell Definition record for Plant Growth, then classify owner
  facts for Overgrowth's 4-feet-per-1-foot movement cost, excluded areas,
  Enrichment duration, harvest yield, radius/area, and table travel/economy
  effects.

Acceptance:

- `plant_growth` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 2 - L5-D02-REMOVE-CURSE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `remove_curse`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md:107`
- `.references/srd-5.2.1/Classes/Cleric.md:216`
- `.references/srd-5.2.1/Classes/Warlock.md:388`
- `.references/srd-5.2.1/Classes/Wizard.md:256`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Resolve the SRD Spell Definition record for Remove Curse.
- If L5-C01-BESTOW-CURSE has already settled runtime Spell Effect curse
  occurrence and curse-removal target semantics, reuse that boundary. Otherwise
  do not create a competing runtime curse occurrence model or claim runtime
  curse-removal support.

Acceptance:

- `remove_curse` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 3 - L5-D03-REVIVIFY

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `revivify`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md:186`
- `.references/srd-5.2.1/Classes/Cleric.md:217`
- `.references/srd-5.2.1/Classes/Druid.md:260`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Revivify with owner facts for death timing, return-to-life
  state, hit points, and condition cleanup boundaries.

Acceptance:

- `revivify` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 4 - L5-D04-SENDING

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `sending`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:145`
- `.references/srd-5.2.1/Classes/Bard.md:227`
- `.references/srd-5.2.1/Classes/Cleric.md:218`
- `.references/srd-5.2.1/Classes/Wizard.md:257`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Sending with an explicit table communication owner for
  message delivery, planar failure chance, and response facts.

Acceptance:

- `sending` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 5 - L5-D05-SLEET-STORM

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `sleet_storm`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:352`
- `.references/srd-5.2.1/Classes/Druid.md:261`
- `.references/srd-5.2.1/Classes/Sorcerer.md:314`
- `.references/srd-5.2.1/Classes/Wizard.md:258`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Resolve the SRD Spell Definition record for Sleet Storm, then classify owner
  facts for area, Difficult Terrain, Heavily Obscured area, Dexterity Saving
  Throw, Prone condition, and Concentration loss.

Acceptance:

- `sleet_storm` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 6 - L5-D06-SLOW

Status: `ready-for-research`

Depends on:

- merged L17 mining audit
- plans/unit-profile-coverage/L3_SLOW_RUNTIME_SURVEY.md

Unit:

- `slow`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:367`
- `.references/srd-5.2.1/Classes/Bard.md:228`
- `.references/srd-5.2.1/Classes/Sorcerer.md:315`
- `.references/srd-5.2.1/Classes/Wizard.md:259`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Preserve the survey's follow-up split: Surface authoring, active penalties,
  and target-turn/Somatic runtime. Do not collapse target count, Wisdom Saving
  Throw, Speed, AC, Dexterity Saving Throw, Reaction, spellcasting delay, and
  repeat Saving Throw facts into a single support or unsupported label.

Acceptance:

- `slow` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 7 - L5-D07-SPEAK-WITH-DEAD

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `speak_with_dead`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:431`
- `.references/srd-5.2.1/Classes/Bard.md:229`
- `.references/srd-5.2.1/Classes/Cleric.md:219`
- `.references/srd-5.2.1/Classes/Wizard.md:260`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Speak with Dead with an explicit table communication and
  corpse-eligibility owner.

Acceptance:

- `speak_with_dead` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 8 - L5-D08-SPEAK-WITH-PLANTS

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `speak_with_plants`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:446`
- `.references/srd-5.2.1/Classes/Bard.md:230`
- `.references/srd-5.2.1/Classes/Druid.md:262`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Speak with Plants with owner facts for plant communication,
  terrain/favor, and table information boundaries.

Acceptance:

- `speak_with_plants` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 9 - L5-D09-TINY-HUT

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `tiny_hut`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:905`
- `.references/srd-5.2.1/Classes/Bard.md:232`
- `.references/srd-5.2.1/Classes/Wizard.md:262`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Author or close Tiny Hut with owner facts for immobile dome, creature/item
  passage, atmosphere, weather, spell blocking, and duration.

Acceptance:

- `tiny_hut` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 10 - L5-D10-WATER-WALK

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `water_walk`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1247`
- `.references/srd-5.2.1/Classes/Cleric.md:222`
- `.references/srd-5.2.1/Classes/Druid.md:264`
- `.references/srd-5.2.1/Classes/Sorcerer.md:320`

Current state:

- Authored record is missing; catalog state is `not-installed`.
- Mining disposition is `missing-authored-record`.

Output:

- Resolve the SRD Spell Definition record for Water Walk, then classify owner
  facts for willing creature targets, supported liquid surfaces, movement across
  those surfaces, and table environment boundaries.

Acceptance:

- `water_walk` leaves `missing-authored-record`.

Verification:

- Shared lane verification.
