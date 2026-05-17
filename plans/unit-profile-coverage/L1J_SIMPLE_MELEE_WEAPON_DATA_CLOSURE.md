# L1J Simple Melee Weapon Data Closure

Task: L1J-SIMPLE-MELEE-WEAPON-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/weapon_greatclub.json`
- `packages/surface/content/weapon_handaxe.json`
- `packages/surface/content/weapon_light_hammer.json`
- `packages/surface/content/weapon_mace.json`
- `packages/surface/content/weapon_sickle.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines weapon table facts: Category, Melee or Ranged,
damage dice and damage type, Weapon Properties, Mastery Property, weight, and
cost. The Task 4 rows are the simple melee weapon table entries assigned to
this closure task:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `weapon_greatclub` | Greatclub | Simple, Melee, 1d8 Bludgeoning, Two-Handed, Push, 10 lb., 2 SP |
| `weapon_handaxe` | Handaxe | Simple, Melee, 1d6 Slashing, Light, Thrown (Range 20/60), Vex, 2 lb., 5 GP |
| `weapon_light_hammer` | Light Hammer | Simple, Melee, 1d4 Bludgeoning, Light, Thrown (Range 20/60), Nick, 2 lb., 2 GP |
| `weapon_mace` | Mace | Simple, Melee, 1d6 Bludgeoning, no Weapon Properties, Sap, 4 lb., 5 GP |
| `weapon_sickle` | Sickle | Simple, Melee, 1d4 Slashing, Light, Nick, 2 lb., 1 GP |

Project language checked Weapon Property, Mastery Property, Weapon Mastery, and
Holding/Wielding. The authored records use SRD provenance `srd-5.2.1` and
section `Equipment#Weapons`.

Other simple melee SRD rows stay outside Task 4: installed `weapon_club`,
`weapon_dagger`, `weapon_quarterstaff`, and `weapon_spear` belong to Task 10
installed-row alignment, while absent `weapon_javelin` belongs to Task 8
thrown/finesse weapon data closure.

## Generated Coverage State

`unit-matrix.json` already records all five rows with:

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

Close Task 4 as authored simple melee weapon table data. No classifier change,
Unit claim, profile, evidence manifest, Unit catalog admission, battle reducer
behavior, attack resolution, inventory simulation, or Weapon Mastery runtime
behavior is needed for these rows.

The weapon table facts are source data. Attack and Mastery Property behavior
consume weapon facts at their own runtime boundaries; the weapon records are not
standalone promoted Unit execution profiles. Admitting them to the Unit catalog
in this task would create unowned runtime pressure rather than close the
authored-data accounting gap.

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
scope after wording cleanup. No additional findings remain.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:21-29`,
  `.references/srd-5.2.1/Equipment.md:54-84`,
  `.references/srd-5.2.1/Equipment.md:121-136`, and
  `UBIQUITOUS_LANGUAGE.md:195-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
