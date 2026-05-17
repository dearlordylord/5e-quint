# Level 1 Ralph Loop C - Character Runtime Support

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1C-AT03S",
      "status": "done",
      "title": "Character Creation Support Scaffold"
    },
    {
      "number": 2,
      "id": "L1C-AT03",
      "status": "done",
      "title": "Fighter Fighting Style Character Profile"
    },
    {
      "number": 3,
      "id": "L1C-AT05",
      "status": "done",
      "title": "Warlock Eldritch Invocations Character Profile"
    },
    {
      "number": 4,
      "id": "L1C-AT06",
      "status": "done",
      "title": "Cleric And Druid Order Character Profiles"
    },
    {
      "number": 5,
      "id": "L1C-AT07",
      "status": "done",
      "title": "Rogue Expertise Character Profile"
    },
    {
      "number": 16,
      "id": "L1C-ROGUE-EXPERTISE-LEVEL-6-GRANT",
      "status": "done",
      "title": "Rogue Expertise Level 6 Grant"
    },
    {
      "number": 6,
      "id": "L1C-AT08",
      "status": "done",
      "title": "Wizard Arcane Recovery Character Sheet Profile"
    },
    {
      "number": 7,
      "id": "L1C-AT04",
      "status": "done",
      "title": "Weapon Mastery Character And Rest Profile"
    },
    {
      "number": 8,
      "id": "L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT",
      "status": "done",
      "title": "Fighter Fighting Style Advancement Replacement"
    },
    {
      "number": 17,
      "id": "L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE",
      "status": "done",
      "title": "Character Advancement Replacement Lifecycle"
    },
    {
      "number": 9,
      "id": "L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE",
      "status": "done",
      "title": "Warlock Eldritch Invocation Lifecycle"
    },
    {
      "number": 18,
      "id": "L1C-WARLOCK-PACT-MAGIC-ADVANCEMENT",
      "status": "ready-for-research",
      "title": "Warlock Pact Magic Advancement"
    },
    {
      "number": 10,
      "id": "L1C-L1X-01",
      "status": "ready-for-research",
      "title": "Create Or Destroy Water No-Matrix Decision"
    },
    {
      "number": 11,
      "id": "L1C-L1X-05",
      "status": "ready-for-research",
      "title": "Floating Disk No-Matrix Decision"
    },
    {
      "number": 12,
      "id": "L1C-L1X-06",
      "status": "ready-for-research",
      "title": "Goodberry No-Matrix Decision"
    },
    {
      "number": 13,
      "id": "L1C-L1X-08",
      "status": "ready-for-research",
      "title": "Mage Hand No-Matrix Decision"
    },
    {
      "number": 14,
      "id": "L1C-L1X-09",
      "status": "ready-for-research",
      "title": "Mending No-Matrix Decision"
    },
    {
      "number": 15,
      "id": "L1C-L1X-12",
      "status": "ready-for-research",
      "title": "Purify Food And Drink No-Matrix Decision"
    }
  ]
}
-->

Umbrella source plan: `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

This loop owns Character Creation and Character Sheet support accounting for the
strict level-1 frontier. It starts after Loop A lands `AT-L1-13`. Internally,
`AT-L1-03S` must land before the Unit-specific Character Creation tasks.

Separate active lane: selected identity MBT. Master currently includes committed
selected-MBT evidence for `mastery_cleave`, `mastery_sap`, and `mastery_topple`.
Those are selected mastery-property Unit identities, not the class Weapon
Mastery container Units owned by `AT-L1-04`.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Owned Tasks

| Task | Unit ids | Ownership |
| --- | --- | --- |
| `AT-L1-03S` Character Creation support scaffold | shared scaffold only | shared Character Creation profile ids, owner markers, runtime-test markers, task claims |
| `AT-L1-03` Fighter Fighting Style profile | `fighter_fighting_style` | level-1 Fighting Style choice evidence; all-level lifecycle guard |
| `L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT` Fighter Fighting Style advancement replacement | `fighter_fighting_style` | evidence that Fighter-level replacement needs a shared advancement/replacement boundary before all-level support |
| `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE` Character advancement replacement lifecycle | shared Character Creation advancement boundary, `fighter_fighting_style` | supported replacement of an already chosen class-feature option when a class level is gained, without duplicate selected-option state |
| `AT-L1-04` Weapon Mastery character/rest profile | `barbarian_weapon_mastery`, `fighter_weapon_mastery`, `paladin_weapon_mastery`, `ranger_weapon_mastery`, `rogue_weapon_mastery` | initial choice plus Long Rest reselection support |
| `AT-L1-05` Warlock Eldritch Invocations profile | `warlock_eldritch_invocations` | level-1 invocation choice evidence; all-level lifecycle guard |
| `L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE` Warlock Eldritch Invocation lifecycle | `warlock_eldritch_invocations` | later-level invocation gains, Warlock-level replacement, prerequisite-retention lockout, and duplicate-selection enforcement |
| `L1C-WARLOCK-PACT-MAGIC-ADVANCEMENT` Warlock Pact Magic advancement | `class_warlock`, `warlock_eldritch_invocations` prerequisite facts | Warlock cantrip, prepared-spell, and Pact Slot CharacterBuild facts across Warlock level gains so invocation prerequisite checks consume fresh Pact Magic facts |
| `AT-L1-06` Cleric/Druid order profile | `cleric_divine_order`, `druid_primal_order` | Divine/Primal Order option projection |
| `AT-L1-07` Rogue Expertise profile | `rogue_expertise` | level-1 two-skill Expertise choice evidence; level 6 lifecycle guard |
| `L1C-ROGUE-EXPERTISE-LEVEL-6-GRANT` Rogue Expertise level 6 grant | `rogue_expertise` | later-level additional two-skill Expertise choice |
| `AT-L1-08` Wizard Arcane Recovery profile | `wizard_arcane_recovery` | Character Sheet Short Rest Spell Slot recovery profile |
| `AT-L1X-01`, `AT-L1X-05`, `AT-L1X-06`, `AT-L1X-08`, `AT-L1X-09`, `AT-L1X-12` item/environment no-matrix decisions | missing spell pressures | owner decisions for item, inventory, object-control, equipment, and environment candidates |

## Internal Order

1. Implement `AT-L1-03S`.
2. Then implement `AT-L1-03`, `AT-L1-05`, `AT-L1-06`, and `AT-L1-07`.
3. Implement `AT-L1-08` at any point after Loop A `AT-L1-13`.
4. Implement `AT-L1-04` after `AT-L1-03S`; include or cite Character Sheet/rest
   support for Long Rest weapon-choice reselection before promoting Weapon
   Mastery containers.
5. `L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT` is complete: the current
   creation fill workflow does not own replacement of finalized choices when a
   class level is gained.
6. `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE` is complete: Character
   Creation owns the shared post-finalization class-level gain boundary needed
   to promote `fighter_fighting_style` to all-level support.
7. `L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE` is complete for invocation
   gain/replacement/duplicate/prerequisite-retention mechanics. Keep
   `warlock_eldritch_invocations` at subset support until
   `L1C-WARLOCK-PACT-MAGIC-ADVANCEMENT` owns fresh Pact Magic build facts across
   Warlock level gains.
8. Implement `L1C-ROGUE-EXPERTISE-LEVEL-6-GRANT` after `AT-L1-07` when
   promoting `rogue_expertise` from the level-1 subset to all-level support.

## Scope

For `AT-L1-03S`:

- add or reuse these profile ids:
  - `character-creation.class-feature-feat-choice`
  - `character-creation.weapon-mastery-choice`
  - `character-creation.eldritch-invocation-choice`
  - `character-creation.class-feature-option-projection`
  - `character-creation.skill-expertise-choice`
- add Character Creation runtime/test owner markers if absent;
- add shared completed-runtime-parity task claims;
- do not edit individual Unit claims in the scaffold task.

For Unit-specific Character Creation tasks:

- reuse the scaffold profile ids;
- add deterministic Unit identity evidence;
- convert all-level Unit claims to `supported-profile` only when every RAW
  lifecycle mechanic is owned;
- otherwise keep the all-level claim `profile-subset-supported` and let the
  strict level-1 report close only the level-1 slice.

Lifecycle gates:

- `fighter_fighting_style` all-level support is closed by
  `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE`: Character Creation owns
  Fighter-level replacement of the finalized selected Fighting Style feat ref
  without adding a second selected-option store.
- Weapon Mastery containers need initial choice and Long Rest reselection support
  before all-level support.
- The existing selected identity MBT evidence for `mastery_cleave`,
  `mastery_sap`, and `mastery_topple` may be cited as child mastery-property
  execution evidence, but it does not satisfy the container Long Rest
  reselection gate and should not be recreated here.
- `warlock_eldritch_invocations` now owns replacement/gain, duplicate-selection,
  repeatable-selection identity, and prerequisite-retention behavior over
  existing CharacterBuild facts. It still needs
  `L1C-WARLOCK-PACT-MAGIC-ADVANCEMENT` before all-level support because Pact
  Magic cantrips, prepared spells, and pact slots must advance as explicit
  CharacterBuild facts rather than being inferred from class tables.

For `AT-L1-08`:

- add `character-sheet.short-rest-spell-slot-recovery`;
- add Character Sheet runtime/test owner markers;
- convert `wizard_arcane_recovery` to `supported-profile`;
- add deterministic identity evidence;
- do not add Pact Slot recovery under Arcane Recovery.

## Primary Files

- `plans/unit-profile-coverage/profiles.jsonl`
- `plans/unit-profile-coverage/task-claims.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/character-creation-runtime/src/index.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- `packages/character-sheet-runtime/src/index.ts`
- `packages/character-sheet-runtime/src/index.test.ts`

## Coordination Rules

- Own only the Unit ids listed in this file.
- Generated coverage artifacts are Loop A owned. This loop may run
  `pnpm unit-profile-coverage:check --write` for verification, but should not
  commit generated report refreshes unless Loop A explicitly asks for them.
- Preserve existing `selected-identity-mbt` evidence rows when editing
  `unit-evidence.jsonl`. Do not turn this character-runtime loop into a selected
  identity MBT batch.
- Do not add battle-runtime reducer work.
- Do not duplicate selected-option state already represented in CharacterBuild,
  Character Creation selections, or Character Sheet projection.
- Keep selected feats, mastery Units, invocation options, and sheet projections
  as owners of child executable behavior.

## Verification

- Read cited local RAW and `UBIQUITOUS_LANGUAGE.md` before changing
  claim/profile text.
- Run `pnpm unit-profile-coverage:check --write`.
- Run `pnpm unit-profile-coverage:check`.
- Run `pnpm --filter @dnd/character-creation-runtime test` if Character Creation
  runtime/test marker files are touched beyond comments.
- Run `pnpm --filter @dnd/character-sheet-runtime test` if Character Sheet
  runtime/test marker files are touched beyond comments.
- Run reviewer loop to convergence, minimum two rounds.
- Do not run MBT unless promoted battle behavior unexpectedly changes; selected
  identity MBT work remains in the separate selected-MBT lane.

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L1C-AT03S - Character Creation Support Scaffold | done | none | Shared profiles/markers only; no Unit claim conversion. |
| 2 | L1C-AT03 - Fighter Fighting Style Character Profile | done | L1C-AT03S | Level-1 slice with advancement lifecycle guard. |
| 3 | L1C-AT05 - Warlock Eldritch Invocations Character Profile | done | L1C-AT03S | Level-1 slice with invocation lifecycle guard. |
| 4 | L1C-AT06 - Cleric And Druid Order Character Profiles | done | L1C-AT03S | Divine/Primal Order projection. |
| 5 | L1C-AT07 - Rogue Expertise Character Profile | done | L1C-AT03S | Level-1 slice with level 6 Expertise guard. |
| 16 | L1C-ROGUE-EXPERTISE-LEVEL-6-GRANT - Rogue Expertise Level 6 Grant | done | L1C-AT07 | Production Rogue 6 admission and deterministic evidence promoted `rogue_expertise` to all-level support. |
| 6 | L1C-AT08 - Wizard Arcane Recovery Character Sheet Profile | done | none | Character Sheet Short Rest Spell Slot recovery. |
| 7 | L1C-AT04 - Weapon Mastery Character And Rest Profile | done | L1C-AT03S | Includes Long Rest reselection support; selected mastery-property MBT does not satisfy this gate. |
| 8 | L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT - Fighter Fighting Style Advancement Replacement | done | L1C-AT03 | Retargeted remaining all-level work to `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE`. |
| 17 | L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE - Character Advancement Replacement Lifecycle | done | L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT | Shared CharacterBuild class-level gain boundary promoted `fighter_fighting_style` to all-level support. |
| 9 | L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE - Warlock Eldritch Invocation Lifecycle | done | L1C-AT05 | Invocation gain, replacement, repeatable-selection identity, duplicate-selection enforcement, and prerequisite-retention are owned over existing CharacterBuild facts. |
| 18 | L1C-WARLOCK-PACT-MAGIC-ADVANCEMENT - Warlock Pact Magic Advancement | ready-for-research | L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE | Advance Warlock cantrip, prepared-spell, and Pact Slot CharacterBuild facts on later Warlock levels before `warlock_eldritch_invocations` can claim full all-level prerequisite ownership. |
| 10 | L1C-L1X-01 - Create Or Destroy Water No-Matrix Decision | ready-for-research | none | Decide environment/fog owner; no Unit claim without admitted UnitRecord. |
| 11 | L1C-L1X-05 - Floating Disk No-Matrix Decision | ready-for-research | none | Decide object/inventory movement owner. |
| 12 | L1C-L1X-06 - Goodberry No-Matrix Decision | ready-for-research | none | Decide Character Sheet consumable/inventory owner. |
| 13 | L1C-L1X-08 - Mage Hand No-Matrix Decision | ready-for-research | none | Decide object-control owner. |
| 14 | L1C-L1X-09 - Mending No-Matrix Decision | ready-for-research | none | Decide equipment/object repair owner. |
| 15 | L1C-L1X-12 - Purify Food And Drink No-Matrix Decision | ready-for-research | none | Decide item/inventory purification owner. |

## Task Details

### Task 1 - L1C-AT03S - Character Creation Support Scaffold

Status: `done`

Implement `AT-L1-03S` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Add or reuse:
  - `character-creation.class-feature-feat-choice`
  - `character-creation.weapon-mastery-choice`
  - `character-creation.eldritch-invocation-choice`
  - `character-creation.class-feature-option-projection`
  - `character-creation.skill-expertise-choice`
- Add Character Creation runtime/test owner markers if absent.
- Add shared completed-runtime-parity task claims.
- Do not edit individual Unit claims in this scaffold task.

Verification:

- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- reviewer loop convergence, minimum two rounds

Plan Impact:

- If a shared profile id is wrong or duplicative, update this plan before moving
  Unit-specific tasks forward.

### Task 2 - L1C-AT03 - Fighter Fighting Style Character Profile

Status: `done`

Implement `AT-L1-03` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `fighter_fighting_style`.
- Reuse `character-creation.class-feature-feat-choice` from Task 1.
- Evidence the level-1 Fighting Style choice/finalization boundary.
- Convert to all-level `supported-profile` only if advancement/replacement
  ownership is also evidenced.
- Otherwise keep the all-level claim `profile-subset-supported` and make the
  strict level-1 report close only the level-1 character-creation slice.
- Add deterministic identity evidence.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Preserve any unowned advancement replacement work as a concrete follow-up.

### Task 8 - L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT - Fighter Fighting Style Advancement Replacement

Status: `done`

Implement the `fighter_fighting_style` follow-up left by Task 2.

Scope:

- Own only `fighter_fighting_style`.
- Preserve the level-1 `character-creation.class-feature-feat-choice` evidence
  from `L1C-AT03`.
- Read `.references/srd-5.2.1/Classes/Fighter.md` Level 1 Fighting Style and
  `UBIQUITOUS_LANGUAGE.md` before changing claim/profile text.
- Evidence or implement replacement of the already chosen Fighting Style feat
  whenever the character gains a Fighter level.
- Keep selected Fighting Style feat execution owned by selected feat Unit
  profiles; do not move feat execution under the `fighter_fighting_style`
  container.
- Convert `fighter_fighting_style` from `profile-subset-supported` to
  `supported-profile` only when the advancement replacement lifecycle is owned.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if Character Creation
  runtime/test marker files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Remaining all-level replacement work is executable as
  `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE`.

### Task 3 - L1C-AT05 - Warlock Eldritch Invocations Character Profile

Status: `done`

Implement `AT-L1-05` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `warlock_eldritch_invocations`.
- Reuse `character-creation.eldritch-invocation-choice` from Task 1.
- Evidence the level-1 invocation choice and prerequisite-gating boundary.
- Convert to all-level `supported-profile` only if replacement/gain and
  prerequisite-retention lifecycle support is also evidenced.
- Otherwise keep the all-level claim `profile-subset-supported` and make the
  strict level-1 report close only the level-1 character-creation slice.
- Keep individual invocation execution owned by selected invocation profiles.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Preserve unowned invocation lifecycle work as concrete follow-up tasks.

### Task 4 - L1C-AT06 - Cleric And Druid Order Character Profiles

Status: `done`

Implement `AT-L1-06` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `cleric_divine_order` and `druid_primal_order`.
- Reuse `character-creation.class-feature-option-projection` from Task 1.
- Convert both order Units to `supported-profile`.
- Add deterministic identity evidence for both.
- Preserve build projection as the runtime-owned output.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Add follow-up tasks only for newly discovered durable lifecycle gaps.

### Task 5 - L1C-AT07 - Rogue Expertise Character Profile

Status: `done`

Implement `AT-L1-07` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `rogue_expertise`.
- Reuse `character-creation.skill-expertise-choice` from Task 1.
- Evidence the level-1 two-skill Expertise choice boundary.
- Convert to all-level `supported-profile` only if the Rogue level 6 additional
  Expertise grant is also owned/evidenced.
- Otherwise keep the all-level claim `profile-subset-supported` and make the
  strict level-1 report close only the initial two-skill Expertise slice.
- Add deterministic identity evidence.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Level 6 Expertise follow-up is closed by completed Task 16.

### Task 16 - L1C-ROGUE-EXPERTISE-LEVEL-6-GRANT - Rogue Expertise Level 6 Grant

Status: `done`

Implement the residual all-level Rogue Expertise grant left by Task 5.

Scope:

- Own only `rogue_expertise`.
- Preserve the level-1 `character-creation.skill-expertise-choice` evidence
  from `L1C-AT07`.
- Read `.references/srd-5.2.1/Classes/Rogue.md` Level 1 Expertise and
  `UBIQUITOUS_LANGUAGE.md` before changing claim/profile text.
- Evidence or implement the Rogue level 6 additional Expertise grant of two
  more skill proficiencies of the player's choice.
- Convert `rogue_expertise` from `profile-subset-supported` to all-level
  `supported-profile` only after the level 6 grant is owned without duplicating
  existing CharacterBuild proficiency state.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Close this task only when all-level Rogue Expertise support has runtime/test
  owner evidence, not from the level-1 choice evidence alone.

### Task 6 - L1C-AT08 - Wizard Arcane Recovery Character Sheet Profile

Status: `done`

Implement `AT-L1-08` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `wizard_arcane_recovery`.
- Add `character-sheet.short-rest-spell-slot-recovery`.
- Add Character Sheet runtime/test owner markers.
- Convert `wizard_arcane_recovery` to `supported-profile`.
- Add deterministic identity evidence.
- Do not add Pact Slot recovery under Arcane Recovery.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-sheet-runtime test` if runtime/test marker files
  are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Add follow-up tasks only for newly discovered durable Character Sheet gaps.

### Task 7 - L1C-AT04 - Weapon Mastery Character And Rest Profile

Status: `done`

Implement `AT-L1-04` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Own only `fighter_weapon_mastery`, `barbarian_weapon_mastery`,
  `paladin_weapon_mastery`, `ranger_weapon_mastery`, and
  `rogue_weapon_mastery`.
- Reuse `character-creation.weapon-mastery-choice` from Task 1.
- Add or cite Character Sheet/rest support for Long Rest weapon-choice
  reselection.
- Convert all five Weapon Mastery container Units to `supported-profile` only
  after both initial choice and Long Rest reselection are evidenced.
- Existing selected identity MBT evidence for `mastery_cleave`, `mastery_sap`,
  and `mastery_topple` may be cited as child mastery-property execution
  evidence, but it does not satisfy this container support gate.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-sheet-runtime test` if Character Sheet
  runtime/test marker files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Preserve unowned Long Rest reselection work as a concrete follow-up if the
  task cannot close it.

### Task 8 - L1C-FIGHTING-STYLE-ADVANCEMENT-REPLACEMENT - Fighter Fighting Style Advancement Replacement

Status: `done`

Implement the all-level Fighter Fighting Style lifecycle follow-up produced by
`L1C-AT03`.

Scope:

- Own only `fighter_fighting_style`.
- Read the local Fighter RAW for Fighting Style and advancement replacement.
- Model or evidence Fighter-level replacement of an already chosen Fighting
  Style feat when gaining Fighter levels.
- Promote `fighter_fighting_style` to all-level `supported-profile` only if the
  replacement lifecycle is owned without duplicating existing CharacterBuild
  choice state.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test files are
  touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- The broader advancement/replacement subsystem is captured as
  `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE`.

### Task 17 - L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE - Character Advancement Replacement Lifecycle

Status: `done`

Research and implement the shared advancement/replacement boundary needed for
class features that replace already finalized choices when a class level is
gained.

Scope:

- Own the shared advancement/replacement boundary and the
  `fighter_fighting_style` replacement lifecycle for this loop.
- Read `.references/srd-5.2.1/Classes/Fighter.md` Level 1 Fighting Style and
  `UBIQUITOUS_LANGUAGE.md` before changing claim/profile text.
- Model an executable operation that replaces the selected CharacterBuild
  feature ref for `fighter_fighting_style` when a Fighter level is gained,
  without adding parallel selected-option state.
- Make invalid replacement states unrepresentable: no replacement without a
  Fighter-level gain boundary, no duplicate Fighting Style selection state, and
  no selected feat outside the Fighting Style feat options.
- Keep selected Fighting Style feat execution owned by the selected feat Unit
  profiles.
- Convert `fighter_fighting_style` from `profile-subset-supported` to
  `supported-profile` only when the advancement replacement lifecycle has
  runtime/test owner evidence.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if Character Creation
  runtime/test files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- If research proves Character Sheet, not Character Creation, must own the
  operation boundary, revise the DAG/source details before implementation.

### Task 9 - L1C-WARLOCK-ELDRITCH-INVOCATION-LIFECYCLE - Warlock Eldritch Invocation Lifecycle

Status: `done`

Implement the residual all-level lifecycle mechanics for
`warlock_eldritch_invocations`.

Scope:

- Own only `warlock_eldritch_invocations`.
- Reuse `character-creation.eldritch-invocation-choice` from Task 1.
- Evidence later-level invocation gains from the Warlock Invocations column.
- Evidence Warlock-level invocation replacement with prerequisite gating.
- Reuse the shared CharacterBuild class-level gain boundary from
  `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE`; do not add separate
  selected invocation state.
- Evidence the prerequisite-retention lockout: an invocation cannot be replaced
  while another selected invocation has it as a prerequisite.
- Evidence duplicate-selection enforcement unless an invocation description says
  otherwise.
- Convert `warlock_eldritch_invocations` from `profile-subset-supported` to
  all-level `supported-profile` only after the full lifecycle is owned.
- Keep individual invocation execution owned by selected invocation profiles.

Verification:

- Read `.references/srd-5.2.1/Classes/Warlock.md` and
  `UBIQUITOUS_LANGUAGE.md` before changing modeled behavior.
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if runtime/test marker
  files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Result:

- Character Creation now owns later-level invocation gains, Warlock-level
  invocation replacement, duplicate selection checks, repeatable invocation
  selection identity, prerequisite checks against existing build facts, and
  prerequisite-retention replacement lockout.
- `warlock_eldritch_invocations` remains `profile-subset-supported` rather than
  all-level `supported-profile` because Pact Magic advancement facts are
  deliberately left to Task 18.
- reviewer loop convergence was attempted repeatedly but is blocked by Claude Code
  org access in this environment; code review found no actionable code findings.

Plan Impact:

- Task 18 owns the remaining Pact Magic advancement boundary before all-level
  Warlock invocation support can be claimed.

### Task 18 - L1C-WARLOCK-PACT-MAGIC-ADVANCEMENT - Warlock Pact Magic Advancement

Status: `ready-for-research`

Research and implement the Warlock Pact Magic CharacterBuild advancement facts
that Task 9 deliberately does not own.

Scope:

- Own Warlock Pact Magic facts consumed by Character Creation advancement:
  Warlock cantrips known, prepared spells, Pact Magic slot level/count, and
  Warlock-level replacement choices for cantrips and prepared spells.
- Read `.references/srd-5.2.1/Classes/Warlock.md` Level 1 Pact Magic and
  `UBIQUITOUS_LANGUAGE.md` before changing modeled behavior.
- Reuse the shared CharacterBuild class-level gain boundary from
  `L1C-CHARACTER-ADVANCEMENT-REPLACEMENT-LIFECYCLE`; do not add parallel
  spellcasting state.
- Ensure `warlock_eldritch_invocations` prerequisite checks consume fresh
  CharacterBuild Warlock cantrip facts after Warlock levels that change known
  cantrips.
- Do not move individual spell execution or selected invocation execution under
  the Warlock class container.

Verification:

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/character-creation-runtime test` if Character Creation
  runtime/test files are touched beyond comments
- reviewer loop convergence, minimum two rounds

Plan Impact:

- Convert `warlock_eldritch_invocations` from `profile-subset-supported` to
  all-level `supported-profile` only if Pact Magic advancement facts and Task 9
  invocation lifecycle facts are both owned.

### Task 10 - L1C-L1X-01 - Create Or Destroy Water No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-01` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `create_or_destroy_water`.
- Read local SRD Create or Destroy Water text.
- Decide between future environment subsystem, table-supplied runtime witness if
  fog removal touches runtime Fog Cloud state, or runtime-detached table
  adjudication.
- Write
  `plans/unit-profile-coverage/frontier-decisions/create_or_destroy_water.md`.
- Do not add claims/profiles without first proposing an admitted UnitRecord
  path.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add implementation follow-ups only for a selected owner.

### Task 11 - L1C-L1X-05 - Floating Disk No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-05` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `floating_disk`.
- Read local SRD Floating Disk text.
- Decide between future object/inventory movement subsystem and
  runtime-detached table adjudication.
- Write `plans/unit-profile-coverage/frontier-decisions/floating_disk.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- No claim/profile changes unless a real owner and UnitRecord path are proposed.

### Task 12 - L1C-L1X-06 - Goodberry No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-06` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `goodberry`.
- Read local SRD Goodberry text.
- Decide whether `@dnd/character-sheet-runtime` owns berry inventory,
  consumable healing, nourishment, and expiry, or whether the current product
  treats it as owner-decision/out-of-scope.
- Write `plans/unit-profile-coverage/frontier-decisions/goodberry.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Produce Character Sheet follow-up tasks only if consumable inventory is in
  scope.

### Task 13 - L1C-L1X-08 - Mage Hand No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-08` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `mage_hand`.
- Read local SRD Mage Hand text.
- Decide between future object-control subsystem and runtime-detached table
  adjudication for manipulation, movement, carry limit, and prohibited actions.
- Write `plans/unit-profile-coverage/frontier-decisions/mage_hand.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add owner tasks only for concrete object-control support.

### Task 14 - L1C-L1X-09 - Mending No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-09` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `mending`.
- Read local SRD Mending text.
- Decide between future equipment/object subsystem and runtime-detached table
  adjudication for physical repair and magic-item non-restoration.
- Write `plans/unit-profile-coverage/frontier-decisions/mending.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Add future-owner task recommendations only for concrete object/equipment
  support.

### Task 15 - L1C-L1X-12 - Purify Food And Drink No-Matrix Decision

Status: `ready-for-research`

Research `AT-L1X-12` from `plans/LEVEL1_FULL_SUPPORT_FRONTIER.md`.

Scope:

- Unit pressure id: `purify_food_and_drink`.
- Read local SRD Purify Food and Drink text.
- Decide between future item/inventory subsystem and runtime-detached table
  adjudication for nonmagical food/drink poison and rot removal.
- Write
  `plans/unit-profile-coverage/frontier-decisions/purify_food_and_drink.md`.

Verification:

- `pnpm unit-profile-coverage:check` if coverage files are edited.

Plan Impact:

- Do not add claims/profiles until an admitted UnitRecord and package owner are
  selected.
