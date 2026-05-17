# Level 1 Ralph Loop G - Character Selected Identities

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1G-CHARACTER-PRECHECK",
      "status": "ready-for-research",
      "title": "Post-C Character Identity Reconciliation"
    },
    {
      "number": 2,
      "id": "L1G-BARBARIAN-UNARMORED-DEFENSE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Barbarian Unarmored Defense Selected Identity Replay"
    },
    {
      "number": 3,
      "id": "L1G-MONK-UNARMORED-DEFENSE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Monk Unarmored Defense Selected Identity Replay"
    },
    {
      "number": 4,
      "id": "L1G-WIZARD-RITUAL-ADEPT",
      "status": "ready-for-implementation-after-light-research",
      "title": "Wizard Ritual Adept Selected Identity Replay"
    },
    {
      "number": 5,
      "id": "L1G-WIZARD-ARCANE-RECOVERY",
      "status": "ready-for-implementation-after-light-research",
      "title": "Wizard Arcane Recovery Selected Identity Replay"
    },
    {
      "number": 6,
      "id": "L1G-SORCERER-INNATE-SORCERY",
      "status": "ready-for-implementation-after-light-research",
      "title": "Sorcerer Innate Sorcery Selected Identity Replay"
    },
    {
      "number": 7,
      "id": "L1G-FIGHTER-FIGHTING-STYLE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Fighter Fighting Style Selected Identity Replay"
    },
    {
      "number": 8,
      "id": "L1G-CLERIC-DIVINE-ORDER",
      "status": "ready-for-implementation-after-light-research",
      "title": "Cleric Divine Order Selected Identity Replay"
    },
    {
      "number": 9,
      "id": "L1G-DRUID-PRIMAL-ORDER",
      "status": "ready-for-implementation-after-light-research",
      "title": "Druid Primal Order Selected Identity Replay"
    },
    {
      "number": 10,
      "id": "L1G-ROGUE-EXPERTISE",
      "status": "ready-for-implementation-after-light-research",
      "title": "Rogue Expertise Selected Identity Replay"
    },
    {
      "number": 11,
      "id": "L1G-WARLOCK-ELDRITCH-INVOCATIONS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Warlock Eldritch Invocations Selected Identity Replay"
    },
    {
      "number": 12,
      "id": "L1G-FIGHTER-WEAPON-MASTERY-CONTAINER",
      "status": "ready-for-implementation-after-light-research",
      "title": "Fighter Weapon Mastery Container Selected Identity Replay"
    },
    {
      "number": 13,
      "id": "L1G-BARBARIAN-WEAPON-MASTERY-CONTAINER",
      "status": "ready-for-implementation-after-light-research",
      "title": "Barbarian Weapon Mastery Container Selected Identity Replay"
    },
    {
      "number": 14,
      "id": "L1G-PALADIN-RANGER-ROGUE-WEAPON-MASTERY-CONTAINERS",
      "status": "ready-for-implementation-after-light-research",
      "title": "Paladin Ranger Rogue Weapon Mastery Container Selected Identity Replay"
    }
  ]
}
-->

This loop owns selected-identity MBT expansion for character-creation,
character-sheet, and class-feature identities. It starts after Loop C is merged
because Loop C is actively promoting several of these Units from subset or open
profile accounting into supported profile coverage.

Do not edit `plans/ACTIVE_PLAN.md`.

## Authority

- Character Creation and Character Sheet are part of full level-1 support.
- Use local class RAW in `.references/srd-5.2.1/Classes/`, feat RAW in
  `.references/srd-5.2.1/Feats.md`, and `UBIQUITOUS_LANGUAGE.md`.
- No redundant state: selected class choices, selected feats, selected mastery
  weapons, selected invocation options, and sheet projections must be derived
  from existing CharacterBuild or Character Sheet state.
- Container Units own selection and lifecycle. Selected child Units own
  executable battle pressure.
- No companion feature work is in scope.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Every task
must produce a review artifact and a decider artifact. The reviewer must reject
parallel registries, duplicated selected-option state, and support claims that
outpace the executable lifecycle.

## Owned Surface

Primary write scope:

- `packages/character-creation-runtime/src/*selected-identity*.mbt.test.ts`;
- `packages/character-sheet-runtime/src/*selected-identity*.mbt.test.ts`;
- matching package-local qnt files if needed;
- `packages/battle-runtime/src/*feature-selected-identity*.mbt.test.ts` only for
  `sorcerer_innate_sorcery`;
- `plans/unit-profile-coverage/unit-evidence.jsonl`;
- generated coverage reports.

Avoid Loop D/E/F/H battle spell owner files.

## MBT And Verification Protocol

Use deterministic replay tests first. If package-local Vitest links are absent,
repair the worktree once with `CI=true pnpm install` and do not commit
`node_modules`. Full MBT is serialized with `flock /tmp/dnd-battle-mbt.lock`
when needed. Character Creation MBT can be slow; run the focused deterministic
replay when the task only adds selected identity evidence.

Every task runs:

- relevant focused deterministic replay test;
- package typecheck for touched package when dependencies are available;
- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- reviewer loop convergence, minimum two rounds.

## Task Details

### Task 1 - L1G-CHARACTER-PRECHECK - Post-C Character Identity Reconciliation

Status: `ready-for-research`

After Loop C lands, reconcile this loop's Unit list against the refreshed strict
report. Keep only supported profile Units or Units that Loop C has just promoted.
If `warlock_eldritch_invocations` is not supported yet, leave Task 11 blocked in
the plan instead of forcing evidence.

### Task 2 - L1G-BARBARIAN-UNARMORED-DEFENSE - Barbarian Unarmored Defense Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `barbarian_unarmored_defense`, proving the
Character Sheet Armor Class base formula is selected from the authored Unit and
projected without duplicating armor state.

RAW: `.references/srd-5.2.1/Classes/Barbarian.md` Unarmored Defense.

### Task 3 - L1G-MONK-UNARMORED-DEFENSE - Monk Unarmored Defense Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `monk_unarmored_defense`, proving the Monk
Armor Class base formula is selected from the authored Unit and remains distinct
from Barbarian's formula.

RAW: `.references/srd-5.2.1/Classes/Monk.md` Unarmored Defense.

### Task 4 - L1G-WIZARD-RITUAL-ADEPT - Wizard Ritual Adept Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `wizard_ritual_adept`, proving spellbook
ritual invocation ownership without treating prepared-only spells as eligible.

RAW: `.references/srd-5.2.1/Classes/Wizard.md` Ritual Adept.

### Task 5 - L1G-WIZARD-ARCANE-RECOVERY - Wizard Arcane Recovery Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `wizard_arcane_recovery`, proving Short Rest
Spell Slot recovery and Long Rest reset through Character Sheet state. Do not
apply Arcane Recovery to Pact Magic slots.

RAW: `.references/srd-5.2.1/Classes/Wizard.md` Arcane Recovery.

### Task 6 - L1G-SORCERER-INNATE-SORCERY - Sorcerer Innate Sorcery Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `sorcerer_innate_sorcery`, binding the
authored class feature through the supported activation and spellcasting benefit
runtime profile.

RAW: `.references/srd-5.2.1/Classes/Sorcerer.md` Innate Sorcery.

### Task 7 - L1G-FIGHTER-FIGHTING-STYLE - Fighter Fighting Style Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `fighter_fighting_style` only after Loop C
has completed replacement support. The replay should show selection and Fighter
level replacement while retaining one selected CharacterBuild feature ref.

RAW: `.references/srd-5.2.1/Classes/Fighter.md` Fighting Style and
`.references/srd-5.2.1/Feats.md` Fighting Style feats.

### Task 8 - L1G-CLERIC-DIVINE-ORDER - Cleric Divine Order Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `cleric_divine_order`, proving
Character Creation option projection from the authored class feature and no
duplicated child state.

RAW: `.references/srd-5.2.1/Classes/Cleric.md` Divine Order.

### Task 9 - L1G-DRUID-PRIMAL-ORDER - Druid Primal Order Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `druid_primal_order`, proving
Character Creation option projection from the authored class feature and no
duplicated child state.

RAW: `.references/srd-5.2.1/Classes/Druid.md` Primal Order.

### Task 10 - L1G-ROGUE-EXPERTISE - Rogue Expertise Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `rogue_expertise`, proving level-1 and level-6
Expertise selection over owned skills using the existing CharacterBuild
proficiency projection.

RAW: `.references/srd-5.2.1/Classes/Rogue.md` Expertise.

### Task 11 - L1G-WARLOCK-ELDRITCH-INVOCATIONS - Warlock Eldritch Invocations Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `warlock_eldritch_invocations` after Loop C
lands invocation lifecycle support. Cover level-1 selection, later-level gains,
replacement, prerequisite-retention lockout, and duplicate-selection rejection
only to the extent C promoted them.

RAW: `.references/srd-5.2.1/Classes/Warlock.md` Eldritch Invocations.

### Task 12 - L1G-FIGHTER-WEAPON-MASTERY-CONTAINER - Fighter Weapon Mastery Container Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `fighter_weapon_mastery`, proving initial
three-weapon selection and Long Rest one-choice reselection at the container
boundary. Selected mastery-property execution remains child Unit owned.

RAW: `.references/srd-5.2.1/Classes/Fighter.md` Weapon Mastery.

### Task 13 - L1G-BARBARIAN-WEAPON-MASTERY-CONTAINER - Barbarian Weapon Mastery Container Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `barbarian_weapon_mastery`, proving initial
selection and Long Rest reselection using the Barbarian eligible weapon profile.

RAW: `.references/srd-5.2.1/Classes/Barbarian.md` Weapon Mastery.

### Task 14 - L1G-PALADIN-RANGER-ROGUE-WEAPON-MASTERY-CONTAINERS - Paladin Ranger Rogue Weapon Mastery Container Selected Identity Replay

Status: `ready-for-implementation-after-light-research`

Add selected identity evidence for `paladin_weapon_mastery`,
`ranger_weapon_mastery`, and `rogue_weapon_mastery`. Keep each container's
choice count and eligible weapon facts distinct; do not reuse Fighter constants
by assumption.

RAW: `.references/srd-5.2.1/Classes/Paladin.md`,
`.references/srd-5.2.1/Classes/Ranger.md`, and
`.references/srd-5.2.1/Classes/Rogue.md` Weapon Mastery.
