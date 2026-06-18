# Ralph L5 Lane A: Class Feature Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L5-A01-BARBARIAN-EXTRA-ATTACK",
      "status": "ready-for-research",
      "title": "Close Barbarian Extra Attack level 5 follow-up"
    },
    {
      "number": 2,
      "id": "L5-A02-BARD-FONT-OF-INSPIRATION",
      "status": "ready-for-research",
      "title": "Close Bard Font of Inspiration level 5 follow-up"
    },
    {
      "number": 3,
      "id": "L5-A03-CLERIC-SEAR-UNDEAD",
      "status": "ready-for-research",
      "title": "Close Cleric Sear Undead level 5 follow-up"
    },
    {
      "number": 4,
      "id": "L5-A04-DRUID-WILD-RESURGENCE",
      "status": "ready-for-research",
      "title": "Close Druid Wild Resurgence level 5 follow-up"
    },
    {
      "number": 5,
      "id": "L5-A05-FIGHTER-TACTICAL-SHIFT",
      "status": "ready-for-research",
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
features such as Fighter, Paladin, Ranger, Rogue, and Barbarian movement
features are out of scope unless a task's RAW pass finds a direct dependency.

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
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- Use only local SRD 5.2.1 sources under `.references/srd-5.2.1/`.
- Do not browse external rules sources.
- Do not add PHB+ authored identity.
- One task equals one mined Unit row. Do not broaden a task into unrelated
  level 6, level 7, subclass, or spell work.
- Before adding a field or status, search for an existing source fact and avoid
  duplicate state.
- For each Unit, first decide the owner boundary in domain language:
  character creation, Character Sheet/progression, battle runtime, or explicit
  non-runtime/runtime-detached closure.
- Do not mark a row supported only by adding a label. The closure must have a
  type/runtime consequence or checker-readable owner evidence.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| L5-A01-BARBARIAN-EXTRA-ATTACK | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A02-BARD-FONT-OF-INSPIRATION | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A03-CLERIC-SEAR-UNDEAD | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A04-DRUID-WILD-RESURGENCE | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A05-FIGHTER-TACTICAL-SHIFT | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A06-MONK-EXTRA-ATTACK | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A07-MONK-STUNNING-STRIKE | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A08-PALADIN-FAITHFUL-STEED | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A09-ROGUE-CUNNING-STRIKE | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A10-SORCERER-SORCEROUS-RESTORATION | merged L17 mining audit | Independent level-5 class feature row. |
| L5-A11-WIZARD-MEMORIZE-SPELL | merged L17 mining audit | Independent level-5 class feature row. |

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
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - L5-A01-BARBARIAN-EXTRA-ATTACK

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `barbarian_extra_attack`

SRD anchor:

- `.references/srd-5.2.1/Classes/Barbarian.md:112`

Current state:

- The level 1-7 mining audit marks this row `level-5-7-follow-up-required`.
- Candidate Unit is not installed and has no unit profile/evidence row.

Output:

- Author or explicitly close the Barbarian Extra Attack Unit with a precise
  owner boundary.
- If it duplicates an existing generic Extra Attack owner, reuse that owner
  rather than creating parallel state.

Acceptance:

- `barbarian_extra_attack` no longer appears as `level-5-7-follow-up-required`.
- Generated coverage shows either installed owner evidence or a typed closure.

Verification:

- Shared lane verification.

### Task 2 - L5-A02-BARD-FONT-OF-INSPIRATION

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `bard_font_of_inspiration`

SRD anchor:

- `.references/srd-5.2.1/Classes/Bard.md:113`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Decide whether Font of Inspiration is Character Sheet/progression, battle
  runtime, or runtime-detached resource-clock evidence.
- Add the minimal authored record, catalog/evidence entry, or closure required
  by that owner decision.

Acceptance:

- `bard_font_of_inspiration` no longer appears as
  `level-5-7-follow-up-required`.
- No Bardic Inspiration resource state is duplicated across owners.

Verification:

- Shared lane verification.

### Task 3 - L5-A03-CLERIC-SEAR-UNDEAD

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `cleric_sear_undead`

SRD anchor:

- `.references/srd-5.2.1/Classes/Cleric.md:110`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

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

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `druid_wild_resurgence`

SRD anchor:

- `.references/srd-5.2.1/Classes/Druid.md:138`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Decide the Wild Resurgence owner boundary across Wild Shape, spell-slot, and
  resource-restoration facts.
- Add only the owner evidence or typed closure required for level-5 parity.

Acceptance:

- `druid_wild_resurgence` is no longer a generated follow-up.
- No spell-slot or Wild Shape count is copied into a second runtime state.

Verification:

- Shared lane verification.

### Task 5 - L5-A05-FIGHTER-TACTICAL-SHIFT

Status: `ready-for-research`

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

- merged L17 mining audit

Unit:

- `monk_extra_attack`

SRD anchor:

- `.references/srd-5.2.1/Classes/Monk.md:120`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Reuse the existing Extra Attack support model if it already carries the SRD
  semantics needed by Monk.
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

- Identify the owner for Stunning Strike across attack-hit timing, saving
  throws, condition application, and Monk resource cost.
- Implement or explicitly split follow-up work only after the RAW owner is
  clear.

Acceptance:

- `monk_stunning_strike` has checker-visible owner evidence or a precise
  executable follow-up split.
- No condition or save workflow relies on authored identity dispatch.

Verification:

- Shared lane verification.

### Task 8 - L5-A08-PALADIN-FAITHFUL-STEED

Status: `ready-for-research`

Depends on:

- merged L17 mining audit

Unit:

- `paladin_faithful_steed`

SRD anchor:

- `.references/srd-5.2.1/Classes/Paladin.md:130`

Current state:

- The mined row is not installed and has no unit profile/evidence row.

Output:

- Decide whether Faithful Steed is a Character Sheet/spell-access owner,
  summoned creature owner, or runtime-detached table companion closure.
- Record the owner boundary without copying mount state into Paladin class
  state.

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
  options, saving throws, and condition/effect outcomes.
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

- Decide the owner for prepared/memorized spell list mutation and level-5
  Wizard progression evidence.
- Add only the authored record, owner evidence, or closure required by that
  boundary.

Acceptance:

- `wizard_memorize_spell` is no longer a generated level-5 follow-up.
- Spell preparation state is not duplicated beside the canonical spell list
  owner.

Verification:

- Shared lane verification.
