# Ralph L5 Lane D: Spell-Level 3 Missing Authored Records 2

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-D01-PLANT-GROWTH",
      "status": "done",
      "title": "Close Plant Growth missing authored record"
    },
    {
      "number": 2,
      "id": "L5-D02-REMOVE-CURSE",
      "status": "done",
      "title": "Close Remove Curse missing authored record"
    },
    {
      "number": 3,
      "id": "L5-D03-REVIVIFY",
      "status": "done",
      "title": "Close Revivify missing authored record"
    },
    {
      "number": 4,
      "id": "L5-D04-SENDING",
      "status": "done",
      "title": "Close Sending missing authored record"
    },
    {
      "number": 5,
      "id": "L5-D05-SLEET-STORM",
      "status": "done",
      "title": "Close Sleet Storm missing authored record"
    },
    {
      "number": 6,
      "id": "L5-D06-SLOW",
      "status": "done",
      "title": "Close Slow missing authored record"
    },
    {
      "number": 7,
      "id": "L5-D07-SPEAK-WITH-DEAD",
      "status": "done",
      "title": "Close Speak with Dead missing authored record"
    },
    {
      "number": 8,
      "id": "L5-D08-SPEAK-WITH-PLANTS",
      "status": "done",
      "title": "Close Speak with Plants missing authored record"
    },
    {
      "number": 9,
      "id": "L5-D09-TINY-HUT",
      "status": "done",
      "title": "Close Tiny Hut missing authored record"
    },
    {
      "number": 10,
      "id": "L5-D10-WATER-WALK",
      "status": "done",
      "title": "Close Water Walk missing authored record"
    },
    {
      "number": 11,
      "id": "L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME",
      "status": "done",
      "title": "Promote Sleet Storm area hazard runtime support"
    },
    {
      "number": 12,
      "id": "L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME",
      "status": "done",
      "title": "Promote Slow active penalties runtime support"
    },
    {
      "number": 13,
      "id": "L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME",
      "status": "ready-for-research",
      "title": "Promote Slow target-turn and Somatic runtime support"
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
| 1 | L5-D01-PLANT-GROWTH - Close Plant Growth missing authored record | done | none | Independent missing spell Unit. |
| 2 | L5-D02-REMOVE-CURSE - Close Remove Curse missing authored record | done | none | May resolve Surface Spell Definition before Bestow Curse runtime occurrence semantics exist. |
| 3 | L5-D03-REVIVIFY - Close Revivify missing authored record | done | none | Independent missing spell Unit. |
| 4 | L5-D04-SENDING - Close Sending missing authored record | done | none | Independent missing spell Unit. |
| 5 | L5-D05-SLEET-STORM - Close Sleet Storm missing authored record | done | none | Independent missing spell Unit. |
| 6 | L5-D06-SLOW - Close Slow missing authored record | done | none | Authored and installed Slow as an SRD Surface Spell Definition while preserving active-penalties and turn/Somatic runtime follow-up tasks. |
| 7 | L5-D07-SPEAK-WITH-DEAD - Close Speak with Dead missing authored record | done | none | Independent missing spell Unit. |
| 8 | L5-D08-SPEAK-WITH-PLANTS - Close Speak with Plants missing authored record | done | none | Authored and installed Speak with Plants as an SRD Surface Spell Definition with a runtime-detached table/spatial/exploration owner. |
| 9 | L5-D09-TINY-HUT - Close Tiny Hut missing authored record | done | none | Authored and installed Tiny Hut as an SRD Surface Spell Definition with a runtime-detached table/spatial/environment shelter owner. |
| 10 | L5-D10-WATER-WALK - Close Water Walk missing authored record | done | none | Independent missing spell Unit. |
| 11 | L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME - Promote Sleet Storm area hazard runtime support | done | L5-D05-SLEET-STORM | Promoted Sleet Storm as a profile-subset-supported area hazard while leaving automatic geometry/pathfinding and exposed-flame dousing at their table/environment owners. |
| 12 | L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME - Promote Slow active penalties runtime support | done | L5-D06-SLOW | Promoted Slow active-penalty runtime support with caller-supplied Cube witnesses, failed-save penalties, Concentration ownership, and repeat-save cleanup. |
| 13 | L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME - Promote Slow target-turn and Somatic runtime support | ready-for-research | L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME | Runtime support consumes the active Slow effect lifecycle before enforcing target-turn action economy and Somatic failure chance. |

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

Status: `done`

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

- Slow is authored and installed as an SRD Surface Spell Definition.
- Unit claim is `unsupported-profile` with active-penalty and target-turn/Somatic
  runtime follow-up tasks.

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

Status: `done`

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

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `speak_with_plants`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:446`
- `.references/srd-5.2.1/Classes/Bard.md:230`
- `.references/srd-5.2.1/Classes/Druid.md:262`

Current state:

- Speak with Plants is authored and installed as an SRD Surface Spell
  Definition.
- Unit claim is `unsupported-profile` with a runtime-detached
  table/spatial/exploration plant communication and terrain owner.

Output:

- Author or close Speak with Plants with owner facts for plant communication,
  terrain/favor, and table information boundaries.

Acceptance:

- `speak_with_plants` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 9 - L5-D09-TINY-HUT

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `tiny_hut`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:905`
- `.references/srd-5.2.1/Classes/Bard.md:232`
- `.references/srd-5.2.1/Classes/Wizard.md:262`

Current state:

- Tiny Hut is authored and installed as an SRD Surface Spell Definition.
- Unit claim is `unsupported-profile` with a runtime-detached
  table/spatial/environment shelter owner.

Output:

- Author or close Tiny Hut with owner facts for immobile dome, creature/item
  passage, atmosphere, weather, spell blocking, and duration.

Acceptance:

- `tiny_hut` leaves `missing-authored-record`.

Verification:

- Shared lane verification.

### Task 10 - L5-D10-WATER-WALK

Status: `done`

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

### Task 11 - L3-FOLLOWUP-SLEET-STORM-AREA-HAZARD-RUNTIME

Status: `done`

Depends on:

- L5-D05-SLEET-STORM

Unit:

- `sleet_storm`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:352`
- `.references/srd-5.2.1/Classes/Druid.md:261`
- `.references/srd-5.2.1/Classes/Sorcerer.md:314`
- `.references/srd-5.2.1/Classes/Wizard.md:258`

Current state:

- Sleet Storm is authored and installed as an SRD Surface Spell Definition.
- The Unit claim is `unsupported-profile` with follow-up runtime owner evidence
  required for the area hazard.

Output:

- Promote Sleet Storm as a Concentration-owned Cylinder area hazard with
  caller-supplied area identity.
- Consume caller-supplied first-entry-on-a-turn and turn-start area-membership
  trigger facts rather than deriving table geometry or pathfinding.
- Support Difficult Terrain and Heavily Obscured projections, failed-save Prone
  application, and failed-save Concentration loss.
- Keep exposed-flame dousing as a separate runtime-detached object/environment
  owner unless that owner is explicitly modeled.

Acceptance:

- `sleet_storm` has a `supported-profile` or `profile-subset-supported` claim
  for the promoted area-hazard subset.
- Deterministic admission/projection evidence and focused runtime tests cover
  the promoted profile without dispatching on authored spell identity.
- Focused Quint/runtime parity is updated for any battle-runtime behavior
  change.
- The claim still names any unimplemented exposed-flame, pathfinding, or
  table-spatial facts as closed or follow-up owner boundaries.

Verification:

- Shared lane verification.
- Battle-runtime focused tests for the promoted area-hazard behavior.
- Relevant QNT proofs and one focused MBT run only if battle-runtime behavior
  changes, following the MBT process in `AGENTS.md`.

### Task 12 - L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME

Status: `done`

Depends on:

- L5-D06-SLOW

Unit:

- `slow`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:367`
- `.references/srd-5.2.1/Classes/Bard.md:228`
- `.references/srd-5.2.1/Classes/Sorcerer.md:315`
- `.references/srd-5.2.1/Classes/Wizard.md:259`

Current state:

- Slow is authored and installed as an SRD Surface Spell Definition.
- Unit claim is `profile-subset-supported` for the active-penalty runtime
  subset; target-turn and Somatic facts remain visible in
  `L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME`.

Output:

- Promote Slow's Magic Action and level-3+ Spell Slot spend, caster-owned
  Concentration, caller-supplied affected-creature set for the 40-foot Cube,
  Wisdom Saving Throw, failed-save active Speed ratio projection, -2 Armor
  Class projection, -2 Dexterity Saving Throw modifier, no-Reaction projection,
  and end-of-target-turn repeat Saving Throw cleanup for each affected target.
- Consume typed Slow Surface facts without spell-id, spell-name, or provenance
  dispatch.
- Leave target-turn Action-or-Bonus-Action, Attack action one-attack cap, and
  Somatic spell failure chance to
  `L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME` unless this task explicitly
  promotes shared lifecycle support that task consumes.

Acceptance:

- `slow` has a `supported-profile` or `profile-subset-supported` claim for the
  promoted active-penalty subset.
- Deterministic admission/projection evidence and focused runtime tests cover
  the promoted active penalties without authored-identity dispatch.
- Focused Quint/runtime parity is updated for any battle-runtime behavior
  change.
- Remaining target-turn/Somatic facts stay visible as follow-up work.

Verification:

- Shared lane verification.
- Battle-runtime focused tests for the promoted active-penalty behavior.
- Relevant QNT proofs and one focused MBT run only if battle-runtime behavior
  changes, following the MBT process in `AGENTS.md`.

### Task 13 - L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME

Status: `ready-for-research`

Depends on:

- L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME

Unit:

- `slow`

SRD anchors:

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:367`
- `.references/srd-5.2.1/Classes/Bard.md:228`
- `.references/srd-5.2.1/Classes/Sorcerer.md:315`
- `.references/srd-5.2.1/Classes/Wizard.md:259`

Current state:

- Slow is authored and installed as an SRD Surface Spell Definition.
- Target-turn action economy and Somatic spell failure chance require an active
  Slow effect lifecycle to consume.

Output:

- Promote Slow's target-turn Action or Bonus Action mutual-exclusion rule,
  Attack-action one-attack cap, and 25 percent spell failure chance for
  affected targets casting spells with Somatic components.
- Consume typed Slow Surface facts and active effect state without spell-id,
  spell-name, or provenance dispatch.

Acceptance:

- Runtime action-resource, Attack action, spell component, chance-result, and
  cleanup tests cover the promoted target-turn/Somatic behavior.
- Focused Quint/runtime parity is updated for any battle-runtime behavior
  change.
- The Unit claim keeps any still-unimplemented Slow facts explicit instead of
  collapsing them into an opaque support label.

Verification:

- Shared lane verification.
- Battle-runtime focused tests for the promoted target-turn and Somatic
  behavior.
- Relevant QNT proofs and one focused MBT run only if battle-runtime behavior
  changes, following the MBT process in `AGENTS.md`.
