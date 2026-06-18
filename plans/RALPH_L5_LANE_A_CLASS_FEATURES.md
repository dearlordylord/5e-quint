# Ralph L5 Lane A: Class Feature Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-A01-BARBARIAN-EXTRA-ATTACK",
      "status": "done",
      "title": "Close Barbarian Extra Attack level 5 follow-up"
    },
    {
      "number": 2,
      "id": "L5-A02-BARD-FONT-OF-INSPIRATION",
      "status": "done",
      "title": "Close Bard Font of Inspiration level 5 follow-up"
    },
    {
      "number": 3,
      "id": "L5-A03-CLERIC-SEAR-UNDEAD",
      "status": "done",
      "title": "Close Cleric Sear Undead level 5 follow-up"
    },
    {
      "number": 4,
      "id": "L5-A04-DRUID-WILD-RESURGENCE",
      "status": "done",
      "title": "Close Druid Wild Resurgence level 5 follow-up"
    },
    {
      "number": 5,
      "id": "L5-A05-FIGHTER-TACTICAL-SHIFT",
      "status": "done",
      "title": "Close Fighter Tactical Shift level 5 follow-up"
    },
    {
      "number": 6,
      "id": "L5-A06-MONK-EXTRA-ATTACK",
      "status": "ready-for-research",
      "title": "Close Monk Extra Attack level 5 follow-up"
    },
    {
      "number": 7,
      "id": "L5-A07-MONK-STUNNING-STRIKE",
      "status": "ready-for-research",
      "title": "Close Monk Stunning Strike level 5 follow-up"
    },
    {
      "number": 8,
      "id": "L5-A08-PALADIN-FAITHFUL-STEED",
      "status": "ready-for-research",
      "title": "Close Paladin Faithful Steed level 5 follow-up"
    },
    {
      "number": 9,
      "id": "L5-A09-ROGUE-CUNNING-STRIKE",
      "status": "ready-for-research",
      "title": "Close Rogue Cunning Strike level 5 follow-up"
    },
    {
      "number": 10,
      "id": "L5-A10-SORCERER-SORCEROUS-RESTORATION",
      "status": "ready-for-research",
      "title": "Close Sorcerer Sorcerous Restoration level 5 follow-up"
    },
    {
      "number": 11,
      "id": "L5-A11-WIZARD-MEMORIZE-SPELL",
      "status": "ready-for-research",
      "title": "Close Wizard Memorize Spell level 5 follow-up"
    }
  ]
}
-->

## Lane Scope

This lane closes the character-level-5 class feature rows that the level 1-7
mining audit marks as `level-5-7-follow-up-required`.

The lane does not own spell-level-3 pressure. The level-5 class table summary
rows are already explicit `non-runtime` closures, and already accepted level-5
rows such as `barbarian_fast_movement`, `fighter_extra_attack`,
`paladin_extra_attack`, `ranger_extra_attack`, and `rogue_uncanny_dodge` are
out of scope unless a task's RAW pass finds a direct dependency.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_7_MINING_AUDIT.md`
- `plans/unit-profile-coverage/level1-7-mining-audit.json`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/*.json`
- `packages/surface/content/*.dhall`
- `packages/character-creation-runtime/src/`
- `packages/character-sheet-runtime/src/`
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
- One task equals one mined Unit row. Do not broaden a task into unrelated
  level 6, level 7, subclass, or spell work.
- Before adding a field or status, search for an existing source fact and avoid
  duplicate state.
- For each Unit, first decide the owner boundary in domain language:
  character creation, Character Sheet/progression, battle runtime, or
  table-only closure.
- Do not mark a row supported only by adding a label. The closure must have a
  type/runtime consequence or checker-readable owner evidence.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L5-A01-BARBARIAN-EXTRA-ATTACK - Close Barbarian Extra Attack level 5 follow-up | done | none | Authored and installed using the shared Extra Attack owner/evidence path. |
| 2 | L5-A02-BARD-FONT-OF-INSPIRATION - Close Bard Font of Inspiration level 5 follow-up | done | none | Closed by unsupported-profile owner evidence for existing Bardic Inspiration resource recovery. |
| 3 | L5-A03-CLERIC-SEAR-UNDEAD - Close Cleric Sear Undead level 5 follow-up | done | none | Closed by unsupported-profile owner evidence for the future Turn Undead Channel Divinity option execution owner. |
| 4 | L5-A04-DRUID-WILD-RESURGENCE - Close Druid Wild Resurgence level 5 follow-up | done | none | Closed by unsupported-profile owner evidence for the future Character Sheet Wild Resurgence resource-restoration owner using existing Wild Shape and Spell Slot state owners. |
| 5 | L5-A05-FIGHTER-TACTICAL-SHIFT - Close Fighter Tactical Shift level 5 follow-up | done | none | Independent level-5 class feature row. |
| 6 | L5-A06-MONK-EXTRA-ATTACK - Close Monk Extra Attack level 5 follow-up | ready-for-research | L5-A01-BARBARIAN-EXTRA-ATTACK | Reuse the established Extra Attack owner/evidence path. |
| 7 | L5-A07-MONK-STUNNING-STRIKE - Close Monk Stunning Strike level 5 follow-up | ready-for-research | none | Independent level-5 class feature row. |
| 8 | L5-A08-PALADIN-FAITHFUL-STEED - Close Paladin Faithful Steed level 5 follow-up | ready-for-research | none | Independent level-5 class feature row. |
| 9 | L5-A09-ROGUE-CUNNING-STRIKE - Close Rogue Cunning Strike level 5 follow-up | ready-for-research | none | Independent level-5 class feature row. |
| 10 | L5-A10-SORCERER-SORCEROUS-RESTORATION - Close Sorcerer Sorcerous Restoration level 5 follow-up | ready-for-research | none | Independent level-5 class feature row. |
| 11 | L5-A11-WIZARD-MEMORIZE-SPELL - Close Wizard Memorize Spell level 5 follow-up | ready-for-research | none | Independent level-5 class feature row. |

## Shared Verification

- RAW and ubiquitous-language check: read the listed local SRD class anchor and
  `UBIQUITOUS_LANGUAGE.md` before modeling or closing the Unit.
- Reviewer-loop convergence: run RAW traceability, ubiquitous-language/domain,
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

### Task 1 - L5-A01-BARBARIAN-EXTRA-ATTACK

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `barbarian_extra_attack`

SRD anchor:

- `.references/srd-5.2.1/Classes/Barbarian.md:112`

Current state:

- `barbarian_extra_attack` is authored, installed, and classified as a
  supported `unit-feature.attack-action-attack-count-scaling` profile.
- Generated coverage records deterministic admission and selected-identity MBT
  owner evidence through the existing Extra Attack path.

Output:

- Author or explicitly close the Barbarian Extra Attack Unit with a precise
  owner boundary.
- Own the generic Extra Attack reuse/widening decision for remaining class rows,
  including Monk, and reuse the existing owner rather than creating parallel
  state.

Acceptance:

- `barbarian_extra_attack` no longer appears as `level-5-7-follow-up-required`.
- Generated coverage shows either installed owner evidence or a typed closure.

Verification:

- Shared lane verification.

### Task 2 - L5-A02-BARD-FONT-OF-INSPIRATION

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `bard_font_of_inspiration`

SRD anchor:

- `.references/srd-5.2.1/Classes/Bard.md:113`

Current state:

- The mined row is closed by an unsupported-profile Unit claim with
  checker-readable owner evidence: Font of Inspiration modifies recovery for
  the existing Bardic Inspiration Pool and does not create a separate battle
  Unit profile or duplicate resource state.

Output:

- Decide whether Font of Inspiration is Character Sheet/progression, battle
  runtime, or battle-runtime-detached Bardic Inspiration Pool evidence with
  Short Rest and Long Rest restoration timing.
- Add the minimal authored record, catalog/evidence entry, or closure required
  by that owner decision.

Acceptance:

- `bard_font_of_inspiration` no longer appears as
  `level-5-7-follow-up-required`.
- No Bardic Inspiration resource state is duplicated across owners.

Verification:

- Shared lane verification.

### Task 3 - L5-A03-CLERIC-SEAR-UNDEAD

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `cleric_sear_undead`

SRD anchor:

- `.references/srd-5.2.1/Classes/Cleric.md:110`

Current state:

- The mined row is closed by an unsupported-profile Unit claim with
  checker-readable owner evidence. Sear Undead is a Turn Undead damage rider,
  not a standalone resource, action, or Character Sheet progression fact; the
  future Turn Undead Channel Divinity option execution owner must derive it from
  the selected Cleric feature and existing Channel Divinity procedure state.

Output:

- Determine whether Sear Undead belongs to Turn Undead/Channel Divinity
  runtime behavior, Character Sheet progression, or an explicit later-owner
  closure.
- Update the authoritative owner and generated evidence.

Acceptance:

- `cleric_sear_undead` is no longer a level 5 follow-up row.
- Any Turn Undead coupling is encoded in a local helper/type, not duplicated
  magic strings.

Verification:

- Shared lane verification.

### Task 4 - L5-A04-DRUID-WILD-RESURGENCE

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `druid_wild_resurgence`

SRD anchor:

- `.references/srd-5.2.1/Classes/Druid.md:138`

Current state:

- The mined row is closed by an unsupported-profile Unit claim with
  checker-readable owner evidence. Wild Resurgence is a resource-restoration
  modifier between existing Wild Shape uses and Spell Slot state, not a
  separate battle Unit profile or duplicate resource pool.

Output:

- Decide the Wild Resurgence owner boundary across Wild Shape, Spell Slot, and
  resource-restoration facts.
- Add only the owner evidence or typed closure required for level-5 parity.

Acceptance:

- `druid_wild_resurgence` is no longer a generated follow-up.
- No Spell Slot or Wild Shape count is copied into a second runtime state.

Verification:

- Shared lane verification.

### Task 5 - L5-A05-FIGHTER-TACTICAL-SHIFT

Status: `done`

Depends on:

- merged L17 mining audit

Unit:

- `fighter_tactical_shift`

SRD anchor:

- `.references/srd-5.2.1/Classes/Fighter.md:98`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Determine whether Tactical Shift needs battle movement behavior, Character
  Sheet progression evidence, or a runtime-detached closure.
- Update the owned layer and generated coverage only for that decision.

Acceptance:

- `fighter_tactical_shift` leaves `level-5-7-follow-up-required`.
- Movement/action economy assumptions are type-visible if runtime behavior is
  implemented.

Verification:

- Shared lane verification.

### Task 6 - L5-A06-MONK-EXTRA-ATTACK

Status: `ready-for-research`

Depends on:

- L5-A01-BARBARIAN-EXTRA-ATTACK

Unit:

- `monk_extra_attack`

SRD anchor:

- `.references/srd-5.2.1/Classes/Monk.md:120`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Reuse the Extra Attack owner/evidence path settled by
  L5-A01-BARBARIAN-EXTRA-ATTACK.
- Add Monk-specific evidence only where the class Unit selection boundary needs
  it.

Acceptance:

- `monk_extra_attack` is closed without duplicating the Extra Attack reducer or
  test oracle.

Verification:

- Shared lane verification.

### Task 7 - L5-A07-MONK-STUNNING-STRIKE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `monk_stunning_strike`

SRD anchor:

- `.references/srd-5.2.1/Classes/Monk.md:124`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Identify the owner for Stunning Strike across attack-hit timing, Saving
  Throws, condition application, and Monk resource cost.
- Implement or explicitly split follow-up work only after the RAW owner is
  clear.

Acceptance:

- `monk_stunning_strike` has checker-visible owner evidence or a precise
  executable follow-up split.
- No condition or Saving Throw workflow relies on authored identity dispatch.

Verification:

- Shared lane verification.

### Task 8 - L5-A08-PALADIN-FAITHFUL-STEED

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `paladin_faithful_steed`

SRD anchors:

- `.references/srd-5.2.1/Classes/Paladin.md:130`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:319`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Decide whether Faithful Steed is Character Sheet spell-access/progression
  evidence, or whether the linked Find Steed Spell Definition and Otherworldly
  Steed Stat Block require Companion, Companion Control, or Companion Execution
  ownership.
- Record the owner boundary without copying mount or companion state into
  Paladin class state.

Acceptance:

- `paladin_faithful_steed` is closed in generated coverage with owner evidence
  or typed closure.

Verification:

- Shared lane verification.

### Task 9 - L5-A09-ROGUE-CUNNING-STRIKE

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `rogue_cunning_strike`

SRD anchor:

- `.references/srd-5.2.1/Classes/Rogue.md:97`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Determine the owner for Cunning Strike across Sneak Attack damage exchange,
  options, Saving Throws, and condition/effect outcomes.
- If implemented, make option facts typed and avoid positional or stringly
  option protocols.

Acceptance:

- `rogue_cunning_strike` is no longer a level 5 follow-up.
- Any option list has a single source of truth.

Verification:

- Shared lane verification.

### Task 10 - L5-A10-SORCERER-SORCEROUS-RESTORATION

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `sorcerer_sorcerous_restoration`

SRD anchor:

- `.references/srd-5.2.1/Classes/Sorcerer.md:127`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Decide the owner for Sorcery Point restoration and rest/resource timing.
- Add owner evidence or typed closure without introducing a second Sorcery
  Point source of truth.

Acceptance:

- `sorcerer_sorcerous_restoration` leaves the follow-up bucket.
- Resource restoration coupling is localized and executable.

Verification:

- Shared lane verification.

### Task 11 - L5-A11-WIZARD-MEMORIZE-SPELL

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `wizard_memorize_spell`

SRD anchor:

- `.references/srd-5.2.1/Classes/Wizard.md:116`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Decide the owner for prepared/memorized Spell Access mutation and level-5
  Wizard progression evidence.
- Add only the authored record, owner evidence, or closure required by that
  boundary.

Acceptance:

- `wizard_memorize_spell` is no longer a generated level-5 follow-up.
- Spell Access state is not duplicated beside the canonical Spell Access owner.

Verification:

- Shared lane verification.
