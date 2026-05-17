# L1J Firearm Exotic Weapon Data Closure

Task: L1J-FIREARM-EXOTIC-WEAPON-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/weapon_musket.json`
- `packages/surface/content/weapon_pistol.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. The SRD weapon table categorizes both Task 9 rows as Martial Ranged
Weapons; "exotic" is a task grouping label, not an SRD weapon category or a
runtime type introduced by this closure.

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `weapon_musket` | Musket | Martial, Ranged, 1d12 Piercing, Ammunition (Range 40/120; Bullet), Loading, Two-Handed, Slow, 10 lb., 500 GP |
| `weapon_pistol` | Pistol | Martial, Ranged, 1d10 Piercing, Ammunition (Range 30/90; Bullet), Loading, Vex, 3 lb., 250 GP |

Project language checked Weapon Property, Mastery Property, Weapon Mastery,
Attack Roll, and Holding/Wielding. The authored records use SRD provenance
`srd-5.2.1` and section `Equipment#Weapons`.

Firearm bullet inventory is a separate equipment table fact and is not modeled
as runtime ammunition tracking by this task.

## Generated Coverage State

`unit-matrix.json` already records both rows with:

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

Close Task 9 as authored firearm weapon table data. No classifier change, Unit
claim, profile, evidence manifest, Unit catalog admission, battle reducer
behavior, firearm attack resolution, firearm proficiency rule, ammunition
tracking, Loading limitation behavior, Two-Handed attack workflow, or Weapon
Mastery runtime behavior is needed for these rows.

The weapon table facts are source data. Ranged attacks, ammunition use,
Loading, Two-Handed, and Mastery Property behavior consume weapon facts at
their own runtime boundaries; the weapon records are not standalone promoted
Unit execution profiles. Admitting them to the Unit catalog in this task would
create unowned runtime pressure rather than close the authored-data accounting
gap.

## Reviewer Loop

Round 1 RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1
Equipment weapon table rows plus the Ammunition, Loading, Range, and
Two-Handed Weapon Property definitions. The artifact uses project terms for
Weapon Property, Mastery Property, Weapon Mastery, Attack Roll, and
Holding/Wielding.

Round 1 architecture/domain pass: no runtime state is added, and no weapon
table fact is duplicated outside the existing Surface records. The closure
points to the authored SRD-provenance records and generated matrix disposition.
"Exotic" is kept out of the modeled domain because the SRD table does not
define it as a weapon category.

Round 1 connascence pass: row ids, SRD table names, authored record paths, and
generated matrix entries must change together. That coupling is limited to this
closure artifact plus the existing Surface content and generated coverage
artifacts; no parallel runtime list was introduced.

Round 1 code-review pass: no code, schema, Unit catalog, Unit claim, Unit
evidence, or runtime behavior changes are required.

Round 2 convergence pass: rechecked RAW traceability, project equipment
language, generated matrix disposition, no-runtime-change scope, and the
explicit non-SRD nature of the task's "exotic" grouping label after drafting.
No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21-29`,
  `.references/srd-5.2.1/Equipment.md:42-76`,
  `.references/srd-5.2.1/Equipment.md:160-166`,
  `.references/srd-5.2.1/Equipment.md:455-503`, and
  `UBIQUITOUS_LANGUAGE.md:195-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
