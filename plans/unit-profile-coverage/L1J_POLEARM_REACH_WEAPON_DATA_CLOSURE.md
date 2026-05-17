# L1J Polearm Reach Weapon Data Closure

Task: L1J-POLEARM-REACH-WEAPON-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/weapon_glaive.json`
- `packages/surface/content/weapon_halberd.json`
- `packages/surface/content/weapon_lance.json`
- `packages/surface/content/weapon_pike.json`
- `packages/surface/content/weapon_trident.json`
- `packages/surface/content/weapon_whip.json`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. The Task 6 rows are the martial melee weapon table entries assigned to
this closure task:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `weapon_glaive` | Glaive | Martial, Melee, 1d10 Slashing, Heavy, Reach, Two-Handed, Graze, 6 lb., 20 GP |
| `weapon_halberd` | Halberd | Martial, Melee, 1d10 Slashing, Heavy, Reach, Two-Handed, Cleave, 6 lb., 20 GP |
| `weapon_lance` | Lance | Martial, Melee, 1d10 Piercing, Heavy, Reach, Two-Handed (unless mounted), Topple, 6 lb., 10 GP |
| `weapon_pike` | Pike | Martial, Melee, 1d10 Piercing, Heavy, Reach, Two-Handed, Push, 18 lb., 5 GP |
| `weapon_trident` | Trident | Martial, Melee, 1d8 Piercing, Thrown (Range 20/60), Versatile (1d10), Topple, 4 lb., 5 GP |
| `weapon_whip` | Whip | Martial, Melee, 1d4 Slashing, Finesse, Reach, Slow, 3 lb., 2 GP |

Project language checked Weapon Property, Mastery Property, Weapon Mastery,
Reach, Opportunity Attack, and Holding/Wielding. The authored records use SRD
provenance `srd-5.2.1` and section `Equipment#Weapons`.

The task title groups polearm and reach pressure, but the owned row set is the
source of truth. `weapon_trident` is included because the plan assigns it to
Task 6, even though the SRD row has Thrown and Versatile Weapon Properties
rather than Reach. Reach and Mastery Property behavior remain outside this
closure task.

## Generated Coverage State

`unit-matrix.json` already records all six rows with:

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

Close Task 6 as authored martial melee weapon table data. No classifier
change, Unit claim, profile, evidence manifest, Unit catalog admission, battle
reducer behavior, Reach behavior, attack resolution, inventory simulation,
mounting workflow, or Weapon Mastery runtime behavior is needed for these rows.

The weapon table facts are source data. Attack, Reach, mounting, Thrown,
Versatile, and Mastery Property behavior consume weapon facts at their own
runtime boundaries; the weapon records are not standalone promoted Unit
execution profiles. Admitting them to the Unit catalog in this task would
create unowned runtime pressure rather than close the authored-data accounting
gap.

## Reviewer Loop

Round 1 RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1
Equipment weapon table rows, the Reach property definition, and the Rules
Glossary Reach baseline. The artifact uses project terms for Weapon Property,
Mastery Property, Weapon Mastery, Opportunity Attack, and Holding/Wielding.

Round 1 architecture/domain pass: no runtime state is added, and no weapon
table fact is duplicated outside the existing Surface records. The closure
points to the authored SRD-provenance records and generated matrix disposition.

Round 1 connascence pass: row ids, SRD table names, authored record paths, and
generated matrix entries must change together. That coupling is limited to this
closure artifact plus the existing Surface content and generated coverage
artifacts; no parallel runtime list was introduced. The task-owned row table
also makes the trident inclusion explicit so future task splits do not infer
Reach from the task title.

Round 1 code-review pass: no code, schema, Unit catalog, Unit claim, Unit
evidence, or runtime behavior changes are required.

Round 2 convergence pass: rechecked RAW traceability, project equipment
language, task exclusions, generated matrix disposition, and no-runtime-change
scope after drafting. No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21-29`,
  `.references/srd-5.2.1/Equipment.md:54-89`,
  `.references/srd-5.2.1/Equipment.md:141-160`,
  `.references/srd-5.2.1/Rules-Glossary.md:810-835`, and
  `UBIQUITOUS_LANGUAGE.md:195-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
