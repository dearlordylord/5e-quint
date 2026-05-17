# L1J Martial Melee Weapon Data Closure

Task: L1J-MARTIAL-MELEE-WEAPON-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/weapon_battleaxe.json`
- `packages/surface/content/weapon_greatsword.json`
- `packages/surface/content/weapon_maul.json`
- `packages/surface/content/weapon_morningstar.json`
- `packages/surface/content/weapon_rapier.json`
- `packages/surface/content/weapon_scimitar.json`
- `packages/surface/content/weapon_war_pick.json`
- `packages/surface/content/weapon_warhammer.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. The Task 5 rows are the martial melee weapon table entries assigned to
this closure task:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `weapon_battleaxe` | Battleaxe | Martial, Melee, 1d8 Slashing, Versatile (1d10), Topple, 4 lb., 10 GP |
| `weapon_greatsword` | Greatsword | Martial, Melee, 2d6 Slashing, Heavy, Two-Handed, Graze, 6 lb., 50 GP |
| `weapon_maul` | Maul | Martial, Melee, 2d6 Bludgeoning, Heavy, Two-Handed, Topple, 10 lb., 10 GP |
| `weapon_morningstar` | Morningstar | Martial, Melee, 1d8 Piercing, no Weapon Properties, Sap, 4 lb., 15 GP |
| `weapon_rapier` | Rapier | Martial, Melee, 1d8 Piercing, Finesse, Vex, 2 lb., 25 GP |
| `weapon_scimitar` | Scimitar | Martial, Melee, 1d6 Slashing, Finesse, Light, Nick, 3 lb., 25 GP |
| `weapon_war_pick` | War Pick | Martial, Melee, 1d8 Piercing, Versatile (1d10), Sap, 2 lb., 5 GP |
| `weapon_warhammer` | Warhammer | Martial, Melee, 1d8 Bludgeoning, Versatile (1d10), Push, 5 lb., 15 GP |

Project language checked Weapon Property, Mastery Property, Weapon Mastery, and
Holding/Wielding. The authored records use SRD provenance `srd-5.2.1` and
section `Equipment#Weapons`.

Other martial melee SRD rows stay outside Task 5: absent `weapon_glaive`,
`weapon_halberd`, `weapon_lance`, `weapon_pike`, `weapon_trident`, and
`weapon_whip` belong to Task 6 polearm/reach weapon data closure, while
installed `weapon_flail`, `weapon_greataxe`, `weapon_longsword`, and
`weapon_shortsword` belong to Task 10 installed-row alignment.

## Generated Coverage State

`unit-matrix.json` already records all eight rows with:

- `catalogAdmission.status`: `not-in-unit-catalog`
- `catalogAdmission.disposition.category`: `non-runtime-authored-data`
- `catalogAdmission.disposition.planningLane`: `no promoted runtime lane`
- `kind`: `weapon`
- `executableMechanics`: `false`
- `profiles`: `[]`
- `evidence`: `[]`

The generated report also lists the rows under Authored Catalog Admission
Triage as `non-runtime-authored-data`, with no promoted runtime lane.

## Decision

Close Task 5 as authored martial melee weapon table data. No classifier
change, Unit claim, profile, evidence manifest, Unit catalog admission, battle
reducer behavior, attack resolution, inventory simulation, or Weapon Mastery
runtime behavior is needed for these rows.

The weapon table facts are source data. Attack and Mastery Property behavior
consume weapon facts at their own runtime boundaries; the weapon records are
not standalone promoted Unit execution profiles. Admitting them to the Unit
catalog in this task would create unowned runtime pressure rather than close
the authored-data accounting gap.

## Reviewer Loop

Round 1 RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1
Equipment weapon table rows and uses project terms for Weapon Property, Mastery
Property, Weapon Mastery, and Holding/Wielding.

Round 1 architecture/domain pass: no runtime state is added, and no weapon
table fact is duplicated outside the existing Surface records. The closure
points to the authored SRD-provenance records and generated matrix disposition.

Round 1 connascence pass: row ids, SRD table names, authored record paths, and
generated matrix entries must change together. That coupling is limited to this
closure artifact plus the existing Surface content and generated coverage
artifacts; no parallel runtime list was introduced.

Round 1 code-review pass: no code, schema, Unit catalog, Unit claim, Unit
evidence, or runtime behavior changes are required.

Round 2 convergence pass: rechecked RAW traceability, project equipment
language, task exclusions, generated matrix disposition, and no-runtime-change
scope after drafting. No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21-29`,
  `.references/srd-5.2.1/Equipment.md:46-119`,
  `.references/srd-5.2.1/Equipment.md:141-158`, and
  `UBIQUITOUS_LANGUAGE.md:195-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
