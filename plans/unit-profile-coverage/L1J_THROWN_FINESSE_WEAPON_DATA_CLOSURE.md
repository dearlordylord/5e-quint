# L1J Thrown Finesse Weapon Data Closure

Task: L1J-THROWN-FINESSE-WEAPON-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/weapon_dart.json`
- `packages/surface/content/weapon_javelin.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. The Task 8 rows are the thrown/finesse weapon table entries assigned to
this closure task:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `weapon_dart` | Dart | Simple, Ranged, 1d4 Piercing, Finesse, Thrown (Range 20/60), Vex, 1/4 lb., 5 CP |
| `weapon_javelin` | Javelin | Simple, Melee, 1d6 Piercing, Thrown (Range 30/120), Slow, 2 lb., 5 SP |

Project language checked Weapon Property, Mastery Property, Weapon Mastery,
Attack Roll, and Holding/Wielding. The authored records use SRD provenance
`srd-5.2.1` and section `Equipment#Weapons`.

The task title groups thrown and finesse pressure, but the owned row set is the
source of truth. Installed thrown/finesse SRD rows such as `weapon_dagger` and
`weapon_spear` belong to Task 10 installed-row alignment. Other absent thrown
rows were already closed by earlier row-set tasks: `weapon_handaxe` and
`weapon_light_hammer` in Task 4, and `weapon_trident` in Task 6.

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

Close Task 8 as authored thrown/finesse weapon table data. No classifier
change, Unit claim, profile, evidence manifest, Unit catalog admission, battle
reducer behavior, attack resolution, inventory simulation, ranged-attack range
workflow, draw-as-part-of-attack workflow, Finesse ability-modifier choice, or
Weapon Mastery runtime behavior is needed for these rows.

The weapon table facts are source data. Attack, range, Thrown, Finesse, and
Mastery Property behavior consume weapon facts at their own runtime boundaries;
the weapon records are not standalone promoted Unit execution profiles.
Admitting them to the Unit catalog in this task would create unowned runtime
pressure rather than close the authored-data accounting gap.

## Reviewer Loop

Round 1 RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1
Equipment weapon table rows plus the Finesse, Range, and Thrown Weapon Property
definitions. The artifact uses project terms for Weapon Property, Mastery
Property, Weapon Mastery, Attack Roll, and Holding/Wielding.

Round 1 architecture/domain pass: no runtime state is added, and no weapon
table fact is duplicated outside the existing Surface records. The closure
points to the authored SRD-provenance records and generated matrix disposition.

Round 1 connascence pass: row ids, SRD table names, authored record paths, and
generated matrix entries must change together. That coupling is limited to this
closure artifact plus the existing Surface content and generated coverage
artifacts; no parallel runtime list was introduced. The task-owned row table
also makes the installed dagger/spear exclusion explicit so future task splits
do not infer every thrown or finesse row from the task title.

Round 1 code-review pass: no code, schema, Unit catalog, Unit claim, Unit
evidence, or runtime behavior changes are required.

Round 2 convergence pass: rechecked RAW traceability, project equipment
language, task exclusions, generated matrix disposition, and no-runtime-change
scope after drafting. No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21-29`,
  `.references/srd-5.2.1/Equipment.md:46-76`,
  `.references/srd-5.2.1/Equipment.md:125-138`, and
  `UBIQUITOUS_LANGUAGE.md:195-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
