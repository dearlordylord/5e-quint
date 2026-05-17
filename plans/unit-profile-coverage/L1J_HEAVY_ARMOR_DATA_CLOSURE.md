# L1J Heavy Armor Data Closure

Task: L1J-HEAVY-ARMOR-DATA.

## Inputs Read

- `plans/unit-profile-coverage/L1J_EQUIPMENT_DATA_PRECHECK.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `packages/surface/content/armor_plate.json`
- `packages/surface/content/armor_ring_mail.json`
- `packages/surface/content/armor_splint_armor.json`
- `.references/srd-5.2.1/Equipment.md`
- `UBIQUITOUS_LANGUAGE.md`

## RAW And Domain Boundary

SRD 5.2.1 Equipment defines armor table facts: Armor Category, Armor
Class formula, Strength requirement when present, Stealth Disadvantage when
present, weight, cost, and don/doff timing. The Task 3 rows are the heavy armor
table entries absent from the Unit catalog and owned by this closure task:

| Unit | SRD row | Authored facts checked |
| --- | --- | --- |
| `armor_ring_mail` | Ring Mail | Heavy Armor, AC 14, Stealth Disadvantage, 40 lb., 30 GP, 10 minutes to don and 5 minutes to doff |
| `armor_splint_armor` | Splint Armor | Heavy Armor, AC 17, Str 15, Stealth Disadvantage, 60 lb., 200 GP, 10 minutes to don and 5 minutes to doff |
| `armor_plate` | Plate Armor | Heavy Armor, AC 18, Str 15, Stealth Disadvantage, 65 lb., 1,500 GP, 10 minutes to don and 5 minutes to doff |

Project language checked Armor Class, Armor Category, and Donning/Doffing. The
authored records use SRD provenance `srd-5.2.1` and section `Equipment#Armor`.
Chain Mail is the remaining heavy armor SRD row, but the precheck assigns
installed `armor_chain_mail` to Task 10 installed-row alignment.

## Generated Coverage State

`unit-matrix.json` already records all three rows with:

- `catalogAdmission.status`: `not-in-unit-catalog`
- `catalogAdmission.disposition.category`: `non-runtime-authored-data`
- `catalogAdmission.disposition.planningLane`: `no promoted runtime lane`
- `kind`: `armor`
- `executableMechanics`: `false`
- `profiles`: `[]`
- `evidence`: `[]`

The generated report also lists the rows under Authored Catalog Admission
Triage as `non-runtime-authored-data`, with no promoted runtime lane.

## Decision

Close Task 3 as authored heavy armor table data. No classifier change, Unit
claim, profile, evidence manifest, Unit catalog admission, battle reducer
behavior, armor-equipping workflow, or character runtime behavior is needed for
these rows.

The armor table facts are source data consumed by existing or future character
equipment projections. They are not standalone promoted Unit execution
profiles, and admitting them to the Unit catalog in this task would create
unowned runtime pressure rather than close the authored-data accounting gap.

## Reviewer Loop

RAW/ubiquitous-language pass: the closure traces to SRD 5.2.1 Equipment armor
table rows and uses project terms for Armor Class, Armor Category, and
Donning/Doffing.

Architecture/domain pass: no runtime state is added, and no armor table fact is
duplicated outside the existing Surface records. The closure points to the
authored SRD-provenance records and generated matrix disposition.

Connascence pass: row ids, SRD table names, authored record paths, and generated
matrix entries must change together. That coupling is limited to this closure
artifact plus the existing Surface content and generated coverage artifacts; no
parallel runtime list was introduced.

Code-review pass: no code, schema, Unit catalog, Unit claim, Unit evidence, or
runtime behavior changes are required.

## Verification

- RAW/source check: `.references/srd-5.2.1/Equipment.md:170-211` and
  `UBIQUITOUS_LANGUAGE.md:168-213`.
- Coverage verification: `pnpm unit-profile-coverage:check --write`, then
  `pnpm unit-profile-coverage:check`.
- Whitespace verification: `git diff --check`.
- MBT: not needed; this task changes only a decision artifact and does not
  change promoted battle/runtime behavior.
