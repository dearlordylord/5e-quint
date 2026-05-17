# L1J Ranged Weapon Data Closure

Task: L1J-RANGED-WEAPON-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/weapon_blowgun.json`
- `packages/surface/content/weapon_hand_crossbow.json`
- `packages/surface/content/weapon_heavy_crossbow.json`
- `packages/surface/content/weapon_light_crossbow.json`
- `packages/surface/content/weapon_longbow.json`
- `packages/surface/content/weapon_sling.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. The Task 7 rows are the simple and martial ranged weapon table entries
assigned to this closure task:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `weapon_blowgun` | Blowgun | Martial, Ranged, 1 Piercing, Ammunition (Range 25/100; Needle), Loading, Vex, 1 lb., 10 GP |
| `weapon_hand_crossbow` | Hand Crossbow | Martial, Ranged, 1d6 Piercing, Ammunition (Range 30/120; Bolt), Light, Loading, Vex, 3 lb., 75 GP |
| `weapon_heavy_crossbow` | Heavy Crossbow | Martial, Ranged, 1d10 Piercing, Ammunition (Range 100/400; Bolt), Heavy, Loading, Two-Handed, Push, 18 lb., 50 GP |
| `weapon_light_crossbow` | Light Crossbow | Simple, Ranged, 1d8 Piercing, Ammunition (Range 80/320; Bolt), Loading, Two-Handed, Slow, 5 lb., 25 GP |
| `weapon_longbow` | Longbow | Martial, Ranged, 1d8 Piercing, Ammunition (Range 150/600; Arrow), Heavy, Two-Handed, Slow, 2 lb., 50 GP |
| `weapon_sling` | Sling | Simple, Ranged, 1d4 Bludgeoning, Ammunition (Range 30/120; Bullet), Slow, no listed weight, 1 SP |

Project language checked Weapon Property, Mastery Property, Weapon Mastery,
Attack Roll, and Holding/Wielding. The authored records use SRD provenance
`srd-5.2.1` and section `Equipment#Weapons`.

Other ranged SRD rows stay outside Task 7: installed `weapon_shortbow` belongs
to Task 10 installed-row alignment; absent `weapon_dart` belongs to Task 8
thrown/finesse weapon data closure; absent `weapon_musket` and `weapon_pistol`
belong to Task 9 firearm/exotic weapon data closure.

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

Close Task 7 as authored ranged weapon table data. No classifier change, Unit
claim, profile, evidence manifest, Unit catalog admission, battle reducer
behavior, ranged attack resolution, ammunition tracking, inventory simulation,
Loading limitation behavior, Heavy prerequisite behavior, Two-Handed attack
workflow, or Weapon Mastery runtime behavior is needed for these rows.

The weapon table facts are source data. Ranged attacks, ammunition use,
Loading, Heavy, Two-Handed, and Mastery Property behavior consume weapon facts
at their own runtime boundaries; the weapon records are not standalone
promoted Unit execution profiles. Admitting them to the Unit catalog in this
task would create unowned runtime pressure rather than close the authored-data
accounting gap.

## Reviewer Loop

Round 1 RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1
Equipment weapon table rows plus the Ammunition, Heavy, Loading, Range, and
Two-Handed Weapon Property definitions. The artifact uses project terms for
Weapon Property, Mastery Property, Weapon Mastery, Attack Roll, and
Holding/Wielding.

Round 1 architecture/domain pass: no runtime state is added, and no weapon
table fact is duplicated outside the existing Surface records. The closure
points to the authored SRD-provenance records and generated matrix disposition.

Round 1 connascence pass: row ids, SRD table names, authored record paths, and
generated matrix entries must change together. That coupling is limited to this
closure artifact plus the existing Surface content and generated coverage
artifacts; no parallel runtime list was introduced. The task-owned row table
also makes the `weapon_shortbow`, `weapon_dart`, `weapon_musket`, and
`weapon_pistol` exclusions explicit so future task splits do not infer all
ranged rows from the task title.

Round 1 code-review pass: no code, schema, Unit catalog, Unit claim, Unit
evidence, or runtime behavior changes are required.

Round 2 convergence pass: rechecked RAW traceability, project equipment
language, task exclusions, generated matrix disposition, and no-runtime-change
scope after drafting. No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21-29`,
  `.references/srd-5.2.1/Equipment.md:40-76`,
  `.references/srd-5.2.1/Equipment.md:136-165`, and
  `UBIQUITOUS_LANGUAGE.md:195-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
