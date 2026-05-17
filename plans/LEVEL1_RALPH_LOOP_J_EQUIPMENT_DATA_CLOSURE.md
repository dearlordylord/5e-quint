# Level 1 Ralph Loop J - Equipment Data Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L1J-PRECHECK",
      "status": "done",
      "title": "Non-D Equipment Data Precheck"
    },
    {
      "number": 2,
      "id": "L1J-LIGHT-MEDIUM-ARMOR-DATA",
      "status": "done",
      "title": "Light Medium Armor Non Runtime Data Closure"
    },
    {
      "number": 3,
      "id": "L1J-HEAVY-ARMOR-DATA",
      "status": "ready-for-research",
      "title": "Heavy Armor Non Runtime Data Closure"
    },
    {
      "number": 4,
      "id": "L1J-SIMPLE-MELEE-WEAPON-DATA",
      "status": "ready-for-research",
      "title": "Simple Melee Weapon Non Runtime Data Closure"
    },
    {
      "number": 5,
      "id": "L1J-MARTIAL-MELEE-WEAPON-DATA",
      "status": "ready-for-research",
      "title": "Martial Melee Weapon Non Runtime Data Closure"
    },
    {
      "number": 6,
      "id": "L1J-POLEARM-REACH-WEAPON-DATA",
      "status": "ready-for-research",
      "title": "Polearm Reach Weapon Non Runtime Data Closure"
    },
    {
      "number": 7,
      "id": "L1J-RANGED-WEAPON-DATA",
      "status": "ready-for-research",
      "title": "Ranged Weapon Non Runtime Data Closure"
    },
    {
      "number": 8,
      "id": "L1J-THROWN-FINESSE-WEAPON-DATA",
      "status": "ready-for-research",
      "title": "Thrown Finesse Weapon Non Runtime Data Closure"
    },
    {
      "number": 9,
      "id": "L1J-FIREARM-EXOTIC-WEAPON-DATA",
      "status": "ready-for-research",
      "title": "Firearm Exotic Weapon Non Runtime Data Closure"
    },
    {
      "number": 10,
      "id": "L1J-INSTALLED-EQUIPMENT-ROW-ALIGNMENT",
      "status": "ready-for-research",
      "title": "Installed Equipment Row Alignment"
    }
  ]
}
-->

This loop owns non-runtime equipment and weapon data closure for authored SRD
armor/weapon records that are not promoted Unit execution profiles. It must not
implement inventory simulation, attack resolution, armor-wearing workflows, or
Weapon Mastery container behavior. D owns Weapon Mastery selected identity and
container accounting.

Companion/familiar work is out of scope.

## Worktree Safety Prefix

Every Ralph prompt for this loop must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`. You are not alone in the codebase:
> do not revert edits made by others, and adapt your implementation around
> existing changes. Do not edit `plans/ACTIVE_PLAN.md`.

## Review Loop

Use implementer, reviewer, handback until `accept`, then decider. Reviewers
should reject any broad runtime/inventory implementation. The intended output is
explicit closure/accounting for non-runtime authored data.

## Owned Surface

Primary write scope:

- `plans/unit-profile-coverage/*EQUIPMENT_DATA*` decision artifacts;
- generated coverage artifacts under `plans/unit-profile-coverage/`;
- `scripts/unit-profile-coverage-check.cjs` or its helper modules only if the
  generated report needs a small classifier fix for non-runtime equipment data;
- no battle reducer or character runtime behavior unless a task explicitly
  proves a narrow existing owner is missing.

Avoid D plan files, D-selected identity files, and Weapon Mastery runtime
behavior.

## Verification

Every task runs:

- `pnpm unit-profile-coverage:check --write`;
- `pnpm unit-profile-coverage:check`;
- `git diff --check`;
- focused tests only if checker code changes;
- reviewer loop convergence.

## Task Table

| Order | Task | Status | Blocks On | Output |
| ---: | --- | --- | --- | --- |
| 1 | L1J-PRECHECK - Non-D Equipment Data Precheck | done | none | decision artifact with exact non-runtime armor/weapon/Shield ownership, excluding D-owned mastery work |
| 2 | L1J-LIGHT-MEDIUM-ARMOR-DATA - Light Medium Armor Non Runtime Data Closure | done | 1 | explicit closure for light/medium armor authored records |
| 3 | L1J-HEAVY-ARMOR-DATA - Heavy Armor Non Runtime Data Closure | ready-for-research | 1 | explicit closure for heavy armor authored records |
| 4 | L1J-SIMPLE-MELEE-WEAPON-DATA - Simple Melee Weapon Non Runtime Data Closure | ready-for-research | 1 | explicit closure for simple melee authored records |
| 5 | L1J-MARTIAL-MELEE-WEAPON-DATA - Martial Melee Weapon Non Runtime Data Closure | ready-for-research | 1 | explicit closure for martial melee authored records |
| 6 | L1J-POLEARM-REACH-WEAPON-DATA - Polearm Reach Weapon Non Runtime Data Closure | ready-for-research | 1 | explicit closure for polearm/reach authored records |
| 7 | L1J-RANGED-WEAPON-DATA - Ranged Weapon Non Runtime Data Closure | ready-for-research | 1 | explicit closure for ranged authored records |
| 8 | L1J-THROWN-FINESSE-WEAPON-DATA - Thrown Finesse Weapon Non Runtime Data Closure | ready-for-research | 1 | explicit closure for thrown/finesse authored records |
| 9 | L1J-FIREARM-EXOTIC-WEAPON-DATA - Firearm Exotic Weapon Non Runtime Data Closure | ready-for-research | 1 | explicit closure for firearm/exotic authored records |
| 10 | L1J-INSTALLED-EQUIPMENT-ROW-ALIGNMENT - Installed Equipment Row Alignment | ready-for-research | 1 | align existing installed equipment/weapon unsupported rows with the same closure language |

### Task 1 - L1J-PRECHECK - Non-D Equipment Data Precheck

Status: `done`

Read `UNIT_REPORT.md`, `srd-unit-inventory.json`, authored Surface equipment
records, and existing weapon/armor Unit claims. Produce a decision artifact that
states the exact rows this loop owns and confirms D-owned Weapon Mastery
selected identity/container work is excluded.

Decision artifact:
`plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`.

### Task 2 - L1J-LIGHT-MEDIUM-ARMOR-DATA - Light Medium Armor Non Runtime Data Closure

Status: `done`

Units include `armor_breastplate`, `armor_chain_shirt`,
`armor_half_plate_armor`, `armor_hide_armor`, `armor_leather`,
`armor_padded_armor`, `armor_scale_mail`, and
`armor_studded_leather_armor`.

Close these as authored equipment facts unless a current generated report needs
better classifier support.

Decision artifact:
`plans/unit-profile-coverage/L1J_LIGHT_MEDIUM_ARMOR_DATA_CLOSURE.md`.

### Task 3 - L1J-HEAVY-ARMOR-DATA - Heavy Armor Non Runtime Data Closure

Status: `ready-for-research`

Units include `armor_plate`, `armor_ring_mail`, and `armor_splint_armor`.

Keep this as equipment-data closure, not armor-equipping runtime.

### Task 4 - L1J-SIMPLE-MELEE-WEAPON-DATA - Simple Melee Weapon Non Runtime Data Closure

Status: `ready-for-research`

Units include `weapon_greatclub`, `weapon_handaxe`, `weapon_light_hammer`,
`weapon_mace`, and `weapon_sickle`.

Do not implement attack mechanics; attacks consume weapon facts elsewhere.

### Task 5 - L1J-MARTIAL-MELEE-WEAPON-DATA - Martial Melee Weapon Non Runtime Data Closure

Status: `ready-for-research`

Units include `weapon_battleaxe`, `weapon_greatsword`, `weapon_maul`,
`weapon_morningstar`, `weapon_rapier`, `weapon_scimitar`, `weapon_war_pick`,
and `weapon_warhammer`.

### Task 6 - L1J-POLEARM-REACH-WEAPON-DATA - Polearm Reach Weapon Non Runtime Data Closure

Status: `ready-for-research`

Units include `weapon_glaive`, `weapon_halberd`, `weapon_lance`,
`weapon_pike`, `weapon_trident`, and `weapon_whip`.

Do not implement reach or mastery behavior in this loop.

### Task 7 - L1J-RANGED-WEAPON-DATA - Ranged Weapon Non Runtime Data Closure

Status: `ready-for-research`

Units include `weapon_blowgun`, `weapon_hand_crossbow`,
`weapon_heavy_crossbow`, `weapon_light_crossbow`, `weapon_longbow`,
and `weapon_sling`.

Installed `weapon_shortbow` belongs to Task 10.

### Task 8 - L1J-THROWN-FINESSE-WEAPON-DATA - Thrown Finesse Weapon Non Runtime Data Closure

Status: `ready-for-research`

Units include `weapon_dart` and `weapon_javelin`.

Installed thrown/finesse rows such as `weapon_dagger` and `weapon_spear` belong
to Task 10.

### Task 9 - L1J-FIREARM-EXOTIC-WEAPON-DATA - Firearm Exotic Weapon Non Runtime Data Closure

Status: `ready-for-research`

Units include `weapon_musket` and `weapon_pistol`.

Do not introduce firearm combat behavior; close only authored data/catalog
pressure.

### Task 10 - L1J-INSTALLED-EQUIPMENT-ROW-ALIGNMENT - Installed Equipment Row Alignment

Status: `ready-for-research`

Align existing installed unsupported rows `armor_chain_mail`,
`equipment_shield`, `weapon_club`, `weapon_dagger`, `weapon_flail`,
`weapon_greataxe`, `weapon_longsword`, `weapon_quarterstaff`,
`weapon_shortbow`, `weapon_shortsword`, and `weapon_spear` with the same
non-runtime authored-data wording if the generated report still presents them as
unassigned pressure.
